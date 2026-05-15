import { WebSocketServer, WebSocket } from 'ws'
import { createServer, type IncomingMessage as HttpIncomingMessage, type ServerResponse } from 'http'
import { GATEWAY_PORT, TELEGRAM_TOKEN, WHATSAPP_PROVIDER, ANTHROPIC_API_KEY } from './config.js'
import { initWorkspace, maybeNudgeUserModel } from './memory/memory.js'
import { routeMessage, classifyIntent } from './agents/router.js'
import { startTelegramChannel } from './channels/telegram.js'
import { startWhatsappChannel, handleWhatsAppWebhook } from './channels/whatsapp.js'
import { startSmsChannel, handleSmsWebhook, smsChannel } from './channels/sms.js'
import { handleVoiceWebhook, voiceChannel } from './channels/voice.js'
import { channelGateSummary, isChannelExplicitlyEnabled } from './channels/enablement.js'
import { getOrCreateSession, updateSession, resetSession, type Session } from './sessions/index.js'
import { indexSession } from './memory/search.js'
import { consultPanel } from './agents/subagent.js'
import { startAllCronJobs } from './cron/index.js'
import { startEnabledPresets } from './cron/presets.js'
import { createApprovalTokenFactory } from './cron/approval.js'
import { buildSkillsContext } from './skills/loader.js'
import { listPersonalities, loadPersonality, getPersonalityPrompt, copyBuiltinToUser } from './personalities/loader.js'
import { handleAttachmentRequest } from './attachments/http.js'
import { handleSeabriApiRequest } from './seabri/api-handler.js'
import { handleClaimApiRequest } from './claim/api-handler.js'
import { startSessionCleanup } from './claim/session.js'
import { routeTask } from './seabri/task-router.js'
import { emitTaskTelemetry } from './seabri/telemetry.js'
import { runIncidentWorkflow } from './seabri/incident-workflow.js'
import { analyzeIncidentImage } from './seabri/vision-analysis.js'
import type { ModelTier } from './orchestrator/model-router.js'
import { startCanvasServer, stopCanvasServer } from './canvas/server.js'
import { parseIncomingMessage, type IncomingMessage, type InitMessage, type ChatMessage } from './schemas.js'
import { extractActionCard, detectActionKind, logConsent, type PendingAction } from './seabri/approval.js'
import { getExecutor } from './seabri/action-executor.js'
import { registerBuiltinTools } from './tools/register-builtin.js'
import { isDbConfigured } from '../db/client.js'
import { log } from './logger.js'
import { validateStartupConfig } from './startup/production-config.js'
import { initializePersistenceAdapterForStartup } from './persistence/adapter.js'

const VERSION = '0.2.0'

const APPROVAL_TTL_MS = Number(process.env.OPENSEABRI_APPROVAL_TTL_MS ?? 300_000)

interface PendingApprovalItem extends PendingAction {
  id: string
}

// Persists pending approvals across WS connections keyed by gateway sessionId.
// Each session can have multiple concurrent approvals (e.g. multiple contractor calls).
const sessionApprovals = new Map<string, PendingApprovalItem[]>()

interface Message {
  role: string
  content: string
}

interface ConnectionState {
  session: Session
  initialized: boolean
}

async function checkSeaBridgeConnection(): Promise<boolean> {
  return false
}

function printBanner(seaBridgeConnected: boolean, telegramActive: boolean, whatsappActive: boolean, smsActive: boolean, voiceActive: boolean): void {
  const seabridgeStatus = seaBridgeConnected
    ? '\x1b[32mConnected\x1b[0m'
    : '\x1b[90mStandalone\x1b[0m'
  const telegramStatus = telegramActive
    ? '\x1b[32mActive\x1b[0m'
    : '\x1b[90mNot configured\x1b[0m'
  const whatsappStatus = whatsappActive
    ? '\x1b[32mActive (/webhooks/whatsapp)\x1b[0m'
    : '\x1b[90mNot configured\x1b[0m'
  const smsStatus = smsActive
    ? '\x1b[32mActive (/webhooks/sms)\x1b[0m'
    : '\x1b[90mNot configured\x1b[0m'
  const voiceStatus = voiceActive
    ? '\x1b[32mActive (/webhooks/voice)\x1b[0m'
    : '\x1b[90mNot configured\x1b[0m'

  log.info('gateway started', {
    version: VERSION,
    port: GATEWAY_PORT,
    seabridge: seaBridgeConnected,
    telegram: telegramActive,
    whatsapp: whatsappActive,
    sms: smsActive,
    voice: voiceActive,
  })
}

async function startGateway(): Promise<void> {
  const startupValidation = validateStartupConfig()
  log.info('startup mode', startupValidation.summary)
  if (!startupValidation.ok) {
    for (const err of startupValidation.errors) {
      log.fatal('startup validation failed', { code: err.code, error: err.message })
    }
    process.exit(1)
  }
  for (const warn of startupValidation.warnings) {
    log.warn('startup validation warning', { code: warn.code, warning: warn.message })
  }
  try {
    const persistence = await initializePersistenceAdapterForStartup()
    log.info('persistence adapter', {
      kind: persistence.kind,
      productionSafe: persistence.productionSafe,
      configured: persistence.configured,
    })
  } catch {
    log.fatal('startup validation failed', {
      code: 'persistence_initialization_failed',
      error: 'Production persistence adapter could not initialize. Check database URL, network access, and migrations.',
    })
    process.exit(1)
  }

  // Initialize workspace files
  try {
    await initWorkspace()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    log.warn('workspace init warning', { error: message })
  }

  // Register typed tool registry
  registerBuiltinTools()

  // Report database status
  if (isDbConfigured()) {
    log.info('PostgreSQL configured')
  } else {
    log.info('no DATABASE_URL - running with file-based sessions')
  }

  // Check optional connections
  const seaBridgeConnected = await checkSeaBridgeConnection()

  // Start cron scheduler
  try {
    await startAllCronJobs()
  } catch {
    // Non-fatal — cron scheduler failure doesn't block gateway
  }

  // Start claim session cleanup (evicts expired sessions every hour)
  const claimCleanupInterval = startSessionCleanup()

  // Start compliance-tagged cron presets (regulation monitoring etc.).
  // Skipped silently when OPENSEABRI_RUN_SECRET is unset — presets cannot
  // mint HMAC approval tokens without it.
  try {
    const factory = createApprovalTokenFactory()
    if (factory) {
      await startEnabledPresets(factory)
    } else {
      log.warn('OPENSEABRI_RUN_SECRET unset - cron presets disabled')
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    log.warn('cron presets warning', { error: message })
  }

  // Optionally start canvas WS broadcast hub (A2UI / Live Canvas).
  // No-op when OPENSEABRI_CANVAS_WS_PORT is unset — matches the tryImport
  // fallback pattern used for telegram/discord.
  try {
    await startCanvasServer()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    log.warn('canvas start warning', { error: message })
  }

  const configuredChannelGate = channelGateSummary()
  log.info('live channel startup gate', { enabledChannels: configuredChannelGate })

  // Optionally start Telegram. Credentials alone are not enough: live channels
  // must be explicitly allowlisted to avoid accidental polling from local .env.
  let telegramActive = false
  if (TELEGRAM_TOKEN && isChannelExplicitlyEnabled('telegram')) {
    try {
      await startTelegramChannel()
      telegramActive = true
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      log.warn('telegram start warning', { error: message })
    }
  } else if (TELEGRAM_TOKEN) {
    log.info('telegram credentials present but channel not enabled; set OPENSEABRI_CHANNELS_ENABLED=telegram to start polling')
  }

  // Optionally start WhatsApp
  let whatsappActive = false
  if (WHATSAPP_PROVIDER && isChannelExplicitlyEnabled('whatsapp')) {
    try {
      await startWhatsappChannel()
      whatsappActive = WHATSAPP_PROVIDER.toLowerCase() === 'cloud'
        ? Boolean(process.env.WHATSAPP_CLOUD_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_VERIFY_TOKEN)
        : false
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      log.warn('whatsapp start warning', { error: message })
    }
  } else if (WHATSAPP_PROVIDER) {
    log.info('whatsapp provider configured but channel not enabled; set OPENSEABRI_CHANNELS_ENABLED=whatsapp to activate webhook processing')
  }

  // Optionally start SMS (Twilio)
  let smsActive = false
  if (isChannelExplicitlyEnabled('sms')) {
    try {
      await startSmsChannel()
      smsActive = smsChannel.isEnabled()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      log.warn('sms start warning', { error: message })
    }
  } else if (smsChannel.isEnabled()) {
    log.info('twilio sms credentials present but channel not enabled; set OPENSEABRI_CHANNELS_ENABLED=sms to activate SMS webhooks')
  }

  // Optionally start Voice (Twilio)
  let voiceActive = false
  if (isChannelExplicitlyEnabled('voice')) {
    try {
      voiceActive = voiceChannel.isEnabled()
      if (voiceActive) await voiceChannel.start()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      log.warn('voice start warning', { error: message })
    }
  } else if (voiceChannel.isEnabled()) {
    log.info('twilio voice credentials present but channel not enabled; set OPENSEABRI_CHANNELS_ENABLED=voice to activate voice webhooks')
  }

  // TwiML endpoint — serves spoken text for outbound Twilio Voice calls.
  // GET /twiml?message=<encoded> → returns TwiML <Response><Say> document.
  function handleTwimlRequest(req: HttpIncomingMessage, res: ServerResponse): boolean {
    const urlObj = new URL(req.url ?? '/', `http://localhost:${GATEWAY_PORT}`)
    if (urlObj.pathname !== '/twiml') return false
    const message = urlObj.searchParams.get('message') ?? 'Hello. This is SeaBri calling on your behalf.'
    const safe = message.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] ?? c))
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna">${safe}</Say></Response>`
    res.writeHead(200, { 'content-type': 'text/xml; charset=utf-8' })
    res.end(twiml)
    return true
  }

  // Shared HTTP server — serves the attachment store over /attachments/* and
  // hosts the WebSocket upgrade on the same port so the gateway keeps a single
  // loopback-bound listener.
  // ── Rate limiting ────────────────────────────────────────────────────────
  const RATE_LIMIT_WINDOW_MS = 60_000
  const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.OPENSEABRI_RATE_LIMIT || '120', 10)
  const rateCounts = new Map<string, { count: number; resetAt: number }>()

  function getClientIp(req: HttpIncomingMessage): string {
    const forwarded = req.headers['x-forwarded-for']
    if (typeof forwarded === 'string') return forwarded.split(',')[0].trim()
    return req.socket.remoteAddress || 'unknown'
  }

  function isRateLimited(ip: string): boolean {
    const now = Date.now()
    const entry = rateCounts.get(ip)
    if (!entry || now >= entry.resetAt) {
      rateCounts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
      return false
    }
    entry.count++
    return entry.count > RATE_LIMIT_MAX_REQUESTS
  }

  // Evict stale rate-limit entries every 5 minutes
  const rateLimitCleanup = setInterval(() => {
    const now = Date.now()
    for (const [ip, entry] of rateCounts) {
      if (now >= entry.resetAt) rateCounts.delete(ip)
    }
  }, 300_000)
  rateLimitCleanup.unref()

  const CORS_ORIGIN = process.env.OPENSEABRI_CORS_ORIGIN || 'http://localhost:5173'

  const httpServer = createServer(async (req: HttpIncomingMessage, res: ServerResponse) => {
    const clientIp = getClientIp(req)
    if (isRateLimited(clientIp)) {
      res.writeHead(429, { 'content-type': 'text/plain', 'retry-after': '60' })
      res.end('Too Many Requests')
      return
    }

    try {
      const reqOrigin = req.headers.origin
      if (reqOrigin && reqOrigin === CORS_ORIGIN) {
        res.setHeader('access-control-allow-origin', CORS_ORIGIN)
        res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS')
        res.setHeader('access-control-allow-headers', 'content-type, x-openseabri-key')
        res.setHeader('access-control-max-age', '86400')
      }

      if (req.method === 'OPTIONS') {
        res.writeHead(204)
        res.end()
        return
      }

      const reqPath = new URL(req.url ?? '/', `http://localhost`).pathname
      if (req.method === 'GET' && reqPath === '/health') {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ status: 'ok', ts: Date.now() }))
        return
      }
      if (await handleSeabriApiRequest(req, res)) return
      if (await handleClaimApiRequest(req, res)) return
      if (await handleAttachmentRequest(req, res)) return
      if (whatsappActive && await handleWhatsAppWebhook(req, res)) return
      if (smsActive && await handleSmsWebhook(req, res)) return
      if (voiceActive && await handleVoiceWebhook(req, res)) return
      if (handleTwimlRequest(req, res)) return
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      res.end('Not Found')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      log.error('HTTP handler error', { error: message })
      if (!res.headersSent) {
        res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
      }
      if (!res.writableEnded) res.end('Internal Server Error')
    }
  })

  const wss = new WebSocketServer({ server: httpServer })

  wss.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      log.fatal('gateway WebSocket port already in use', { port: GATEWAY_PORT })
      return
    }
    log.error('gateway WebSocket server error', { error: err.message })
  })

  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      log.fatal('port already in use', { port: GATEWAY_PORT })
      process.exit(1)
    }
    log.error('HTTP server error', { error: err.message })
  })

  const GATEWAY_HOST = process.env.GATEWAY_HOST || '127.0.0.1'
  await new Promise<void>((resolve) => httpServer.listen(GATEWAY_PORT, GATEWAY_HOST, resolve))

  printBanner(seaBridgeConnected, telegramActive, whatsappActive, smsActive, voiceActive)

  const wsToken = process.env.SEABRI_WS_TOKEN
  if (!wsToken) {
    log.warn('SEABRI_WS_TOKEN not set - all WebSocket connections will be rejected')
  }

  wss.on('connection', (ws: WebSocket, req: HttpIncomingMessage) => {
    if (!wsToken) {
      ws.close(1008, 'Server not configured for WebSocket auth')
      return
    }
    const wsClientIp = getClientIp(req)
    if (isRateLimited(wsClientIp)) {
      ws.close(1008, 'Too many connections')
      return
    }
    const reqUrl = new URL(req.url ?? '/', `http://localhost`)
    if (reqUrl.searchParams.get('token') !== wsToken) {
      ws.close(1008, 'Unauthorized')
      return
    }

    const state: ConnectionState = {
      session: {
        id: '',
        name: '',
        agentId: 'general',
        history: [],
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        compressed: false,
        turnCount: 0,
      },
      initialized: false,
    }

    function sendText(text: string, done = true): void {
      if (ws.readyState !== WebSocket.OPEN) return
      for (const char of text) {
        ws.send(JSON.stringify({ type: 'token', content: char }))
      }
      if (done) ws.send(JSON.stringify({ type: 'done' }))
    }

    async function handleSlashCommand(cmd: string): Promise<string | null> {
      const parts = cmd.trim().split(/\s+/)
      const command = parts[0]

      if (command === '/new') {
        const fresh = await resetSession(state.session.id)
        if (fresh) state.session = fresh
        return 'Started a fresh conversation.'
      }

      if (command === '/reset') {
        const fresh = await resetSession(state.session.id)
        if (fresh) state.session = fresh
        return 'Conversation reset.'
      }

      if (command === '/compact') {
        const { compressHistory } = await import('./memory/compress.js')
        const result = await compressHistory(state.session.history)
        state.session.history = result.history
        state.session.compressed = true
        await updateSession(state.session)
        return result.compressed
          ? `Conversation compacted. Summary retained: ${result.summary.slice(0, 100)}...`
          : 'Conversation is short enough — nothing to compact.'
      }

      if (command === '/status') {
        const turns = Math.floor(state.session.history.length / 2)
        return (
          `Agent: ${state.session.agentId}\n` +
          `Session: ${state.session.name}\n` +
          `Turns: ${turns}\n` +
          `Compressed: ${state.session.compressed ? 'Yes' : 'No'}`
        )
      }

      if (command === '/think') {
        const thinkContent = parts.slice(1).join(' ')
        if (!thinkContent) return 'Usage: /think <your question>'
        const personaPrompt = await getPersonalityPrompt(state.session.personalityId)
        const extra = ['Use extended reasoning. Show your work.', personaPrompt]
          .filter(Boolean)
          .join('\n\n---\n\n')
        const response = await routeMessage(
          state.session.agentId,
          `Think step by step about: ${thinkContent}`,
          state.session.history,
          extra
        )
        return response
      }

      if (command === '/persona' || command === '/personality') {
        const sub = (parts[1] ?? 'current').toLowerCase()

        if (sub === 'list') {
          const all = await listPersonalities()
          if (all.length === 0) return 'No personalities available.'
          const active = state.session.personalityId ?? 'default'
          const lines = all.map((p) => {
            const marker = p.id === active ? '* ' : '  '
            const src = p.source === 'user' ? ' (user)' : ''
            return `${marker}${p.id}${src} — ${p.description}`
          })
          return `Personalities:\n${lines.join('\n')}`
        }

        if (sub === 'current') {
          const id = state.session.personalityId ?? 'default'
          const p = await loadPersonality(id)
          if (!p) return `No personality matching "${id}".`
          return `Current personality: ${p.name} (${p.id})\n${p.description}`
        }

        if (sub === 'use' || sub === 'set') {
          const target = (parts[2] ?? '').toLowerCase()
          if (!target) return 'Usage: /persona use <id>'
          const p = await loadPersonality(target)
          if (!p) return `Unknown personality: ${target}. Try /persona list.`
          state.session.personalityId = p.id
          await updateSession(state.session)
          return `Personality set to ${p.name} (${p.id}).`
        }

        if (sub === 'edit') {
          const target = (parts[2] ?? '').toLowerCase()
          if (!target) return 'Usage: /persona edit <id>'
          const dest = await copyBuiltinToUser(target)
          if (!dest) return `Cannot edit "${target}" — not a built-in personality, or not found.`
          return `Copied to ${dest}. Edit the file and changes will hot-reload.`
        }

        return 'Usage: /persona [list|current|use <id>|edit <id>]'
      }

      if (command === '/usage' || command === '/metrics') {
        const turns = Math.floor(state.session.history.length / 2)
        const totalChars = state.session.history.reduce((sum, m) => sum + m.content.length, 0)
        const { aggregateMetrics } = await import('./orchestrator/metrics.js')
        const agg = aggregateMetrics()
        const lines = [
          `Session turns: ${turns}`,
          `Estimated context characters: ${totalChars.toLocaleString()}`,
        ]
        if (agg.totalRequests > 0) {
          lines.push('')
          lines.push(`API calls: ${agg.totalRequests}`)
          lines.push(`Total cost: $${agg.totalCostUsd.toFixed(4)}`)
          lines.push(`Total carbon: ${agg.totalCarbonGrams.toFixed(4)} gCO₂e`)
          lines.push(`Avg latency: ${Math.round(agg.avgLatencyMs)}ms`)
          const models = Object.entries(agg.byModel)
            .map(([m, s]) => `  ${m}: ${s.requests} calls, ${s.tokens} tokens`)
            .join('\n')
          if (models) lines.push(`Models:\n${models}`)
        }
        return lines.join('\n')
      }

      if (command === '/agents') {
        const { AGENTS: agentList } = await import('./config.js')
        const lines = agentList.map((a: { icon: string; id: string; name: string }) => `${a.icon} \`${a.id}\` — ${a.name}`)
        return `Available agents:\n\n${lines.join('\n')}`
      }

      if (command === '/skills') {
        return await buildSkillsContext()
      }

      if (command === '/panel') {
        const question = parts.slice(1).join(' ')
        if (!question) return 'Usage: /panel <your question>'
        try {
          const result = await consultPanel(question, {
            conversationHistory: state.session.history,
          })
          const successCount = result.responses.filter((r) => !r.error).length
          const secs = Math.round(result.totalDurationMs / 1000)
          return `Panel synthesis — ${successCount}/${result.responses.length} specialists, ${secs}s\n\n${result.synthesis}`
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err)
          return `Panel consultation failed: ${message}`
        }
      }

      if (command === '/memory') {
        const { readMemory, readUser } = await import('./memory/memory.js')
        const memory = await readMemory()
        const user = await readUser()
        return `Memory:\n${memory}\n\nUser profile:\n${user}`
      }

      if (command === '/company') {
        const { loadUserConfig, setUserConfigField } = await import('./user_config.js')
        const sub = (parts[1] ?? '').toLowerCase()
        const subVal = parts.slice(2).join(' ').trim()

        if (!sub || sub === 'show') {
          const cfg = await loadUserConfig()
          return [
            'Company context:',
            `  companyId: ${cfg.companyId ?? '(not set)'}`,
            `  assetId:   ${cfg.assetId ?? '(not set)'}`,
            `  sector:    ${cfg.sector ?? '(not set)'}`,
            '',
            'Commands: /company set <id> | sector <name> | asset <id> | clear',
          ].join('\n')
        }
        if (sub === 'set') {
          if (!subVal) return 'Usage: /company set <companyId>'
          await setUserConfigField('companyId', subVal)
          return `Company ID set to "${subVal}".`
        }
        if (sub === 'sector') {
          if (!subVal) return 'Usage: /company sector <sector-name>'
          await setUserConfigField('sector', subVal)
          return `Sector set to "${subVal}".`
        }
        if (sub === 'asset') {
          if (!subVal) return 'Usage: /company asset <assetId>'
          await setUserConfigField('assetId', subVal)
          return `Asset ID set to "${subVal}".`
        }
        if (sub === 'clear') {
          await setUserConfigField('companyId', undefined)
          await setUserConfigField('assetId', undefined)
          await setUserConfigField('sector', undefined)
          return 'Company context cleared.'
        }
        return 'Usage: /company [show|set <id>|sector <name>|asset <id>|clear]'
      }

      return null // Not a slash command
    }

    ws.on('message', async (raw: Buffer | string) => {
      let parsed: IncomingMessage

      try {
        parsed = parseIncomingMessage(raw.toString())
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format.' }))
        return
      }

      // Handle init message — load or create session
      if (parsed.type === 'init') {
        const initMsg = parsed
        const agentId = initMsg.agentId || 'general'
        try {
          state.session = await getOrCreateSession(agentId, initMsg.sessionId)
        } catch {
          state.session = {
            id: `fallback_${Date.now()}`,
            name: 'Session',
            agentId,
            history: [],
            createdAt: Date.now(),
            lastActiveAt: Date.now(),
            compressed: false,
            turnCount: 0,
          }
        }
        state.initialized = true
        ws.send(JSON.stringify({
          type: 'ready',
          agentId: state.session.agentId,
          sessionId: state.session.id,
          sessionName: state.session.name,
        }))
        return
      }

      // Handle chat message
      if (parsed.type === 'chat') {
        const content = parsed.content.trim()
        const imageAttachment = parsed.attachments?.find((a) => a.kind === 'image' || a.mime.startsWith('image/'))
        const workflowContent = imageAttachment
          ? `${content}\n[image attached: ${imageAttachment.name} ${imageAttachment.mime}]`
          : content

        // Slash command handling
        if (content.startsWith('/')) {
          ws.send(JSON.stringify({ type: 'thinking' }))
          try {
            const result = await handleSlashCommand(content)
            if (result !== null) {
              sendText(result)
              return
            }
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err)
            ws.send(JSON.stringify({ type: 'error', message }))
            return
          }
        }

        ws.send(JSON.stringify({ type: 'thinking' }))

        try {
          const personaPrompt = await getPersonalityPrompt(state.session.personalityId)

          // Auto-classify: when session agent is "general", route to the best specialist
          let effectiveAgent = state.session.agentId
          if (effectiveAgent === 'general') {
            const classification = classifyIntent(content)
            if (classification.primaryAgent !== 'general' && classification.confidence > 0.5) {
              effectiveAgent = classification.primaryAgent
            }
          }

          // Route task through SeaBri OS to get sustainability-aware model selection
          const routingDecision = routeTask({ task: content, agentId: effectiveAgent, channelId: 'websocket' })
          const chatStartMs = Date.now()

          const incident = runIncidentWorkflow({
            message: workflowContent,
            history: state.session.history,
          })
          if (incident.handled && incident.response) {
            let response = incident.response
            if (imageAttachment) {
              const analysis = await analyzeIncidentImage({
                imageBase64: imageAttachment.data,
                mimeType: imageAttachment.mime,
                prompt: content,
                incidentContext: workflowContent,
              })
              response += '\n\nIMAGE CHECK:\n'
              response += analysis.status === 'analyzed'
                ? `${analysis.summary}\nVisible findings: ${analysis.visibleFindings.join('; ') || 'none returned'}\nConfidence: ${analysis.confidence}`
                : `${analysis.summary}\nRecommended photos: ${analysis.recommendedAngles.slice(0, 3).join('; ')}`
            }
            sendText(response, false)

            emitTaskTelemetry({
              taskId: routingDecision.taskId,
              agentId: effectiveAgent,
              model: 'local-incident-workflow',
              tier: 'haiku',
              inputTokens: Math.ceil(content.length / 4),
              outputTokens: Math.ceil(response.length / 4),
              latencyMs: Date.now() - chatStartMs,
            }).catch(() => {})

            state.session.history.push({ role: 'user', content: workflowContent })
            state.session.history.push({ role: 'assistant', content: response })
            state.session.turnCount++
            await updateSession(state.session)

            const actionCardText = extractActionCard(response)
            if (actionCardText && state.session.id) {
              const kind = detectActionKind(actionCardText)
              const approvalItem: PendingApprovalItem = {
                id: `${state.session.id}-${Date.now()}`,
                card: actionCardText,
                expiresAt: Date.now() + APPROVAL_TTL_MS,
                kind,
              }
              const existing = sessionApprovals.get(state.session.id) ?? []
              sessionApprovals.set(state.session.id, [...existing, approvalItem])
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  type: 'action_card',
                  id: approvalItem.id,
                  kind: approvalItem.kind,
                  card: approvalItem.card,
                }))
              }
            }

            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'done' }))
            }
            return
          }

          // Stream tokens to the client as they arrive from the API
          const response = await routeMessage(
            effectiveAgent,
            content,
            state.session.history,
            personaPrompt || undefined,
            (token: string) => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'token', content: token }))
              }
            },
            routingDecision.modelId
          )

          // Emit sustainability telemetry fire-and-forget
          emitTaskTelemetry({
            taskId: routingDecision.taskId,
            agentId: effectiveAgent,
            model: routingDecision.modelId,
            tier: routingDecision.modelTier as ModelTier,
            inputTokens: Math.ceil(content.length / 4),
            outputTokens: Math.ceil(response.length / 4),
            latencyMs: Date.now() - chatStartMs,
          }).catch(() => {})

          state.session.history.push({ role: 'user', content })
          state.session.history.push({ role: 'assistant', content: response })
          state.session.turnCount++

          await updateSession(state.session)

          // Periodically nudge user model learning
          if (ANTHROPIC_API_KEY) {
            maybeNudgeUserModel(state.session.turnCount, state.session.history, ANTHROPIC_API_KEY).catch(() => {})
          }

          // Detect action cards that need user approval
          const actionCardText = extractActionCard(response)
          if (actionCardText && state.session.id) {
            const kind = detectActionKind(actionCardText)
            const approvalItem: PendingApprovalItem = {
              id: `${state.session.id}-${Date.now()}`,
              card: actionCardText,
              expiresAt: Date.now() + APPROVAL_TTL_MS,
              kind,
            }
            const existing = sessionApprovals.get(state.session.id) ?? []
            sessionApprovals.set(state.session.id, [...existing, approvalItem])
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'action_card',
                id: approvalItem.id,
                kind: approvalItem.kind,
                card: approvalItem.card,
              }))
            }
          }

          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'done' }))
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err)
          log.error('WS chat error', { error: message })
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'error', message: 'An error occurred processing your message.' }))
          }
        }
        return
      }

      // Handle approval / denial of a pending action card
      if (parsed.type === 'approve' || parsed.type === 'deny') {
        const { id } = parsed
        const sessionId = state.session.id
        const pending = sessionApprovals.get(sessionId) ?? []
        const item = pending.find((a) => a.id === id && a.expiresAt > Date.now())
        if (!item) {
          ws.send(JSON.stringify({ type: 'approval_result', id, ok: false, message: 'Approval request not found or expired.' }))
          return
        }
        // Remove this item from pending list
        sessionApprovals.set(sessionId, pending.filter((a) => a.id !== id))

        const approved = parsed.type === 'approve'
        logConsent(sessionId, item.card, approved, sessionId).catch(() => {})

        if (!approved) {
          ws.send(JSON.stringify({ type: 'approval_result', id, ok: true, message: 'Action cancelled.' }))
          sendText('Action cancelled. Let me know if you\'d like to change anything.')
          return
        }

        try {
          const executor = getExecutor(item.kind)
          const result = await executor.execute(item.card, sessionId)
          ws.send(JSON.stringify({ type: 'approval_result', id, ok: result.ok, message: result.message ?? result.error }))
          sendText(result.ok
            ? (result.message ?? 'Action completed successfully.')
            : `Action failed: ${result.error ?? 'unknown error'}`)
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          ws.send(JSON.stringify({ type: 'approval_result', id, ok: false, message: msg }))
          sendText(`Action failed: ${msg}`)
        }
        return
      }

      ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type.' }))
    })

    ws.on('close', () => {
      // Index session for search on disconnect
      if (state.session.id && state.session.history.length > 0) {
        indexSession(
          state.session.id,
          state.session.name,
          state.session.agentId,
          state.session.history
        ).catch(() => {})
      }
    })

    ws.on('error', (err: Error) => {
      log.error('WebSocket error', { error: err.message })
    })
  })

  wss.on('error', (err: Error) => {
    log.error('WSS server error', { error: err.message })
  })

  // Graceful shutdown
  function shutdown(): void {
    log.info('shutting down')
    clearInterval(claimCleanupInterval)
    stopCanvasServer().catch(() => {})
    wss.close(() => {
      httpServer.close(() => {
        log.info('stopped')
        process.exit(0)
      })
    })
    // Force exit if close takes too long
    setTimeout(() => {
      log.warn('force exit')
      process.exit(0)
    }, 3000).unref()
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

startGateway().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  log.fatal('gateway startup failed', { error: message })
  process.exit(1)
})

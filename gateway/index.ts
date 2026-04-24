import { WebSocketServer, WebSocket } from 'ws'
import { createServer, type IncomingMessage as HttpIncomingMessage, type ServerResponse } from 'http'
import { GATEWAY_PORT, TELEGRAM_TOKEN, SEABRIDGE_API_URL, SEABRIDGE_API_KEY, ANTHROPIC_API_KEY } from './config.js'
import { initWorkspace, maybeNudgeUserModel } from './memory/memory.js'
import { routeMessage } from './agents/router.js'
import { startTelegramChannel } from './channels/telegram.js'
import { getOrCreateSession, updateSession, resetSession, type Session } from './sessions/index.js'
import { indexSession } from './memory/search.js'
import { consultPanel } from './agents/subagent.js'
import { startAllCronJobs } from './cron/index.js'
import { startEnabledPresets } from './cron/presets.js'
import { createApprovalTokenFactory } from './cron/approval.js'
import { buildSkillsContext } from './skills/loader.js'
import { listPersonalities, loadPersonality, getPersonalityPrompt, copyBuiltinToUser } from './personalities/loader.js'
import { handleAttachmentRequest } from './attachments/http.js'
import { startCanvasServer, stopCanvasServer } from './canvas/server.js'

const VERSION = '0.1.0'

interface Message {
  role: string
  content: string
}

interface InitMessage {
  type: 'init'
  agentId: string
  sessionId?: string
}

interface ChatMessage {
  type: 'chat'
  content: string
}

type IncomingMessage = InitMessage | ChatMessage

interface ConnectionState {
  session: Session
  initialized: boolean
}

async function checkSeaBridgeConnection(): Promise<boolean> {
  if (!SEABRIDGE_API_URL) return false
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    const headers: Record<string, string> = {}
    if (SEABRIDGE_API_KEY) {
      headers['Authorization'] = `Bearer ${SEABRIDGE_API_KEY}`
    }
    const response = await fetch(`${SEABRIDGE_API_URL}/health`, {
      signal: controller.signal,
      headers,
    })
    clearTimeout(timeout)
    return response.ok
  } catch {
    return false
  }
}

function printBanner(seaBridgeConnected: boolean, telegramActive: boolean): void {
  const seabridgeStatus = seaBridgeConnected
    ? '\x1b[32mConnected\x1b[0m'
    : '\x1b[90mStandalone\x1b[0m'
  const telegramStatus = telegramActive
    ? '\x1b[32mActive\x1b[0m'
    : '\x1b[90mNot configured\x1b[0m'

  console.log(`
\x1b[1m\x1b[32m🌱 OpenSeaBri Gateway v${VERSION}\x1b[0m
\x1b[32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m
WebSocket:    \x1b[36mws://localhost:${GATEWAY_PORT}\x1b[0m
SeaBridgeAI:  ${seabridgeStatus}
Telegram:     ${telegramStatus}
\x1b[32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m
Ready. Ctrl+C to stop.
`)
}

async function startGateway(): Promise<void> {
  // Initialize workspace files
  try {
    await initWorkspace()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn(`[Gateway] Workspace init warning: ${message}`)
  }

  // Check optional connections
  const seaBridgeConnected = await checkSeaBridgeConnection()

  // Start cron scheduler
  try {
    await startAllCronJobs()
  } catch {
    // Non-fatal — cron scheduler failure doesn't block gateway
  }

  // Start compliance-tagged cron presets (regulation monitoring etc.).
  // Skipped silently when OPENSEABRI_RUN_SECRET is unset — presets cannot
  // mint HMAC approval tokens without it.
  try {
    const factory = createApprovalTokenFactory()
    if (factory) {
      await startEnabledPresets(factory)
    } else {
      console.warn('[Gateway] OPENSEABRI_RUN_SECRET unset — cron presets disabled')
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn(`[Gateway] Cron presets warning: ${message}`)
  }

  // Optionally start canvas WS broadcast hub (A2UI / Live Canvas).
  // No-op when OPENSEABRI_CANVAS_WS_PORT is unset — matches the tryImport
  // fallback pattern used for telegram/discord.
  try {
    await startCanvasServer()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn(`[Gateway] Canvas start warning: ${message}`)
  }

  // Optionally start Telegram
  let telegramActive = false
  if (TELEGRAM_TOKEN) {
    try {
      await startTelegramChannel()
      telegramActive = true
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.warn(`[Gateway] Telegram start warning: ${message}`)
    }
  }

  // Shared HTTP server — serves the attachment store over /attachments/* and
  // hosts the WebSocket upgrade on the same port so the gateway keeps a single
  // loopback-bound listener.
  const httpServer = createServer(async (req: HttpIncomingMessage, res: ServerResponse) => {
    try {
      if (await handleAttachmentRequest(req, res)) return
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      res.end('Not Found')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[Gateway] HTTP handler error: ${message}`)
      if (!res.headersSent) {
        res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
      }
      if (!res.writableEnded) res.end('Internal Server Error')
    }
  })

  const wss = new WebSocketServer({ server: httpServer })

  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `\x1b[31mError: Port ${GATEWAY_PORT} is already in use.\x1b[0m\n` +
          `Another instance of the gateway may be running.\n` +
          `Set a different port with: GATEWAY_PORT=<port> seabri gateway`
      )
      process.exit(1)
    }
    console.error(`\x1b[31m[Gateway] HTTP server error: ${err.message}\x1b[0m`)
  })

  await new Promise<void>((resolve) => httpServer.listen(GATEWAY_PORT, resolve))

  printBanner(seaBridgeConnected, telegramActive)

  wss.on('connection', (ws: WebSocket) => {
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

    function sendText(text: string): void {
      if (ws.readyState !== WebSocket.OPEN) return
      for (const char of text) {
        ws.send(JSON.stringify({ type: 'token', content: char }))
      }
      ws.send(JSON.stringify({ type: 'done' }))
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

      if (command === '/usage') {
        const turns = Math.floor(state.session.history.length / 2)
        const totalChars = state.session.history.reduce((sum, m) => sum + m.content.length, 0)
        return `Session turns: ${turns}\nEstimated context characters: ${totalChars.toLocaleString()}`
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
        parsed = JSON.parse(raw.toString()) as IncomingMessage
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON message.' }))
        return
      }

      // Handle init message — load or create session
      if (parsed.type === 'init') {
        const initMsg = parsed as InitMessage
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
        const chatMsg = parsed as ChatMessage
        if (!chatMsg.content) {
          ws.send(JSON.stringify({ type: 'error', message: 'Empty message content.' }))
          return
        }

        const content = chatMsg.content.trim()

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

          // Stream tokens to the client as they arrive from the API
          const response = await routeMessage(
            state.session.agentId,
            content,
            state.session.history,
            personaPrompt || undefined,
            (token: string) => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'token', content: token }))
              }
            }
          )

          state.session.history.push({ role: 'user', content })
          state.session.history.push({ role: 'assistant', content: response })
          state.session.turnCount++

          await updateSession(state.session)

          // Periodically nudge user model learning
          if (ANTHROPIC_API_KEY) {
            maybeNudgeUserModel(state.session.turnCount, state.session.history, ANTHROPIC_API_KEY).catch(() => {})
          }

          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'done' }))
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err)
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'error', message }))
          }
        }
        return
      }

      ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${(parsed as { type?: string }).type}` }))
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
      console.error(`[Gateway] WebSocket error: ${err.message}`)
    })
  })

  wss.on('error', (err: Error) => {
    console.error(`[Gateway] Server error: ${err.message}`)
  })

  // Graceful shutdown
  function shutdown(): void {
    console.log('\n[Gateway] Shutting down...')
    stopCanvasServer().catch(() => {})
    wss.close(() => {
      httpServer.close(() => {
        console.log('[Gateway] Stopped.')
        process.exit(0)
      })
    })
    // Force exit if close takes too long
    setTimeout(() => {
      console.log('[Gateway] Force exit.')
      process.exit(0)
    }, 3000).unref()
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

startGateway().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  console.error(`\x1b[31m[Gateway] Fatal error: ${message}\x1b[0m`)
  process.exit(1)
})

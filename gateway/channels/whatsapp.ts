/**
 * WhatsApp channel.
 *
 * Two provider modes behind WHATSAPP_PROVIDER:
 *   cloud   → Meta WhatsApp Cloud API (webhook-based). Requires:
 *               WHATSAPP_CLOUD_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN
 *               Mount the HTTP server path /webhooks/whatsapp in your host.
 *   baileys → @whiskeysockets/baileys (self-hosted, QR-based). Scaffold only.
 *
 * Degrades gracefully: unset WHATSAPP_PROVIDER → disabled with no warnings.
 */

import type { IncomingMessage, ServerResponse } from 'http'
import { createHmac, timingSafeEqual } from 'crypto'
import { routeMessage } from '../agents/router.js'
import { APPROVAL_TTL_MS } from '../config.js'
import {
  isApproved,
  createPairingCode,
  verifyPairingCode,
  approveSender,
} from '../security/pairing.js'
import { getPreferredAgent, isAllowed, requiresPairing } from '../security/policy.js'
import {
  buildAdditionalContext,
  handleSlashCommand,
  isInboundPhoneAllowed,
  sanitizeForPlainText,
  type ChannelState,
} from './shared_commands.js'
import { tryImport, type BaseChannel } from './base.js'
import { Product } from '../product.js'
import { processAttachment } from '../seabri/attachments.js'
import { extractActionCard, isApproval, isDenial, logConsent, detectActionKind, requiresDoubleConfirmation, generateConfirmCode, isConfirmCode } from '../seabri/approval.js'
import { getExecutor } from '../seabri/action-executor.js'
import { geocodeCoordinates } from '../seabri/geocoder.js'
import { putBlob } from '../attachments/store.js'

const CHANNEL_ID = 'whatsapp'

interface UserState extends ChannelState {}

const USER_STATE_MAX = 10_000

// Bounded LRU map: evicts oldest entry when capacity is exceeded
function makeLruMap<V>(maxSize: number): Map<string, V> {
  const map = new Map<string, V>()
  const _set = map.set.bind(map)
  map.set = (k: string, v: V) => {
    if (map.has(k)) map.delete(k)
    else if (map.size >= maxSize) map.delete(map.keys().next().value as string)
    return _set(k, v)
  }
  return map
}

// Module-level state shared between start() and handleWhatsAppWebhook()
const userStates = makeLruMap<UserState>(USER_STATE_MAX)

async function getState(userId: string): Promise<UserState> {
  if (!userStates.has(userId)) {
    const agentId = await getPreferredAgent(userId)
    userStates.set(userId, { agentId, history: [], personalityId: null, thinkMode: false })
  }
  return userStates.get(userId)!
}

async function handleInbound(
  senderId: string,
  text: string,
  send: (reply: string) => Promise<void>,
  attachment?: { type: 'image'; mediaType: string; data: string },
  attachmentContext?: string
): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed && !attachment && !attachmentContext) return

  if (!isInboundPhoneAllowed(senderId)) return

  if (!(await isAllowed(senderId, CHANNEL_ID))) {
    await send('Access denied by policy.')
    return
  }

  const pairingNeeded = await requiresPairing(CHANNEL_ID)
  const approved = await isApproved(senderId)

  if (pairingNeeded && !approved) {
    if (trimmed.startsWith('/pair ')) {
      const code = trimmed.replace('/pair ', '').trim()
      const valid = await verifyPairingCode(senderId, code)
      if (valid) {
        await approveSender(senderId)
        await send('Paired successfully. Welcome to OpenSeaBri.')
      } else {
        await send('Invalid or expired pairing code.')
      }
      return
    }
    const code = await createPairingCode(senderId)
    await send(
      `OpenSeaBri requires pairing.\nYour code: ${code}\n` +
        `Approve: seabri pairing approve ${senderId} ${code}\n` +
        `Or reply: /pair ${code}`
    )
    return
  }

  const state = await getState(senderId)

  // --- Approval intercept ---
  if (state.pendingApproval) {
    if (Date.now() > state.pendingApproval.expiresAt) {
      state.pendingApproval = undefined
      await send('⏱ The pending action expired. Please ask again if you still want to proceed.')
    } else if (state.pendingApproval.awaitingConfirmCode) {
      if (isConfirmCode(trimmed) && trimmed === (state.pendingApproval as { confirmCode?: string }).confirmCode) {
        const { card, kind } = state.pendingApproval
        state.pendingApproval = undefined
        await logConsent(senderId, card, true)
        const result = await getExecutor(kind).execute(card, senderId)
        await send(result.ok ? `🚨 Emergency notification sent.` : `⚠️ ${result.error}`)
      } else {
        state.pendingApproval = undefined
        await send('🚫 Confirmation code did not match. Emergency action cancelled.')
      }
      state.history.push({ role: 'user', content: trimmed })
      state.history.push({ role: 'assistant', content: '🚨 Emergency flow completed.' })
      return
    } else if (isApproval(trimmed)) {
      const { card, kind } = state.pendingApproval
      if (requiresDoubleConfirmation(kind)) {
        const confirmCode = generateConfirmCode()
        state.pendingApproval = { ...state.pendingApproval, awaitingConfirmCode: true, confirmCode } as typeof state.pendingApproval & { confirmCode: string }
        await send(`⚠️ *Emergency alert confirmation required.*\n\nReply with this code to confirm: \`${confirmCode}\``)
        return
      }
      state.pendingApproval = undefined
      await logConsent(senderId, card, true)
      const result = await getExecutor(kind).execute(card, senderId)
      await send(result.ok ? `✅ ${result.message ?? 'Action completed.'}` : `⚠️ ${result.error}`)
      state.history.push({ role: 'user', content: 'YES — I approve the action.' })
      state.history.push({ role: 'assistant', content: '✅ Action confirmed and logged.' })
      return
    } else if (isDenial(trimmed)) {
      const { card } = state.pendingApproval
      state.pendingApproval = undefined
      await logConsent(senderId, card, false)
      await send('🚫 Action cancelled. What else can I help you with?')
      state.history.push({ role: 'user', content: 'NO — cancel the action.' })
      state.history.push({ role: 'assistant', content: '🚫 Action cancelled.' })
      return
    } else {
      state.pendingApproval = undefined
    }
  }

  if (trimmed.startsWith('/')) {
    const result = await handleSlashCommand(state, trimmed)
    if (result.handled) {
      if (result.reply) await send(result.reply)
      return
    }
  }

  const userText = [trimmed, attachmentContext].filter(Boolean).join('\n\n')

  try {
    const additional = await buildAdditionalContext(state)
    const response = await routeMessage(
      state.agentId,
      userText || '(attachment)',
      state.history,
      additional,
      undefined,
      undefined,
      attachment
    )
    if (state.thinkMode) state.thinkMode = false

    const actionCard = extractActionCard(response)
    if (actionCard) state.pendingApproval = { card: sanitizeForPlainText(actionCard), expiresAt: Date.now() + APPROVAL_TTL_MS, kind: detectActionKind(actionCard) }

    state.history.push({ role: 'user', content: userText || '(attachment)' })
    state.history.push({ role: 'assistant', content: response })
    if (state.history.length > 40) {
      state.history = state.history.slice(-40)
    }
    await send(sanitizeForPlainText(response))
  } catch (err: unknown) {
    await send('Something went wrong. Please try again.')
  }
}

// ── Meta Cloud API helpers ────────────────────────────────────────────────────

/** Download a WhatsApp Cloud media object by mediaId and return its Buffer + mimeType. */
async function downloadCloudMedia(
  mediaId: string,
  token: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  // Step 1: resolve the download URL
  const metaResp = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000),
  })
  if (!metaResp.ok) throw new Error(`Media metadata failed: HTTP ${metaResp.status}`)
  const meta = (await metaResp.json()) as { url?: string; mime_type?: string }
  if (!meta.url) throw new Error('No download URL in media metadata')

  // Step 2: download the file
  const fileResp = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(30_000),
  })
  if (!fileResp.ok) throw new Error(`Media download failed: HTTP ${fileResp.status}`)
  const arrayBuffer = await fileResp.arrayBuffer()
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: meta.mime_type ?? 'application/octet-stream',
  }
}

async function sendCloudMessage(
  to: string,
  body: string,
  token: string,
  phoneNumberId: string
): Promise<void> {
  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`
  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body },
      }),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[WhatsApp] send error: ${message}`)
  }
}

const MAX_WEBHOOK_BYTES = 256 * 1024 // 256 KB

function readRawBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let total = 0
    req.on('data', (chunk: Buffer) => {
      total += chunk.length
      if (total > MAX_WEBHOOK_BYTES) {
        reject(Object.assign(new Error('Payload too large'), { status: 413 }))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function verifyWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined, appSecret: string): boolean {
  if (!signatureHeader?.startsWith('sha256=')) return false
  const expected = 'sha256=' + createHmac('sha256', appSecret).update(rawBody).digest('hex')
  if (expected.length !== signatureHeader.length) return false
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader))
}

/**
 * HTTP handler for Meta Cloud API webhooks.
 * Mount before the 404 fallback in your HTTP server.
 * Returns true if the request was handled.
 */
export async function handleWhatsAppWebhook(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const rawUrl = req.url || '/'
  if (!rawUrl.startsWith('/webhooks/whatsapp')) return false

  const parsedUrl = new URL(rawUrl, 'http://localhost')
  const token = process.env.WHATSAPP_CLOUD_TOKEN || ''
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || ''
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || ''

  // GET — Meta hub verification challenge
  if (req.method === 'GET') {
    const mode = parsedUrl.searchParams.get('hub.mode')
    const challenge = parsedUrl.searchParams.get('hub.challenge')
    const verify = parsedUrl.searchParams.get('hub.verify_token')
    if (mode === 'subscribe' && verify === verifyToken && verifyToken) {
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' })
      res.end(challenge ?? '')
    } else {
      res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' })
      res.end('Forbidden')
    }
    return true
  }

  // POST — incoming message event
  if (req.method === 'POST') {
    let rawBuf: Buffer
    try {
      rawBuf = await readRawBody(req)
    } catch {
      res.writeHead(413)
      res.end('Payload Too Large')
      return true
    }

    const appSecret = process.env.WHATSAPP_APP_SECRET || ''
    if (!appSecret) {
      console.warn('[WhatsApp] WHATSAPP_APP_SECRET is not set — webhook signature validation is disabled. Set this in production.')
    } else {
      const sig = req.headers['x-hub-signature-256'] as string | undefined
      if (!verifyWebhookSignature(rawBuf, sig, appSecret)) {
        res.writeHead(403)
        res.end('Forbidden')
        return true
      }
    }

    const raw = rawBuf.toString('utf8')

    // Acknowledge immediately — Meta requires a 200 within 20 s
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok' }))

    let data: unknown
    try {
      data = JSON.parse(raw)
    } catch {
      return true
    }

    const entry = (data as { entry?: unknown[] })?.entry?.[0] as
      | { changes?: unknown[] }
      | undefined
    const value = (entry?.changes?.[0] as { value?: unknown })?.value as
      | { messages?: unknown[] }
      | undefined
    const messages = value?.messages

    if (!Array.isArray(messages)) return true

    for (const msg of messages) {
      const m = msg as {
        type?: string
        from?: string
        text?: { body?: string }
        image?: { id?: string; caption?: string; mime_type?: string }
        document?: { id?: string; filename?: string; caption?: string; mime_type?: string }
        audio?: { id?: string; mime_type?: string }
        video?: { id?: string; caption?: string; mime_type?: string }
        location?: { latitude: number; longitude: number; name?: string; address?: string }
      }

      const senderId = m.from ?? ''
      if (!senderId) continue

      const send = async (reply: string): Promise<void> => {
        await sendCloudMessage(senderId, reply, token, phoneNumberId)
      }

      if (m.type === 'text') {
        const text = m.text?.body ?? ''
        if (!text) continue
        handleInbound(senderId, text, send).catch((err: unknown) => {
          console.error(`[WhatsApp] inbound handler error: ${err instanceof Error ? err.message : String(err)}`)
        })
        continue
      }

      if (m.type === 'location' && m.location) {
        const { latitude, longitude, name, address } = m.location
        ;(async () => {
          try {
            const geocoded = await geocodeCoordinates(latitude, longitude)
            const label = name ?? geocoded.formattedAddress
            const locationCtx = `[LOCATION: ${label} | ${latitude},${longitude}]`
            const state = await getState(senderId)
            if (state.agentId === 'general') state.agentId = 'property-climate-risk'
            await handleInbound(senderId, address ?? '', send, undefined, locationCtx)
          } catch {
            const locationCtx = `[LOCATION: ${latitude},${longitude}]`
            const state = await getState(senderId)
            if (state.agentId === 'general') state.agentId = 'property-climate-risk'
            await handleInbound(senderId, '', send, undefined, locationCtx)
          }
        })().catch((err: unknown) => {
          console.error(`[WhatsApp] location handler error: ${err instanceof Error ? err.message : String(err)}`)
        })
        continue
      }

      // Media types: image, document, audio, video
      const mediaTypes = ['image', 'document', 'audio', 'video']
      if (!m.type || !mediaTypes.includes(m.type)) continue

      // Extract caption as the user's text, mediaId for download
      const captionText =
        (m.image?.caption ?? m.document?.caption ?? m.video?.caption ?? '').trim()
      const mediaId =
        m.image?.id ?? m.document?.id ?? m.audio?.id ?? m.video?.id ?? ''
      const mimeType =
        m.image?.mime_type ??
        m.document?.mime_type ??
        m.audio?.mime_type ??
        m.video?.mime_type ??
        'application/octet-stream'
      const fileName = m.document?.filename ?? `${m.type}.bin`

      if (!mediaId) continue

      // Fire-and-forget with attachment processing
      ;(async () => {
        try {
          const { buffer, mimeType: resolvedMime } = await downloadCloudMedia(mediaId, token)
          const result = await processAttachment(buffer, resolvedMime || mimeType, fileName)

          putBlob(buffer, { mimeType: resolvedMime || mimeType, filename: fileName, tags: ['whatsapp'] }).catch(() => undefined)

          let imgAttachment: { type: 'image'; mediaType: string; data: string } | undefined
          let attachmentCtx: string | undefined

          if (result.type === 'image') {
            imgAttachment = { type: 'image', mediaType: result.mediaType!, data: result.content }
          } else {
            attachmentCtx = result.content
          }

          await handleInbound(senderId, captionText, send, imgAttachment, attachmentCtx)
        } catch (err: unknown) {
          console.error(`[WhatsApp] media processing error: ${err instanceof Error ? err.message : String(err)}`)
          await handleInbound(
            senderId,
            captionText || '(attachment)',
            send,
            undefined,
            '[Attachment could not be downloaded. Please describe what you sent.]'
          )
        }
      })()
    }
    return true
  }

  return false
}

// ── Channel lifecycle ─────────────────────────────────────────────────────────

function provider(): string {
  return (process.env.WHATSAPP_PROVIDER || '').toLowerCase()
}

export const whatsappChannel: BaseChannel = {
  id: CHANNEL_ID,
  displayName: 'WhatsApp',
  product: Product.COMPANION,

  isEnabled(): boolean {
    return Boolean(provider())
  },

  async start(): Promise<void> {
    const mode = provider()
    if (!mode) {
      console.log('[WhatsApp] WHATSAPP_PROVIDER not set — WhatsApp channel not started.')
      return
    }

    if (mode !== 'baileys' && mode !== 'cloud') {
      console.warn(
        `[WhatsApp] Unknown WHATSAPP_PROVIDER='${mode}'. Expected 'baileys' or 'cloud'.`
      )
      return
    }

    if (mode === 'cloud') {
      const token = process.env.WHATSAPP_CLOUD_TOKEN
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
      const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN
      if (!token || !phoneNumberId || !verifyToken) {
        console.warn(
          '[WhatsApp] cloud mode needs WHATSAPP_CLOUD_TOKEN, WHATSAPP_PHONE_NUMBER_ID, and WHATSAPP_VERIFY_TOKEN.'
        )
        return
      }
      // Webhook handler (handleWhatsAppWebhook) is wired by the host HTTP server.
      console.log('[WhatsApp] Cloud API ready — webhook at /webhooks/whatsapp')
      return
    }

    if (mode === 'baileys') {
      const baileys = await tryImport<Record<string, unknown>>(
        '@whiskeysockets/baileys',
        CHANNEL_ID
      )
      if (!baileys) return

      type BaileysModule = {
        makeWASocket: (opts: object) => BaileysSocket
        useMultiFileAuthState: (dir: string) => Promise<{ state: unknown; saveCreds: () => Promise<void> }>
        DisconnectReason: { loggedOut: number }
        downloadMediaMessage: (msg: unknown, type: string, opts: object, extra: object) => Promise<Buffer>
      }
      type BaileysSocket = {
        ev: {
          on(event: string, handler: (...args: unknown[]) => unknown): void
          removeAllListeners(event?: string): void
        }
        sendMessage(jid: string, content: object): Promise<unknown>
        updateMediaMessage: unknown
        logout(): Promise<void>
      }

      const {
        makeWASocket,
        useMultiFileAuthState,
        DisconnectReason,
        downloadMediaMessage,
      } = baileys as unknown as BaileysModule

      const { WORKSPACE_DIR } = await import('../config.js')
      const { resolve } = await import('path')
      const { mkdir } = await import('fs/promises')

      const authDir = resolve(WORKSPACE_DIR, 'baileys-auth')
      await mkdir(authDir, { recursive: true })

      let sock: BaileysSocket
      let shouldReconnect = true

      function connect(): void {
        useMultiFileAuthState(authDir).then(({ state, saveCreds }) => {
          sock = makeWASocket({
            auth: state,
            printQRInTerminal: true,
          })

          sock.ev.on('creds.update', () => { saveCreds().catch(console.error) })

          sock.ev.on('connection.update', (...args: unknown[]) => {
            const update = args[0] as { connection?: string; lastDisconnect?: { error?: { output?: { statusCode?: number } } }; qr?: string }
            const { connection, lastDisconnect, qr } = update
            if (qr) console.log('[WhatsApp/Baileys] Scan QR code to connect.')
            if (connection === 'open') console.log('[WhatsApp/Baileys] Connected.')
            if (connection === 'close') {
              const statusCode = lastDisconnect?.error?.output?.statusCode
              const loggedOut = statusCode === DisconnectReason.loggedOut
              if (loggedOut) {
                console.warn('[WhatsApp/Baileys] Logged out. Delete auth state and restart to re-pair.')
                shouldReconnect = false
              } else if (shouldReconnect) {
                console.warn('[WhatsApp/Baileys] Connection closed, reconnecting...')
                setTimeout(connect, 5_000)
              }
            }
          })

          sock.ev.on('messages.upsert', async (...args: unknown[]) => {
            const upsert = args[0] as { messages: unknown[]; type: string }
            if (upsert.type !== 'notify') return

            for (const raw of upsert.messages) {
              const msg = raw as {
                key: { remoteJid?: string; fromMe?: boolean }
                message?: {
                  conversation?: string
                  extendedTextMessage?: { text?: string }
                  imageMessage?: { caption?: string; mimetype?: string }
                  documentMessage?: { fileName?: string; mimetype?: string; caption?: string }
                  audioMessage?: { mimetype?: string }
                  videoMessage?: { mimetype?: string; caption?: string }
                  locationMessage?: { degreesLatitude?: number; degreesLongitude?: number; name?: string; address?: string }
                }
              }

              if (msg.key.fromMe) continue
              const jid = msg.key.remoteJid
              if (!jid) continue

              const senderId = jid
              const send = async (reply: string): Promise<void> => {
                await sock.sendMessage(jid, { text: reply })
              }

              const msgContent = msg.message
              if (!msgContent) continue

              // Location
              const loc = msgContent.locationMessage
              if (loc?.degreesLatitude !== undefined && loc?.degreesLongitude !== undefined) {
                const { latitude, longitude, name, address } = {
                  latitude: loc.degreesLatitude,
                  longitude: loc.degreesLongitude,
                  name: loc.name,
                  address: loc.address,
                }
                ;(async () => {
                  try {
                    const geocoded = await geocodeCoordinates(latitude, longitude)
                    const label = name ?? geocoded.formattedAddress
                    const locationCtx = `[LOCATION: ${label} | ${latitude},${longitude}]`
                    const state = await getState(senderId)
                    if (state.agentId === 'general') state.agentId = 'property-climate-risk'
                    await handleInbound(senderId, address ?? '', send, undefined, locationCtx)
                  } catch {
                    const locationCtx = `[LOCATION: ${latitude},${longitude}]`
                    const state = await getState(senderId)
                    if (state.agentId === 'general') state.agentId = 'property-climate-risk'
                    await handleInbound(senderId, '', send, undefined, locationCtx)
                  }
                })().catch(console.error)
                continue
              }

              // Text
              const text = msgContent.conversation ?? msgContent.extendedTextMessage?.text ?? ''

              // Media attachments
              let attachment: { type: 'image'; mediaType: string; data: string } | undefined
              let attachmentContext: string | undefined

              const mediaTypes = ['imageMessage', 'documentMessage', 'audioMessage', 'videoMessage'] as const
              for (const mt of mediaTypes) {
                if (msgContent[mt]) {
                  try {
                    const buffer = await downloadMediaMessage(
                      msg,
                      'buffer',
                      {},
                      { logger: console, reuploadRequest: sock.updateMediaMessage }
                    )
                    const mimeType = (msgContent[mt] as { mimetype?: string }).mimetype ?? 'application/octet-stream'
                    const fileName = (msgContent[mt] as { fileName?: string }).fileName ?? `file.${mimeType.split('/')[1] ?? 'bin'}`
                    const processed = await processAttachment(buffer, mimeType, fileName)
                    if (processed.type === 'image') {
                      attachment = { type: 'image', mediaType: processed.mediaType ?? 'image/jpeg', data: processed.content }
                    } else {
                      attachmentContext = processed.content
                    }
                  } catch {
                    // skip unprocessable
                  }
                  break
                }
              }

              await handleInbound(senderId, text, send, attachment, attachmentContext)
            }
          })
        }).catch((err: unknown) => {
          console.error('[WhatsApp/Baileys] Auth state error:', err)
        })
      }

      connect()

      // Register stop handler
      ;(whatsappChannel as { _stopBaileys?: () => void })._stopBaileys = () => {
        shouldReconnect = false
        if (sock) sock.logout().catch(() => undefined)
      }
      return
    }
  },

  async stop(): Promise<void> {
    const self = whatsappChannel as { _stopBaileys?: () => void }
    if (self._stopBaileys) {
      self._stopBaileys()
      self._stopBaileys = undefined
    }
  },
}

export async function startWhatsappChannel(): Promise<void> {
  if (!whatsappChannel.isEnabled()) return
  await whatsappChannel.start()
}

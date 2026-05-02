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
import { routeMessage } from '../agents/router.js'
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
  type ChannelState,
} from './shared_commands.js'
import { tryImport, type BaseChannel } from './base.js'

const CHANNEL_ID = 'whatsapp'

interface UserState extends ChannelState {}

// Module-level state shared between start() and handleWhatsAppWebhook()
const userStates = new Map<string, UserState>()

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
  send: (reply: string) => Promise<void>
): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed) return

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

  if (trimmed.startsWith('/')) {
    const result = await handleSlashCommand(state, trimmed)
    if (result.handled) {
      if (result.reply) await send(result.reply)
      return
    }
  }

  try {
    const additional = await buildAdditionalContext(state)
    const response = await routeMessage(state.agentId, trimmed, state.history, additional)
    if (state.thinkMode) state.thinkMode = false
    state.history.push({ role: 'user', content: trimmed })
    state.history.push({ role: 'assistant', content: response })
    if (state.history.length > 40) {
      state.history.splice(0, state.history.length - 40)
    }
    await send(response)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    await send(`Something went wrong: ${message}`)
  }
}

// ── Meta Cloud API helpers ────────────────────────────────────────────────────

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

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
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
    let raw: string
    try {
      raw = await readBody(req)
    } catch {
      res.writeHead(400)
      res.end('Bad Request')
      return true
    }

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
      const m = msg as { type?: string; from?: string; text?: { body?: string } }
      if (m.type !== 'text') continue
      const senderId = m.from ?? ''
      const text = m.text?.body ?? ''
      if (!senderId || !text) continue

      const send = async (reply: string): Promise<void> => {
        await sendCloudMessage(senderId, reply, token, phoneNumberId)
      }

      handleInbound(senderId, text, send).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        console.error(`[WhatsApp] inbound handler error: ${message}`)
      })
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
      console.warn(
        '[WhatsApp] baileys provider detected. Full wiring pending — inbound handler available but SDK hookup is a scaffold.'
      )
      return
    }
  },
}

export async function startWhatsappChannel(): Promise<void> {
  if (!whatsappChannel.isEnabled()) return
  await whatsappChannel.start()
}

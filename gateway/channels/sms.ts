/**
 * SMS channel via Twilio.
 *
 * Inbound: Twilio sends an HTTP POST to /webhooks/sms with TwiML form fields.
 * Outbound: Twilio REST API sends a reply SMS from your number.
 *
 * Required env vars:
 *   TWILIO_ACCOUNT_SID   — Twilio Account SID (starts with AC…)
 *   TWILIO_AUTH_TOKEN    — Twilio Auth Token
 *   TWILIO_FROM_NUMBER   — Your Twilio phone number (E.164, e.g. +15551234567)
 *
 * Optional:
 *   TWILIO_WEBHOOK_SECRET — if set, validates the X-Twilio-Signature header
 *
 * Degrades gracefully: unset TWILIO_ACCOUNT_SID → disabled, no warnings.
 *
 * Attachment handling:
 *   Twilio MMS sends NumMedia + MediaUrl0..N fields. Each media URL is
 *   downloaded, passed through processAttachment(), and injected as image
 *   vision content (images) or context text (documents / audio / video).
 *   All received media is persisted to the blob store.
 */

import type { IncomingMessage, ServerResponse } from 'http'
import { createHmac, timingSafeEqual } from 'crypto'

// ── Exported flag ─────────────────────────────────────────────────────────────

export const SMS_CHANNEL_ENABLED = process.env.OPENSEABRI_SMS_ENABLED === 'true'

// ── Public types ──────────────────────────────────────────────────────────────

export interface SmsInboundMessage {
  from: string
  to: string
  body: string
  messageSid: string
  mediaUrl?: string
  mediaContentType?: string
}

export type SmsRouteStatus = 'gated' | 'routed'

export interface SmsRouteResult {
  status: SmsRouteStatus
  twiml: string
}

// ── Parse ─────────────────────────────────────────────────────────────────────

export function parseSmsInbound(body: Record<string, string>): SmsInboundMessage {
  const msg: SmsInboundMessage = {
    from: body['From'] ?? '',
    to: body['To'] ?? '',
    body: body['Body'] ?? '',
    messageSid: body['MessageSid'] ?? '',
  }
  const numMedia = parseInt(body['NumMedia'] ?? '0', 10)
  if (numMedia > 0 && body['MediaUrl0']) {
    msg.mediaUrl = body['MediaUrl0']
    if (body['MediaContentType0']) {
      msg.mediaContentType = body['MediaContentType0']
    }
  }
  return msg
}

// ── Signature verification ────────────────────────────────────────────────────

/**
 * Validate Twilio webhook X-Twilio-Signature.
 *
 * Algorithm (standard Twilio pattern):
 *   1. Start with the full URL.
 *   2. Sort POST params alphabetically by key.
 *   3. Append each key+value pair (no separator) to the URL string.
 *   4. HMAC-SHA1 the result with the auth token.
 *   5. Base64-encode and compare to the provided signature using timing-safe equals.
 */
export function verifySmsWebhookSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  if (!authToken || !signature) return false

  const sortedKeys = Object.keys(params).sort()
  let s = url
  for (const key of sortedKeys) {
    s += key + (params[key] ?? '')
  }

  const expected = createHmac('sha1', authToken).update(s, 'utf8').digest('base64')

  try {
    const expectedBuf = Buffer.from(expected, 'utf8')
    const providedBuf = Buffer.from(signature, 'utf8')
    if (expectedBuf.length !== providedBuf.length) return false
    return timingSafeEqual(expectedBuf, providedBuf)
  } catch {
    return false
  }
}

// ── Format ────────────────────────────────────────────────────────────────────

const SMS_MAX_TWIML_LENGTH = 1600

export function formatSmsTwimlResponse(text: string): string {
  const truncated = text.length > SMS_MAX_TWIML_LENGTH ? text.slice(0, SMS_MAX_TWIML_LENGTH) : text
  const escaped = truncated
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
  return `<Response><Message>${escaped}</Message></Response>`
}

// ── Route ─────────────────────────────────────────────────────────────────────

export function routeSmsMessage(
  message: SmsInboundMessage,
  options: { liveApproved: boolean }
): SmsRouteResult {
  if (!options.liveApproved) {
    return {
      status: 'gated',
      twiml: '<Response><Message>OpenSeaBri SMS pilot is not yet active. Visit the web app to get started.</Message></Response>',
    }
  }
  const responseText = `Hello from OpenSeaBri! You sent: ${message.body.slice(0, 100)}`
  return {
    status: 'routed',
    twiml: formatSmsTwimlResponse(responseText),
  }
}

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
  isInboundPhoneAllowed,
  sanitizeForPlainText,
  type ChannelState,
} from './shared_commands.js'
import { type BaseChannel } from './base.js'
import { Product } from '../product.js'
import { processAttachment } from '../seabri/attachments.js'
import { extractActionCard, isApproval, isDenial, logConsent, detectActionKind } from '../seabri/approval.js'
import { getExecutor } from '../seabri/action-executor.js'
import { APPROVAL_TTL_MS } from '../config.js'
import { putBlob } from '../attachments/store.js'

const CHANNEL_ID = 'sms'

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

// Module-level state shared between start() and handleSmsWebhook()
const userStates = makeLruMap<UserState>(USER_STATE_MAX)

async function getState(userId: string): Promise<UserState> {
  if (!userStates.has(userId)) {
    const agentId = await getPreferredAgent(userId)
    userStates.set(userId, { agentId, history: [], personalityId: null, thinkMode: false })
  }
  return userStates.get(userId)!
}

function accountSid(): string {
  return process.env.TWILIO_ACCOUNT_SID || ''
}

function authToken(): string {
  return process.env.TWILIO_AUTH_TOKEN || ''
}

function fromNumber(): string {
  return process.env.TWILIO_FROM_NUMBER || ''
}

// ── Twilio outbound ───────────────────────────────────────────────────────────

async function sendSms(to: string, body: string): Promise<void> {
  const sid = accountSid()
  const token = authToken()
  const from = fromNumber()
  if (!sid || !token || !from) return

  try {
    // @ts-ignore — twilio is an optional peer dep; import guarded by isEnabled()
    const { default: Twilio } = await import('twilio')
    const client = Twilio(sid, token)
    // Split messages > 1600 chars (SMS segment limit)
    const chunks = splitMessage(body, 1550)
    for (const chunk of chunks) {
      await client.messages.create({ to, from, body: chunk })
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[SMS] send error: ${msg}`)
  }
}

function splitMessage(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text]
  const chunks: string[] = []
  let remaining = text
  while (remaining.length > maxLen) {
    // Break at last space within limit
    let cut = remaining.lastIndexOf(' ', maxLen)
    if (cut < maxLen / 2) cut = maxLen
    chunks.push(remaining.slice(0, cut).trim())
    remaining = remaining.slice(cut).trim()
  }
  if (remaining) chunks.push(remaining)
  return chunks
}

// ── Form body parser ──────────────────────────────────────────────────────────

const MAX_BODY_BYTES = 256 * 1024 // 256 KB

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let total = 0
    req.on('data', (chunk: Buffer) => {
      total += chunk.length
      if (total > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Payload too large'), { status: 413 }))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function validateTwilioSignature(req: IncomingMessage, rawBody: string): boolean {
  const secret = process.env.TWILIO_WEBHOOK_SECRET
  if (!secret) return true // validation opt-in

  const sig = (req.headers['x-twilio-signature'] as string | undefined) ?? ''
  if (!sig) return false

  // Use a configured canonical URL to prevent host-header spoofing.
  // TWILIO_WEBHOOK_URL must be set to the full public webhook URL when
  // TWILIO_WEBHOOK_SECRET is in use (e.g. https://yourhost.example.com/webhooks/sms).
  const webhookUrl = process.env.TWILIO_WEBHOOK_URL
  if (!webhookUrl) {
    console.warn('[SMS] TWILIO_WEBHOOK_SECRET is set but TWILIO_WEBHOOK_URL is not — signature validation skipped to prevent host-header spoofing. Set TWILIO_WEBHOOK_URL to enable.')
    return true
  }
  const url = webhookUrl

  // Twilio HMAC-SHA1: sign the full URL + sorted POST params concatenated
  const params = parseForm(rawBody)
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, k) => acc + k + params[k], '')
  const expected = createHmac('sha1', secret).update(url + sortedParams).digest('base64')

  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  } catch {
    return false
  }
}

function parseForm(body: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const pair of body.split('&')) {
    const eq = pair.indexOf('=')
    if (eq === -1) continue
    const key = decodeURIComponent(pair.slice(0, eq).replace(/\+/g, ' '))
    const val = decodeURIComponent(pair.slice(eq + 1).replace(/\+/g, ' '))
    result[key] = val
  }
  return result
}

// Twilio media hostnames that are trusted for MMS downloads.
const TRUSTED_TWILIO_HOSTS = new Set([
  'api.twilio.com',
  'media.twiliocdn.com',
  'mcs.us1.twilio.com',
  'mcs.us2.twilio.com',
  'mcs.eu1.twilio.com',
])

function isTrustedMediaUrl(rawUrl: string): boolean {
  try {
    const { protocol, hostname } = new URL(rawUrl)
    if (protocol !== 'https:') return false
    if (TRUSTED_TWILIO_HOSTS.has(hostname)) return true
    // Allow subdomains of twilio.com
    if (hostname.endsWith('.twilio.com') || hostname.endsWith('.twiliocdn.com')) return true
    return false
  } catch {
    return false
  }
}

// ── MMS attachment downloader ─────────────────────────────────────────────────

async function downloadMedia(
  url: string
): Promise<{ buffer: Buffer; mimeType: string; fileName: string } | null> {
  if (!isTrustedMediaUrl(url)) {
    console.warn(`[SMS] Refusing to download media from untrusted URL: ${url}`)
    return null
  }
  const sid = accountSid()
  const token = authToken()
  try {
    const authHeader = 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64')
    const resp = await fetch(url, {
      headers: { Authorization: authHeader },
      signal: AbortSignal.timeout(30_000),
    })
    if (!resp.ok) return null
    const contentType = resp.headers.get('content-type') ?? 'application/octet-stream'
    const mimeType = contentType.split(';')[0].trim()
    const ext = mimeType.split('/')[1] ?? 'bin'
    const arrayBuffer = await resp.arrayBuffer()
    return {
      buffer: Buffer.from(arrayBuffer),
      mimeType,
      fileName: `mms-media.${ext}`,
    }
  } catch {
    return null
  }
}

// ── Core inbound handler ──────────────────────────────────────────────────────

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
      await send('The pending action expired. Please ask again if you still want to proceed.')
    } else if (isApproval(trimmed)) {
      const { card, kind } = state.pendingApproval
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
      await send('Action cancelled. What else can I help you with?')
      state.history.push({ role: 'user', content: 'NO — cancel the action.' })
      state.history.push({ role: 'assistant', content: 'Action cancelled.' })
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

// ── HTTP webhook handler ──────────────────────────────────────────────────────

/**
 * HTTP handler for Twilio SMS/MMS webhooks.
 * Mount before the 404 fallback in your HTTP server.
 * Returns true if the request was handled.
 *
 * Twilio must be configured to POST to https://your-host/webhooks/sms
 */
export async function handleSmsWebhook(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const rawUrl = req.url || '/'
  if (!rawUrl.startsWith('/webhooks/sms')) return false
  if (req.method !== 'POST') return false

  let raw: string
  try {
    raw = await readBody(req)
  } catch {
    res.writeHead(400)
    res.end('Bad Request')
    return true
  }

  if (!validateTwilioSignature(req, raw)) {
    res.writeHead(403)
    res.end('Forbidden')
    return true
  }

  // Acknowledge immediately with empty TwiML — we'll reply via REST API
  res.writeHead(200, { 'content-type': 'text/xml; charset=utf-8' })
  res.end('<?xml version="1.0" encoding="UTF-8"?><Response></Response>')

  const fields = parseForm(raw)
  const senderId: string = fields['From'] ?? ''
  const bodyText: string = fields['Body'] ?? ''
  const numMedia = parseInt(fields['NumMedia'] ?? '0', 10)

  if (!senderId) return true

  const send = async (reply: string): Promise<void> => {
    await sendSms(senderId, reply)
  }

  if (numMedia === 0) {
    handleInbound(senderId, bodyText, send).catch((err: unknown) => {
      console.error(`[SMS] inbound handler error: ${err instanceof Error ? err.message : String(err)}`)
    })
    return true
  }

  // MMS — process all media items
  ;(async () => {
    const contextParts: string[] = []
    let imgAttachment: { type: 'image'; mediaType: string; data: string } | undefined

    for (let i = 0; i < numMedia; i++) {
      const mediaUrl = fields[`MediaUrl${i}`]
      const mediaMime = fields[`MediaContentType${i}`] ?? 'application/octet-stream'
      if (!mediaUrl) continue

      try {
        const downloaded = await downloadMedia(mediaUrl)
        if (!downloaded) continue

        const { buffer, mimeType, fileName } = downloaded
        putBlob(buffer, { mimeType, filename: fileName, tags: ['sms'] }).catch(() => undefined)

        const result = await processAttachment(buffer, mimeType, fileName)

        if (result.type === 'image' && !imgAttachment) {
          imgAttachment = { type: 'image', mediaType: result.mediaType!, data: result.content }
        } else if (result.type !== 'unsupported') {
          contextParts.push(result.content)
        }
      } catch (err: unknown) {
        console.error(`[SMS] media ${i} error: ${err instanceof Error ? err.message : String(err)}`)
        contextParts.push('[An attached file could not be processed.]')
      }
    }

    const attachmentContext = contextParts.length ? contextParts.join('\n\n') : undefined
    await handleInbound(senderId, bodyText, send, imgAttachment, attachmentContext)
  })().catch((err: unknown) => {
    console.error(`[SMS] MMS pipeline error: ${err instanceof Error ? err.message : String(err)}`)
    handleInbound(senderId, bodyText, send).catch(() => undefined)
  })

  return true
}

// ── Channel lifecycle ─────────────────────────────────────────────────────────

export const smsChannel: BaseChannel = {
  id: CHANNEL_ID,
  displayName: 'SMS (Twilio)',
  product: Product.COMPANION,

  isEnabled(): boolean {
    return Boolean(accountSid() && authToken() && fromNumber())
  },

  async start(): Promise<void> {
    if (!this.isEnabled()) {
      console.log(
        '[SMS] TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER not set — SMS channel not started.'
      )
      return
    }
    const liveApproved = process.env.OPENSEABRI_SMS_LIVE_APPROVED === 'true'
    if (SMS_CHANNEL_ENABLED && !liveApproved) {
      console.log('[SMS] channel active but gated — set OPENSEABRI_SMS_LIVE_APPROVED=true to enable real routing')
    }
    console.log(`[SMS] Twilio channel ready — webhook at /webhooks/sms (from: ${fromNumber()})`)
  },
}

export async function startSmsChannel(): Promise<void> {
  if (!smsChannel.isEnabled()) return
  await smsChannel.start()
}

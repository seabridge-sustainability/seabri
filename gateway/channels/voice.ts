/**
 * Voice channel via Twilio Programmable Voice.
 *
 * Inbound: Twilio sends an HTTP POST to /webhooks/voice with call details.
 * The handler responds with TwiML that gathers speech input, sends it to
 * SeaBri for processing, then speaks back the response using <Say>.
 *
 * Required env vars:
 *   TWILIO_ACCOUNT_SID   — Twilio Account SID
 *   TWILIO_AUTH_TOKEN     — Twilio Auth Token
 *   TWILIO_VOICE_WEBHOOK_URL — Public URL for voice webhooks (e.g. https://host/webhooks/voice)
 *
 * Optional:
 *   TWILIO_VOICE_LANGUAGE — Language for speech recognition (default: en-US)
 *   TWILIO_VOICE_VOICE    — TTS voice name (default: Polly.Joanna)
 *
 * Degrades gracefully: unset TWILIO_ACCOUNT_SID → disabled.
 */

import type { IncomingMessage, ServerResponse } from 'http'
import { routeMessage } from '../agents/router.js'
import { routeTask } from '../seabri/task-router.js'
import {
  isApproved,
  createPairingCode,
  verifyPairingCode,
  approveSender,
} from '../security/pairing.js'
import { getPreferredAgent, isAllowed, requiresPairing } from '../security/policy.js'
import type { BaseChannel } from './base.js'
import { Product } from '../product.js'

const CHANNEL_ID = 'voice'

const MAX_BODY_BYTES = 256 * 1024

function accountSid(): string {
  return process.env.TWILIO_ACCOUNT_SID || ''
}

function authToken(): string {
  return process.env.TWILIO_AUTH_TOKEN || ''
}

function webhookUrl(): string {
  return process.env.TWILIO_VOICE_WEBHOOK_URL || ''
}

function voiceName(): string {
  return process.env.TWILIO_VOICE_VOICE || 'Polly.Joanna'
}

function speechLang(): string {
  return process.env.TWILIO_VOICE_LANGUAGE || 'en-US'
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function twimlResponse(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`
}

function sayAndGather(message: string, actionPath: string): string {
  const voice = voiceName()
  const lang = speechLang()
  return twimlResponse(
    `<Gather input="speech" action="${escapeXml(actionPath)}" method="POST" speechTimeout="auto" language="${lang}">` +
    `<Say voice="${voice}">${escapeXml(message)}</Say>` +
    `</Gather>` +
    `<Say voice="${voice}">I didn't hear anything. Goodbye.</Say>`
  )
}

function sayAndHangup(message: string): string {
  return twimlResponse(
    `<Say voice="${voiceName()}">${escapeXml(message)}</Say><Hangup/>`
  )
}

function sayAndRedirect(message: string, redirectUrl: string): string {
  return twimlResponse(
    `<Say voice="${voiceName()}">${escapeXml(message)}</Say>` +
    `<Redirect method="POST">${escapeXml(redirectUrl)}</Redirect>`
  )
}

// ── Form body parser ──────────────────────────────────────────────────────────

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

// Simple in-memory conversation history per caller (bounded)
const callHistory = new Map<string, Array<{ role: string; content: string }>>()
const MAX_HISTORY = 10
const MAX_CALLERS = 5000

function getHistory(callerId: string): Array<{ role: string; content: string }> {
  if (!callHistory.has(callerId)) {
    if (callHistory.size >= MAX_CALLERS) {
      const oldest = callHistory.keys().next().value as string
      callHistory.delete(oldest)
    }
    callHistory.set(callerId, [])
  }
  return callHistory.get(callerId)!
}

// ── Webhook handlers ──────────────────────────────────────────────────────────

async function handleInitialCall(fields: Record<string, string>, res: ServerResponse): Promise<void> {
  const callerId = fields['From'] ?? ''
  const baseUrl = webhookUrl().replace(/\/webhooks\/voice\/?$/, '')

  if (!(await isAllowed(callerId, CHANNEL_ID))) {
    res.writeHead(200, { 'content-type': 'text/xml; charset=utf-8' })
    res.end(sayAndHangup('Access denied. Goodbye.'))
    return
  }

  const pairingNeeded = await requiresPairing(CHANNEL_ID)
  const approved = await isApproved(callerId)

  if (pairingNeeded && !approved) {
    const code = await createPairingCode(callerId)
    res.writeHead(200, { 'content-type': 'text/xml; charset=utf-8' })
    res.end(sayAndHangup(
      `OpenSeaBri requires pairing. Your code is ${code.split('').join(' ')}. ` +
      `Please pair via the CLI before calling again.`
    ))
    return
  }

  res.writeHead(200, { 'content-type': 'text/xml; charset=utf-8' })
  res.end(sayAndGather(
    'Welcome to OpenSeaBri. How can I help you with sustainability today?',
    `${baseUrl}/webhooks/voice/respond`
  ))
}

async function handleSpeechInput(fields: Record<string, string>, res: ServerResponse): Promise<void> {
  const callerId = fields['From'] ?? ''
  const speechResult = fields['SpeechResult'] ?? ''
  const baseUrl = webhookUrl().replace(/\/webhooks\/voice\/?$/, '')

  if (!speechResult.trim()) {
    res.writeHead(200, { 'content-type': 'text/xml; charset=utf-8' })
    res.end(sayAndGather(
      'I didn\'t catch that. Could you repeat your question?',
      `${baseUrl}/webhooks/voice/respond`
    ))
    return
  }

  const history = getHistory(callerId)
  const agentId = (await getPreferredAgent(callerId)) ?? 'general'

  try {
    const routing = routeTask({ task: speechResult, agentId, channelId: CHANNEL_ID })
    const response = await routeMessage(
      routing.agentId,
      speechResult,
      history,
      undefined,
      undefined,
      routing.modelId
    )

    // Trim response for voice (max ~500 chars to keep it reasonable)
    const trimmed = response.length > 500
      ? response.slice(0, 497) + '...'
      : response

    history.push({ role: 'user', content: speechResult })
    history.push({ role: 'assistant', content: trimmed })
    if (history.length > MAX_HISTORY * 2) {
      history.splice(0, history.length - MAX_HISTORY * 2)
    }

    res.writeHead(200, { 'content-type': 'text/xml; charset=utf-8' })
    res.end(sayAndRedirect(
      trimmed + '. Is there anything else?',
      `${baseUrl}/webhooks/voice/respond`
    ))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[Voice] error: ${message}`)
    res.writeHead(200, { 'content-type': 'text/xml; charset=utf-8' })
    res.end(sayAndGather(
      'I encountered an error processing your request. Please try again.',
      `${baseUrl}/webhooks/voice/respond`
    ))
  }
}

// ── HTTP webhook handler ──────────────────────────────────────────────────────

export async function handleVoiceWebhook(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const rawUrl = req.url || '/'
  if (!rawUrl.startsWith('/webhooks/voice')) return false
  if (req.method !== 'POST') return false

  let raw: string
  try {
    raw = await readBody(req)
  } catch {
    res.writeHead(400)
    res.end('Bad Request')
    return true
  }

  const fields = parseForm(raw)

  if (rawUrl.startsWith('/webhooks/voice/respond')) {
    await handleSpeechInput(fields, res)
  } else {
    await handleInitialCall(fields, res)
  }

  return true
}

// ── Channel lifecycle ─────────────────────────────────────────────────────────

export const voiceChannel: BaseChannel = {
  id: CHANNEL_ID,
  displayName: 'Voice (Twilio)',
  product: Product.COMPANION,

  isEnabled(): boolean {
    return Boolean(accountSid() && authToken() && webhookUrl())
  },

  async start(): Promise<void> {
    if (!this.isEnabled()) {
      console.log('[Voice] TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_VOICE_WEBHOOK_URL not set — Voice channel not started.')
      return
    }
    console.log(`[Voice] Twilio Voice channel ready — webhook at /webhooks/voice`)
  },
}

export async function startVoiceChannel(): Promise<void> {
  if (!voiceChannel.isEnabled()) return
  await voiceChannel.start()
}

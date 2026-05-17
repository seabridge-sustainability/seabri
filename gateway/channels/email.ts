/**
 * Email inbound channel scaffold.
 *
 * Parses SendGrid Inbound Parse webhook payloads and routes them through
 * the pilot gate. Live routing requires OPENSEABRI_EMAIL_ENABLED=true and
 * explicit liveApproved=true at call time.
 *
 * No real SendGrid calls are made here — this is a scaffold that properly
 * gates the inbound path until the pilot is approved.
 */

import type { IncomingMessage, ServerResponse } from 'http'
import { timingSafeEqual } from 'crypto'

export const EMAIL_CHANNEL_ENABLED: boolean =
  process.env.OPENSEABRI_EMAIL_ENABLED === 'true'

const MAX_BODY_BYTES = 1_048_576 // 1 MB — prevents memory-exhaustion DoS

export const emailChannel = {
  isEnabled(): boolean {
    return EMAIL_CHANNEL_ENABLED
  },
}

export async function startEmailChannel(): Promise<void> {
  // Email inbound arrives via SendGrid Inbound Parse webhook — no persistent
  // connection to open. The HTTP server mounts /webhooks/email.
}

export async function handleEmailWebhook(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  const rawUrl = req.url || '/'
  if (!rawUrl.startsWith('/webhooks/email')) return false
  if (req.method !== 'POST') return false

  // Validate webhook secret token if configured (set via OPENSEABRI_EMAIL_WEBHOOK_SECRET;
  // configure SendGrid to include ?token=<secret> in the webhook URL).
  const webhookSecret = process.env.OPENSEABRI_EMAIL_WEBHOOK_SECRET
  if (webhookSecret) {
    const urlObj = new URL(rawUrl, 'http://localhost')
    const provided = urlObj.searchParams.get('token') ?? ''
    const a = Buffer.from(webhookSecret, 'utf-8')
    const b = Buffer.from(provided, 'utf-8')
    const valid = a.length === b.length && timingSafeEqual(a, b)
    if (!valid) {
      res.writeHead(403, { 'content-type': 'text/plain' })
      res.end('Forbidden')
      return true
    }
  }

  const chunks: Buffer[] = []
  let totalBytes = 0
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBuffer)
    totalBytes += buf.length
    if (totalBytes > MAX_BODY_BYTES) {
      res.writeHead(413, { 'content-type': 'text/plain' })
      res.end('Payload Too Large')
      return true
    }
    chunks.push(buf)
  }
  const raw = Buffer.concat(chunks).toString('utf-8')

  let payload: Record<string, unknown>
  try {
    payload = Object.fromEntries(new URLSearchParams(raw).entries())
  } catch {
    res.writeHead(400, { 'content-type': 'text/plain' })
    res.end('Bad Request')
    return true
  }

  const message = parseEmailInbound(payload)
  const liveApproved = process.env.OPENSEABRI_LIVE_PROVIDER_APPROVED === 'true'
  const result = routeEmailMessage(message, { liveApproved })

  res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify({ status: result.status, note: result.note }))
  return true
}

export interface EmailInboundMessage {
  from: string
  to: string
  subject: string
  body: string
  attachmentCount: number
}

export interface EmailRouteResult {
  status: 'gated' | 'routed'
  note?: string
  agentId?: string
}

/**
 * Parse a SendGrid Inbound Parse webhook payload into a typed EmailInboundMessage.
 * Missing or malformed fields are defaulted gracefully — no crash on bad input.
 */
export function parseEmailInbound(payload: Record<string, unknown>): EmailInboundMessage {
  const from = typeof payload.from === 'string' ? payload.from.trim() : ''
  const to = typeof payload.to === 'string' ? payload.to.trim() : ''
  const subject = typeof payload.subject === 'string' ? payload.subject.trim() : ''

  // Prefer plain-text body; fall back to html, then empty string
  const body =
    typeof payload.text === 'string'
      ? payload.text.trim()
      : typeof payload.html === 'string'
        ? payload.html.trim()
        : ''

  // SendGrid sends attachment-info as a JSON string; count attachments safely
  let attachmentCount = 0
  if (typeof payload.attachments === 'number' && Number.isFinite(payload.attachments)) {
    attachmentCount = Math.max(0, Math.floor(payload.attachments))
  } else if (typeof payload['attachment-info'] === 'string') {
    try {
      const info = JSON.parse(payload['attachment-info']) as Record<string, unknown>
      attachmentCount = Object.keys(info).length
    } catch {
      // Malformed attachment-info — default to 0
    }
  }

  return { from, to, subject, body, attachmentCount }
}

/**
 * Route a parsed email message.
 *
 * If liveApproved is false (the default for the un-launched pilot), returns
 * a gated status so no action is taken. If liveApproved is true, returns a
 * mock routed result pointing to the sustainability-companion agent.
 */
export function routeEmailMessage(
  message: EmailInboundMessage,
  options: { liveApproved: boolean },
): EmailRouteResult {
  if (!options.liveApproved) {
    return {
      status: 'gated',
      note: 'Email inbound pilot not yet active.',
    }
  }

  // Pilot routing: all inbound email → sustainability-companion (mock)
  // Future: inspect message.subject/body to choose the best agent
  void message // referenced to avoid unused-variable lint
  return {
    status: 'routed',
    agentId: 'sustainability-companion',
  }
}

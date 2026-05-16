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

export const EMAIL_CHANNEL_ENABLED: boolean =
  process.env.OPENSEABRI_EMAIL_ENABLED === 'true'

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

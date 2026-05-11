import {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_FROM_NUMBER,
  TWILIO_VOICE_TWIML_BASE_URL,
  OUTBOUND_CALLS_ENABLED,
  SEABRI_CALLS_ENABLED,
  SEABRI_CALL_TEST_MODE,
  SEABRI_CALL_TEST_ALLOWED_NUMBERS,
  SEABRI_MESSAGES_ENABLED,
  SEABRI_MESSAGE_TEST_MODE,
} from '../config.js'

export interface OutboundCallRequest {
  toNumber: string
  message: string
  userId: string
  sessionId?: string
}

export type OutboundCallResult =
  | { ok: true; callSid: string }
  | { ok: false; error: string }

/** Normalise a phone number to digits only (E.164 without leading +). */
function digitsOnly(n: string): string {
  return n.replace(/\D/g, '')
}

/**
 * Validate a call target against test-mode whitelist.
 * Returns an error string if blocked, or null if allowed.
 */
function checkCallAllowed(toNumber: string): string | null {
  const enabled = SEABRI_CALLS_ENABLED || OUTBOUND_CALLS_ENABLED
  if (!enabled) {
    return 'Outbound calls are not enabled. Set SEABRI_CALLS_ENABLED=true to enable.'
  }
  if (SEABRI_CALL_TEST_MODE) {
    const digits = digitsOnly(toNumber)
    const allowed = SEABRI_CALL_TEST_ALLOWED_NUMBERS.some(n => digits.endsWith(n) || n.endsWith(digits))
    if (!allowed) {
      return `Test mode is active — calls are restricted to whitelisted numbers only.`
    }
  }
  return null
}

function checkSmsAllowed(toNumber: string): string | null {
  if (!SEABRI_MESSAGES_ENABLED) {
    return 'Outbound SMS is not enabled. Set SEABRI_MESSAGES_ENABLED=true to enable.'
  }
  if (SEABRI_MESSAGE_TEST_MODE) {
    const digits = digitsOnly(toNumber)
    const allowed = SEABRI_CALL_TEST_ALLOWED_NUMBERS.some(n => digits.endsWith(n) || n.endsWith(digits))
    if (!allowed) {
      return `Test mode is active — SMS is restricted to whitelisted numbers only.`
    }
  }
  return null
}

// Initiates a Twilio Programmable Voice call that reads `message` aloud to the recipient.
// Requires SEABRI_CALLS_ENABLED=true (or legacy OUTBOUND_CALLS_ENABLED=true) and Twilio credentials.
export async function initiateOutboundCall(req: OutboundCallRequest): Promise<OutboundCallResult> {
  const callError = checkCallAllowed(req.toNumber)
  if (callError) return { ok: false, error: callError }
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    return { ok: false, error: 'Twilio credentials not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER).' }
  }

  // TwiML hosted at TWILIO_VOICE_TWIML_BASE_URL/twiml?message=<encoded>
  // Falls back to inline TwiML via statusCallback if base URL not set.
  const twimlUrl = buildTwimlUrl(req.message)

  const body = new URLSearchParams({
    To: req.toNumber,
    From: TWILIO_FROM_NUMBER,
    Url: twimlUrl,
  })

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
        signal: AbortSignal.timeout(15_000),
      }
    )

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText)
      return { ok: false, error: `Twilio API error ${response.status}: ${text}` }
    }

    const data = await response.json() as { sid?: string }
    if (!data.sid) return { ok: false, error: 'Twilio returned no call SID.' }
    return { ok: true, callSid: data.sid }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `Network error initiating call: ${message}` }
  }
}

function buildTwimlUrl(message: string): string {
  if (TWILIO_VOICE_TWIML_BASE_URL) {
    return `${TWILIO_VOICE_TWIML_BASE_URL}/twiml?message=${encodeURIComponent(message)}`
  }
  throw new Error(
    'TWILIO_VOICE_TWIML_BASE_URL is not set. ' +
    'Point it at your gateway /twiml endpoint (e.g. https://yourhost.example.com) ' +
    'so outbound voice calls have a hosted TwiML document to read.'
  )
}

// ── Outbound SMS ──────────────────────────────────────────────────────────────

export interface OutboundSmsRequest {
  toNumber: string
  message: string
  userId: string
  sessionId?: string
}

export type OutboundSmsResult =
  | { ok: true; messageSid: string }
  | { ok: false; error: string }

/** Send an outbound SMS via Twilio Messaging API. Requires SEABRI_MESSAGES_ENABLED=true. */
export async function initiateOutboundSms(req: OutboundSmsRequest): Promise<OutboundSmsResult> {
  const smsError = checkSmsAllowed(req.toNumber)
  if (smsError) return { ok: false, error: smsError }
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    return { ok: false, error: 'Twilio credentials not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER).' }
  }

  const body = new URLSearchParams({
    To: req.toNumber,
    From: TWILIO_FROM_NUMBER,
    Body: req.message,
  })

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
        signal: AbortSignal.timeout(15_000),
      }
    )

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText)
      return { ok: false, error: `Twilio SMS error ${response.status}: ${text}` }
    }

    const data = await response.json() as { sid?: string }
    if (!data.sid) return { ok: false, error: 'Twilio returned no message SID.' }
    return { ok: true, messageSid: data.sid }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `Network error sending SMS: ${message}` }
  }
}

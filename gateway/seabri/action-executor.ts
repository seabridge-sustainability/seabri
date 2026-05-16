import { mkdir, appendFile } from 'fs/promises'
import { resolve } from 'path'
import { randomUUID } from 'crypto'

/** Sanitize a userId for use as a filesystem path segment. Strips any chars that could cause path traversal. */
function safeUserSegment(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 64) || 'anonymous'
}
import { initiateOutboundCall, initiateOutboundSms } from './outbound.js'
import {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_FROM_NUMBER,
  EMERGENCY_ALERT_NUMBER,
  EMERGENCY_SMS_ENABLED,
  SENDGRID_API_KEY,
  SENDGRID_FROM_EMAIL,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
  WORKSPACE_DIR,
} from '../config.js'

export type ActionKind =
  | 'outbound_call'
  | 'send_sms'
  | 'send_whatsapp'
  | 'send_email'
  | 'document_damage'
  | 'schedule_appointment'
  | 'notify_emergency'
  | 'general'

export interface ExecutionResult {
  ok: boolean
  message?: string
  error?: string
  [key: string]: unknown
}

export interface ActionExecutor {
  kind: ActionKind
  execute(card: string, userId: string): Promise<ExecutionResult>
}

// Extracts the first E.164-ish phone number from a string.
function extractPhoneNumber(text: string): string | null {
  const match = text.match(/(\+?1?[\s\-.]?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4})/)
  if (!match) return null
  return match[1].replace(/[\s\-.()/]/g, '')
}

// Extracts the first email address from a string.
export function extractEmail(text: string): string | null {
  const match = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/)
  return match ? match[0] : null
}

// Parse comma-separated allowlist from an env var. Returns null when unset (no restriction).
function parseAllowlist(envVar: string): Set<string> | null {
  const raw = process.env[envVar]
  if (!raw) return null
  return new Set(raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean))
}

export const ACTION_EXECUTORS: ActionExecutor[] = [
  {
    kind: 'outbound_call',
    async execute(card, userId) {
      const toNumber = extractPhoneNumber(card)
      if (!toNumber) return { ok: false, error: 'No phone number found in action card.' }
      const allowlist = parseAllowlist('OUTBOUND_CALL_ALLOWLIST')
      if (allowlist && !allowlist.has(toNumber.replace(/\D/g, ''))) {
        return { ok: false, error: 'Phone number not in allowed list.' }
      }
      const result = await initiateOutboundCall({ toNumber, message: card, userId })
      if (result.ok) return { ok: true, message: `Call placed. SID: ${result.callSid}`, callSid: result.callSid }
      return { ok: false, error: result.error }
    },
  },
  {
    kind: 'send_sms',
    async execute(card, userId) {
      const toNumber = extractPhoneNumber(card)
      if (!toNumber) return { ok: false, error: 'No phone number found in action card.' }
      const result = await initiateOutboundSms({ toNumber, message: card, userId })
      if (result.ok) return { ok: true, message: `SMS sent. SID: ${result.messageSid}`, messageSid: result.messageSid }
      return { ok: false, error: result.error }
    },
  },
  {
    kind: 'send_whatsapp',
    async execute(card, userId) {
      const toNumber = extractPhoneNumber(card)
      if (!toNumber) return { ok: false, error: 'No phone number found in action card.' }
      // WhatsApp via Twilio uses the same Messages.json endpoint with whatsapp: prefix
      const waNumber = toNumber.startsWith('whatsapp:') ? toNumber : `whatsapp:${toNumber}`
      const fromNumber = TWILIO_FROM_NUMBER ? `whatsapp:${TWILIO_FROM_NUMBER}` : ''
      if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !fromNumber) {
        return { ok: false, error: 'Twilio credentials not configured for WhatsApp.' }
      }
      const body = new URLSearchParams({ To: waNumber, From: fromNumber, Body: card })
      try {
        const resp = await fetch(
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
        if (!resp.ok) {
          const text = await resp.text().catch(() => resp.statusText)
          return { ok: false, error: `Twilio WhatsApp error ${resp.status}: ${text}` }
        }
        const data = await resp.json() as { sid?: string }
        if (!data.sid) return { ok: false, error: 'Twilio returned no message SID.' }
        return { ok: true, message: `WhatsApp message sent. SID: ${data.sid}`, messageSid: data.sid }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        return { ok: false, error: `Network error sending WhatsApp message: ${message}` }
      }
    },
  },
  {
    kind: 'send_email',
    async execute(card, userId) {
      const to = extractEmail(card)
      if (!to) return { ok: false, error: 'No email address found in action card.' }
      const allowlist = parseAllowlist('EMAIL_RECIPIENT_ALLOWLIST')
      if (allowlist && !allowlist.has(to.toLowerCase())) {
        return { ok: false, error: 'Email recipient not in allowed list.' }
      }

      // SendGrid path
      if (SENDGRID_API_KEY) {
        const from = SENDGRID_FROM_EMAIL || 'noreply@seabridgeai.com'
        try {
          const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${SENDGRID_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              personalizations: [{ to: [{ email: to }] }],
              from: { email: from },
              subject: 'SeaBri Action Notification',
              content: [{ type: 'text/plain', value: card }],
            }),
            signal: AbortSignal.timeout(15_000),
          })
          if (resp.status === 202) return { ok: true, message: `Email sent to ${to}.` }
          const text = await resp.text().catch(() => resp.statusText)
          return { ok: false, error: `SendGrid error ${resp.status}: ${text}` }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err)
          return { ok: false, error: `Network error sending email: ${message}` }
        }
      }

      // SMTP path (nodemailer, optional dep)
      if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
        let nodemailer: { createTransport: (opts: unknown) => { sendMail: (opts: unknown) => Promise<unknown> } }
        try {
          // @ts-ignore — optional dep; handled by catch
          nodemailer = (await import('nodemailer')) as typeof nodemailer
        } catch {
          return { ok: false, error: 'nodemailer not installed. Add it or configure SENDGRID_API_KEY.' }
        }
        const transporter = nodemailer.createTransport({
          host: SMTP_HOST,
          port: SMTP_PORT,
          secure: SMTP_PORT === 465,
          requireTLS: SMTP_PORT !== 465,
          auth: { user: SMTP_USER, pass: SMTP_PASS },
        })
        try {
          await transporter.sendMail({
            from: SMTP_FROM || SMTP_USER,
            to,
            subject: 'SeaBri Action Notification',
            text: card,
          })
          return { ok: true, message: `Email sent to ${to}.` }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err)
          return { ok: false, error: `SMTP error: ${message}` }
        }
      }

      return { ok: false, error: 'Email not configured. Set SENDGRID_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASS.' }
    },
  },
  {
    kind: 'document_damage',
    async execute(card, userId) {
      const dir = resolve(WORKSPACE_DIR, 'damage-reports', safeUserSegment(userId))
      await mkdir(dir, { recursive: true })
      const record = JSON.stringify({
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        userId,
        card,
      })
      await appendFile(resolve(dir, 'damage-reports.jsonl'), record + '\n', 'utf8')
      return { ok: true, message: 'Damage report recorded.' }
    },
  },
  {
    kind: 'schedule_appointment',
    async execute(card, userId) {
      const dir = resolve(WORKSPACE_DIR, 'appointments', safeUserSegment(userId))
      await mkdir(dir, { recursive: true })
      const record = JSON.stringify({
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        userId,
        card,
      })
      await appendFile(resolve(dir, 'appointments.jsonl'), record + '\n', 'utf8')
      return { ok: true, message: 'Appointment request recorded.' }
    },
  },
  {
    kind: 'notify_emergency',
    async execute(card, userId) {
      if (!EMERGENCY_SMS_ENABLED) {
        return { ok: false, error: 'Emergency SMS disabled. Set EMERGENCY_SMS_ENABLED=true to enable.' }
      }
      if (!EMERGENCY_ALERT_NUMBER) {
        return { ok: false, error: 'EMERGENCY_ALERT_NUMBER not configured.' }
      }
      if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
        return { ok: false, error: 'Twilio credentials not configured.' }
      }

      const body = new URLSearchParams({
        To: EMERGENCY_ALERT_NUMBER,
        From: TWILIO_FROM_NUMBER,
        Body: `[SeaBri Emergency] User ${userId}:\n${card}`,
      })

      try {
        const resp = await fetch(
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
        if (!resp.ok) {
          const text = await resp.text().catch(() => resp.statusText)
          return { ok: false, error: `Twilio SMS error ${resp.status}: ${text}` }
        }
        const data = await resp.json() as { sid?: string }
        if (!data.sid) return { ok: false, error: 'Twilio returned no SMS SID.' }
        return { ok: true, message: `Emergency alert sent. SID: ${data.sid}`, smsSid: data.sid }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        return { ok: false, error: `Network error sending emergency SMS: ${message}` }
      }
    },
  },
  {
    kind: 'general',
    async execute(_card, _userId) {
      return { ok: true, message: 'Action acknowledged.' }
    },
  },
]

/** Look up an executor by kind. Falls back to the 'general' executor. */
export function getExecutor(kind: ActionKind): ActionExecutor {
  return ACTION_EXECUTORS.find((e) => e.kind === kind) ?? ACTION_EXECUTORS.find((e) => e.kind === 'general')!
}

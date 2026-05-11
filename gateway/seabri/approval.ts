import { appendFile, mkdir } from 'fs/promises'
import { randomInt } from 'crypto'
import { resolve } from 'path'
import { WORKSPACE_DIR } from '../config.js'

const CONSENT_LOG = resolve(WORKSPACE_DIR, 'consent.log')

export interface ConsentRecord {
  timestamp: string
  userId: string
  sessionId?: string
  actionCard: string
  approved: boolean
}

export interface PendingAction {
  card: string
  expiresAt: number
  kind: 'general' | 'outbound_call' | 'send_sms' | 'send_whatsapp' | 'send_email' | 'document_damage' | 'schedule_appointment' | 'notify_emergency'
  /** For notify_emergency: set to true after first YES, waiting for confirmation code. */
  awaitingConfirmCode?: boolean
}

// Serialized write queue — prevents interleaved JSONL lines under concurrent requests
let _writeChain: Promise<void> = Promise.resolve()

export async function logConsent(
  userId: string,
  actionCard: string,
  approved: boolean,
  sessionId?: string
): Promise<void> {
  const record: ConsentRecord = {
    timestamp: new Date().toISOString(),
    userId,
    sessionId,
    actionCard,
    approved,
  }
  _writeChain = _writeChain.then(async () => {
    await mkdir(WORKSPACE_DIR, { recursive: true })
    await appendFile(CONSENT_LOG, JSON.stringify(record) + '\n', 'utf-8')
  })
  return _writeChain
}

const OUTBOUND_CALL_MARKERS = ['calling', 'dial', 'phone call', 'call them', 'call your insurer', 'call the contractor', 'i will call', 'placing a call', 'via: call']
const SEND_SMS_MARKERS = ['send a text', 'send sms', 'text them', 'text your', 'texting', 'via: sms', 'via: text', 'send a message to']
const SEND_WHATSAPP_MARKERS = ['send via whatsapp', 'whatsapp message', 'via: whatsapp']
const SEND_EMAIL_MARKERS = ['send an email', 'email your', 'email the', 'emailing', 'email to', 'i will email', 'sending an email']
const DOCUMENT_DAMAGE_MARKERS = ['document the damage', 'damage report', 'create a report', 'log the damage', 'record the damage']
const SCHEDULE_APPOINTMENT_MARKERS = ['schedule an appointment', 'book an appointment', 'schedule a visit', 'book a slot', 'calendly', 'schedule inspection']
const NOTIFY_EMERGENCY_MARKERS = ['notify emergency', 'emergency services', 'call 911', 'alert emergency', 'emergency alert', 'contact 911']

/** Generates a random 6-digit confirmation code for double-confirm flows. */
export function generateConfirmCode(): string {
  return String(randomInt(100000, 1000000))
}

/** Returns true if the message is a valid 6-digit confirmation code. */
export function isConfirmCode(text: string): boolean {
  return /^\s*\d{6}\s*$/.test(text)
}

/** Returns true when this action kind requires double confirmation (YES + code). */
export function requiresDoubleConfirmation(kind: PendingAction['kind']): boolean {
  return kind === 'notify_emergency'
}

// Detects whether agent output contains an action card requiring approval.
// Action cards must contain the sentinel phrase "Confirm? Reply YES".
// Returns the full text and a kind so channels can route outbound_call approvals appropriately.
export function extractActionCard(text: string): string | null {
  const lower = text.toLowerCase()
  if (!lower.includes('confirm? reply yes')) return null
  return text
}

export function detectActionKind(card: string): PendingAction['kind'] {
  const lower = card.toLowerCase()
  if (NOTIFY_EMERGENCY_MARKERS.some(m => lower.includes(m))) return 'notify_emergency'
  if (OUTBOUND_CALL_MARKERS.some(m => lower.includes(m))) return 'outbound_call'
  if (SEND_WHATSAPP_MARKERS.some(m => lower.includes(m))) return 'send_whatsapp'
  if (SEND_SMS_MARKERS.some(m => lower.includes(m))) return 'send_sms'
  if (SEND_EMAIL_MARKERS.some(m => lower.includes(m))) return 'send_email'
  if (DOCUMENT_DAMAGE_MARKERS.some(m => lower.includes(m))) return 'document_damage'
  if (SCHEDULE_APPOINTMENT_MARKERS.some(m => lower.includes(m))) return 'schedule_appointment'
  return 'general'
}

// Returns true if the message is an affirmative approval response.
export function isApproval(text: string): boolean {
  return /^\s*yes\b/i.test(text.trim())
}

// Returns true if the message is a denial.
export function isDenial(text: string): boolean {
  return /^\s*no\b/i.test(text.trim())
}

/** Strong approval specifically for outbound call actions: "YES CALL" or plain "YES". */
export function isCallApproval(text: string): boolean {
  const t = text.trim()
  return /^\s*yes\s+call\b/i.test(t) || /^\s*yes\b/i.test(t)
}

/** Strong approval specifically for SMS/WhatsApp: "YES SEND", "YES TEXT", or plain "YES". */
export function isSmsApproval(text: string): boolean {
  const t = text.trim()
  return /^\s*yes\s+(send|text)\b/i.test(t) || /^\s*yes\b/i.test(t)
}

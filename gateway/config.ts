import { config } from 'dotenv'
import { resolve } from 'path'
import { homedir } from 'os'

const dotenvPath = resolve(process.cwd(), '.env')
config({ path: dotenvPath })
if (process.env.OPENSEABRI_DOTENV_OVERRIDE === 'true') {
  config({ path: dotenvPath, override: true })
}

export const WORKSPACE_DIR = process.env.OPENSEABRI_WORKSPACE ||
  resolve(homedir(), '.openseabri', 'workspace')

export const CONFIG_FILE = resolve(homedir(), '.openseabri', 'openseabri.json')

export const GATEWAY_PORT = parseInt(process.env.GATEWAY_PORT || '18790', 10)
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''
export const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || ''
export const WHATSAPP_PROVIDER = process.env.WHATSAPP_PROVIDER || ''
export const WHATSAPP_CLOUD_TOKEN = process.env.WHATSAPP_CLOUD_TOKEN || ''
export const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || ''
export const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || ''
export const TAVILY_API_KEY = process.env.TAVILY_API_KEY || ''
export const NASA_FIRMS_KEY = process.env.NASA_FIRMS_KEY || ''
export const AIRNOW_KEY = process.env.AIRNOW_KEY || ''
export const MODEL = process.env.OPENSEABRI_MODEL || 'claude-sonnet-4-6'

export const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || ''
export const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || ''
export const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER || ''
export const TWILIO_VOICE_TWIML_BASE_URL = process.env.TWILIO_VOICE_TWIML_BASE_URL || ''
export const OUTBOUND_CALLS_ENABLED = process.env.OUTBOUND_CALLS_ENABLED === 'true'
export const APPROVAL_TTL_MS = parseInt(process.env.OPENSEABRI_APPROVAL_TTL_MS || '300000', 10)

// Granular call/SMS controls (override OUTBOUND_CALLS_ENABLED for action-level gates)
export const SEABRI_CALLS_ENABLED = process.env.SEABRI_CALLS_ENABLED === 'true'
export const SEABRI_CALL_TEST_MODE = process.env.SEABRI_CALL_TEST_MODE === 'true'
/** Comma-separated digit-only numbers allowed in test mode. Default: the known dev test number. */
export const SEABRI_CALL_TEST_ALLOWED_NUMBERS: readonly string[] =
  (process.env.SEABRI_CALL_TEST_ALLOWED_NUMBERS || '2698300869')
    .split(',').map(n => n.trim().replace(/\D/g, '')).filter(Boolean)
export const SEABRI_MESSAGES_ENABLED = process.env.SEABRI_MESSAGES_ENABLED === 'true'
export const SEABRI_MESSAGE_TEST_MODE = process.env.SEABRI_MESSAGE_TEST_MODE === 'true'

/** Comma-separated E.164 numbers allowed to send inbound messages. Unset = no restriction. */
export const INBOUND_PHONE_ALLOWLIST: readonly string[] | null =
  process.env.OPENSEABRI_INBOUND_PHONE_ALLOWLIST
    ? process.env.OPENSEABRI_INBOUND_PHONE_ALLOWLIST.split(',').map(n => n.trim().replace(/\D/g, '')).filter(Boolean)
    : null

export const EMERGENCY_ALERT_NUMBER = process.env.EMERGENCY_ALERT_NUMBER || ''
export const EMERGENCY_SMS_ENABLED = process.env.EMERGENCY_SMS_ENABLED === 'true'

export const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || ''
export const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || ''
export const SMTP_HOST = process.env.SMTP_HOST || ''
export const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10)
export const SMTP_USER = process.env.SMTP_USER || ''
export const SMTP_PASS = process.env.SMTP_PASS || ''
export const SMTP_FROM = process.env.SMTP_FROM || ''

export const AGENTS = [
  // ── SeaBri core agents ────────────────────────────────────────────────────
  { id: 'seabri-orchestrator', name: 'SeaBri', icon: '🌊' },
  { id: 'emergency-resilience', name: 'Emergency Resilience', icon: '🚨' },
  { id: 'insurance-navigator', name: 'Insurance Navigator', icon: '📄' },
  { id: 'property-climate-risk', name: 'Property Climate Risk', icon: '🏠' },
  { id: 'damage-documentation', name: 'Damage Documentation', icon: '📸' },
  { id: 'contractor-coordination', name: 'Contractor Coordination', icon: '🔨' },
  { id: 'sustainability-companion', name: 'Sustainability Companion', icon: '⚡' },
  // ── Specialist agents ─────────────────────────────────────────────────────
  { id: 'climate-risk', name: 'Climate Risk', icon: '🌡️' },
  { id: 'nature-biodiversity', name: 'Nature & Biodiversity', icon: '🌿' },
  { id: 'sustainability-reporting', name: 'Sustainability Reporting', icon: '📋' },
  { id: 'investment-screening', name: 'Investment Risk Screening', icon: '🔍' },
  { id: 'home-community', name: 'Home & Community', icon: '🏘️' },
  { id: 'net-zero', name: 'Net Zero & Decarbonization', icon: '🎯' },
  { id: 'natural-capital', name: 'Natural Capital & Land', icon: '🌾' },
  { id: 'general', name: 'General Sustainability', icon: '🌍' },
]

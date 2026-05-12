import { config } from 'dotenv'
import { getProviderReadinessWithEvidence } from '../gateway/seabri/provider-readiness.js'
import { buildRegistrySnapshot } from '../gateway/seabri/registry-snapshot.js'

config({ path: '.env' })

const secretKeys = [
  'OPENSEABRI_API_KEY',
  'SEABRI_WS_TOKEN',
  'OPENSEABRI_CANVAS_WS_TOKEN',
  'TELEGRAM_TOKEN',
  'WHATSAPP_CLOUD_TOKEN',
  'WHATSAPP_APP_SECRET',
  'TWILIO_AUTH_TOKEN',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'DATABASE_URL',
  'SEABRI_DATABASE_URL',
]

function liveSecretValues(): string[] {
  return secretKeys
    .map((key) => process.env[key])
    .filter((value): value is string => Boolean(value && value.length >= 8))
}

const readiness = await getProviderReadinessWithEvidence()
const snapshot = await buildRegistrySnapshot()
const surface = JSON.stringify({ readiness, snapshot })

for (const value of liveSecretValues()) {
  if (surface.includes(value)) {
    console.error('[check:secrets] FAIL: a configured secret value appeared in a public readiness or registry surface')
    process.exit(1)
  }
}

console.log('[check:secrets] provider readiness and registry snapshot are secret-safe')
console.log('[check:secrets] PASS')

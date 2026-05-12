import { existsSync } from 'fs'
import { config } from 'dotenv'
import { validateChannelAllowlist } from '../gateway/channels/enablement.js'
import { validateStartupConfig } from '../gateway/startup/production-config.js'

config({ path: '.env.production' })
config({ path: '.env' })

const REQUIRED = [
  'OPENSEABRI_MODE',
  'OPENSEABRI_API_KEY',
  'SEABRI_WS_TOKEN',
  'OPENSEABRI_CANVAS_WS_TOKEN',
  'OPENSEABRI_CORS_ORIGIN',
  'OPENSEABRI_RATE_LIMIT',
  'OPENSEABRI_PERSISTENCE_ADAPTER',
]

const PLACEHOLDER = /<|>|example\.com|your-domain|set-in-secret-manager|secret-manager|managed-postgres-url|change-me|changeme/i

function value(name: string): string {
  return process.env[name] || ''
}

function isPlaceholder(name: string): boolean {
  const raw = value(name)
  return Boolean(raw && PLACEHOLDER.test(raw))
}

function present(name: string): boolean {
  return Boolean(value(name))
}

function failIfStrict(blockers: string[]): void {
  if (blockers.length === 0) return
  console.log(`[deployment:preflight] BLOCKED: ${blockers.join('; ')}`)
  if (process.env.OPENSEABRI_PREFLIGHT_REQUIRED === 'true') process.exit(1)
  console.log('[deployment:preflight] PASS with external deployment actions required')
  process.exit(0)
}

const env = { ...process.env, OPENSEABRI_MODE: value('OPENSEABRI_MODE') || 'production' }
const startup = validateStartupConfig(env)
const blockers: string[] = []

for (const name of REQUIRED) {
  if (!present(name)) blockers.push(`${name} missing`)
  else if (isPlaceholder(name)) blockers.push(`${name} still has a placeholder value`)
}

const dbUrl = value('SEABRI_DATABASE_URL') || value('DATABASE_URL')
if (!dbUrl) blockers.push('SEABRI_DATABASE_URL or DATABASE_URL missing')
else if (PLACEHOLDER.test(dbUrl)) blockers.push('database URL still has a placeholder value')
else if (!/^postgres(ql)?:\/\//i.test(dbUrl)) blockers.push('database URL must use postgres:// or postgresql://')

if ((value('OPENSEABRI_MODE') || '').toLowerCase() !== 'production') blockers.push('OPENSEABRI_MODE must be production')
if (value('OPENSEABRI_PERSISTENCE_ADAPTER') !== 'database') blockers.push('OPENSEABRI_PERSISTENCE_ADAPTER must be database')
if (value('OPENSEABRI_CORS_ORIGIN') === '*') blockers.push('OPENSEABRI_CORS_ORIGIN must not be wildcard in production')
if (!/^[1-9]\d*$/.test(value('OPENSEABRI_RATE_LIMIT'))) blockers.push('OPENSEABRI_RATE_LIMIT must be a positive integer')

const channelErrors = validateChannelAllowlist(value('OPENSEABRI_CHANNELS_ENABLED'))
blockers.push(...channelErrors)

const liveChannels = value('OPENSEABRI_CHANNELS_ENABLED')
const liveApproved = value('OPENSEABRI_LIVE_PROVIDER_APPROVED') === 'true'
if (liveChannels && !liveApproved) blockers.push('live channels are listed but OPENSEABRI_LIVE_PROVIDER_APPROVED is not true')

for (const issue of startup.errors) blockers.push(`${issue.code}: ${issue.message}`)

for (const path of [
  'db/migrations/0000_minor_luminals.sql',
  'db/migrations/0001_even_punisher.sql',
  'gateway/seabri/provider-readiness.ts',
  'gateway/seabri/provider-validation-evidence.ts',
]) {
  if (!existsSync(path)) blockers.push(`required deployment artifact missing: ${path}`)
}

console.log('[deployment:preflight] mode:', value('OPENSEABRI_MODE') || '(missing)')
console.log('[deployment:preflight] persistence adapter:', value('OPENSEABRI_PERSISTENCE_ADAPTER') || '(missing)')
console.log('[deployment:preflight] database URL:', dbUrl ? 'present' : 'missing')
console.log('[deployment:preflight] live channels:', liveChannels || '(none)')
console.log('[deployment:preflight] live provider approved:', liveApproved)
console.log('[deployment:preflight] provider readiness contract:', existsSync('gateway/seabri/provider-readiness.ts') ? 'present' : 'missing')
console.log('[deployment:preflight] migration files:', existsSync('db/migrations/0001_even_punisher.sql') ? 'present' : 'missing')

failIfStrict(blockers)
console.log('[deployment:preflight] PASS')

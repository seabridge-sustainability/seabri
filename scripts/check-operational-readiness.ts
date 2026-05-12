import { config } from 'dotenv'
import { validateStartupConfig } from '../gateway/startup/production-config.js'

config({ path: '.env.production' })
config({ path: '.env' })

const REQUIRED_ENV = [
  'OPENSEABRI_API_KEY',
  'SEABRI_WS_TOKEN',
  'OPENSEABRI_CORS_ORIGIN',
  'OPENSEABRI_RATE_LIMIT',
  'OPENSEABRI_PERSISTENCE_ADAPTER',
]

const REQUIRED_DB_ENV = ['SEABRI_DATABASE_URL', 'DATABASE_URL']

const OPTIONAL_DECISION_ENV = [
  'OPENSEABRI_HOSTING_TARGET',
  'OPENSEABRI_PUBLIC_ORIGIN',
  'OPENSEABRI_GATEWAY_ORIGIN',
]

function present(name: string): boolean {
  return Boolean(process.env[name])
}

function label(name: string): string {
  return present(name) ? 'present' : 'missing'
}

const productionEnv = {
  ...process.env,
  OPENSEABRI_MODE: 'production',
}

const startup = validateStartupConfig(productionEnv)
const missingRequired = REQUIRED_ENV.filter((name) => !present(name))
const dbConfigured = REQUIRED_DB_ENV.some((name) => present(name))
const missingDecisions = OPTIONAL_DECISION_ENV.filter((name) => !present(name))
const liveChannels = process.env.OPENSEABRI_CHANNELS_ENABLED || ''
const liveApproved = process.env.OPENSEABRI_LIVE_PROVIDER_APPROVED === 'true'

console.log('[check:operational-readiness] target=GoDaddy DNS + Docker-capable host + managed Postgres')
for (const name of OPTIONAL_DECISION_ENV) console.log(`[check:operational-readiness] ${name}: ${label(name)}`)
for (const name of REQUIRED_ENV) console.log(`[check:operational-readiness] ${name}: ${label(name)}`)
console.log(`[check:operational-readiness] database url: ${dbConfigured ? 'present' : 'missing'}`)
console.log(`[check:operational-readiness] live channels enabled: ${liveChannels || '(none)'}`)
console.log(`[check:operational-readiness] live provider approved: ${liveApproved}`)

const blockers = [
  ...missingRequired.map((name) => `${name} missing`),
  ...(dbConfigured ? [] : ['SEABRI_DATABASE_URL or DATABASE_URL missing']),
  ...startup.errors.map((issue) => `${issue.code}: ${issue.message}`),
]

if (missingDecisions.length > 0) {
  console.log(`[check:operational-readiness] external decisions pending: ${missingDecisions.join(', ')}`)
}

if (blockers.length > 0) {
  console.log(`[check:operational-readiness] BLOCKED: ${blockers.join('; ')}`)
  if (process.env.OPENSEABRI_OPERATIONAL_REQUIRED === 'true') process.exit(1)
  console.log('[check:operational-readiness] PASS with external deployment actions required')
  process.exit(0)
}

console.log('[check:operational-readiness] PASS')

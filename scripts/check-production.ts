import { validateStartupConfig } from '../gateway/startup/production-config.js'
import { config } from 'dotenv'

config({ path: '.env' })

function printResult(label: string, result: ReturnType<typeof validateStartupConfig>): void {
  console.log(`[check:production] ${label}: ${result.ok ? 'PASS' : 'FAIL'} mode=${result.mode}`)
  console.log(`[check:production] summary=${JSON.stringify(result.summary)}`)
  for (const err of result.errors) console.error(`[check:production] error ${err.code}: ${err.message}`)
  for (const warn of result.warnings) console.warn(`[check:production] warning ${warn.code}: ${warn.message}`)
}

const current = validateStartupConfig(process.env)
printResult('current environment', current)
if (current.mode === 'production' && !current.ok) process.exit(1)

const missingProd = validateStartupConfig({ NODE_ENV: 'production' })
if (missingProd.ok) {
  console.error('[check:production] FAIL: production missing-secret self-test unexpectedly passed')
  process.exit(1)
}
console.log('[check:production] production fail-closed self-test: PASS')

const safeProd = validateStartupConfig({
  NODE_ENV: 'production',
  OPENSEABRI_API_KEY: 'check-only-api-key',
  SEABRI_WS_TOKEN: 'check-only-ws-token',
  OPENSEABRI_CORS_ORIGIN: 'https://openseabri.example.com',
  OPENSEABRI_RATE_LIMIT: '120',
  OPENSEABRI_PERSISTENCE_ADAPTER: 'database',
  DATABASE_URL: 'postgres://check-only',
  OPENSEABRI_CHANNELS_ENABLED: '',
})
if (!safeProd.ok) {
  printResult('safe production baseline', safeProd)
  process.exit(1)
}
console.log('[check:production] safe production baseline self-test: PASS')

const unknownChannel = validateStartupConfig({ OPENSEABRI_CHANNELS_ENABLED: 'telegram,unknown-channel' })
if (unknownChannel.ok) {
  console.error('[check:production] FAIL: unknown-channel self-test unexpectedly passed')
  process.exit(1)
}
console.log('[check:production] unknown channel self-test: PASS')
console.log('[check:production] PASS')

import pg from 'pg'
import { config } from 'dotenv'

config({ path: '.env' })

const REQUIRED_TABLES = [
  'user_profiles',
  'telemetry_events',
  'provider_validation_evidence',
  'sessions',
  'messages',
]

const url = process.env.SEABRI_DATABASE_URL || process.env.DATABASE_URL || ''
const required = process.env.OPENSEABRI_DB_REQUIRED === 'true'
const connectCheck = process.env.OPENSEABRI_DB_CONNECT_CHECK === 'true'

function safeUrlLabel(value: string): string {
  try {
    const parsed = new URL(value)
    return `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}/${parsed.pathname.replace(/^\/+/, '') || '<database>'}`
  } catch {
    return '<configured database url>'
  }
}

function fail(message: string): never {
  console.error(`[check:db] FAIL: ${message}`)
  process.exit(1)
}

if (!url) {
  const message = 'SEABRI_DATABASE_URL or DATABASE_URL is not configured.'
  if (required) fail(message)
  console.log(`[check:db] SKIP: ${message} Set OPENSEABRI_DB_REQUIRED=true in production release checks.`)
  console.log('[check:db] PASS')
  process.exit(0)
}

if (!/^postgres(ql)?:\/\//i.test(url)) {
  fail('database URL must use postgres:// or postgresql:// and was not printed for safety.')
}

console.log(`[check:db] database URL shape: PASS (${safeUrlLabel(url)})`)

if (!connectCheck) {
  console.log('[check:db] connectivity/table verification skipped: set OPENSEABRI_DB_CONNECT_CHECK=true after selecting the managed production database.')
  console.log(`[check:db] required tables: ${REQUIRED_TABLES.join(', ')}`)
  console.log('[check:db] PASS')
  process.exit(0)
}

const pool = new pg.Pool({ connectionString: url, max: 1 })
try {
  await pool.query('select 1')
  const result = await pool.query<{ table_name: string }>(
    `
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name = any($1::text[])
    `,
    [REQUIRED_TABLES],
  )
  const found = new Set(result.rows.map((row) => row.table_name))
  const missing = REQUIRED_TABLES.filter((table) => !found.has(table))
  if (missing.length > 0) fail(`missing required tables: ${missing.join(', ')}`)
  console.log('[check:db] connectivity: PASS')
  console.log('[check:db] required tables: PASS')
  console.log('[check:db] PASS')
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  fail(`database verification failed: ${message}`)
} finally {
  await pool.end().catch(() => undefined)
}

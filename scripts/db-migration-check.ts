import { existsSync, readdirSync } from 'fs'
import pg from 'pg'
import { config } from 'dotenv'

config({ path: '.env.production' })
config({ path: '.env' })

const REQUIRED_TABLES = [
  'user_profiles',
  'telemetry_events',
  'provider_validation_evidence',
  'sessions',
  'messages',
]

const REQUIRED_MIGRATIONS = [
  'db/migrations/0000_minor_luminals.sql',
  'db/migrations/0001_even_punisher.sql',
]

function fail(message: string): never {
  console.error(`[db:migration-check] FAIL: ${message}`)
  process.exit(1)
}

for (const file of REQUIRED_MIGRATIONS) {
  if (!existsSync(file)) fail(`required migration file missing: ${file}`)
}

const migrations = readdirSync('db/migrations').filter((name) => name.endsWith('.sql')).sort()
console.log(`[db:migration-check] migration files: ${migrations.join(', ')}`)
console.log(`[db:migration-check] expected tables: ${REQUIRED_TABLES.join(', ')}`)

const url = process.env.SEABRI_DATABASE_URL || process.env.DATABASE_URL || ''
const required = process.env.OPENSEABRI_DB_REQUIRED === 'true'
const connectCheck = process.env.OPENSEABRI_DB_CONNECT_CHECK === 'true'

if (!url) {
  const message = 'SEABRI_DATABASE_URL or DATABASE_URL is not configured.'
  if (required) fail(message)
  console.log(`[db:migration-check] SKIP: ${message}`)
  console.log('[db:migration-check] PASS with external DB action required')
  process.exit(0)
}

if (!/^postgres(ql)?:\/\//i.test(url)) fail('database URL must use postgres:// or postgresql:// and was not printed for safety.')
console.log('[db:migration-check] database URL shape: PASS')

if (!connectCheck) {
  console.log('[db:migration-check] DB connectivity/table verification skipped. Set OPENSEABRI_DB_CONNECT_CHECK=true only when the intended DB is selected.')
  console.log('[db:migration-check] PASS')
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
  console.log('[db:migration-check] connectivity: PASS')
  console.log('[db:migration-check] required tables: PASS')
  console.log('[db:migration-check] PASS')
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  fail(`database verification failed: ${message}`)
} finally {
  await pool.end().catch(() => undefined)
}

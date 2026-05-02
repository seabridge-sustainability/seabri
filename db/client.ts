import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from './schema.js'

const DATABASE_URL = process.env.SEABRI_DATABASE_URL || process.env.DATABASE_URL || ''

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null
let _pool: pg.Pool | null = null

export function getDb() {
  if (_db) return _db

  if (!DATABASE_URL) {
    throw new Error(
      'No database URL configured. Set SEABRI_DATABASE_URL or DATABASE_URL to enable PostgreSQL persistence.',
    )
  }

  _pool = new pg.Pool({ connectionString: DATABASE_URL, max: 10 })
  _db = drizzle(_pool, { schema })
  return _db
}

export function isDbConfigured(): boolean {
  return !!DATABASE_URL
}

export async function closeDb(): Promise<void> {
  if (_pool) {
    await _pool.end()
    _pool = null
    _db = null
  }
}

export { schema }

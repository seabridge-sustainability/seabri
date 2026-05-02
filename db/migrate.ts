import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { getDb, closeDb } from './client.js'

async function runMigrations() {
  console.log('Running database migrations...')

  try {
    const db = getDb()
    await migrate(db, { migrationsFolder: './db/migrations' })
    console.log('Migrations completed successfully.')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await closeDb()
  }
}

runMigrations()

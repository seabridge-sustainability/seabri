/**
 * rotate-encryption-key.ts
 *
 * One-shot migration script: re-encrypts all V1 encrypted column blobs to V2.
 *
 * Prerequisites:
 *   - Set OPENSEABRI_DB_ENCRYPTION_KEY (or OPENSEABRI_DB_ENCRYPTION_KEY_V1) to the OLD key.
 *   - Set OPENSEABRI_DB_ENCRYPTION_KEY_V2 to the NEW key.
 *   - DATABASE_URL must point to the target database.
 *
 * Usage:
 *   npx tsx scripts/rotate-encryption-key.ts [--dry-run]
 *
 * The script is idempotent: rows already on V2 are skipped. Run it in a
 * maintenance window or rolling upgrade — reads decode with V1, writes encode
 * with V2, so the app can serve V1 rows at all times.
 */

import pg from 'pg'
import { config } from 'dotenv'
import { isEncrypted, blobKeyVersion, reEncrypt } from '../db/encryption.js'

config({ path: '.env' })

const DRY_RUN = process.argv.includes('--dry-run')

interface ColumnSpec {
  table: string
  idCol: string
  encCol: string
}

// Encrypted columns as of migration 0002_pgcrypto_pii_enc.sql
const ENCRYPTED_COLUMNS: ColumnSpec[] = [
  { table: 'messages', idCol: 'id', encCol: 'tool_input_enc' },
  { table: 'workflows', idCol: 'id', encCol: 'trigger_config_enc' },
]

async function rotateColumn(client: pg.Client, spec: ColumnSpec, dryRun: boolean): Promise<{ skipped: number; rotated: number; failed: number }> {
  const { table, idCol, encCol } = spec
  const result = await client.query(`SELECT ${idCol}, ${encCol} FROM ${table} WHERE ${encCol} IS NOT NULL`)

  let skipped = 0
  let rotated = 0
  let failed = 0

  for (const row of result.rows as Record<string, string>[]) {
    const id = row[idCol]
    const blob = row[encCol]

    if (!blob || !isEncrypted(blob)) {
      skipped++
      continue
    }

    const version = blobKeyVersion(blob)
    if (version === 2) {
      // Already V2 — nothing to do
      skipped++
      continue
    }

    const newBlob = reEncrypt(blob)
    if (!newBlob) {
      console.error(`[rotate] FAILED to re-encrypt ${table}.${encCol} id=${id} (decryption returned null — check V1 key)`)
      failed++
      continue
    }

    if (dryRun) {
      console.log(`[rotate] DRY-RUN: would update ${table}.${encCol} id=${id} (v${version ?? '?'} → v2)`)
      rotated++
      continue
    }

    await client.query(`UPDATE ${table} SET ${encCol} = $1 WHERE ${idCol} = $2`, [newBlob, id])
    console.log(`[rotate] updated ${table}.${encCol} id=${id} (v${version ?? '?'} → v2)`)
    rotated++
  }

  return { skipped, rotated, failed }
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('DATABASE_URL is required')
    process.exit(1)
  }

  const v1Key = process.env.OPENSEABRI_DB_ENCRYPTION_KEY_V1 || process.env.OPENSEABRI_DB_ENCRYPTION_KEY
  const v2Key = process.env.OPENSEABRI_DB_ENCRYPTION_KEY_V2
  if (!v1Key) {
    console.error('OPENSEABRI_DB_ENCRYPTION_KEY_V1 (or OPENSEABRI_DB_ENCRYPTION_KEY) is required for V1 decryption')
    process.exit(1)
  }
  if (!v2Key) {
    console.error('OPENSEABRI_DB_ENCRYPTION_KEY_V2 is required for V2 encryption')
    process.exit(1)
  }
  if (v1Key === v2Key) {
    console.warn('[rotate] WARNING: V1 and V2 keys are identical — nothing will change except the prefix')
  }

  if (DRY_RUN) {
    console.log('[rotate] DRY-RUN mode — no writes will be performed')
  }

  const client = new pg.Client({ connectionString: databaseUrl })
  await client.connect()
  console.log('[rotate] connected to database')

  let totalSkipped = 0
  let totalRotated = 0
  let totalFailed = 0

  try {
    for (const spec of ENCRYPTED_COLUMNS) {
      console.log(`[rotate] processing ${spec.table}.${spec.encCol} …`)
      const counts = await rotateColumn(client, spec, DRY_RUN)
      totalSkipped += counts.skipped
      totalRotated += counts.rotated
      totalFailed += counts.failed
      console.log(`[rotate]   skipped=${counts.skipped} rotated=${counts.rotated} failed=${counts.failed}`)
    }
  } finally {
    await client.end()
  }

  console.log(`\n[rotate] DONE — skipped=${totalSkipped} rotated=${totalRotated} failed=${totalFailed}`)
  if (totalFailed > 0) {
    console.error('[rotate] Some rows failed to rotate. Check key configuration.')
    process.exit(1)
  }
}

main().catch((err: unknown) => {
  console.error('[rotate] Fatal error:', err instanceof Error ? err.message : err)
  process.exit(1)
})

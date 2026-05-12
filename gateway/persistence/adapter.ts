import pg from 'pg'

type EnvLike = Record<string, string | undefined>

export type PersistenceAdapterKind = 'fallback' | 'database' | 'mock'

export interface ProfileStoreContract<TProfile> {
  get(userId: string, channel: string): Promise<TProfile | null>
  upsert(userId: string, channel: string, updates: Partial<TProfile>): Promise<TProfile>
  delete(userId: string, channel: string): Promise<boolean>
}

export interface SessionStoreContract<TSession> {
  save(session: TSession): Promise<void>
  load(id: string): Promise<TSession | null>
  delete(id: string): Promise<void>
  list(): Promise<TSession[]>
}

export interface ProviderValidationStoreContract<TEvidence> {
  list(provider?: string): Promise<TEvidence[]>
  append(evidence: TEvidence): Promise<void>
}

export interface PersistenceAdapterStatus {
  kind: PersistenceAdapterKind
  configured: boolean
  productionSafe: boolean
  requiresConnectionCheck: boolean
  message: string
}

function value(env: EnvLike, key: string): string {
  return env[key] || ''
}

export function resolvePersistenceAdapter(env: EnvLike = process.env): PersistenceAdapterStatus {
  const explicit = value(env, 'OPENSEABRI_PERSISTENCE_ADAPTER').toLowerCase()
  const dbUrl = value(env, 'SEABRI_DATABASE_URL') || value(env, 'DATABASE_URL')
  const mode = (value(env, 'OPENSEABRI_MODE') || value(env, 'NODE_ENV')).toLowerCase()
  const production = mode === 'production'

  if (explicit === 'mock') {
    const allowed = mode === 'test' || value(env, 'OPENSEABRI_ALLOW_MOCK_PERSISTENCE_FOR_TESTS') === 'true'
    return {
      kind: 'mock',
      configured: allowed,
      productionSafe: allowed,
      requiresConnectionCheck: false,
      message: allowed ? 'Mock persistence adapter enabled for tests only.' : 'Mock persistence adapter is not allowed outside tests.',
    }
  }

  if (explicit === 'database' || (production && dbUrl)) {
    return {
      kind: 'database',
      configured: Boolean(dbUrl),
      productionSafe: Boolean(dbUrl),
      requiresConnectionCheck: production && Boolean(dbUrl),
      message: dbUrl
        ? 'Database persistence adapter configured for profiles, telemetry, and provider validation evidence.'
        : 'Database persistence adapter selected but no database URL is configured.',
    }
  }

  return {
    kind: 'fallback',
    configured: false,
    productionSafe: false,
    requiresConnectionCheck: false,
    message: 'File/in-memory fallback persistence is available for dev and staging only.',
  }
}

export function persistenceConfigIssues(env: EnvLike = process.env): string[] {
  const status = resolvePersistenceAdapter(env)
  if (!status.productionSafe) return [status.message]
  return []
}

export async function initializePersistenceAdapterForStartup(env: EnvLike = process.env): Promise<PersistenceAdapterStatus> {
  const status = resolvePersistenceAdapter(env)
  if (!status.requiresConnectionCheck || value(env, 'OPENSEABRI_SKIP_DB_CONNECTION_CHECK') === 'true') return status

  const connectionString = value(env, 'SEABRI_DATABASE_URL') || value(env, 'DATABASE_URL')
  const pool = new pg.Pool({ connectionString, max: 1 })
  try {
    await pool.query('select 1')
    return status
  } finally {
    await pool.end().catch(() => undefined)
  }
}

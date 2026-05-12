import { mkdir, appendFile } from 'fs/promises'
import { dirname, resolve } from 'path'
import { resolvePersistenceAdapter } from '../persistence/adapter.js'
import { getDb, schema } from '../../db/client.js'

export type TelemetryEventType =
  | 'provider_readiness_checked'
  | 'registry_snapshot_generated'
  | 'agent_invoked'
  | 'skill_invoked'
  | 'model_routed'
  | 'action_prepared'
  | 'action_approved'
  | 'action_blocked'
  | 'provider_error'
  | 'sustainability_scored'

export interface TelemetryEvent {
  type: TelemetryEventType
  timestamp?: string
  data?: Record<string, unknown>
}

export interface TelemetryStore {
  append(event: TelemetryEvent): Promise<void>
}

const SENSITIVE_KEY = /(secret|token|api[_-]?key|authorization|password|credential|auth[_-]?token|webhook[_-]?secret|database_url|redis_url|dsn|phone|address|zip|postal|profile)/i

export function redactTelemetryValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactTelemetryValue)
  if (!value || typeof value !== 'object') return value

  const out: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SENSITIVE_KEY.test(key) ? '[redacted]' : redactTelemetryValue(child)
  }
  return out
}

export function sanitizeTelemetryEvent(event: TelemetryEvent): Required<TelemetryEvent> {
  return {
    type: event.type,
    timestamp: event.timestamp ?? new Date().toISOString(),
    data: redactTelemetryValue(event.data ?? {}) as Record<string, unknown>,
  }
}

export class InMemoryTelemetryStore implements TelemetryStore {
  readonly events: Required<TelemetryEvent>[] = []

  async append(event: TelemetryEvent): Promise<void> {
    this.events.push(sanitizeTelemetryEvent(event))
  }
}

export class FileTelemetryStore implements TelemetryStore {
  constructor(private readonly filePath: string) {}

  async append(event: TelemetryEvent): Promise<void> {
    const safe = sanitizeTelemetryEvent(event)
    await mkdir(dirname(this.filePath), { recursive: true })
    await appendFile(this.filePath, JSON.stringify(safe) + '\n', 'utf8')
  }
}

export class DatabaseTelemetryStore implements TelemetryStore {
  async append(event: TelemetryEvent): Promise<void> {
    const safe = sanitizeTelemetryEvent(event)
    await getDb().insert(schema.telemetryEvents).values({
      type: safe.type,
      timestamp: new Date(safe.timestamp),
      data: safe.data,
    })
  }
}

const memoryStore = new InMemoryTelemetryStore()
let activeStore: TelemetryStore | null = null

export function defaultTelemetryPath(): string {
  return resolve(process.cwd(), 'data', 'openseabri', 'telemetry', 'events.jsonl')
}

export function getTelemetryStore(): TelemetryStore {
  if (activeStore) return activeStore
  if (process.env.OPENSEABRI_TELEMETRY_STORE === 'database' || resolvePersistenceAdapter().kind === 'database') {
    activeStore = new DatabaseTelemetryStore()
  } else if (process.env.OPENSEABRI_TELEMETRY_STORE === 'file') {
    activeStore = new FileTelemetryStore(process.env.OPENSEABRI_TELEMETRY_PATH || defaultTelemetryPath())
  } else {
    activeStore = memoryStore
  }
  return activeStore
}

export function setTelemetryStoreForTesting(store: TelemetryStore | null): void {
  activeStore = store
}

export async function recordTelemetryEvent(event: TelemetryEvent): Promise<void> {
  try {
    await getTelemetryStore().append(event)
  } catch {
    // Telemetry must never break user-facing runtime paths.
  }
}

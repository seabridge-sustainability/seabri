import { createHash, randomUUID } from 'crypto'
import { resolvePersistenceAdapter } from '../persistence/adapter.js'
import { DatabaseProviderValidationStore } from '../persistence/database-stores.js'
import type { ProviderId } from './provider-readiness.js'

export type ProviderValidationMode = 'dry_run' | 'test_mode' | 'live_approved'
export type ProviderValidationEvidenceResult = 'pass' | 'fail' | 'skipped' | 'blocked'

export interface ProviderValidationEvidence {
  provider: ProviderId
  mode: ProviderValidationMode
  validationId: string
  validatedAt: string
  validatedBy: string
  targetLabel?: string
  result: ProviderValidationEvidenceResult
  evidenceSummary: string
  providerReferenceId?: string
  notes?: string
  expiresAt?: string
  secretsRedacted: true
}

export interface ProviderValidationEvidenceInput {
  provider: ProviderId
  mode: ProviderValidationMode
  validationId?: string
  validatedAt?: string
  validatedBy: string
  targetLabel?: string
  result: ProviderValidationEvidenceResult
  evidenceSummary: string
  providerReferenceId?: string
  notes?: string
  expiresAt?: string
}

const memoryEvidence: ProviderValidationEvidence[] = []
let dbStore: DatabaseProviderValidationStore | null = null

function store(): DatabaseProviderValidationStore | null {
  if (resolvePersistenceAdapter().kind !== 'database') return null
  dbStore ??= new DatabaseProviderValidationStore()
  return dbStore
}

function redactReference(value: string | undefined): string | undefined {
  if (!value) return undefined
  const hash = createHash('sha256').update(value).digest('hex').slice(0, 12)
  return `ref_${hash}`
}

export function sanitizeProviderValidationEvidence(input: ProviderValidationEvidenceInput): ProviderValidationEvidence {
  return {
    provider: input.provider,
    mode: input.mode,
    validationId: input.validationId || randomUUID(),
    validatedAt: input.validatedAt || new Date().toISOString(),
    validatedBy: input.validatedBy,
    targetLabel: input.targetLabel,
    result: input.result,
    evidenceSummary: input.evidenceSummary,
    providerReferenceId: redactReference(input.providerReferenceId),
    notes: input.notes,
    expiresAt: input.expiresAt,
    secretsRedacted: true,
  }
}

export async function recordProviderValidationEvidence(input: ProviderValidationEvidenceInput): Promise<ProviderValidationEvidence> {
  const evidence = sanitizeProviderValidationEvidence(input)
  const db = store()
  if (db) await db.append(evidence)
  else {
    const index = memoryEvidence.findIndex((item) => item.validationId === evidence.validationId)
    if (index >= 0) memoryEvidence[index] = evidence
    else memoryEvidence.unshift(evidence)
  }
  return evidence
}

export async function listProviderValidationEvidence(provider?: ProviderId): Promise<ProviderValidationEvidence[]> {
  const db = store()
  if (db) return db.list(provider)
  return memoryEvidence.filter((item) => !provider || item.provider === provider)
}

export async function latestProviderValidationEvidence(provider: ProviderId): Promise<ProviderValidationEvidence | null> {
  const [latest] = await listProviderValidationEvidence(provider)
  return latest ?? null
}

export function isEvidenceExpired(evidence: ProviderValidationEvidence | null, now = new Date()): boolean {
  if (!evidence?.expiresAt) return false
  return new Date(evidence.expiresAt).getTime() <= now.getTime()
}

export function resetProviderValidationEvidenceForTesting(): void {
  memoryEvidence.splice(0, memoryEvidence.length)
  dbStore = null
}

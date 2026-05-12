import { eq, desc } from 'drizzle-orm'
import { getDb, schema } from '../../db/client.js'
import type { UserProfile } from '../seabri/user-profile.js'
import type { ProviderValidationEvidence } from '../seabri/provider-validation-evidence.js'

function profileKey(userId: string, channel: string): string {
  return `${channel}:${userId}`
}

export interface ProfileStore {
  get(userId: string, channel: string): Promise<UserProfile | null>
  upsert(userId: string, channel: string, updates: Partial<Omit<UserProfile, 'userId' | 'channel' | 'createdAt'>>): Promise<UserProfile>
  delete(userId: string, channel: string): Promise<boolean>
}

export class DatabaseProfileStore implements ProfileStore {
  async get(userId: string, channel: string): Promise<UserProfile | null> {
    const rows = await getDb().select().from(schema.userProfiles).where(eq(schema.userProfiles.id, profileKey(userId, channel))).limit(1)
    return (rows[0]?.profile as UserProfile | undefined) ?? null
  }

  async upsert(userId: string, channel: string, updates: Partial<Omit<UserProfile, 'userId' | 'channel' | 'createdAt'>>): Promise<UserProfile> {
    const existing = await this.get(userId, channel)
    const now = new Date().toISOString()
    const profile: UserProfile = existing
      ? { ...existing, ...updates, updatedAt: now }
      : { userId, channel, ...updates, createdAt: now, updatedAt: now }
    await getDb().insert(schema.userProfiles).values({
      id: profileKey(userId, channel),
      userId,
      channel,
      profile,
      updatedAt: new Date(now),
    }).onConflictDoUpdate({
      target: schema.userProfiles.id,
      set: { profile, updatedAt: new Date(now) },
    })
    return profile
  }

  async delete(userId: string, channel: string): Promise<boolean> {
    const existing = await this.get(userId, channel)
    if (!existing) return false
    await getDb().delete(schema.userProfiles).where(eq(schema.userProfiles.id, profileKey(userId, channel)))
    return true
  }
}

export class DatabaseProviderValidationStore {
  async list(provider?: string): Promise<ProviderValidationEvidence[]> {
    const base = getDb().select().from(schema.providerValidationEvidence)
    const rows = provider
      ? await base.where(eq(schema.providerValidationEvidence.provider, provider)).orderBy(desc(schema.providerValidationEvidence.validatedAt))
      : await base.orderBy(desc(schema.providerValidationEvidence.validatedAt))
    return rows.map((row) => ({
      provider: row.provider as ProviderValidationEvidence['provider'],
      mode: row.mode as ProviderValidationEvidence['mode'],
      validationId: row.validationId,
      validatedAt: row.validatedAt.toISOString(),
      validatedBy: row.validatedBy,
      targetLabel: row.targetLabel ?? undefined,
      result: row.result as ProviderValidationEvidence['result'],
      evidenceSummary: row.evidenceSummary,
      providerReferenceId: row.providerReferenceId ?? undefined,
      notes: row.notes ?? undefined,
      expiresAt: row.expiresAt?.toISOString(),
      secretsRedacted: true,
    }))
  }

  async append(evidence: ProviderValidationEvidence): Promise<void> {
    await getDb().insert(schema.providerValidationEvidence).values({
      validationId: evidence.validationId,
      provider: evidence.provider,
      mode: evidence.mode,
      validatedAt: new Date(evidence.validatedAt),
      validatedBy: evidence.validatedBy,
      targetLabel: evidence.targetLabel,
      result: evidence.result,
      evidenceSummary: evidence.evidenceSummary,
      providerReferenceId: evidence.providerReferenceId,
      notes: evidence.notes,
      expiresAt: evidence.expiresAt ? new Date(evidence.expiresAt) : undefined,
      secretsRedacted: true,
    }).onConflictDoUpdate({
      target: schema.providerValidationEvidence.validationId,
      set: {
        result: evidence.result,
        evidenceSummary: evidence.evidenceSummary,
        notes: evidence.notes,
        expiresAt: evidence.expiresAt ? new Date(evidence.expiresAt) : undefined,
        secretsRedacted: true,
      },
    })
  }
}

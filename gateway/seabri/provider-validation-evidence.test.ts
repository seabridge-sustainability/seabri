import { describe, it, expect, beforeEach } from 'vitest'
import {
  isEvidenceExpired,
  listProviderValidationEvidence,
  recordProviderValidationEvidence,
  resetProviderValidationEvidenceForTesting,
} from './provider-validation-evidence.js'
import { getProviderReadinessWithEvidence } from './provider-readiness.js'

beforeEach(() => {
  resetProviderValidationEvidenceForTesting()
})

describe('provider validation evidence', () => {
  it('stores sanitized evidence without secret provider references', async () => {
    const evidence = await recordProviderValidationEvidence({
      provider: 'telegram',
      mode: 'dry_run',
      validatedBy: 'ops',
      targetLabel: 'approved staging chat',
      result: 'pass',
      evidenceSummary: 'Webhook shape and token presence checked; no message sent.',
      providerReferenceId: 'telegram-secret-message-id-12345',
    })

    expect(evidence.secretsRedacted).toBe(true)
    expect(evidence.providerReferenceId).toMatch(/^ref_[a-f0-9]{12}$/)
    expect(JSON.stringify(evidence)).not.toContain('telegram-secret-message-id-12345')
  })

  it('reports expiry and integrates latest evidence into provider readiness', async () => {
    await recordProviderValidationEvidence({
      provider: 'twilio_sms',
      mode: 'test_mode',
      validatedAt: '2026-01-01T00:00:00.000Z',
      validatedBy: 'ops',
      result: 'blocked',
      evidenceSummary: 'Blocked non-allowlisted target before provider contact.',
      expiresAt: '2026-01-02T00:00:00.000Z',
    })

    const [evidence] = await listProviderValidationEvidence('twilio_sms')
    expect(isEvidenceExpired(evidence, new Date('2026-01-03T00:00:00.000Z'))).toBe(true)

    const statuses = await getProviderReadinessWithEvidence()
    const sms = statuses.find((item) => item.provider === 'twilio_sms')
    expect(sms?.lastEvidenceStatus).toBe('blocked')
    expect(sms?.evidenceExpired).toBe(true)
    expect(sms?.requiredValidation).toContain('Refresh')
  })
})

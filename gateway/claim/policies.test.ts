import { describe, expect, it } from 'vitest'
import {
  evaluatePolicies,
  isPacketComplete,
  deriveStatus,
  detectCrisisLanguage,
  detectCATEvent,
} from './policies.js'
import { makeEmptyPacket, type SIUFlag } from './schemas.js'

function basePacket() {
  return makeEmptyPacket('00000000-0000-0000-0000-000000000001')
}

// ── evaluatePolicies ──────────────────────────────────────────────────────────

describe('evaluatePolicies', () => {
  it('returns standard routing for a clean packet', () => {
    const result = evaluatePolicies(basePacket())
    expect(result.routing).toBe('standard')
    expect(result.warnings).toHaveLength(0)
    expect(result.requiresSeniorReview).toBe(false)
  })

  it('escalates to siu when 2+ SIU flags present', () => {
    const packet = { ...basePacket(), siuFlags: ['DELAYED_REPORT', 'PRIOR_CLAIM_PATTERN'] as SIUFlag[]}
    const result = evaluatePolicies(packet)
    expect(result.routing).toBe('siu')
    expect(result.warnings[0]).toMatch(/SIU escalation/)
  })

  it('remains siu (not overridden) when both siu flags and high value', () => {
    const packet = {
      ...basePacket(),
      siuFlags: ['DELAYED_REPORT', 'PRIOR_CLAIM_PATTERN'] as SIUFlag[],
      estimatedValue: 300_000,
    }
    const result = evaluatePolicies(packet)
    expect(result.routing).toBe('siu')
    expect(result.requiresSeniorReview).toBe(true)
  })

  it('escalates to senior_review for high-value claims above 250k', () => {
    const packet = { ...basePacket(), estimatedValue: 300_000 }
    const result = evaluatePolicies(packet)
    expect(result.routing).toBe('senior_review')
    expect(result.requiresSeniorReview).toBe(true)
    expect(result.warnings.some((w) => w.includes('High-value'))).toBe(true)
  })

  it('does not trigger senior_review at or below 250k', () => {
    const packet = { ...basePacket(), estimatedValue: 250_000 }
    const result = evaluatePolicies(packet)
    expect(result.requiresSeniorReview).toBe(false)
  })

  it('adds injury warning when injuriesReported is true', () => {
    const packet = { ...basePacket(), injuriesReported: true }
    const result = evaluatePolicies(packet)
    expect(result.warnings.some((w) => w.includes('medical protocol'))).toBe(true)
  })

  it('single SIU flag does not trigger siu routing', () => {
    const packet = { ...basePacket(), siuFlags: ['DELAYED_REPORT'] as SIUFlag[]}
    const result = evaluatePolicies(packet)
    expect(result.routing).toBe('standard')
  })
})

// ── isPacketComplete ──────────────────────────────────────────────────────────

describe('isPacketComplete', () => {
  it('returns false for an empty packet', () => {
    expect(isPacketComplete(basePacket())).toBe(false)
  })

  it('returns true when all required fields are set and description is ≥30 chars', () => {
    const packet = {
      ...basePacket(),
      claimType: 'HOME_WATER' as const,
      claimantName: 'Jane Doe',
      policyNumber: 'HO-2024-88821',
      dateOfLoss: '2024-01-15',
      locationOfLoss: '123 Main St, Springfield',
      lossDescription: 'Water damage from a burst pipe in the basement caused significant flooding.',
    }
    expect(isPacketComplete(packet)).toBe(true)
  })

  it('returns false when description is too short', () => {
    const packet = {
      ...basePacket(),
      claimType: 'HOME_WATER' as const,
      claimantName: 'Jane Doe',
      policyNumber: 'HO-2024-88821',
      dateOfLoss: '2024-01-15',
      locationOfLoss: '123 Main St',
      lossDescription: 'Short.',
    }
    expect(isPacketComplete(packet)).toBe(false)
  })

  it('returns false when a required field is missing', () => {
    const packet = {
      ...basePacket(),
      claimType: 'HOME_WATER' as const,
      claimantName: 'Jane Doe',
      policyNumber: 'HO-2024-88821',
      dateOfLoss: '2024-01-15',
      locationOfLoss: null,
      lossDescription: 'Water damage from a burst pipe in the basement caused significant flooding.',
    }
    expect(isPacketComplete(packet)).toBe(false)
  })
})

// ── deriveStatus ──────────────────────────────────────────────────────────────

describe('deriveStatus', () => {
  it('returns siu_referral for siu routing', () => {
    expect(deriveStatus(basePacket(), 'siu')).toBe('siu_referral')
  })

  it('returns senior_review for senior_review routing', () => {
    expect(deriveStatus(basePacket(), 'senior_review')).toBe('senior_review')
  })

  it('returns cat_queue for catastrophe routing', () => {
    expect(deriveStatus(basePacket(), 'catastrophe')).toBe('cat_queue')
  })

  it('returns pending_documents when packet is complete and routing is standard', () => {
    const packet = {
      ...basePacket(),
      claimType: 'AUTO_COLLISION' as const,
      claimantName: 'John Smith',
      policyNumber: 'AU-2024-12345',
      dateOfLoss: '2024-02-10',
      locationOfLoss: 'I-95 Northbound, Exit 42',
      lossDescription: 'Rear-ended at a traffic stop; significant damage to bumper and trunk area.',
    }
    expect(deriveStatus(packet, 'standard')).toBe('pending_documents')
  })

  it('returns intake when packet is incomplete and routing is standard', () => {
    expect(deriveStatus(basePacket(), 'standard')).toBe('intake')
  })
})

// ── detectCrisisLanguage ──────────────────────────────────────────────────────

describe('detectCrisisLanguage', () => {
  it('detects explicit crisis terms', () => {
    expect(detectCrisisLanguage('I want to suicide')).toBe(true)
    expect(detectCrisisLanguage("I can't go on anymore")).toBe(true)
    expect(detectCrisisLanguage('I want to end my life')).toBe(true)
    expect(detectCrisisLanguage('I want to kill myself')).toBe(true)
    expect(detectCrisisLanguage('I hurt myself in the accident')).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(detectCrisisLanguage('SUICIDE')).toBe(true)
    expect(detectCrisisLanguage('Want To Die')).toBe(true)
  })

  it('returns false for normal claim language', () => {
    expect(detectCrisisLanguage('My car was totaled in a collision')).toBe(false)
    expect(detectCrisisLanguage('The pipe burst and flooded the basement')).toBe(false)
  })
})

// ── detectCATEvent ────────────────────────────────────────────────────────────

describe('detectCATEvent', () => {
  it('detects CAT keywords', () => {
    expect(detectCATEvent('My house was damaged by a hurricane')).toBe(true)
    expect(detectCATEvent('The tornado destroyed the roof')).toBe(true)
    expect(detectCATEvent('We evacuated due to the wildfire')).toBe(true)
    expect(detectCATEvent('FEMA declared this a federal disaster')).toBe(true)
    expect(detectCATEvent('The governor declared a state of emergency')).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(detectCATEvent('HURRICANE season')).toBe(true)
    expect(detectCATEvent('Flood Warning issued for this county')).toBe(true)
  })

  it('returns false for normal claim language', () => {
    expect(detectCATEvent('Pipe burst, water damage in kitchen')).toBe(false)
    expect(detectCATEvent('Rear-ended at a red light')).toBe(false)
  })
})

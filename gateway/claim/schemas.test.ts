import { describe, expect, it } from 'vitest'
import {
  ClaimCategorySchema,
  SIUFlagSchema,
  ClaimStatusSchema,
  ClaimPacketSchema,
  StartClaimRequestSchema,
  ClaimTurnRequestSchema,
  HandoffRequestSchema,
  makeEmptyPacket,
  EXTRACT_CLAIM_TOOL,
} from './schemas.js'

const TEST_UUID = '12345678-1234-4234-8234-123456789abc'

// ── ClaimCategorySchema ───────────────────────────────────────────────────────

describe('ClaimCategorySchema', () => {
  it('accepts all valid categories', () => {
    const valid = [
      'HOME_WATER', 'HOME_FIRE', 'HOME_THEFT',
      'AUTO_COLLISION', 'AUTO_THEFT',
      'TRAVEL_CANCELLATION', 'TRAVEL_MEDICAL',
      'MEDICAL_EXPENSE',
    ] as const
    for (const v of valid) {
      expect(ClaimCategorySchema.safeParse(v).success).toBe(true)
    }
  })

  it('rejects unknown category', () => {
    expect(ClaimCategorySchema.safeParse('UNKNOWN_TYPE').success).toBe(false)
  })
})

// ── SIUFlagSchema ─────────────────────────────────────────────────────────────

describe('SIUFlagSchema', () => {
  it('accepts all 10 SIU flags', () => {
    const flags = [
      'RECENT_POLICY_CHANGE', 'PRIOR_CLAIM_PATTERN', 'DELAYED_REPORT',
      'INCONSISTENT_ACCOUNT', 'EXCESSIVE_VALUATION', 'CASH_SETTLEMENT_DEMAND',
      'NO_POLICE_REPORT', 'MULTIPLE_VEHICLES_INSURED', 'VACANT_PROPERTY',
      'UNVERIFIABLE_LOSS',
    ] as const
    for (const f of flags) {
      expect(SIUFlagSchema.safeParse(f).success).toBe(true)
    }
  })

  it('rejects unknown flag', () => {
    expect(SIUFlagSchema.safeParse('FAKE_FLAG').success).toBe(false)
  })
})

// ── ClaimStatusSchema ─────────────────────────────────────────────────────────

describe('ClaimStatusSchema', () => {
  it('accepts all valid statuses', () => {
    const statuses = [
      'intake', 'pending_documents', 'under_review',
      'siu_referral', 'senior_review', 'cat_queue', 'closed',
    ] as const
    for (const s of statuses) {
      expect(ClaimStatusSchema.safeParse(s).success).toBe(true)
    }
  })
})

// ── ClaimPacketSchema ─────────────────────────────────────────────────────────

describe('ClaimPacketSchema', () => {
  it('validates a packet produced by makeEmptyPacket', () => {
    const packet = makeEmptyPacket(TEST_UUID)
    const result = ClaimPacketSchema.safeParse(packet)
    expect(result.success).toBe(true)
  })

  it('rejects non-uuid sessionId', () => {
    const packet = makeEmptyPacket('not-a-uuid')
    expect(ClaimPacketSchema.safeParse(packet).success).toBe(false)
  })

  it('requires siuFlags to be an array', () => {
    const packet = { ...makeEmptyPacket(TEST_UUID), siuFlags: null }
    expect(ClaimPacketSchema.safeParse(packet).success).toBe(false)
  })

  it('rejects invalid siu flag in array', () => {
    const packet = {
      ...makeEmptyPacket(TEST_UUID),
      siuFlags: ['FAKE_FLAG'],
    }
    expect(ClaimPacketSchema.safeParse(packet).success).toBe(false)
  })
})

// ── makeEmptyPacket ───────────────────────────────────────────────────────────

describe('makeEmptyPacket', () => {
  it('returns a packet with all nullable fields set to null and status intake', () => {
    const p = makeEmptyPacket(TEST_UUID)
    expect(p.claimType).toBeNull()
    expect(p.claimantName).toBeNull()
    expect(p.siuFlags).toEqual([])
    expect(p.status).toBe('intake')
    expect(p.completedAt).toBeNull()
  })

  it('sets sessionId to the provided value', () => {
    expect(makeEmptyPacket(TEST_UUID).sessionId).toBe(TEST_UUID)
  })

  it('sets createdAt to a valid ISO string', () => {
    const p = makeEmptyPacket(TEST_UUID)
    expect(() => new Date(p.createdAt)).not.toThrow()
    expect(new Date(p.createdAt).toISOString()).toBe(p.createdAt)
  })
})

// ── API request schemas ───────────────────────────────────────────────────────

describe('StartClaimRequestSchema', () => {
  it('accepts valid request with default role', () => {
    const result = StartClaimRequestSchema.safeParse({ policyNumber: 'HO-2024-88821' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.role).toBe('claimant')
  })

  it('accepts adjuster role', () => {
    const result = StartClaimRequestSchema.safeParse({ policyNumber: 'HO-2024-88821', role: 'adjuster' })
    expect(result.success).toBe(true)
  })

  it('rejects empty policyNumber', () => {
    expect(StartClaimRequestSchema.safeParse({ policyNumber: '' }).success).toBe(false)
  })
})

describe('ClaimTurnRequestSchema', () => {
  const validId = TEST_UUID

  it('accepts valid turn request', () => {
    const result = ClaimTurnRequestSchema.safeParse({ sessionId: validId, message: 'Hello' })
    expect(result.success).toBe(true)
  })

  it('rejects non-uuid sessionId', () => {
    expect(ClaimTurnRequestSchema.safeParse({ sessionId: 'bad', message: 'Hello' }).success).toBe(false)
  })

  it('rejects empty message', () => {
    expect(ClaimTurnRequestSchema.safeParse({ sessionId: validId, message: '' }).success).toBe(false)
  })
})

describe('HandoffRequestSchema', () => {
  const validId = TEST_UUID

  it('accepts handoff with no note', () => {
    expect(HandoffRequestSchema.safeParse({ sessionId: validId }).success).toBe(true)
  })

  it('accepts handoff with optional note', () => {
    expect(HandoffRequestSchema.safeParse({ sessionId: validId, adjusterNote: 'Watch SIU flags' }).success).toBe(true)
  })
})

// ── EXTRACT_CLAIM_TOOL ────────────────────────────────────────────────────────

describe('EXTRACT_CLAIM_TOOL', () => {
  it('has required fields siuFlags and nextBestQuestion', () => {
    expect(EXTRACT_CLAIM_TOOL.input_schema.required).toContain('siuFlags')
    expect(EXTRACT_CLAIM_TOOL.input_schema.required).toContain('nextBestQuestion')
  })

  it('has the correct tool name', () => {
    expect(EXTRACT_CLAIM_TOOL.name).toBe('extract_claim_packet')
  })
})

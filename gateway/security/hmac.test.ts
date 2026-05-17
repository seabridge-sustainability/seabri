import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { signRunApproval, verifyRunApproval } from './hmac.js'
import type { RunApprovalPayload } from './hmac.js'

const TEST_SECRET = 'test-secret-key-for-hmac-tests'
const payload: RunApprovalPayload = {
  channel: 'telegram',
  senderId: 'user-123',
  skillId: 'carbon-tracker',
}

describe('signRunApproval', () => {
  beforeEach(() => {
    vi.stubEnv('OPENSEABRI_RUN_APPROVAL_SECRET', TEST_SECRET)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns null when secret is not set', () => {
    vi.stubEnv('OPENSEABRI_RUN_APPROVAL_SECRET', '')
    expect(signRunApproval(payload)).toBeNull()
  })

  it('returns header and timestamp', () => {
    const result = signRunApproval(payload)
    expect(result).not.toBeNull()
    expect(result!.header).toContain('t=')
    expect(result!.header).toContain('v1=')
    expect(result!.timestamp).toBeGreaterThan(0)
  })

  it('uses provided timestamp', () => {
    const ts = 1700000000000
    const result = signRunApproval({ ...payload, timestamp: ts })
    expect(result!.timestamp).toBe(ts)
    expect(result!.header).toContain(`t=${ts}`)
  })

  it('produces deterministic output for same inputs', () => {
    const ts = 1700000000000
    const a = signRunApproval({ ...payload, timestamp: ts })
    const b = signRunApproval({ ...payload, timestamp: ts })
    expect(a!.header).toBe(b!.header)
  })

  it('produces different output for different payloads', () => {
    const ts = 1700000000000
    const a = signRunApproval({ ...payload, timestamp: ts })
    const b = signRunApproval({ ...payload, skillId: 'other-skill', timestamp: ts })
    expect(a!.header).not.toBe(b!.header)
  })
})

describe('verifyRunApproval', () => {
  beforeEach(() => {
    vi.stubEnv('OPENSEABRI_RUN_APPROVAL_SECRET', TEST_SECRET)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns false when secret is not set', () => {
    vi.stubEnv('OPENSEABRI_RUN_APPROVAL_SECRET', '')
    expect(verifyRunApproval('t=123,v1=abc', payload)).toBe(false)
  })

  it('verifies a valid signature', () => {
    const result = signRunApproval(payload)!
    expect(verifyRunApproval(result.header, payload)).toBe(true)
  })

  it('rejects tampered header', () => {
    const result = signRunApproval(payload)!
    const sig = result.header.match(/v1=([0-9a-f]+)/)![1]
    const flipped = sig[0] === 'a' ? 'b' : 'a'
    const tampered = result.header.replace(`v1=${sig}`, `v1=${flipped}${sig.slice(1)}`)
    expect(verifyRunApproval(tampered, payload)).toBe(false)
  })

  it('rejects wrong payload', () => {
    const result = signRunApproval(payload)!
    const wrongPayload = { ...payload, senderId: 'different-user' }
    expect(verifyRunApproval(result.header, wrongPayload)).toBe(false)
  })

  it('rejects expired timestamp', () => {
    const oldTs = Date.now() - 6 * 60 * 1000 // 6 minutes ago
    const result = signRunApproval({ ...payload, timestamp: oldTs })!
    expect(verifyRunApproval(result.header, payload)).toBe(false)
  })

  it('accepts timestamp within skew window', () => {
    const recentTs = Date.now() - 1 * 60 * 1000 // 1 minute ago — well within 2-min skew
    const result = signRunApproval({ ...payload, timestamp: recentTs })!
    expect(verifyRunApproval(result.header, payload)).toBe(true)
  })

  it('rejects malformed header', () => {
    expect(verifyRunApproval('garbage', payload)).toBe(false)
    expect(verifyRunApproval('', payload)).toBe(false)
    expect(verifyRunApproval('t=notanumber,v1=abc', payload)).toBe(false)
  })
})

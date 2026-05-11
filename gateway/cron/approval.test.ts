import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createApprovalTokenFactory, ApprovalSecretMissingError } from './approval.js'

describe('createApprovalTokenFactory', () => {
  beforeEach(() => {
    vi.stubEnv('OPENSEABRI_RUN_SECRET', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns null when OPENSEABRI_RUN_SECRET is not set', () => {
    const factory = createApprovalTokenFactory()
    expect(factory).toBeNull()
  })

  it('returns a function when secret is set', () => {
    vi.stubEnv('OPENSEABRI_RUN_SECRET', 'test-secret-key')
    const factory = createApprovalTokenFactory()
    expect(factory).toBeTypeOf('function')
  })

  it('produces a base64 string token', () => {
    vi.stubEnv('OPENSEABRI_RUN_SECRET', 'test-secret-key')
    const factory = createApprovalTokenFactory()!
    const token = factory('regulation_monitoring', { scope: 'global' }) as string
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(0)
    expect(() => Buffer.from(token, 'base64')).not.toThrow()
  })

  it('produces deterministic tokens for same inputs', () => {
    vi.stubEnv('OPENSEABRI_RUN_SECRET', 'test-secret-key')
    const factory = createApprovalTokenFactory()!
    const t1 = factory('agent-a', { key: 'value' })
    const t2 = factory('agent-a', { key: 'value' })
    expect(t1).toBe(t2)
  })

  it('produces different tokens for different agents', () => {
    vi.stubEnv('OPENSEABRI_RUN_SECRET', 'test-secret-key')
    const factory = createApprovalTokenFactory()!
    const t1 = factory('agent-a', { key: 'value' })
    const t2 = factory('agent-b', { key: 'value' })
    expect(t1).not.toBe(t2)
  })

  it('produces different tokens for different bodies', () => {
    vi.stubEnv('OPENSEABRI_RUN_SECRET', 'test-secret-key')
    const factory = createApprovalTokenFactory()!
    const t1 = factory('agent-a', { scope: 'global' })
    const t2 = factory('agent-a', { scope: 'local' })
    expect(t1).not.toBe(t2)
  })

  it('produces different tokens for different secrets', () => {
    vi.stubEnv('OPENSEABRI_RUN_SECRET', 'secret-1')
    const f1 = createApprovalTokenFactory()!
    const t1 = f1('agent-a', {})

    vi.stubEnv('OPENSEABRI_RUN_SECRET', 'secret-2')
    const f2 = createApprovalTokenFactory()!
    const t2 = f2('agent-a', {})

    expect(t1).not.toBe(t2)
  })
})

describe('ApprovalSecretMissingError', () => {
  it('has correct name', () => {
    const err = new ApprovalSecretMissingError()
    expect(err.name).toBe('ApprovalSecretMissingError')
  })

  it('has descriptive message', () => {
    const err = new ApprovalSecretMissingError()
    expect(err.message).toContain('OPENSEABRI_RUN_SECRET')
  })

  it('is an instance of Error', () => {
    const err = new ApprovalSecretMissingError()
    expect(err).toBeInstanceOf(Error)
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../config.js', () => ({
  TWILIO_ACCOUNT_SID: 'ACmock',
  TWILIO_AUTH_TOKEN: 'mock-token',
  TWILIO_FROM_NUMBER: '+15550001111',
  TWILIO_VOICE_TWIML_BASE_URL: 'https://example.test',
  OUTBOUND_CALLS_ENABLED: false,
  SEABRI_CALLS_ENABLED: true,
  SEABRI_CALL_TEST_MODE: true,
  SEABRI_CALL_TEST_ALLOWED_NUMBERS: ['15558675309'],
  SEABRI_MESSAGES_ENABLED: true,
  SEABRI_MESSAGE_TEST_MODE: true,
}))

import { initiateOutboundCall, initiateOutboundSms } from './outbound.js'

describe('outbound action safety gates', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  it('blocks non-whitelisted outbound calls in test mode before provider contact', async () => {
    const result = await initiateOutboundCall({
      toNumber: '+15551234567',
      message: 'Please call this number.',
      userId: 'user:test',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('whitelisted')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('blocks non-whitelisted outbound SMS in test mode before provider contact', async () => {
    const result = await initiateOutboundSms({
      toNumber: '+15551234567',
      message: 'Please send this SMS.',
      userId: 'user:test',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('whitelisted')
    expect(global.fetch).not.toHaveBeenCalled()
  })
})

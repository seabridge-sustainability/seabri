import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getProviderReadiness, validateProviderReadiness } from './provider-readiness.js'

const keys = [
  'TELEGRAM_TOKEN',
  'WHATSAPP_PROVIDER',
  'WHATSAPP_CLOUD_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_VERIFY_TOKEN',
  'WHATSAPP_APP_SECRET',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_FROM_NUMBER',
  'TWILIO_VOICE_WEBHOOK_URL',
  'TWILIO_VOICE_TWIML_BASE_URL',
  'SEABRI_MESSAGES_ENABLED',
  'SEABRI_MESSAGE_TEST_MODE',
  'SEABRI_CALLS_ENABLED',
  'SEABRI_CALL_TEST_MODE',
  'SEABRI_CALL_TEST_ALLOWED_NUMBERS',
  'OPENSEABRI_LIVE_PROVIDER_TESTS_ENABLED',
  'OPENSEABRI_CHANNELS_ENABLED',
]

const oldEnv: Record<string, string | undefined> = {}

beforeEach(() => {
  for (const key of keys) {
    oldEnv[key] = process.env[key]
    delete process.env[key]
  }
})

afterEach(() => {
  for (const key of keys) {
    if (oldEnv[key] === undefined) delete process.env[key]
    else process.env[key] = oldEnv[key]
  }
})

describe('provider readiness', () => {
  it('returns sanitized missing config labels without secret values', () => {
    process.env.TELEGRAM_TOKEN = 'telegram-secret-value'
    const statuses = getProviderReadiness()
    const text = JSON.stringify(statuses)
    expect(text).not.toContain('telegram-secret-value')
    expect(statuses.some((s) => s.provider === 'telegram')).toBe(true)
    expect(statuses.find((s) => s.provider === 'telegram')?.enabled).toBe(false)
    expect(statuses.find((s) => s.provider === 'twilio_sms')?.missingConfigKeys).toContain('TWILIO_ACCOUNT_SID')
  })

  it('requires explicit channel allowlist even when provider credentials are present', () => {
    process.env.TELEGRAM_TOKEN = 'telegram-secret-value'
    process.env.TWILIO_ACCOUNT_SID = 'ACtest'
    process.env.TWILIO_AUTH_TOKEN = 'secret-token'
    process.env.TWILIO_FROM_NUMBER = '+15550001111'
    process.env.SEABRI_MESSAGES_ENABLED = 'true'

    let statuses = getProviderReadiness()
    expect(statuses.find((s) => s.provider === 'telegram')?.enabled).toBe(false)
    expect(statuses.find((s) => s.provider === 'twilio_sms')?.enabled).toBe(false)

    process.env.OPENSEABRI_CHANNELS_ENABLED = 'telegram,sms'
    statuses = getProviderReadiness()
    expect(statuses.find((s) => s.provider === 'telegram')?.enabled).toBe(true)
    expect(statuses.find((s) => s.provider === 'twilio_sms')?.enabled).toBe(true)
  })

  it('blocks live validation unless the live gate is explicitly enabled', async () => {
    process.env.TWILIO_ACCOUNT_SID = 'ACtest'
    process.env.TWILIO_AUTH_TOKEN = 'secret-token'
    process.env.TWILIO_FROM_NUMBER = '+15550001111'
    process.env.SEABRI_MESSAGES_ENABLED = 'true'
    process.env.SEABRI_MESSAGE_TEST_MODE = 'true'

    const result = await validateProviderReadiness({
      provider: 'twilio_sms',
      liveTestRequested: true,
      testTarget: '+12698300869',
    })
    expect(result.results[0].status).toBe('blocked')
    expect(JSON.stringify(result)).not.toContain('secret-token')
  })

  it('blocks non-whitelisted test numbers before any provider contact', async () => {
    process.env.TWILIO_ACCOUNT_SID = 'ACtest'
    process.env.TWILIO_AUTH_TOKEN = 'secret-token'
    process.env.TWILIO_FROM_NUMBER = '+15550001111'
    process.env.SEABRI_MESSAGES_ENABLED = 'true'
    process.env.SEABRI_MESSAGE_TEST_MODE = 'true'
    process.env.SEABRI_CALL_TEST_ALLOWED_NUMBERS = '2698300869'

    const result = await validateProviderReadiness({
      provider: 'twilio_sms',
      testTarget: '+15551234567',
    })
    expect(result.results[0].status).toBe('blocked')
    expect(result.results[0].safeMessage).toContain('whitelisted')
  })

  it('passes safe dry-run validation for configured test-mode SMS', async () => {
    process.env.TWILIO_ACCOUNT_SID = 'ACtest'
    process.env.TWILIO_AUTH_TOKEN = 'secret-token'
    process.env.TWILIO_FROM_NUMBER = '+15550001111'
    process.env.SEABRI_MESSAGES_ENABLED = 'true'
    process.env.SEABRI_MESSAGE_TEST_MODE = 'true'

    const result = await validateProviderReadiness({
      provider: 'twilio_sms',
      testTarget: '+12698300869',
    })
    expect(result.results[0].status).toBe('passed')
    expect(result.results[0].safeMessage).toContain('No live provider call')
  })
})

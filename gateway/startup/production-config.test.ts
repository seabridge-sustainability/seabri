import { describe, expect, it } from 'vitest'
import { resolveStartupMode, validateStartupConfig } from './production-config.js'

describe('startup production config validation', () => {
  it('resolves explicit startup modes', () => {
    expect(resolveStartupMode({ OPENSEABRI_MODE: 'staging', NODE_ENV: 'production' })).toBe('staging')
    expect(resolveStartupMode({ NODE_ENV: 'production' })).toBe('production')
    expect(resolveStartupMode({ NODE_ENV: 'test' })).toBe('test')
    expect(resolveStartupMode({})).toBe('dev')
  })

  it('fails closed in production without required secrets and persistence', () => {
    const result = validateStartupConfig({ NODE_ENV: 'production' })
    expect(result.ok).toBe(false)
    expect(result.errors.map((e) => e.code)).toContain('missing_required_secret_or_config')
    expect(result.errors.map((e) => e.code)).toContain('missing_production_persistence')
  })

  it('allows staging file fallback with warnings instead of production errors', () => {
    const result = validateStartupConfig({ OPENSEABRI_MODE: 'staging' })
    expect(result.ok).toBe(true)
    expect(result.warnings.map((e) => e.code)).toContain('file_persistence')
  })

  it('allows dev file fallback without a production persistence warning', () => {
    const result = validateStartupConfig({ OPENSEABRI_MODE: 'dev' })
    expect(result.ok).toBe(true)
    expect(result.warnings.map((e) => e.code)).not.toContain('file_persistence')
  })

  it('rejects unknown channel names', () => {
    const result = validateStartupConfig({ OPENSEABRI_CHANNELS_ENABLED: 'telegram,unknown-channel' })
    expect(result.ok).toBe(false)
    expect(result.errors[0].code).toBe('unknown_channel')
  })

  it('does not enable channels from credentials alone', () => {
    const result = validateStartupConfig({
      TELEGRAM_TOKEN: 'secret-token',
      TWILIO_ACCOUNT_SID: 'ACmock',
      TWILIO_AUTH_TOKEN: 'secret',
      TWILIO_FROM_NUMBER: '+15550001111',
    })
    expect(result.ok).toBe(true)
    expect(result.summary.liveChannelsEnabled).toBe('(none)')
  })

  it('blocks production live channels unless the live gate is approved', () => {
    const base = {
      NODE_ENV: 'production',
      OPENSEABRI_API_KEY: 'api-key',
      SEABRI_WS_TOKEN: 'ws-token',
      OPENSEABRI_CORS_ORIGIN: 'https://example.com',
      OPENSEABRI_RATE_LIMIT: '120',
      OPENSEABRI_PERSISTENCE_ADAPTER: 'database',
      DATABASE_URL: 'postgres://example',
      OPENSEABRI_CHANNELS_ENABLED: 'telegram',
      TELEGRAM_TOKEN: 'telegram-token',
    }
    expect(validateStartupConfig(base).errors.map((e) => e.code)).toContain('live_provider_gate_closed')
    expect(validateStartupConfig({ ...base, OPENSEABRI_LIVE_PROVIDER_APPROVED: 'true' }).ok).toBe(true)
  })

  it('requires canvas token in production when canvas is enabled', () => {
    const result = validateStartupConfig({
      NODE_ENV: 'production',
      OPENSEABRI_API_KEY: 'api-key',
      SEABRI_WS_TOKEN: 'ws-token',
      OPENSEABRI_CORS_ORIGIN: 'https://example.com',
      OPENSEABRI_RATE_LIMIT: '120',
      OPENSEABRI_PERSISTENCE_ADAPTER: 'database',
      DATABASE_URL: 'postgres://example',
      OPENSEABRI_CANVAS_WS_PORT: '18791',
    })
    expect(result.ok).toBe(false)
    expect(result.errors.map((e) => e.code)).toContain('missing_canvas_token')
  })

  it('rejects fallback persistence in production and permits mocked adapter only for tests', () => {
    const base = {
      NODE_ENV: 'production',
      OPENSEABRI_API_KEY: 'api-key',
      SEABRI_WS_TOKEN: 'ws-token',
      OPENSEABRI_CORS_ORIGIN: 'https://example.com',
      OPENSEABRI_RATE_LIMIT: '120',
      OPENSEABRI_CHANNELS_ENABLED: '',
    }

    expect(validateStartupConfig(base).errors.map((e) => e.code)).toContain('missing_production_persistence')
    expect(validateStartupConfig({
      ...base,
      OPENSEABRI_PERSISTENCE_ADAPTER: 'mock',
      OPENSEABRI_ALLOW_MOCK_PERSISTENCE_FOR_TESTS: 'true',
    }).ok).toBe(true)
  })
})

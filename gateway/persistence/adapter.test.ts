import { describe, expect, it } from 'vitest'
import { initializePersistenceAdapterForStartup, resolvePersistenceAdapter } from './adapter.js'

describe('persistence adapter resolution', () => {
  it('uses fallback only for non-production modes', () => {
    const status = resolvePersistenceAdapter({ OPENSEABRI_MODE: 'staging' })
    expect(status.kind).toBe('fallback')
    expect(status.productionSafe).toBe(false)
  })

  it('resolves database adapter from explicit adapter and database URL', () => {
    const status = resolvePersistenceAdapter({
      OPENSEABRI_MODE: 'production',
      OPENSEABRI_PERSISTENCE_ADAPTER: 'database',
      SEABRI_DATABASE_URL: 'postgres://example',
    })
    expect(status.kind).toBe('database')
    expect(status.productionSafe).toBe(true)
    expect(status.requiresConnectionCheck).toBe(true)
  })

  it('initializes a mocked adapter only when explicitly allowed for tests', async () => {
    const status = await initializePersistenceAdapterForStartup({
      OPENSEABRI_MODE: 'production',
      OPENSEABRI_PERSISTENCE_ADAPTER: 'mock',
      OPENSEABRI_ALLOW_MOCK_PERSISTENCE_FOR_TESTS: 'true',
    })
    expect(status.kind).toBe('mock')
    expect(status.productionSafe).toBe(true)
  })
})

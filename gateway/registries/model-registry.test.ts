import { describe, it, expect } from 'vitest'
import { ModelRegistry, modelRegistry } from './model-registry.js'
import type { ModelDefinition } from './model-registry.js'

const makeModel = (overrides: Partial<ModelDefinition> = {}): ModelDefinition => ({
  id: 'test-model',
  provider: 'anthropic',
  tier: 'sonnet',
  displayName: 'Test Model',
  contextWindow: 200_000,
  costPer1kInput: 0.003,
  costPer1kOutput: 0.015,
  energyPer1kTokens: 0.00004,
  supportsStreaming: true,
  supportsTools: true,
  supportsVision: true,
  enabled: true,
  ...overrides,
})

describe('ModelRegistry', () => {
  it('starts empty', () => {
    const reg = new ModelRegistry()
    expect(reg.list()).toHaveLength(0)
  })

  it('registers and retrieves a model', () => {
    const reg = new ModelRegistry()
    reg.register(makeModel())
    expect(reg.get('test-model')?.displayName).toBe('Test Model')
  })

  it('throws on empty id', () => {
    const reg = new ModelRegistry()
    expect(() => reg.register(makeModel({ id: '' }))).toThrow('"id" is required')
  })

  it('throws on duplicate id', () => {
    const reg = new ModelRegistry()
    reg.register(makeModel())
    expect(() => reg.register(makeModel())).toThrow('already registered')
  })

  it('enables and disables models', () => {
    const reg = new ModelRegistry()
    reg.register(makeModel())
    reg.disable('test-model')
    expect(reg.get('test-model')?.enabled).toBe(false)
    reg.enable('test-model')
    expect(reg.get('test-model')?.enabled).toBe(true)
  })

  it('throws when enabling non-existent model', () => {
    const reg = new ModelRegistry()
    expect(() => reg.enable('ghost')).toThrow('not found')
  })

  it('lists by tier (enabled only)', () => {
    const reg = new ModelRegistry()
    reg.register(makeModel({ id: 'm1', tier: 'haiku', enabled: true }))
    reg.register(makeModel({ id: 'm2', tier: 'sonnet', enabled: true }))
    reg.register(makeModel({ id: 'm3', tier: 'sonnet', enabled: false }))
    expect(reg.listByTier('haiku')).toHaveLength(1)
    expect(reg.listByTier('sonnet')).toHaveLength(1)
  })

  it('lists by provider (enabled only)', () => {
    const reg = new ModelRegistry()
    reg.register(makeModel({ id: 'm1', provider: 'anthropic' }))
    reg.register(makeModel({ id: 'm2', provider: 'openai' }))
    expect(reg.listByProvider('anthropic')).toHaveLength(1)
    expect(reg.listByProvider('openai')).toHaveLength(1)
  })

  it('selects model for tier using preferred provider', () => {
    const reg = new ModelRegistry()
    reg.register(makeModel({ id: 'a-sonnet', provider: 'anthropic', tier: 'sonnet' }))
    reg.register(makeModel({ id: 'o-sonnet', provider: 'openai', tier: 'sonnet' }))
    reg.setPolicy({ preferProvider: 'anthropic' })
    const selected = reg.selectForTier('sonnet')
    expect(selected?.id).toBe('a-sonnet')
  })

  it('selects carbon-optimized model when policy enabled', () => {
    const reg = new ModelRegistry()
    reg.register(makeModel({ id: 'high-energy', tier: 'sonnet', energyPer1kTokens: 0.0001 }))
    reg.register(makeModel({ id: 'low-energy', tier: 'sonnet', energyPer1kTokens: 0.00001 }))
    reg.setPolicy({ carbonOptimize: true })
    const selected = reg.selectForTier('sonnet')
    expect(selected?.id).toBe('low-energy')
  })

  it('returns undefined for empty tier', () => {
    const reg = new ModelRegistry()
    expect(reg.selectForTier('opus')).toBeUndefined()
  })

  it('estimates cost', () => {
    const reg = new ModelRegistry()
    reg.register(makeModel({ id: 'm1', costPer1kInput: 0.003, costPer1kOutput: 0.015 }))
    const cost = reg.estimateCost('m1', 1000, 1000)
    expect(cost).toBeCloseTo(0.018)
  })

  it('returns undefined cost for unknown model', () => {
    const reg = new ModelRegistry()
    expect(reg.estimateCost('ghost', 1000, 1000)).toBeUndefined()
  })

  it('estimates carbon', () => {
    const reg = new ModelRegistry()
    reg.register(makeModel({ id: 'm1', energyPer1kTokens: 0.00004 }))
    const carbon = reg.estimateCarbon('m1', 10_000)
    expect(carbon).toBeGreaterThan(0)
  })

  it('unregisters a model', () => {
    const reg = new ModelRegistry()
    reg.register(makeModel())
    expect(reg.unregister('test-model')).toBe(true)
    expect(reg.has('test-model')).toBe(false)
  })

  it('manages routing policy', () => {
    const reg = new ModelRegistry()
    reg.setPolicy({ defaultTier: 'haiku', carbonOptimize: true })
    const policy = reg.getPolicy()
    expect(policy.defaultTier).toBe('haiku')
    expect(policy.carbonOptimize).toBe(true)
  })
})

describe('modelRegistry (singleton)', () => {
  it('has 3 built-in Anthropic models', () => {
    expect(modelRegistry.list()).toHaveLength(3)
  })

  it('includes haiku, sonnet, and opus', () => {
    expect(modelRegistry.listByTier('haiku')).toHaveLength(1)
    expect(modelRegistry.listByTier('sonnet')).toHaveLength(1)
    expect(modelRegistry.listByTier('opus')).toHaveLength(1)
  })

  it('all models support streaming and tools', () => {
    for (const m of modelRegistry.list()) {
      expect(m.supportsStreaming).toBe(true)
      expect(m.supportsTools).toBe(true)
    }
  })

  it('selects sonnet as default tier', () => {
    const selected = modelRegistry.selectForTier('sonnet')
    expect(selected).toBeDefined()
    expect(selected?.tier).toBe('sonnet')
  })
})

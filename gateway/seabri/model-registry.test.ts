import { describe, it, expect } from 'vitest'
import { ModelRegistry, modelRegistry } from './model-registry.js'
import type { ModelRegistration } from './model-registry.js'
import { TIER_MODELS } from '../orchestrator/model-router.js'

const makeModel = (overrides: Partial<ModelRegistration> = {}): ModelRegistration => ({
  id: 'test-model',
  name: 'Test Model',
  tier: 'haiku',
  contextWindow: 200_000,
  costPer1kInputUsd: 0.001,
  costPer1kOutputUsd: 0.005,
  carbonPer1kTokensGrams: 0.039,
  strengths: ['testing'],
  provider: 'anthropic',
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
    expect(reg.get('test-model')).toBeDefined()
    expect(reg.get('test-model')?.tier).toBe('haiku')
  })

  it('throws when registering duplicate id', () => {
    const reg = new ModelRegistry()
    reg.register(makeModel())
    expect(() => reg.register(makeModel())).toThrow('already registered')
  })

  it('throws when registering model without id', () => {
    const reg = new ModelRegistry()
    expect(() => reg.register(makeModel({ id: '' }))).toThrow('"id" is required')
  })

  it('retrieves by tier', () => {
    const reg = new ModelRegistry()
    reg.register(makeModel({ tier: 'sonnet' }))
    expect(reg.getByTier('sonnet')).toBeDefined()
    expect(reg.getByTier('haiku')).toBeUndefined()
  })

  it('estimates cost correctly', () => {
    const reg = new ModelRegistry()
    reg.register(makeModel({ costPer1kInputUsd: 0.001, costPer1kOutputUsd: 0.005 }))
    // 1000 input + 500 output tokens
    const cost = reg.estimateCost('test-model', 1000, 500)
    expect(cost).toBeCloseTo(0.001 + 0.0025, 5)
  })

  it('returns 0 for unknown model cost', () => {
    const reg = new ModelRegistry()
    expect(reg.estimateCost('ghost', 1000, 1000)).toBe(0)
  })

  it('estimates carbon correctly', () => {
    const reg = new ModelRegistry()
    reg.register(makeModel({ carbonPer1kTokensGrams: 0.039 }))
    const carbon = reg.estimateCarbon('test-model', 1000)
    expect(carbon).toBeCloseTo(0.039, 5)
  })
})

describe('modelRegistry (singleton)', () => {
  it('has 3 built-in models', () => {
    expect(modelRegistry.list()).toHaveLength(3)
  })

  it('includes haiku, sonnet, opus', () => {
    expect(modelRegistry.get(TIER_MODELS.haiku)).toBeDefined()
    expect(modelRegistry.get(TIER_MODELS.sonnet)).toBeDefined()
    expect(modelRegistry.get(TIER_MODELS.opus)).toBeDefined()
  })

  it('haiku has lowest carbon per 1k tokens', () => {
    const haiku = modelRegistry.get(TIER_MODELS.haiku)!
    const sonnet = modelRegistry.get(TIER_MODELS.sonnet)!
    const opus = modelRegistry.get(TIER_MODELS.opus)!
    expect(haiku.carbonPer1kTokensGrams).toBeLessThan(sonnet.carbonPer1kTokensGrams)
    expect(sonnet.carbonPer1kTokensGrams).toBeLessThan(opus.carbonPer1kTokensGrams)
  })

  it('haiku is cheapest', () => {
    const haiku = modelRegistry.get(TIER_MODELS.haiku)!
    const sonnet = modelRegistry.get(TIER_MODELS.sonnet)!
    expect(haiku.costPer1kInputUsd).toBeLessThan(sonnet.costPer1kInputUsd)
  })
})

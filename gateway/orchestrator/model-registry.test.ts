import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MODEL_REGISTRY, selectProvider } from './model-registry.js'
import type { NormalizedMessage } from '../types/message.js'

describe('MODEL_REGISTRY', () => {
  it('has at least one entry per provider', () => {
    const providers = new Set(MODEL_REGISTRY.map(m => m.provider))
    expect(providers.has('anthropic')).toBe(true)
  })

  it('has google, openai, deepseek, and local providers', () => {
    const providers = new Set(MODEL_REGISTRY.map(m => m.provider))
    expect(providers.has('google')).toBe(true)
    expect(providers.has('openai')).toBe(true)
    expect(providers.has('deepseek')).toBe(true)
    expect(providers.has('local')).toBe(true)
  })

  it('all entries have required env key defined', () => {
    MODEL_REGISTRY.forEach(m => {
      expect(m.envKey, `model ${m.id} should have envKey`).toBeTruthy()
    })
  })

  it('all entries have a non-empty id', () => {
    MODEL_REGISTRY.forEach(m => {
      expect(m.id).toBeTruthy()
    })
  })

  it('anthropic models all support vision', () => {
    const anthropic = MODEL_REGISTRY.filter(m => m.provider === 'anthropic')
    anthropic.forEach(m => {
      expect(m.supportsVision, `${m.id} should support vision`).toBe(true)
    })
  })

  it('local model has zero cost', () => {
    const local = MODEL_REGISTRY.find(m => m.provider === 'local')!
    expect(local.costPer1kInputUsd).toBe(0)
    expect(local.costPer1kOutputUsd).toBe(0)
  })
})

describe('selectProvider', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    // Clear all provider keys
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.GOOGLE_API_KEY
    delete process.env.OPENAI_API_KEY
    delete process.env.DEEPSEEK_API_KEY
    delete process.env.LOCAL_INFERENCE_URL
    delete process.env.SEABRI_PREFERRED_PROVIDER
  })

  afterEach(() => {
    // Restore original env
    for (const key of ['ANTHROPIC_API_KEY', 'GOOGLE_API_KEY', 'OPENAI_API_KEY', 'DEEPSEEK_API_KEY', 'LOCAL_INFERENCE_URL', 'SEABRI_PREFERRED_PROVIDER']) {
      if (key in originalEnv) {
        process.env[key] = originalEnv[key]
      } else {
        delete process.env[key]
      }
    }
  })

  it('selectProvider filters to available models when ANTHROPIC_API_KEY set', () => {
    process.env.ANTHROPIC_API_KEY = 'test'
    delete process.env.GOOGLE_API_KEY
    const candidates = selectProvider({ attachment: undefined } as Pick<NormalizedMessage, 'attachment'>, 'general')
    expect(candidates.every(m => m.provider !== 'google')).toBe(true)
  })

  it('vision message filtered to vision-capable models only', () => {
    process.env.ANTHROPIC_API_KEY = 'test'
    process.env.DEEPSEEK_API_KEY = 'test'
    const msg = { attachment: { type: 'image' } } as NormalizedMessage
    const candidates = selectProvider(msg, 'general')
    expect(candidates.every(m => m.supportsVision)).toBe(true)
  })

  it('returns at least one model when only anthropic key set', () => {
    process.env.ANTHROPIC_API_KEY = 'test'
    const candidates = selectProvider({ attachment: undefined } as Pick<NormalizedMessage, 'attachment'>, 'general')
    expect(candidates.length).toBeGreaterThan(0)
    expect(candidates.every(m => m.provider === 'anthropic')).toBe(true)
  })

  it('falls back to anthropic when no keys set', () => {
    const candidates = selectProvider({ attachment: undefined } as Pick<NormalizedMessage, 'attachment'>, 'general')
    expect(candidates.every(m => m.provider === 'anthropic')).toBe(true)
  })

  it('preferred provider is sorted first when SEABRI_PREFERRED_PROVIDER set', () => {
    process.env.ANTHROPIC_API_KEY = 'test'
    process.env.GOOGLE_API_KEY = 'test'
    process.env.SEABRI_PREFERRED_PROVIDER = 'google'
    const candidates = selectProvider({ attachment: undefined } as Pick<NormalizedMessage, 'attachment'>, 'general')
    expect(candidates[0].provider).toBe('google')
  })

  it('non-image messages include non-vision models if available', () => {
    process.env.ANTHROPIC_API_KEY = 'test'
    process.env.DEEPSEEK_API_KEY = 'test'
    const msg = { attachment: undefined } as Pick<NormalizedMessage, 'attachment'>
    const candidates = selectProvider(msg, 'general')
    const hasNonVision = candidates.some(m => !m.supportsVision)
    expect(hasNonVision).toBe(true)
  })
})

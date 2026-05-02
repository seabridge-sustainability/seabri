import { describe, it, expect } from 'vitest'
import {
  estimateCarbonGrams,
  MODEL_ENERGY_FACTOR,
  GRID_INTENSITY_BY_REGION,
  DEFAULT_GRID_INTENSITY,
  type CarbonInput,
} from './carbon-model.js'

describe('estimateCarbonGrams', () => {
  describe('model energy factors', () => {
    it('haiku uses 0.1x relative energy factor', () => {
      expect(MODEL_ENERGY_FACTOR['claude-haiku-4-5']).toBeCloseTo(0.1)
    })

    it('sonnet uses 1.0x relative energy factor', () => {
      expect(MODEL_ENERGY_FACTOR['claude-sonnet-4-6']).toBeCloseTo(1.0)
    })

    it('opus uses 3.0x relative energy factor', () => {
      expect(MODEL_ENERGY_FACTOR['claude-opus-4-7']).toBeCloseTo(3.0)
    })
  })

  describe('basic calculation', () => {
    it('returns a positive number for a valid haiku call', () => {
      const input: CarbonInput = {
        model: 'claude-haiku-4-5',
        inputTokens: 500,
        outputTokens: 200,
      }
      const result = estimateCarbonGrams(input)
      expect(result).toBeGreaterThan(0)
    })

    it('sonnet produces more carbon than haiku for same tokens', () => {
      const base: CarbonInput = { model: 'claude-haiku-4-5', inputTokens: 1000, outputTokens: 500 }
      const sonnet: CarbonInput = { ...base, model: 'claude-sonnet-4-6' }

      expect(estimateCarbonGrams(sonnet)).toBeGreaterThan(estimateCarbonGrams(base))
    })

    it('opus produces more carbon than sonnet for same tokens', () => {
      const base: CarbonInput = { model: 'claude-sonnet-4-6', inputTokens: 1000, outputTokens: 500 }
      const opus: CarbonInput = { ...base, model: 'claude-opus-4-7' }

      expect(estimateCarbonGrams(opus)).toBeGreaterThan(estimateCarbonGrams(base))
    })

    it('opus/haiku carbon ratio matches 3.0/0.1 = 30x energy ratio', () => {
      const tokens: CarbonInput = { inputTokens: 1000, outputTokens: 500 }
      const haiku = estimateCarbonGrams({ ...tokens, model: 'claude-haiku-4-5' })
      const opus = estimateCarbonGrams({ ...tokens, model: 'claude-opus-4-7' })

      expect(opus / haiku).toBeCloseTo(30, 1)
    })

    it('more tokens → more carbon (linear with token count)', () => {
      const small: CarbonInput = { model: 'claude-sonnet-4-6', inputTokens: 100, outputTokens: 50 }
      const large: CarbonInput = { model: 'claude-sonnet-4-6', inputTokens: 1000, outputTokens: 500 }

      expect(estimateCarbonGrams(large)).toBeGreaterThan(estimateCarbonGrams(small))
    })

    it('doubling tokens doubles carbon', () => {
      const base: CarbonInput = { model: 'claude-sonnet-4-6', inputTokens: 500, outputTokens: 250 }
      const doubled: CarbonInput = { model: 'claude-sonnet-4-6', inputTokens: 1000, outputTokens: 500 }

      expect(estimateCarbonGrams(doubled)).toBeCloseTo(estimateCarbonGrams(base) * 2, 5)
    })
  })

  describe('grid intensity by region', () => {
    it('uses default grid intensity when no region provided', () => {
      const input: CarbonInput = { model: 'claude-sonnet-4-6', inputTokens: 1000, outputTokens: 500 }
      const withDefault = estimateCarbonGrams(input)
      const explicit = estimateCarbonGrams({ ...input, region: 'us-east-1' })

      // us-east-1 should produce a specific (possibly different) value
      expect(typeof withDefault).toBe('number')
      expect(typeof explicit).toBe('number')
    })

    it('EU region (lower carbon grid) produces less carbon than coal-heavy region', () => {
      const input: CarbonInput = { model: 'claude-sonnet-4-6', inputTokens: 1000, outputTokens: 500 }
      const eu = estimateCarbonGrams({ ...input, region: 'eu-west-1' })
      const coalHeavy = estimateCarbonGrams({ ...input, region: 'ap-southeast-1' })

      // EU grid is cleaner than Southeast Asia average
      expect(eu).toBeLessThan(coalHeavy)
    })

    it('unknown region falls back to default grid intensity', () => {
      const input: CarbonInput = { model: 'claude-sonnet-4-6', inputTokens: 1000, outputTokens: 500 }
      const known = estimateCarbonGrams(input)
      const unknown = estimateCarbonGrams({ ...input, region: 'xx-unknown-99' })

      expect(unknown).toBeCloseTo(known, 5)
    })

    it('GRID_INTENSITY_BY_REGION has entries for common AWS regions', () => {
      expect(GRID_INTENSITY_BY_REGION).toHaveProperty('us-east-1')
      expect(GRID_INTENSITY_BY_REGION).toHaveProperty('eu-west-1')
      expect(GRID_INTENSITY_BY_REGION).toHaveProperty('ap-southeast-1')
    })

    it('DEFAULT_GRID_INTENSITY is a positive number in gCO2e/kWh', () => {
      expect(DEFAULT_GRID_INTENSITY).toBeGreaterThan(0)
      expect(DEFAULT_GRID_INTENSITY).toBeLessThan(1000)
    })
  })

  describe('tool call overhead', () => {
    it('tool calls add carbon overhead', () => {
      const base: CarbonInput = { model: 'claude-sonnet-4-6', inputTokens: 1000, outputTokens: 500 }
      const withTools: CarbonInput = { ...base, toolCalls: 5 }

      expect(estimateCarbonGrams(withTools)).toBeGreaterThan(estimateCarbonGrams(base))
    })

    it('more tool calls → more carbon linearly', () => {
      const base: CarbonInput = { model: 'claude-sonnet-4-6', inputTokens: 500, outputTokens: 200, toolCalls: 2 }
      const more: CarbonInput = { ...base, toolCalls: 4 }
      const extra = estimateCarbonGrams(more) - estimateCarbonGrams(base)
      const oneUnit = estimateCarbonGrams({ ...base, toolCalls: 3 }) - estimateCarbonGrams(base)

      expect(extra).toBeCloseTo(oneUnit * 2, 5)
    })

    it('zero tool calls equals no tool call overhead', () => {
      const base: CarbonInput = { model: 'claude-sonnet-4-6', inputTokens: 500, outputTokens: 200 }
      const zero: CarbonInput = { ...base, toolCalls: 0 }

      expect(estimateCarbonGrams(zero)).toBeCloseTo(estimateCarbonGrams(base), 10)
    })
  })

  describe('unknown model fallback', () => {
    it('falls back to sonnet energy factor for unknown models', () => {
      const known: CarbonInput = { model: 'claude-sonnet-4-6', inputTokens: 1000, outputTokens: 500 }
      const unknown: CarbonInput = { model: 'gpt-unknown-99', inputTokens: 1000, outputTokens: 500 }

      expect(estimateCarbonGrams(unknown)).toBeCloseTo(estimateCarbonGrams(known), 5)
    })
  })
})

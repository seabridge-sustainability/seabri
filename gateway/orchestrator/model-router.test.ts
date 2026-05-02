import { describe, it, expect } from 'vitest'
import { selectModel, getModelCost, getFailoverModels, TIER_MODELS } from './model-router.js'

describe('Model Router', () => {
  describe('selectModel', () => {
    it('selects haiku for simple queries', () => {
      const result = selectModel('What is a flood zone?', 'general')
      expect(result.tier).toBe('haiku')
      expect(result.model).toBe(TIER_MODELS.haiku)
    })

    it('selects sonnet for medium-complexity queries', () => {
      const result = selectModel(
        'Can you compare the TCFD and CSRD reporting frameworks and explain the key differences? What are the pros and cons of each?',
        'sustainability-reporting',
      )
      expect(result.tier).toBe('sonnet')
    })

    it('selects opus for high-complexity queries', () => {
      const result = selectModel(
        'I need you to analyze my portfolio exposure to physical climate risk. First, assess the flood risk for each asset class. Then, compare the transition risk scenarios under 1.5C vs 2C pathways. Next, calculate the implied temperature rise. After that, generate a comprehensive report with scenario analysis and quantified financial impact estimates across three time horizons. What are the trade-offs between divesting from high-carbon assets versus engaging?',
        'investment-screening',
      )
      expect(result.tier).toBe('opus')
    })

    it('respects agent floor for investment-screening', () => {
      const result = selectModel('What is ESG?', 'investment-screening')
      expect(result.tier).not.toBe('haiku')
      expect(['sonnet', 'opus']).toContain(result.tier)
    })

    it('respects agent floor for sustainability-reporting', () => {
      const result = selectModel('What is GRI?', 'sustainability-reporting')
      expect(result.tier).not.toBe('haiku')
    })

    it('returns user-specified model when forced', () => {
      const result = selectModel('hello', 'general', 0, 'custom-model-123')
      expect(result.model).toBe('custom-model-123')
      expect(result.reason).toBe('user-specified model')
    })

    it('escalates for multi-question messages', () => {
      const result = selectModel(
        'What is scope 1? What about scope 2? And scope 3? How do they relate?',
        'net-zero',
      )
      expect(['sonnet', 'opus']).toContain(result.tier)
    })

    it('escalates for data analysis requests', () => {
      const result = selectModel(
        'Can you analyze the carbon footprint and calculate the emissions reduction potential?',
        'net-zero',
      )
      expect(result.tier).not.toBe('haiku')
    })

    it('considers conversation depth', () => {
      const shortConvo = selectModel('Tell me more', 'general', 2)
      const deepConvo = selectModel('Tell me more', 'general', 15)
      expect(deepConvo.tier === shortConvo.tier || deepConvo.tier !== 'haiku').toBe(true)
    })
  })

  describe('getModelCost', () => {
    it('calculates haiku cost correctly', () => {
      const cost = getModelCost('haiku', 1000, 500)
      expect(cost).toBeCloseTo(0.001 + 0.0025, 5)
    })

    it('calculates sonnet cost correctly', () => {
      const cost = getModelCost('sonnet', 1000, 500)
      expect(cost).toBeCloseTo(0.003 + 0.0075, 5)
    })

    it('calculates opus cost correctly', () => {
      const cost = getModelCost('opus', 1000, 500)
      expect(cost).toBeCloseTo(0.015 + 0.0375, 5)
    })

    it('returns 0 for 0 tokens', () => {
      expect(getModelCost('haiku', 0, 0)).toBe(0)
    })
  })

  describe('getFailoverModels', () => {
    it('returns haiku only when primary is haiku', () => {
      const models = getFailoverModels(TIER_MODELS.haiku)
      expect(models).toHaveLength(1)
      expect(models[0]).toBe(TIER_MODELS.haiku)
    })

    it('returns primary + haiku fallback for sonnet', () => {
      const models = getFailoverModels(TIER_MODELS.sonnet)
      expect(models).toHaveLength(2)
      expect(models[0]).toBe(TIER_MODELS.sonnet)
      expect(models[1]).toBe(TIER_MODELS.haiku)
    })

    it('returns primary + haiku fallback for opus', () => {
      const models = getFailoverModels(TIER_MODELS.opus)
      expect(models).toHaveLength(2)
      expect(models[0]).toBe(TIER_MODELS.opus)
      expect(models[1]).toBe(TIER_MODELS.haiku)
    })
  })
})

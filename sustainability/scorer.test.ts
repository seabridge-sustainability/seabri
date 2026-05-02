import { describe, it, expect } from 'vitest'
import {
  scoreDecision,
  aggregateScores,
  EFFICIENCY_THRESHOLDS,
  type DecisionInput,
  type DecisionScore,
} from './scorer.js'

const makeInput = (overrides: Partial<DecisionInput> = {}): DecisionInput => ({
  carbonGrams: 0.01,
  model: 'claude-sonnet-4-6',
  inputTokens: 500,
  outputTokens: 200,
  taskComplexity: 'medium',
  userFollowedRecommendation: null,
  ...overrides,
})

describe('scoreDecision', () => {
  describe('carbon score', () => {
    it('returns a carbon score between 0 and 100', () => {
      const result = scoreDecision(makeInput())
      expect(result.carbonScore).toBeGreaterThanOrEqual(0)
      expect(result.carbonScore).toBeLessThanOrEqual(100)
    })

    it('lower carbon → higher carbon score (lower is better for planet)', () => {
      const low = scoreDecision(makeInput({ carbonGrams: 0.001 }))
      const high = scoreDecision(makeInput({ carbonGrams: 0.1 }))
      expect(low.carbonScore).toBeGreaterThan(high.carbonScore)
    })

    it('zero carbon yields maximum carbon score of 100', () => {
      const result = scoreDecision(makeInput({ carbonGrams: 0 }))
      expect(result.carbonScore).toBe(100)
    })
  })

  describe('efficiency score', () => {
    it('returns an efficiency score between 0 and 100', () => {
      const result = scoreDecision(makeInput())
      expect(result.efficiencyScore).toBeGreaterThanOrEqual(0)
      expect(result.efficiencyScore).toBeLessThanOrEqual(100)
    })

    it('haiku on simple task scores highest efficiency', () => {
      const optimal = scoreDecision(makeInput({ model: 'claude-haiku-4-5', taskComplexity: 'simple' }))
      const wasteful = scoreDecision(makeInput({ model: 'claude-opus-4-7', taskComplexity: 'simple' }))
      expect(optimal.efficiencyScore).toBeGreaterThan(wasteful.efficiencyScore)
    })

    it('opus on complex task is more efficient than opus on simple task', () => {
      const justified = scoreDecision(makeInput({ model: 'claude-opus-4-7', taskComplexity: 'complex' }))
      const wasteful = scoreDecision(makeInput({ model: 'claude-opus-4-7', taskComplexity: 'simple' }))
      expect(justified.efficiencyScore).toBeGreaterThan(wasteful.efficiencyScore)
    })

    it('EFFICIENCY_THRESHOLDS has entries for simple, medium, complex', () => {
      expect(EFFICIENCY_THRESHOLDS).toHaveProperty('simple')
      expect(EFFICIENCY_THRESHOLDS).toHaveProperty('medium')
      expect(EFFICIENCY_THRESHOLDS).toHaveProperty('complex')
    })
  })

  describe('recommendation score', () => {
    it('following recommendation yields score of 100', () => {
      const result = scoreDecision(makeInput({ userFollowedRecommendation: true }))
      expect(result.recommendationScore).toBe(100)
    })

    it('ignoring recommendation yields score of 0', () => {
      const result = scoreDecision(makeInput({ userFollowedRecommendation: false }))
      expect(result.recommendationScore).toBe(0)
    })

    it('null recommendation (no recommendation given) yields neutral score of 50', () => {
      const result = scoreDecision(makeInput({ userFollowedRecommendation: null }))
      expect(result.recommendationScore).toBe(50)
    })
  })

  describe('overall score', () => {
    it('returns an overall score between 0 and 100', () => {
      const result = scoreDecision(makeInput())
      expect(result.overallScore).toBeGreaterThanOrEqual(0)
      expect(result.overallScore).toBeLessThanOrEqual(100)
    })

    it('overall score is a weighted average of the three sub-scores', () => {
      const result = scoreDecision(makeInput())
      const weighted = result.carbonScore * 0.4 + result.efficiencyScore * 0.4 + result.recommendationScore * 0.2
      expect(result.overallScore).toBeCloseTo(weighted, 5)
    })

    it('all-optimal decision yields overall score ≥ 90', () => {
      const result = scoreDecision(makeInput({
        carbonGrams: 0,
        model: 'claude-haiku-4-5',
        taskComplexity: 'simple',
        userFollowedRecommendation: true,
      }))
      expect(result.overallScore).toBeGreaterThanOrEqual(90)
    })

    it('all-poor decision yields overall score ≤ 30', () => {
      const result = scoreDecision(makeInput({
        carbonGrams: 10,
        model: 'claude-opus-4-7',
        taskComplexity: 'simple',
        userFollowedRecommendation: false,
      }))
      expect(result.overallScore).toBeLessThanOrEqual(30)
    })
  })

  describe('recommendations', () => {
    it('returns an array of string recommendations', () => {
      const result = scoreDecision(makeInput())
      expect(Array.isArray(result.recommendations)).toBe(true)
      result.recommendations.forEach((r) => expect(typeof r).toBe('string'))
    })

    it('suggests model downgrade when opus used for simple task', () => {
      const result = scoreDecision(makeInput({ model: 'claude-opus-4-7', taskComplexity: 'simple' }))
      const hasDowngradeRec = result.recommendations.some((r) =>
        r.toLowerCase().includes('haiku') || r.toLowerCase().includes('sonnet') || r.toLowerCase().includes('simpler'),
      )
      expect(hasDowngradeRec).toBe(true)
    })

    it('no recommendations for already-optimal decision', () => {
      const result = scoreDecision(makeInput({
        carbonGrams: 0,
        model: 'claude-haiku-4-5',
        taskComplexity: 'simple',
        userFollowedRecommendation: true,
      }))
      expect(result.recommendations).toHaveLength(0)
    })
  })
})

describe('aggregateScores', () => {
  const makeScore = (overrides: Partial<DecisionScore> = {}): DecisionScore => ({
    carbonScore: 80,
    efficiencyScore: 70,
    recommendationScore: 50,
    overallScore: 72,
    recommendations: [],
    ...overrides,
  })

  it('returns averages of each score dimension', () => {
    const scores = [makeScore({ overallScore: 60 }), makeScore({ overallScore: 80 })]
    const agg = aggregateScores(scores)
    expect(agg.avgOverallScore).toBeCloseTo(70, 5)
  })

  it('returns count of scored decisions', () => {
    const scores = [makeScore(), makeScore(), makeScore()]
    expect(aggregateScores(scores).count).toBe(3)
  })

  it('returns empty aggregate for empty input', () => {
    const agg = aggregateScores([])
    expect(agg.count).toBe(0)
    expect(agg.avgOverallScore).toBe(0)
  })

  it('collects unique recommendations across all decisions', () => {
    const scores = [
      makeScore({ recommendations: ['Switch to haiku'] }),
      makeScore({ recommendations: ['Switch to haiku', 'Enable caching'] }),
    ]
    const agg = aggregateScores(scores)
    expect(agg.topRecommendations).toContain('Switch to haiku')
    expect(agg.topRecommendations).toContain('Enable caching')
  })
})

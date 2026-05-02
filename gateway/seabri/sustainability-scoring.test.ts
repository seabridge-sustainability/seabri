import { describe, it, expect } from 'vitest'
import { scoreSustainability, aggregateSustainabilityScores } from './sustainability-scoring.js'

describe('scoreSustainability', () => {
  it('returns composite 0-100', () => {
    const score = scoreSustainability(0.001, 0.001, 'haiku')
    expect(score.composite).toBeGreaterThanOrEqual(0)
    expect(score.composite).toBeLessThanOrEqual(100)
  })

  it('rates an efficient haiku call as excellent', () => {
    // haiku budget: 0.0005 USD, 0.01 gCO2e — well under budget
    const score = scoreSustainability(0.0001, 0.001, 'haiku')
    expect(score.tier).toBe('excellent')
    expect(score.composite).toBeGreaterThanOrEqual(75)
  })

  it('rates an over-budget opus call as lower', () => {
    // opus budget: 0.05 USD, 0.20 gCO2e — 10x over
    const score = scoreSustainability(0.50, 2.0, 'opus')
    expect(score.composite).toBeLessThan(75)
  })

  it('carbonEfficiency and costEfficiency are 0-100', () => {
    const score = scoreSustainability(0.001, 0.01, 'sonnet')
    expect(score.carbonEfficiency).toBeGreaterThanOrEqual(0)
    expect(score.carbonEfficiency).toBeLessThanOrEqual(100)
    expect(score.costEfficiency).toBeGreaterThanOrEqual(0)
    expect(score.costEfficiency).toBeLessThanOrEqual(100)
  })

  it('breakdown reflects inputs', () => {
    const score = scoreSustainability(0.003, 0.05, 'sonnet')
    expect(score.breakdown.costUsd).toBe(0.003)
    expect(score.breakdown.carbonGrams).toBe(0.05)
    expect(score.breakdown.modelTier).toBe('sonnet')
  })

  it('assigns tier labels correctly', () => {
    const excellent = scoreSustainability(0.00001, 0.0001, 'haiku')
    expect(excellent.tier).toBe('excellent')
  })
})

describe('aggregateSustainabilityScores', () => {
  it('handles empty array', () => {
    const result = aggregateSustainabilityScores([])
    expect(result.avgComposite).toBe(0)
    expect(result.tier).toBe('poor')
    expect(result.totalCostUsd).toBe(0)
    expect(result.totalCarbonGrams).toBe(0)
  })

  it('averages scores correctly', () => {
    const s1 = scoreSustainability(0.0001, 0.001, 'haiku')
    const s2 = scoreSustainability(0.0001, 0.001, 'haiku')
    const result = aggregateSustainabilityScores([s1, s2])
    expect(result.avgComposite).toBe(s1.composite)
  })

  it('sums cost and carbon', () => {
    const s1 = scoreSustainability(0.001, 0.01, 'haiku')
    const s2 = scoreSustainability(0.002, 0.02, 'haiku')
    const result = aggregateSustainabilityScores([s1, s2])
    expect(result.totalCostUsd).toBeCloseTo(0.003, 5)
    expect(result.totalCarbonGrams).toBeCloseTo(0.03, 5)
  })
})

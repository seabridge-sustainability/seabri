import { describe, it, expect } from 'vitest'
import {
  computeOverallScore,
  createSustainabilityScore,
  scoreToBand,
  formatScoreReport,
} from './scoring.js'
import type { DimensionScore, SustainabilityScore } from './scoring.js'

const makeDim = (overrides: Partial<DimensionScore> = {}): DimensionScore => ({
  dimension: 'carbon-footprint',
  score: 75,
  confidence: 0.9,
  sources: ['test-source'],
  ...overrides,
})

describe('scoreToBand', () => {
  it('returns A for score >= 80', () => {
    expect(scoreToBand(80)).toBe('A')
    expect(scoreToBand(100)).toBe('A')
    expect(scoreToBand(95)).toBe('A')
  })

  it('returns B for score >= 60 and < 80', () => {
    expect(scoreToBand(60)).toBe('B')
    expect(scoreToBand(79)).toBe('B')
  })

  it('returns C for score >= 40 and < 60', () => {
    expect(scoreToBand(40)).toBe('C')
    expect(scoreToBand(59)).toBe('C')
  })

  it('returns D for score >= 20 and < 40', () => {
    expect(scoreToBand(20)).toBe('D')
    expect(scoreToBand(39)).toBe('D')
  })

  it('returns E for score < 20', () => {
    expect(scoreToBand(0)).toBe('E')
    expect(scoreToBand(19)).toBe('E')
  })
})

describe('computeOverallScore', () => {
  it('returns 0 for empty dimensions', () => {
    expect(computeOverallScore([])).toBe(0)
  })

  it('computes weighted score for single dimension', () => {
    const dims = [makeDim({ dimension: 'carbon-footprint', score: 80, confidence: 1.0 })]
    const score = computeOverallScore(dims)
    expect(score).toBe(80)
  })

  it('adjusts for confidence', () => {
    const full = computeOverallScore([makeDim({ score: 80, confidence: 1.0 })])
    const half = computeOverallScore([makeDim({ score: 80, confidence: 0.5 })])
    expect(full).toBe(half)
  })

  it('weights dimensions differently', () => {
    const carbonHigh = computeOverallScore([
      makeDim({ dimension: 'carbon-footprint', score: 100, confidence: 1.0 }),
      makeDim({ dimension: 'social-equity', score: 0, confidence: 1.0 }),
    ])
    const carbonLow = computeOverallScore([
      makeDim({ dimension: 'carbon-footprint', score: 0, confidence: 1.0 }),
      makeDim({ dimension: 'social-equity', score: 100, confidence: 1.0 }),
    ])
    expect(carbonHigh).toBeGreaterThan(carbonLow)
  })

  it('clamps result between 0 and 100', () => {
    const score = computeOverallScore([makeDim({ score: 100, confidence: 1.0 })])
    expect(score).toBeLessThanOrEqual(100)
    expect(score).toBeGreaterThanOrEqual(0)
  })

  it('returns 0 when all confidences are zero', () => {
    const score = computeOverallScore([
      makeDim({ score: 80, confidence: 0 }),
      makeDim({ dimension: 'energy-efficiency', score: 90, confidence: 0 }),
    ])
    expect(score).toBe(0)
  })

  it('handles all six dimensions', () => {
    const dims: DimensionScore[] = [
      makeDim({ dimension: 'carbon-footprint', score: 80, confidence: 1.0 }),
      makeDim({ dimension: 'energy-efficiency', score: 70, confidence: 1.0 }),
      makeDim({ dimension: 'water-stewardship', score: 60, confidence: 1.0 }),
      makeDim({ dimension: 'biodiversity-impact', score: 50, confidence: 1.0 }),
      makeDim({ dimension: 'waste-circularity', score: 40, confidence: 1.0 }),
      makeDim({ dimension: 'social-equity', score: 30, confidence: 1.0 }),
    ]
    const score = computeOverallScore(dims)
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThanOrEqual(100)
  })
})

describe('createSustainabilityScore', () => {
  it('creates score with computed overall', () => {
    const dims = [makeDim({ score: 80, confidence: 1.0 })]
    const result = createSustainabilityScore(dims)
    expect(result.overall).toBe(80)
    expect(result.dimensions).toHaveLength(1)
    expect(result.timestamp).toBeInstanceOf(Date)
  })

  it('clamps individual dimension scores to 0-100', () => {
    const dims = [makeDim({ score: 150, confidence: 1.0 })]
    const result = createSustainabilityScore(dims)
    expect(result.dimensions[0].score).toBe(100)
  })

  it('clamps confidence to 0-1', () => {
    const dims = [makeDim({ score: 80, confidence: 1.5 })]
    const result = createSustainabilityScore(dims)
    expect(result.dimensions[0].confidence).toBe(1)
  })

  it('includes entity fields when provided', () => {
    const result = createSustainabilityScore(
      [makeDim()],
      'prop-123',
      'property'
    )
    expect(result.entityId).toBe('prop-123')
    expect(result.entityType).toBe('property')
  })

  it('omits entity fields when not provided', () => {
    const result = createSustainabilityScore([makeDim()])
    expect(result.entityId).toBeUndefined()
    expect(result.entityType).toBeUndefined()
  })

  it('does not mutate input dimensions', () => {
    const dim = makeDim({ score: 150, confidence: 2.0 })
    createSustainabilityScore([dim])
    expect(dim.score).toBe(150)
    expect(dim.confidence).toBe(2.0)
  })
})

describe('formatScoreReport', () => {
  it('includes overall score and band', () => {
    const score = createSustainabilityScore(
      [makeDim({ score: 85, confidence: 1.0 })],
    )
    const report = formatScoreReport(score)
    expect(report).toContain('Sustainability Score:')
    expect(report).toContain('/100')
    expect(report).toContain('Band')
  })

  it('includes entity info when present', () => {
    const score = createSustainabilityScore(
      [makeDim()],
      'company-456',
      'company'
    )
    const report = formatScoreReport(score)
    expect(report).toContain('company-456')
    expect(report).toContain('company')
  })

  it('includes dimension breakdown', () => {
    const score = createSustainabilityScore([
      makeDim({ dimension: 'carbon-footprint', score: 85, confidence: 0.95 }),
      makeDim({ dimension: 'energy-efficiency', score: 70, confidence: 0.8 }),
    ])
    const report = formatScoreReport(score)
    expect(report).toContain('carbon-footprint')
    expect(report).toContain('energy-efficiency')
    expect(report).toContain('confidence')
  })

  it('includes sources when present', () => {
    const score = createSustainabilityScore([
      makeDim({ sources: ['CDP', 'GRI Report'] }),
    ])
    const report = formatScoreReport(score)
    expect(report).toContain('CDP')
    expect(report).toContain('GRI Report')
  })

  it('includes notes when present', () => {
    const score = createSustainabilityScore([
      makeDim({ notes: 'Estimated from sector average' }),
    ])
    const report = formatScoreReport(score)
    expect(report).toContain('Estimated from sector average')
  })

  it('omits sources line when sources array is empty', () => {
    const score = createSustainabilityScore([
      makeDim({ sources: [] }),
    ])
    const report = formatScoreReport(score)
    expect(report).not.toContain('Sources:')
  })
})

import { describe, it, expect } from 'vitest'
import {
  formatCarbonGrams,
  buildDailyChart,
  computeSavingsVsBaseline,
  type DailyMetric,
} from './useSustainabilityData.js'

describe('formatCarbonGrams', () => {
  it('formats sub-milligram amounts in μg', () => {
    expect(formatCarbonGrams(0.0005)).toContain('μg')
  })

  it('formats milligram-range amounts in mg', () => {
    expect(formatCarbonGrams(0.5)).toContain('mg')
  })

  it('formats gram-range amounts in g', () => {
    expect(formatCarbonGrams(1.5)).toContain('g')
  })

  it('always returns a string', () => {
    expect(typeof formatCarbonGrams(0)).toBe('string')
    expect(typeof formatCarbonGrams(1000)).toBe('string')
  })
})

describe('buildDailyChart', () => {
  const metrics: DailyMetric[] = [
    { date: '2026-04-28', carbonGrams: 0.1, costUsd: 0.02, requestCount: 10 },
    { date: '2026-04-29', carbonGrams: 0.2, costUsd: 0.04, requestCount: 20 },
    { date: '2026-04-30', carbonGrams: 0.15, costUsd: 0.03, requestCount: 15 },
  ]

  it('returns one entry per metric', () => {
    expect(buildDailyChart(metrics)).toHaveLength(3)
  })

  it('each entry has date, carbon, cost, requests', () => {
    const chart = buildDailyChart(metrics)
    expect(chart[0]).toHaveProperty('date')
    expect(chart[0]).toHaveProperty('carbon')
    expect(chart[0]).toHaveProperty('cost')
    expect(chart[0]).toHaveProperty('requests')
  })

  it('returns empty array for no metrics', () => {
    expect(buildDailyChart([])).toHaveLength(0)
  })

  it('entries are sorted by date ascending', () => {
    const unsorted: DailyMetric[] = [
      { date: '2026-04-30', carbonGrams: 0.15, costUsd: 0.03, requestCount: 15 },
      { date: '2026-04-28', carbonGrams: 0.1, costUsd: 0.02, requestCount: 10 },
      { date: '2026-04-29', carbonGrams: 0.2, costUsd: 0.04, requestCount: 20 },
    ]
    const chart = buildDailyChart(unsorted)
    expect(chart[0].date).toBe('2026-04-28')
    expect(chart[2].date).toBe('2026-04-30')
  })
})

describe('computeSavingsVsBaseline', () => {
  it('returns positive savings when actual cost is below baseline', () => {
    const result = computeSavingsVsBaseline({ actualCostUsd: 0.5, baselineCostUsd: 1.0 })
    expect(result.savedUsd).toBeCloseTo(0.5, 5)
    expect(result.savedPercent).toBeCloseTo(50, 5)
  })

  it('returns zero savings when actual equals baseline', () => {
    const result = computeSavingsVsBaseline({ actualCostUsd: 1.0, baselineCostUsd: 1.0 })
    expect(result.savedUsd).toBeCloseTo(0, 5)
    expect(result.savedPercent).toBeCloseTo(0, 5)
  })

  it('returns negative savings (overspend) when actual exceeds baseline', () => {
    const result = computeSavingsVsBaseline({ actualCostUsd: 1.5, baselineCostUsd: 1.0 })
    expect(result.savedUsd).toBeCloseTo(-0.5, 5)
    expect(result.savedPercent).toBeCloseTo(-50, 5)
  })

  it('returns zero for zero baseline to avoid division by zero', () => {
    const result = computeSavingsVsBaseline({ actualCostUsd: 0.5, baselineCostUsd: 0 })
    expect(result.savedPercent).toBe(0)
  })

  it('also computes carbon savings in grams', () => {
    const result = computeSavingsVsBaseline({
      actualCostUsd: 0.5,
      baselineCostUsd: 1.0,
      actualCarbonGrams: 0.02,
      baselineCarbonGrams: 0.04,
    })
    expect(result.savedCarbonGrams).toBeCloseTo(0.02, 5)
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { CarbonTracker, estimateRequestCarbon } from './carbon-tracker.js'
import type { CarbonEstimate } from './carbon-tracker.js'

describe('estimateRequestCarbon', () => {
  it('returns correct structure', () => {
    const est = estimateRequestCarbon('sonnet', 1000, 500)
    expect(est).toHaveProperty('totalTokens', 1500)
    expect(est).toHaveProperty('tier', 'sonnet')
    expect(est).toHaveProperty('energyKwh')
    expect(est).toHaveProperty('carbonGrams')
    expect(est).toHaveProperty('gridIntensity')
  })

  it('sums input and output tokens', () => {
    const est = estimateRequestCarbon('haiku', 800, 200)
    expect(est.totalTokens).toBe(1000)
  })

  it('calculates energy based on tier', () => {
    const haiku = estimateRequestCarbon('haiku', 1000, 0)
    const sonnet = estimateRequestCarbon('sonnet', 1000, 0)
    const opus = estimateRequestCarbon('opus', 1000, 0)
    expect(haiku.energyKwh).toBeLessThan(sonnet.energyKwh)
    expect(sonnet.energyKwh).toBeLessThan(opus.energyKwh)
  })

  it('scales carbon with token count', () => {
    const small = estimateRequestCarbon('sonnet', 100, 0)
    const large = estimateRequestCarbon('sonnet', 10000, 0)
    expect(large.carbonGrams).toBeGreaterThan(small.carbonGrams)
    expect(large.carbonGrams / small.carbonGrams).toBeCloseTo(100, 0)
  })

  it('uses default grid intensity when not provided', () => {
    const est = estimateRequestCarbon('sonnet', 1000, 0)
    expect(est.gridIntensity).toBe(0.39)
  })

  it('accepts custom grid intensity', () => {
    const low = estimateRequestCarbon('sonnet', 1000, 0, 0.1)
    const high = estimateRequestCarbon('sonnet', 1000, 0, 0.8)
    expect(low.gridIntensity).toBe(0.1)
    expect(high.gridIntensity).toBe(0.8)
    expect(high.carbonGrams).toBeGreaterThan(low.carbonGrams)
  })

  it('returns zero carbon for zero tokens', () => {
    const est = estimateRequestCarbon('haiku', 0, 0)
    expect(est.totalTokens).toBe(0)
    expect(est.energyKwh).toBe(0)
    expect(est.carbonGrams).toBe(0)
  })
})

describe('CarbonTracker', () => {
  let tracker: CarbonTracker

  beforeEach(() => {
    tracker = new CarbonTracker()
  })

  it('starts empty', () => {
    expect(tracker.count()).toBe(0)
  })

  it('records an estimate', () => {
    const est = estimateRequestCarbon('sonnet', 1000, 500)
    tracker.record(est)
    expect(tracker.count()).toBe(1)
  })

  it('records a request and returns estimate', () => {
    const est = tracker.recordRequest('haiku', 500, 200)
    expect(est.tier).toBe('haiku')
    expect(est.totalTokens).toBe(700)
    expect(tracker.count()).toBe(1)
  })

  it('accumulates multiple requests', () => {
    tracker.recordRequest('haiku', 500, 200)
    tracker.recordRequest('sonnet', 1000, 500)
    tracker.recordRequest('opus', 2000, 1000)
    expect(tracker.count()).toBe(3)
  })

  it('clears all estimates', () => {
    tracker.recordRequest('haiku', 500, 200)
    tracker.recordRequest('sonnet', 1000, 500)
    tracker.clear()
    expect(tracker.count()).toBe(0)
  })

  describe('summarize', () => {
    it('returns zeros for empty tracker', () => {
      const summary = tracker.summarize()
      expect(summary.totalCarbonGrams).toBe(0)
      expect(summary.totalEnergyKwh).toBe(0)
      expect(summary.totalTokens).toBe(0)
      expect(summary.requestCount).toBe(0)
      expect(summary.avgCarbonPerRequest).toBe(0)
    })

    it('aggregates totals across requests', () => {
      tracker.recordRequest('sonnet', 1000, 500)
      tracker.recordRequest('sonnet', 2000, 1000)
      const summary = tracker.summarize()
      expect(summary.totalTokens).toBe(4500)
      expect(summary.requestCount).toBe(2)
      expect(summary.totalCarbonGrams).toBeGreaterThan(0)
      expect(summary.totalEnergyKwh).toBeGreaterThan(0)
    })

    it('calculates average carbon per request', () => {
      tracker.recordRequest('sonnet', 1000, 0)
      tracker.recordRequest('sonnet', 1000, 0)
      const summary = tracker.summarize()
      expect(summary.avgCarbonPerRequest).toBeCloseTo(summary.totalCarbonGrams / 2)
    })

    it('breaks down by tier', () => {
      tracker.recordRequest('haiku', 500, 200)
      tracker.recordRequest('sonnet', 1000, 500)
      tracker.recordRequest('opus', 2000, 1000)
      const summary = tracker.summarize()
      expect(summary.tierBreakdown.haiku.tokens).toBe(700)
      expect(summary.tierBreakdown.sonnet.tokens).toBe(1500)
      expect(summary.tierBreakdown.opus.tokens).toBe(3000)
      expect(summary.tierBreakdown.haiku.carbonGrams).toBeGreaterThan(0)
      expect(summary.tierBreakdown.sonnet.carbonGrams).toBeGreaterThan(0)
      expect(summary.tierBreakdown.opus.carbonGrams).toBeGreaterThan(0)
    })

    it('includes carbon equivalents', () => {
      tracker.recordRequest('opus', 10000, 5000)
      const summary = tracker.summarize()
      expect(summary.equivalents.googleSearches).toBeGreaterThan(0)
      expect(summary.equivalents.kmDriven).toBeGreaterThan(0)
      expect(summary.equivalents.smartphoneCharges).toBeGreaterThan(0)
    })

    it('opus has higher carbon than haiku for same token count', () => {
      const t1 = new CarbonTracker()
      const t2 = new CarbonTracker()
      t1.recordRequest('haiku', 5000, 5000)
      t2.recordRequest('opus', 5000, 5000)
      expect(t2.summarize().totalCarbonGrams).toBeGreaterThan(t1.summarize().totalCarbonGrams)
    })
  })
})

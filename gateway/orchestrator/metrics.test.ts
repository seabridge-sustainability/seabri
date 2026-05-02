import { describe, it, expect, beforeEach } from 'vitest'
import { estimateCarbon, recordMetric, getRecentMetrics, aggregateMetrics, clearInMemoryMetrics } from './metrics.js'
import type { MetricEvent } from './metrics.js'

describe('Metrics Tracker', () => {
  beforeEach(() => {
    clearInMemoryMetrics()
  })

  describe('estimateCarbon', () => {
    it('returns positive value for non-zero tokens', () => {
      const carbon = estimateCarbon('sonnet', 1000, 500)
      expect(carbon).toBeGreaterThan(0)
    })

    it('returns 0 for 0 tokens', () => {
      const carbon = estimateCarbon('haiku', 0, 0)
      expect(carbon).toBe(0)
    })

    it('haiku produces less carbon than sonnet', () => {
      const haikuCarbon = estimateCarbon('haiku', 1000, 500)
      const sonnetCarbon = estimateCarbon('sonnet', 1000, 500)
      expect(haikuCarbon).toBeLessThan(sonnetCarbon)
    })

    it('sonnet produces less carbon than opus', () => {
      const sonnetCarbon = estimateCarbon('sonnet', 1000, 500)
      const opusCarbon = estimateCarbon('opus', 1000, 500)
      expect(sonnetCarbon).toBeLessThan(opusCarbon)
    })

    it('scales linearly with tokens', () => {
      const singleCarbon = estimateCarbon('sonnet', 1000, 0)
      const doubleCarbon = estimateCarbon('sonnet', 2000, 0)
      expect(doubleCarbon).toBeCloseTo(singleCarbon * 2, 10)
    })
  })

  describe('recordMetric', () => {
    const baseEvent: MetricEvent = {
      agentId: 'climate-risk',
      model: 'claude-sonnet-4-6',
      tier: 'sonnet',
      inputTokens: 1000,
      outputTokens: 500,
      latencyMs: 2500,
      toolCalls: 1,
    }

    it('records a metric and returns enriched data', async () => {
      const result = await recordMetric(baseEvent)
      expect(result.costUsd).toBeGreaterThan(0)
      expect(result.carbonGrams).toBeGreaterThan(0)
      expect(result.timestamp).toBeInstanceOf(Date)
    })

    it('adds to in-memory store', async () => {
      expect(getRecentMetrics()).toHaveLength(0)
      await recordMetric(baseEvent)
      expect(getRecentMetrics()).toHaveLength(1)
    })

    it('limits in-memory store size', async () => {
      for (let i = 0; i < 510; i++) {
        await recordMetric({ ...baseEvent, latencyMs: i })
      }
      expect(getRecentMetrics(1000).length).toBeLessThanOrEqual(500)
    })
  })

  describe('aggregateMetrics', () => {
    it('returns zero totals for empty metrics', () => {
      const agg = aggregateMetrics([])
      expect(agg.totalRequests).toBe(0)
      expect(agg.totalCostUsd).toBe(0)
      expect(agg.totalCarbonGrams).toBe(0)
    })

    it('aggregates multiple metrics correctly', async () => {
      await recordMetric({
        agentId: 'climate-risk',
        model: 'claude-sonnet-4-6',
        tier: 'sonnet',
        inputTokens: 1000,
        outputTokens: 500,
        latencyMs: 2000,
        toolCalls: 0,
      })
      await recordMetric({
        agentId: 'net-zero',
        model: 'claude-haiku-4-5-20251001',
        tier: 'haiku',
        inputTokens: 500,
        outputTokens: 200,
        latencyMs: 800,
        toolCalls: 1,
      })

      const agg = aggregateMetrics()
      expect(agg.totalRequests).toBe(2)
      expect(agg.totalInputTokens).toBe(1500)
      expect(agg.totalOutputTokens).toBe(700)
      expect(agg.totalCostUsd).toBeGreaterThan(0)
      expect(agg.totalCarbonGrams).toBeGreaterThan(0)
      expect(agg.avgLatencyMs).toBe(1400)
      expect(Object.keys(agg.byModel)).toHaveLength(2)
      expect(Object.keys(agg.byAgent)).toHaveLength(2)
    })

    it('groups by model correctly', async () => {
      await recordMetric({
        model: 'claude-sonnet-4-6',
        tier: 'sonnet',
        inputTokens: 100,
        outputTokens: 50,
        latencyMs: 500,
        toolCalls: 0,
      })
      await recordMetric({
        model: 'claude-sonnet-4-6',
        tier: 'sonnet',
        inputTokens: 200,
        outputTokens: 100,
        latencyMs: 700,
        toolCalls: 0,
      })

      const agg = aggregateMetrics()
      const sonnetStats = agg.byModel['claude-sonnet-4-6']
      expect(sonnetStats.requests).toBe(2)
      expect(sonnetStats.tokens).toBe(450)
    })
  })

  describe('clearInMemoryMetrics', () => {
    it('clears all stored metrics', async () => {
      await recordMetric({
        model: 'claude-sonnet-4-6',
        tier: 'sonnet',
        inputTokens: 100,
        outputTokens: 50,
        latencyMs: 500,
        toolCalls: 0,
      })
      expect(getRecentMetrics()).toHaveLength(1)
      clearInMemoryMetrics()
      expect(getRecentMetrics()).toHaveLength(0)
    })
  })
})

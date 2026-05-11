import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../orchestrator/metrics.js', () => {
  const now = new Date()
  const makeMetric = (tier: 'haiku' | 'sonnet' | 'opus', agentId: string, minutesAgo: number) => ({
    model: `claude-${tier}-4-5`,
    tier,
    inputTokens: 500,
    outputTokens: 300,
    latencyMs: 200,
    toolCalls: 0,
    costUsd: tier === 'haiku' ? 0.002 : tier === 'sonnet' ? 0.01 : 0.05,
    carbonGrams: tier === 'haiku' ? 0.003 : tier === 'sonnet' ? 0.012 : 0.05,
    timestamp: new Date(now.getTime() - minutesAgo * 60000),
    sessionId: 'sess-1',
    agentId,
  })

  return {
    getRecentMetrics: vi.fn().mockReturnValue([
      makeMetric('haiku', 'climate-risk', 10),
      makeMetric('haiku', 'climate-risk', 20),
      makeMetric('sonnet', 'net-zero', 30),
      makeMetric('opus', 'sustainability-reporting', 60),
      makeMetric('haiku', 'general', 120),
    ]),
    aggregateMetrics: vi.fn().mockImplementation((records: any[]) => ({
      totalRequests: records.length,
      totalInputTokens: records.length * 500,
      totalOutputTokens: records.length * 300,
      totalCostUsd: records.reduce((s: number, m: any) => s + m.costUsd, 0),
      totalCarbonGrams: records.reduce((s: number, m: any) => s + m.carbonGrams, 0),
      avgLatencyMs: 200,
      byModel: {},
      byAgent: {},
    })),
  }
})

import { generateCarbonReport } from './carbon-report.js'

describe('generateCarbonReport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a report with all required fields', () => {
    const report = generateCarbonReport(7)
    expect(report.generatedAt).toBeTruthy()
    expect(report.periodDays).toBe(7)
    expect(report.summary).toBeDefined()
    expect(report.daily).toBeInstanceOf(Array)
    expect(report.byAgent).toBeDefined()
    expect(report.byTier).toBeDefined()
    expect(report.recommendations).toBeInstanceOf(Array)
  })

  it('calculates summary totals from metrics', () => {
    const report = generateCarbonReport(7)
    expect(report.summary.totalRequests).toBe(5)
    expect(report.summary.totalCarbonGrams).toBeGreaterThan(0)
    expect(report.summary.totalCostUsd).toBeGreaterThan(0)
  })

  it('includes carbon equivalent in summary', () => {
    const report = generateCarbonReport(7)
    expect(report.summary.carbonEquivalent).toMatch(/driving/)
  })

  it('breaks down by agent', () => {
    const report = generateCarbonReport(7)
    expect(report.byAgent['climate-risk']).toBeDefined()
    expect(report.byAgent['climate-risk'].requests).toBe(2)
  })

  it('breaks down by tier with percentages', () => {
    const report = generateCarbonReport(7)
    expect(report.byTier['haiku']).toBeDefined()
    expect(report.byTier['haiku'].percentage).toBeGreaterThan(0)
    expect(report.byTier['sonnet']).toBeDefined()
  })

  it('generates sustainability recommendations', () => {
    const report = generateCarbonReport(7)
    expect(report.recommendations.length).toBeGreaterThan(0)
    expect(report.recommendations[0]).toBeTruthy()
  })

  it('groups metrics into daily buckets', () => {
    const report = generateCarbonReport(7)
    expect(report.daily.length).toBeGreaterThan(0)
    for (const day of report.daily) {
      expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(day.requests).toBeGreaterThan(0)
    }
  })

  it('includes sustainability tier in summary', () => {
    const report = generateCarbonReport(7)
    expect(['excellent', 'good', 'fair', 'poor']).toContain(report.summary.sustainabilityTier)
  })
})

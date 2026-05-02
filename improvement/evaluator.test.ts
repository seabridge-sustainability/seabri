import { describe, it, expect } from 'vitest'
import {
  buildAgentScorecard,
  rankAgents,
  identifyUnderperformers,
  type AgentMetrics,
  type AgentScorecard,
} from './evaluator.js'

const makeMetrics = (overrides: Partial<AgentMetrics> = {}): AgentMetrics => ({
  agentId: 'climate-risk',
  totalTasks: 100,
  successfulTasks: 80,
  totalLatencyMs: 50000,
  totalCostUsd: 5.0,
  satisfactionRate: 75,
  ...overrides,
})

describe('buildAgentScorecard', () => {
  it('computes task success rate', () => {
    const sc = buildAgentScorecard(makeMetrics({ totalTasks: 100, successfulTasks: 90 }))
    expect(sc.successRate).toBeCloseTo(90, 5)
  })

  it('computes average latency in ms', () => {
    const sc = buildAgentScorecard(makeMetrics({ totalTasks: 10, totalLatencyMs: 30000 }))
    expect(sc.avgLatencyMs).toBeCloseTo(3000, 5)
  })

  it('computes cost per successful task', () => {
    const sc = buildAgentScorecard(
      makeMetrics({ totalTasks: 100, successfulTasks: 80, totalCostUsd: 8.0 }),
    )
    expect(sc.costPerSuccessUsd).toBeCloseTo(0.1, 5)
  })

  it('handles zero successful tasks without dividing by zero', () => {
    const sc = buildAgentScorecard(makeMetrics({ successfulTasks: 0, totalCostUsd: 5.0 }))
    expect(sc.costPerSuccessUsd).toBe(0)
  })

  it('handles zero total tasks without dividing by zero', () => {
    const sc = buildAgentScorecard(makeMetrics({ totalTasks: 0, successfulTasks: 0, totalLatencyMs: 0 }))
    expect(sc.successRate).toBe(0)
    expect(sc.avgLatencyMs).toBe(0)
  })

  it('carries through satisfactionRate unchanged', () => {
    const sc = buildAgentScorecard(makeMetrics({ satisfactionRate: 62.5 }))
    expect(sc.satisfactionRate).toBeCloseTo(62.5, 5)
  })

  it('computes an overall performance score 0–100', () => {
    const sc = buildAgentScorecard(makeMetrics())
    expect(sc.overallScore).toBeGreaterThanOrEqual(0)
    expect(sc.overallScore).toBeLessThanOrEqual(100)
  })

  it('returns a higher overall score for better metrics', () => {
    const good = buildAgentScorecard(
      makeMetrics({ successfulTasks: 95, satisfactionRate: 90, totalLatencyMs: 10000, totalCostUsd: 1.0 }),
    )
    const bad = buildAgentScorecard(
      makeMetrics({ successfulTasks: 40, satisfactionRate: 30, totalLatencyMs: 200000, totalCostUsd: 20.0 }),
    )
    expect(good.overallScore).toBeGreaterThan(bad.overallScore)
  })

  it('sets agentId on the scorecard', () => {
    const sc = buildAgentScorecard(makeMetrics({ agentId: 'net-zero' }))
    expect(sc.agentId).toBe('net-zero')
  })
})

describe('rankAgents', () => {
  it('returns agents sorted by overallScore descending', () => {
    const high = makeMetrics({ agentId: 'a', successfulTasks: 95, satisfactionRate: 90, totalLatencyMs: 5000, totalCostUsd: 1.0 })
    const low = makeMetrics({ agentId: 'b', successfulTasks: 40, satisfactionRate: 30, totalLatencyMs: 200000, totalCostUsd: 20.0 })
    const ranked = rankAgents([low, high])
    expect(ranked[0].agentId).toBe('a')
    expect(ranked[1].agentId).toBe('b')
  })

  it('returns empty array for empty input', () => {
    expect(rankAgents([])).toHaveLength(0)
  })

  it('handles a single agent', () => {
    const ranked = rankAgents([makeMetrics()])
    expect(ranked).toHaveLength(1)
    expect(ranked[0].agentId).toBe('climate-risk')
  })
})

describe('identifyUnderperformers', () => {
  it('returns agents below the threshold', () => {
    const good = makeMetrics({ agentId: 'good', successfulTasks: 95, satisfactionRate: 90, totalLatencyMs: 5000, totalCostUsd: 1.0 })
    const bad = makeMetrics({ agentId: 'bad', successfulTasks: 20, satisfactionRate: 10, totalLatencyMs: 500000, totalCostUsd: 50.0 })
    const under = identifyUnderperformers([good, bad], { threshold: 50 })
    expect(under.map((s) => s.agentId)).toContain('bad')
    expect(under.map((s) => s.agentId)).not.toContain('good')
  })

  it('returns empty array when all agents are above threshold', () => {
    const metrics = makeMetrics({ successfulTasks: 95, satisfactionRate: 90, totalLatencyMs: 5000, totalCostUsd: 1.0 })
    expect(identifyUnderperformers([metrics], { threshold: 10 })).toHaveLength(0)
  })

  it('defaults to threshold 50 when not specified', () => {
    const bad = makeMetrics({ agentId: 'bad', successfulTasks: 20, satisfactionRate: 10, totalLatencyMs: 500000, totalCostUsd: 50.0 })
    const under = identifyUnderperformers([bad])
    expect(under).toHaveLength(1)
  })
})

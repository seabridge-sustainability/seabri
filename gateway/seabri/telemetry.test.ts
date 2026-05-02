import { describe, it, expect, beforeEach } from 'vitest'
import { clearInMemoryMetrics } from '../orchestrator/metrics.js'
import { emitTaskTelemetry, getTelemetrySnapshot } from './telemetry.js'

beforeEach(() => {
  clearInMemoryMetrics()
})

describe('emitTaskTelemetry', () => {
  it('returns taskId, cost, carbon, sustainability, and timestamp', async () => {
    const result = await emitTaskTelemetry({
      taskId: 'task_test_1',
      agentId: 'climate-risk',
      model: 'claude-haiku-4-5-20251001',
      tier: 'haiku',
      inputTokens: 500,
      outputTokens: 300,
      latencyMs: 400,
    })
    expect(result.taskId).toBe('task_test_1')
    expect(result.costUsd).toBeGreaterThan(0)
    expect(result.carbonGrams).toBeGreaterThan(0)
    expect(result.sustainability.composite).toBeGreaterThanOrEqual(0)
    expect(result.timestamp).toBeInstanceOf(Date)
  })

  it('sustainability tier is a valid value', async () => {
    const result = await emitTaskTelemetry({
      taskId: 'task_test_2',
      model: 'claude-haiku-4-5-20251001',
      tier: 'haiku',
      inputTokens: 100,
      outputTokens: 50,
      latencyMs: 200,
    })
    expect(['excellent', 'good', 'fair', 'poor']).toContain(result.sustainability.tier)
  })
})

describe('getTelemetrySnapshot', () => {
  it('returns zero counts on empty state', () => {
    const snapshot = getTelemetrySnapshot()
    expect(snapshot.recentCount).toBe(0)
    expect(snapshot.aggregated.totalRequests).toBe(0)
    expect(snapshot.sustainabilityScore.totalCostUsd).toBe(0)
  })

  it('reflects emitted events', async () => {
    await emitTaskTelemetry({
      taskId: 'task_snap_1',
      model: 'claude-haiku-4-5-20251001',
      tier: 'haiku',
      inputTokens: 300,
      outputTokens: 150,
      latencyMs: 300,
    })
    const snapshot = getTelemetrySnapshot()
    expect(snapshot.recentCount).toBe(1)
    expect(snapshot.aggregated.totalRequests).toBe(1)
    expect(snapshot.aggregated.totalCostUsd).toBeGreaterThan(0)
  })

  it('sustainability avgComposite is 0-100', async () => {
    await emitTaskTelemetry({
      taskId: 'task_snap_2',
      model: 'claude-sonnet-4-6',
      tier: 'sonnet',
      inputTokens: 600,
      outputTokens: 400,
      latencyMs: 800,
    })
    const snapshot = getTelemetrySnapshot()
    expect(snapshot.sustainabilityScore.avgComposite).toBeGreaterThanOrEqual(0)
    expect(snapshot.sustainabilityScore.avgComposite).toBeLessThanOrEqual(100)
  })
})

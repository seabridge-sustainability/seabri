import type { ModelTier } from '../orchestrator/model-router.js'
import { recordMetric, aggregateMetrics, getRecentMetrics } from '../orchestrator/metrics.js'
import type { RecordedMetric, AggregatedMetrics } from '../orchestrator/metrics.js'
import { scoreSustainability, aggregateSustainabilityScores } from './sustainability-scoring.js'
import type { SustainabilityScore } from './sustainability-scoring.js'

export interface TaskTelemetryEvent {
  taskId: string
  sessionId?: string
  agentId?: string
  model: string
  tier: ModelTier
  inputTokens: number
  outputTokens: number
  latencyMs: number
  toolCalls?: number
}

export interface TaskTelemetryResult {
  taskId: string
  costUsd: number
  carbonGrams: number
  sustainability: SustainabilityScore
  timestamp: Date
}

/** Emit a telemetry event for a completed task and return enriched result. */
export async function emitTaskTelemetry(event: TaskTelemetryEvent): Promise<TaskTelemetryResult> {
  const recorded: RecordedMetric = await recordMetric({
    sessionId: event.sessionId,
    agentId: event.agentId,
    model: event.model,
    tier: event.tier,
    inputTokens: event.inputTokens,
    outputTokens: event.outputTokens,
    latencyMs: event.latencyMs,
    toolCalls: event.toolCalls ?? 0,
  })

  const sustainability = scoreSustainability(recorded.costUsd, recorded.carbonGrams, event.tier)

  return {
    taskId: event.taskId,
    costUsd: recorded.costUsd,
    carbonGrams: recorded.carbonGrams,
    sustainability,
    timestamp: recorded.timestamp,
  }
}

export interface TelemetrySnapshot {
  aggregated: AggregatedMetrics
  sustainabilityScore: ReturnType<typeof aggregateSustainabilityScores>
  recentCount: number
  lastRoutingTier?: ModelTier
}

/** Get a snapshot of aggregated metrics with sustainability scoring. */
export function getTelemetrySnapshot(limit = 100): TelemetrySnapshot {
  const recent = getRecentMetrics(limit)
  const aggregated = aggregateMetrics(recent)

  const scores = recent.map((m) =>
    scoreSustainability(m.costUsd, m.carbonGrams, m.tier),
  )
  const sustainabilityScore = aggregateSustainabilityScores(scores)
  const lastRoutingTier = recent.at(-1)?.tier

  return {
    aggregated,
    sustainabilityScore,
    recentCount: recent.length,
    lastRoutingTier,
  }
}

export interface DailyBucket {
  date: string
  requestCount: number
  costUsd: number
  carbonGrams: number
  avgLatencyMs: number
}

/** Group recent metrics into daily buckets (newest-first, up to `days` days). */
export function getTelemetryHistory(days = 7): DailyBucket[] {
  const all = getRecentMetrics(500)
  const byDay = new Map<string, { count: number; cost: number; carbon: number; latency: number }>()

  for (const m of all) {
    const day = m.timestamp.toISOString().slice(0, 10)
    const bucket = byDay.get(day) ?? { count: 0, cost: 0, carbon: 0, latency: 0 }
    bucket.count++
    bucket.cost += m.costUsd
    bucket.carbon += m.carbonGrams
    bucket.latency += m.latencyMs
    byDay.set(day, bucket)
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, days)
    .map(([date, b]) => ({
      date,
      requestCount: b.count,
      costUsd: b.cost,
      carbonGrams: b.carbon,
      avgLatencyMs: b.count > 0 ? Math.round(b.latency / b.count) : 0,
    }))
}

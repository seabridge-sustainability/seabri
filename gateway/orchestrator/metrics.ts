import type { ModelTier } from './model-router.js'
import { getModelCost } from './model-router.js'
import { isDbConfigured, getDb } from '../../db/client.js'
import { metrics } from '../../db/schema.js'

// Energy per 1K tokens (kWh) — derived from Luccioni et al. 2023 estimates
// adjusted for inference (not training). Conservative upper bounds.
const ENERGY_PER_1K_TOKENS: Record<ModelTier, number> = {
  haiku: 0.00001,   // ~10 Wh per 1M tokens
  sonnet: 0.00004,  // ~40 Wh per 1M tokens
  opus: 0.00012,    // ~120 Wh per 1M tokens
}

// US average grid intensity: ~0.39 kgCO2/kWh (EPA eGRID 2022)
const GRID_INTENSITY_KG_CO2_PER_KWH = 0.39

export interface MetricEvent {
  sessionId?: string
  workflowRunId?: string
  agentId?: string
  model: string
  tier: ModelTier
  inputTokens: number
  outputTokens: number
  latencyMs: number
  toolCalls: number
}

export interface RecordedMetric extends MetricEvent {
  costUsd: number
  carbonGrams: number
  timestamp: Date
}

const recentMetrics: RecordedMetric[] = []
const MAX_IN_MEMORY = 500

export function estimateCarbon(tier: ModelTier, inputTokens: number, outputTokens: number): number {
  const totalTokensK = (inputTokens + outputTokens) / 1000
  const energyKwh = totalTokensK * ENERGY_PER_1K_TOKENS[tier]
  const carbonKg = energyKwh * GRID_INTENSITY_KG_CO2_PER_KWH
  return carbonKg * 1000 // grams
}

export async function recordMetric(event: MetricEvent): Promise<RecordedMetric> {
  const costUsd = getModelCost(event.tier, event.inputTokens, event.outputTokens)
  const carbonGrams = estimateCarbon(event.tier, event.inputTokens, event.outputTokens)

  const recorded: RecordedMetric = {
    ...event,
    costUsd,
    carbonGrams,
    timestamp: new Date(),
  }

  recentMetrics.push(recorded)
  if (recentMetrics.length > MAX_IN_MEMORY) recentMetrics.shift()

  if (isDbConfigured()) {
    try {
      const db = getDb()
      await db.insert(metrics).values({
        sessionId: event.sessionId || null,
        workflowRunId: event.workflowRunId || null,
        agentId: event.agentId || null,
        model: event.model,
        inputTokens: event.inputTokens,
        outputTokens: event.outputTokens,
        costUsd,
        latencyMs: event.latencyMs,
        carbonGrams,
        toolCalls: event.toolCalls,
      })
    } catch {
      // DB write failure is non-fatal — metric is still in memory
    }
  }

  return recorded
}

export interface AggregatedMetrics {
  totalRequests: number
  totalInputTokens: number
  totalOutputTokens: number
  totalCostUsd: number
  totalCarbonGrams: number
  avgLatencyMs: number
  byModel: Record<string, { requests: number; costUsd: number; tokens: number }>
  byAgent: Record<string, { requests: number; costUsd: number }>
}

export function getRecentMetrics(limit: number = 50): RecordedMetric[] {
  return recentMetrics.slice(-limit)
}

export function aggregateMetrics(records?: RecordedMetric[]): AggregatedMetrics {
  const source = records ?? recentMetrics

  const result: AggregatedMetrics = {
    totalRequests: source.length,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCostUsd: 0,
    totalCarbonGrams: 0,
    avgLatencyMs: 0,
    byModel: {},
    byAgent: {},
  }

  if (source.length === 0) return result

  let totalLatency = 0
  for (const m of source) {
    result.totalInputTokens += m.inputTokens
    result.totalOutputTokens += m.outputTokens
    result.totalCostUsd += m.costUsd
    result.totalCarbonGrams += m.carbonGrams
    totalLatency += m.latencyMs

    if (!result.byModel[m.model]) {
      result.byModel[m.model] = { requests: 0, costUsd: 0, tokens: 0 }
    }
    result.byModel[m.model].requests++
    result.byModel[m.model].costUsd += m.costUsd
    result.byModel[m.model].tokens += m.inputTokens + m.outputTokens

    const agent = m.agentId ?? 'unknown'
    if (!result.byAgent[agent]) {
      result.byAgent[agent] = { requests: 0, costUsd: 0 }
    }
    result.byAgent[agent].requests++
    result.byAgent[agent].costUsd += m.costUsd
  }

  result.avgLatencyMs = Math.round(totalLatency / source.length)
  return result
}

export function clearInMemoryMetrics(): void {
  recentMetrics.length = 0
}

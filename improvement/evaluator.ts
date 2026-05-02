export interface AgentMetrics {
  agentId: string
  totalTasks: number
  successfulTasks: number
  totalLatencyMs: number
  totalCostUsd: number
  satisfactionRate: number
}

export interface AgentScorecard {
  agentId: string
  successRate: number
  avgLatencyMs: number
  costPerSuccessUsd: number
  satisfactionRate: number
  overallScore: number
}

// Normalise latency to 0–100: excellent <500ms → 100, terrible >60s → 0
function normalizeLatency(avgMs: number): number {
  if (avgMs <= 500) return 100
  if (avgMs >= 60_000) return 0
  return 100 - ((avgMs - 500) / (60_000 - 500)) * 100
}

// Normalise cost per success: excellent <$0.01 → 100, terrible >$1 → 0
function normalizeCost(costPerSuccess: number): number {
  if (costPerSuccess <= 0) return 100
  if (costPerSuccess >= 1) return 0
  return 100 - (costPerSuccess / 1) * 100
}

export function buildAgentScorecard(m: AgentMetrics): AgentScorecard {
  const successRate = m.totalTasks === 0 ? 0 : (m.successfulTasks / m.totalTasks) * 100
  const avgLatencyMs = m.totalTasks === 0 ? 0 : m.totalLatencyMs / m.totalTasks
  const costPerSuccessUsd = m.successfulTasks === 0 ? 0 : m.totalCostUsd / m.successfulTasks

  // Weighted overall: successRate 35%, satisfaction 35%, latency 15%, cost 15%
  const latencyScore = normalizeLatency(avgLatencyMs)
  const costScore = normalizeCost(costPerSuccessUsd)
  const overallScore =
    successRate * 0.35 +
    m.satisfactionRate * 0.35 +
    latencyScore * 0.15 +
    costScore * 0.15

  return {
    agentId: m.agentId,
    successRate,
    avgLatencyMs,
    costPerSuccessUsd,
    satisfactionRate: m.satisfactionRate,
    overallScore: Math.max(0, Math.min(100, overallScore)),
  }
}

export function rankAgents(metrics: AgentMetrics[]): AgentScorecard[] {
  return metrics
    .map(buildAgentScorecard)
    .sort((a, b) => b.overallScore - a.overallScore)
}

export function identifyUnderperformers(
  metrics: AgentMetrics[],
  opts: { threshold?: number } = {},
): AgentScorecard[] {
  const threshold = opts.threshold ?? 50
  return metrics
    .map(buildAgentScorecard)
    .filter((sc) => sc.overallScore < threshold)
}

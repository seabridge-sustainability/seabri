import { getRecentMetrics, aggregateMetrics } from '../orchestrator/metrics.js'
import type { RecordedMetric } from '../orchestrator/metrics.js'
import { scoreSustainability, aggregateSustainabilityScores } from './sustainability-scoring.js'

export interface CarbonReportPeriod {
  date: string
  requests: number
  totalCarbonGrams: number
  totalCostUsd: number
  avgCarbonPerRequest: number
  avgCostPerRequest: number
  tierDistribution: Record<string, number>
}

export interface CarbonReport {
  generatedAt: string
  periodDays: number
  summary: {
    totalRequests: number
    totalCarbonGrams: number
    totalCostUsd: number
    avgSustainabilityScore: number
    sustainabilityTier: string
    carbonEquivalent: string
  }
  daily: CarbonReportPeriod[]
  byAgent: Record<string, { requests: number; carbonGrams: number; costUsd: number }>
  byTier: Record<string, { requests: number; carbonGrams: number; percentage: number }>
  recommendations: string[]
}

const DRIVING_GRAMS_CO2_PER_METER = 0.21

function carbonEquivalent(grams: number): string {
  const meters = grams / DRIVING_GRAMS_CO2_PER_METER
  if (meters < 1000) return `driving ${Math.round(meters)}m`
  return `driving ${(meters / 1000).toFixed(1)}km`
}

function generateRecommendations(
  metrics: RecordedMetric[],
  tierDist: Record<string, number>,
): string[] {
  const recs: string[] = []
  const total = metrics.length
  if (total === 0) return ['No usage data yet — start using SeaBri to track sustainability.']

  const opusPercent = ((tierDist['opus'] ?? 0) / total) * 100
  const haikuPercent = ((tierDist['haiku'] ?? 0) / total) * 100

  if (opusPercent > 20) {
    recs.push(`${Math.round(opusPercent)}% of requests use Opus. Consider routing simpler queries to Sonnet or Haiku to reduce carbon by up to 80%.`)
  }
  if (haikuPercent < 40 && total > 5) {
    recs.push(`Only ${Math.round(haikuPercent)}% of requests use Haiku. Target 40%+ for optimal sustainability.`)
  }
  if (haikuPercent >= 60) {
    recs.push('Excellent Haiku usage rate — your routing is well-optimized for sustainability.')
  }

  const avgCarbon = metrics.reduce((s, m) => s + m.carbonGrams, 0) / total
  if (avgCarbon > 0.1) {
    recs.push(`Average carbon per request is ${avgCarbon.toFixed(3)}g. Consider shorter prompts or response length limits.`)
  }

  return recs.length > 0 ? recs : ['Sustainability metrics are within normal range.']
}

export function generateCarbonReport(days = 7): CarbonReport {
  const all = getRecentMetrics(500)

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const filtered = all.filter((m) => m.timestamp >= cutoff)

  const aggregated = aggregateMetrics(filtered)
  const scores = filtered.map((m) =>
    scoreSustainability(m.costUsd, m.carbonGrams, m.tier),
  )
  const sustainability = aggregateSustainabilityScores(scores)

  // Daily buckets
  const byDay = new Map<string, { metrics: RecordedMetric[] }>()
  for (const m of filtered) {
    const day = m.timestamp.toISOString().slice(0, 10)
    const bucket = byDay.get(day) ?? { metrics: [] }
    bucket.metrics.push(m)
    byDay.set(day, bucket)
  }

  const daily: CarbonReportPeriod[] = [...byDay.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, { metrics: dayMetrics }]) => {
      const tierDist: Record<string, number> = {}
      let carbon = 0
      let cost = 0
      for (const m of dayMetrics) {
        carbon += m.carbonGrams
        cost += m.costUsd
        tierDist[m.tier] = (tierDist[m.tier] ?? 0) + 1
      }
      return {
        date,
        requests: dayMetrics.length,
        totalCarbonGrams: carbon,
        totalCostUsd: cost,
        avgCarbonPerRequest: dayMetrics.length > 0 ? carbon / dayMetrics.length : 0,
        avgCostPerRequest: dayMetrics.length > 0 ? cost / dayMetrics.length : 0,
        tierDistribution: tierDist,
      }
    })

  // By agent
  const byAgent: Record<string, { requests: number; carbonGrams: number; costUsd: number }> = {}
  for (const m of filtered) {
    const agent = m.agentId ?? 'unknown'
    if (!byAgent[agent]) byAgent[agent] = { requests: 0, carbonGrams: 0, costUsd: 0 }
    byAgent[agent].requests++
    byAgent[agent].carbonGrams += m.carbonGrams
    byAgent[agent].costUsd += m.costUsd
  }

  // By tier
  const tierCounts: Record<string, { requests: number; carbonGrams: number }> = {}
  for (const m of filtered) {
    if (!tierCounts[m.tier]) tierCounts[m.tier] = { requests: 0, carbonGrams: 0 }
    tierCounts[m.tier].requests++
    tierCounts[m.tier].carbonGrams += m.carbonGrams
  }
  const byTier: Record<string, { requests: number; carbonGrams: number; percentage: number }> = {}
  for (const [tier, data] of Object.entries(tierCounts)) {
    byTier[tier] = {
      ...data,
      percentage: filtered.length > 0 ? (data.requests / filtered.length) * 100 : 0,
    }
  }

  const tierDistribution: Record<string, number> = {}
  for (const [tier, data] of Object.entries(tierCounts)) {
    tierDistribution[tier] = data.requests
  }
  const recommendations = generateRecommendations(filtered, tierDistribution)

  return {
    generatedAt: new Date().toISOString(),
    periodDays: days,
    summary: {
      totalRequests: aggregated.totalRequests,
      totalCarbonGrams: aggregated.totalCarbonGrams,
      totalCostUsd: aggregated.totalCostUsd,
      avgSustainabilityScore: sustainability.avgComposite,
      sustainabilityTier: sustainability.tier,
      carbonEquivalent: carbonEquivalent(aggregated.totalCarbonGrams),
    },
    daily,
    byAgent,
    byTier,
    recommendations,
  }
}

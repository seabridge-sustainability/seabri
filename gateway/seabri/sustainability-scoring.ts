import type { ModelTier } from '../orchestrator/model-router.js'

export type SustainabilityTier = 'excellent' | 'good' | 'fair' | 'poor'

export interface SustainabilityScore {
  /** 0–100 composite score (higher = more sustainable) */
  composite: number
  tier: SustainabilityTier
  /** 0–100: lower cost = higher score */
  costEfficiency: number
  /** 0–100: lower carbon = higher score */
  carbonEfficiency: number
  breakdown: {
    costUsd: number
    carbonGrams: number
    modelTier: ModelTier
  }
}

const TIER_CARBON_BUDGET: Record<ModelTier, number> = {
  haiku: 0.01,   // gCO2e — baseline budget per request
  sonnet: 0.05,
  opus: 0.20,
}

const TIER_COST_BUDGET: Record<ModelTier, number> = {
  haiku: 0.0005,   // USD — baseline budget per request
  sonnet: 0.005,
  opus: 0.05,
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, v))
}

/**
 * Score a single inference call on sustainability dimensions.
 * Scores are relative to tier budget — a well-optimised haiku call scores
 * higher than a haiku call that uses 10× its expected token budget.
 */
export function scoreSustainability(
  costUsd: number,
  carbonGrams: number,
  modelTier: ModelTier,
): SustainabilityScore {
  const carbonBudget = TIER_CARBON_BUDGET[modelTier]
  const costBudget = TIER_COST_BUDGET[modelTier]

  // Carbon efficiency: 100 when at/below budget, drops linearly above it
  const carbonRatio = carbonGrams / Math.max(carbonBudget, 1e-10)
  const carbonEfficiency = clamp(Math.round((1 / Math.max(carbonRatio, 0.01)) * 100))

  // Cost efficiency: same pattern
  const costRatio = costUsd / Math.max(costBudget, 1e-10)
  const costEfficiency = clamp(Math.round((1 / Math.max(costRatio, 0.01)) * 100))

  // Composite: equal weight, slight penalty for using higher-tier model than necessary
  const tierPenalty = modelTier === 'haiku' ? 0 : modelTier === 'sonnet' ? 5 : 10
  const composite = clamp(Math.round((carbonEfficiency + costEfficiency) / 2 - tierPenalty))

  let tier: SustainabilityTier
  if (composite >= 75) tier = 'excellent'
  else if (composite >= 50) tier = 'good'
  else if (composite >= 25) tier = 'fair'
  else tier = 'poor'

  return {
    composite,
    tier,
    costEfficiency,
    carbonEfficiency,
    breakdown: { costUsd, carbonGrams, modelTier },
  }
}

export function aggregateSustainabilityScores(scores: SustainabilityScore[]): {
  avgComposite: number
  avgCostEfficiency: number
  avgCarbonEfficiency: number
  tier: SustainabilityTier
  totalCostUsd: number
  totalCarbonGrams: number
} {
  if (scores.length === 0) {
    return {
      avgComposite: 0,
      avgCostEfficiency: 0,
      avgCarbonEfficiency: 0,
      tier: 'poor',
      totalCostUsd: 0,
      totalCarbonGrams: 0,
    }
  }

  const avgComposite = Math.round(scores.reduce((s, r) => s + r.composite, 0) / scores.length)
  const avgCostEfficiency = Math.round(scores.reduce((s, r) => s + r.costEfficiency, 0) / scores.length)
  const avgCarbonEfficiency = Math.round(scores.reduce((s, r) => s + r.carbonEfficiency, 0) / scores.length)
  const totalCostUsd = scores.reduce((s, r) => s + r.breakdown.costUsd, 0)
  const totalCarbonGrams = scores.reduce((s, r) => s + r.breakdown.carbonGrams, 0)

  let tier: SustainabilityTier
  if (avgComposite >= 75) tier = 'excellent'
  else if (avgComposite >= 50) tier = 'good'
  else if (avgComposite >= 25) tier = 'fair'
  else tier = 'poor'

  return { avgComposite, avgCostEfficiency, avgCarbonEfficiency, tier, totalCostUsd, totalCarbonGrams }
}

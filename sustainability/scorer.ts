import { MODEL_ENERGY_FACTOR } from './carbon-model.js'

export type TaskComplexity = 'simple' | 'medium' | 'complex'

export interface DecisionInput {
  carbonGrams: number
  model: string
  inputTokens: number
  outputTokens: number
  taskComplexity: TaskComplexity
  userFollowedRecommendation: boolean | null
}

export interface DecisionScore {
  carbonScore: number
  efficiencyScore: number
  recommendationScore: number
  overallScore: number
  recommendations: string[]
}

export interface AggregateResult {
  count: number
  avgCarbonScore: number
  avgEfficiencyScore: number
  avgRecommendationScore: number
  avgOverallScore: number
  topRecommendations: string[]
}

// Optimal model for each complexity tier
export const EFFICIENCY_THRESHOLDS: Record<TaskComplexity, string> = {
  simple: 'claude-haiku-4-5',
  medium: 'claude-sonnet-4-6',
  complex: 'claude-opus-4-7',
}

// Carbon score: exponential decay — 0 grams = 100, ~0.05g ≈ 50, ≥1g → near 0
function computeCarbonScore(carbonGrams: number): number {
  if (carbonGrams <= 0) return 100
  return Math.max(0, Math.round(100 * Math.exp(-carbonGrams * 30)))
}

// Efficiency score: how close is the used model's energy factor to the optimal tier?
function computeEfficiencyScore(model: string, complexity: TaskComplexity): number {
  const optimalModel = EFFICIENCY_THRESHOLDS[complexity]
  const optimalFactor = MODEL_ENERGY_FACTOR[optimalModel] ?? 1.0
  const usedFactor = MODEL_ENERGY_FACTOR[model] ?? MODEL_ENERGY_FACTOR['claude-sonnet-4-6']

  if (usedFactor <= optimalFactor) return 100
  // Penalty: how many times more energy than needed
  const ratio = usedFactor / optimalFactor
  return Math.max(0, Math.round(100 / ratio))
}

function computeRecommendationScore(followed: boolean | null): number {
  if (followed === null) return 50
  return followed ? 100 : 0
}

function buildRecommendations(input: DecisionInput, efficiency: number, carbon: number): string[] {
  const recs: string[] = []

  const optimalModel = EFFICIENCY_THRESHOLDS[input.taskComplexity]
  const usedFactor = MODEL_ENERGY_FACTOR[input.model] ?? 1.0
  const optimalFactor = MODEL_ENERGY_FACTOR[optimalModel] ?? 1.0

  if (usedFactor > optimalFactor) {
    const betterModel = optimalFactor <= 0.1 ? 'claude-haiku-4-5' : 'claude-sonnet-4-6'
    recs.push(
      `Switch to a simpler model (${betterModel}) for ${input.taskComplexity} tasks to reduce energy use by ${Math.round((1 - optimalFactor / usedFactor) * 100)}%`,
    )
  }

  if (carbon > 0.05) {
    recs.push(`High carbon footprint detected (${input.carbonGrams.toFixed(4)}g CO₂e) — consider model routing or caching repeated queries`)
  }

  return recs
}

export function scoreDecision(input: DecisionInput): DecisionScore {
  const carbonScore = computeCarbonScore(input.carbonGrams)
  const efficiencyScore = computeEfficiencyScore(input.model, input.taskComplexity)
  const recommendationScore = computeRecommendationScore(input.userFollowedRecommendation)

  const overallScore = carbonScore * 0.4 + efficiencyScore * 0.4 + recommendationScore * 0.2
  const recommendations = overallScore >= 90 ? [] : buildRecommendations(input, efficiencyScore, carbonScore)

  return {
    carbonScore,
    efficiencyScore,
    recommendationScore,
    overallScore,
    recommendations,
  }
}

export function aggregateScores(scores: DecisionScore[]): AggregateResult {
  if (scores.length === 0) {
    return { count: 0, avgCarbonScore: 0, avgEfficiencyScore: 0, avgRecommendationScore: 0, avgOverallScore: 0, topRecommendations: [] }
  }

  const sum = scores.reduce(
    (acc, s) => ({
      carbon: acc.carbon + s.carbonScore,
      efficiency: acc.efficiency + s.efficiencyScore,
      recommendation: acc.recommendation + s.recommendationScore,
      overall: acc.overall + s.overallScore,
    }),
    { carbon: 0, efficiency: 0, recommendation: 0, overall: 0 },
  )

  const n = scores.length
  const allRecs = scores.flatMap((s) => s.recommendations)
  const topRecommendations = [...new Set(allRecs)]

  return {
    count: n,
    avgCarbonScore: sum.carbon / n,
    avgEfficiencyScore: sum.efficiency / n,
    avgRecommendationScore: sum.recommendation / n,
    avgOverallScore: sum.overall / n,
    topRecommendations,
  }
}

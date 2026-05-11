import type { ModelTier } from '../orchestrator/model-router.js'

export interface CarbonEstimate {
  totalTokens: number
  tier: ModelTier
  energyKwh: number
  carbonGrams: number
  gridIntensity: number
}

export interface SessionCarbonSummary {
  totalCarbonGrams: number
  totalEnergyKwh: number
  totalTokens: number
  requestCount: number
  avgCarbonPerRequest: number
  tierBreakdown: Record<ModelTier, { tokens: number; carbonGrams: number }>
  equivalents: CarbonEquivalents
}

export interface CarbonEquivalents {
  googleSearches: number
  kmDriven: number
  smartphoneCharges: number
}

const ENERGY_PER_1K_TOKENS: Record<ModelTier, number> = {
  haiku: 0.00001,
  sonnet: 0.00004,
  opus: 0.00012,
}

const DEFAULT_GRID_INTENSITY = 0.39

const CARBON_GOOGLE_SEARCH_GRAMS = 0.2
const CARBON_KM_DRIVEN_GRAMS = 121
const CARBON_PHONE_CHARGE_GRAMS = 8.22

export function estimateRequestCarbon(
  tier: ModelTier,
  inputTokens: number,
  outputTokens: number,
  gridIntensityKgCo2PerKwh: number = DEFAULT_GRID_INTENSITY
): CarbonEstimate {
  const totalTokens = inputTokens + outputTokens
  const energyKwh = (totalTokens / 1000) * ENERGY_PER_1K_TOKENS[tier]
  const carbonGrams = energyKwh * gridIntensityKgCo2PerKwh * 1000

  return {
    totalTokens,
    tier,
    energyKwh,
    carbonGrams,
    gridIntensity: gridIntensityKgCo2PerKwh,
  }
}

function computeEquivalents(carbonGrams: number): CarbonEquivalents {
  return {
    googleSearches: Math.round((carbonGrams / CARBON_GOOGLE_SEARCH_GRAMS) * 100) / 100,
    kmDriven: Math.round((carbonGrams / CARBON_KM_DRIVEN_GRAMS) * 10000) / 10000,
    smartphoneCharges: Math.round((carbonGrams / CARBON_PHONE_CHARGE_GRAMS) * 1000) / 1000,
  }
}

export class CarbonTracker {
  private readonly estimates: CarbonEstimate[] = []

  record(estimate: CarbonEstimate): void {
    this.estimates.push(estimate)
  }

  recordRequest(
    tier: ModelTier,
    inputTokens: number,
    outputTokens: number,
    gridIntensity?: number
  ): CarbonEstimate {
    const estimate = estimateRequestCarbon(tier, inputTokens, outputTokens, gridIntensity)
    this.estimates.push(estimate)
    return estimate
  }

  summarize(): SessionCarbonSummary {
    const tierBreakdown: Record<ModelTier, { tokens: number; carbonGrams: number }> = {
      haiku: { tokens: 0, carbonGrams: 0 },
      sonnet: { tokens: 0, carbonGrams: 0 },
      opus: { tokens: 0, carbonGrams: 0 },
    }

    let totalCarbonGrams = 0
    let totalEnergyKwh = 0
    let totalTokens = 0

    for (const e of this.estimates) {
      totalCarbonGrams += e.carbonGrams
      totalEnergyKwh += e.energyKwh
      totalTokens += e.totalTokens
      tierBreakdown[e.tier].tokens += e.totalTokens
      tierBreakdown[e.tier].carbonGrams += e.carbonGrams
    }

    return {
      totalCarbonGrams,
      totalEnergyKwh,
      totalTokens,
      requestCount: this.estimates.length,
      avgCarbonPerRequest: this.estimates.length > 0 ? totalCarbonGrams / this.estimates.length : 0,
      tierBreakdown,
      equivalents: computeEquivalents(totalCarbonGrams),
    }
  }

  clear(): void {
    this.estimates.length = 0
  }

  count(): number {
    return this.estimates.length
  }
}

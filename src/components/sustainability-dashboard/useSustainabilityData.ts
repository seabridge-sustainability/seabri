export interface DailyMetric {
  date: string
  carbonGrams: number
  costUsd: number
  requestCount: number
}

export interface ChartPoint {
  date: string
  carbon: number
  cost: number
  requests: number
}

export interface SavingsResult {
  savedUsd: number
  savedPercent: number
  savedCarbonGrams?: number
}

export function formatCarbonGrams(grams: number): string {
  if (grams < 0.001) return `${(grams * 1_000_000).toFixed(1)} μg CO₂e`
  if (grams < 1) return `${(grams * 1000).toFixed(1)} mg CO₂e`
  return `${grams.toFixed(2)} g CO₂e`
}

export function buildDailyChart(metrics: DailyMetric[]): ChartPoint[] {
  return [...metrics]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((m) => ({
      date: m.date,
      carbon: m.carbonGrams,
      cost: m.costUsd,
      requests: m.requestCount,
    }))
}

export function computeSavingsVsBaseline(input: {
  actualCostUsd: number
  baselineCostUsd: number
  actualCarbonGrams?: number
  baselineCarbonGrams?: number
}): SavingsResult {
  const { actualCostUsd, baselineCostUsd, actualCarbonGrams, baselineCarbonGrams } = input

  const savedUsd = baselineCostUsd - actualCostUsd
  const savedPercent = baselineCostUsd === 0 ? 0 : (savedUsd / baselineCostUsd) * 100

  const result: SavingsResult = { savedUsd, savedPercent }

  if (actualCarbonGrams !== undefined && baselineCarbonGrams !== undefined) {
    result.savedCarbonGrams = baselineCarbonGrams - actualCarbonGrams
  }

  return result
}

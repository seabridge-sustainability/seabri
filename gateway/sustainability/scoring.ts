export type SustainabilityDimension =
  | 'carbon-footprint'
  | 'energy-efficiency'
  | 'water-stewardship'
  | 'biodiversity-impact'
  | 'waste-circularity'
  | 'social-equity'

export interface DimensionScore {
  dimension: SustainabilityDimension
  score: number
  confidence: number
  sources: string[]
  notes?: string
}

export interface SustainabilityScore {
  overall: number
  dimensions: DimensionScore[]
  timestamp: Date
  entityId?: string
  entityType?: 'property' | 'company' | 'portfolio' | 'product'
}

const DIMENSION_WEIGHTS: Record<SustainabilityDimension, number> = {
  'carbon-footprint': 0.30,
  'energy-efficiency': 0.20,
  'water-stewardship': 0.15,
  'biodiversity-impact': 0.15,
  'waste-circularity': 0.10,
  'social-equity': 0.10,
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function computeOverallScore(dimensions: DimensionScore[]): number {
  if (dimensions.length === 0) return 0

  let weightedSum = 0
  let totalWeight = 0

  for (const dim of dimensions) {
    const weight = DIMENSION_WEIGHTS[dim.dimension] ?? 0
    const confidenceAdjusted = dim.score * dim.confidence
    weightedSum += confidenceAdjusted * weight
    totalWeight += weight * dim.confidence
  }

  if (totalWeight === 0) return 0
  return clamp(Math.round((weightedSum / totalWeight) * 100) / 100, 0, 100)
}

export function createSustainabilityScore(
  dimensions: DimensionScore[],
  entityId?: string,
  entityType?: SustainabilityScore['entityType']
): SustainabilityScore {
  return {
    overall: computeOverallScore(dimensions),
    dimensions: dimensions.map((d) => ({
      ...d,
      score: clamp(d.score, 0, 100),
      confidence: clamp(d.confidence, 0, 1),
    })),
    timestamp: new Date(),
    entityId,
    entityType,
  }
}

export function scoreToBand(score: number): string {
  if (score >= 80) return 'A'
  if (score >= 60) return 'B'
  if (score >= 40) return 'C'
  if (score >= 20) return 'D'
  return 'E'
}

export function formatScoreReport(score: SustainabilityScore): string {
  const lines: string[] = []
  const band = scoreToBand(score.overall)
  lines.push(`Sustainability Score: ${score.overall}/100 (Band ${band})`)

  if (score.entityId) {
    lines.push(`Entity: ${score.entityId} (${score.entityType ?? 'unknown'})`)
  }

  lines.push('')
  lines.push('Dimension Breakdown:')
  for (const dim of score.dimensions) {
    const dimBand = scoreToBand(dim.score)
    const conf = Math.round(dim.confidence * 100)
    lines.push(`  ${dim.dimension}: ${dim.score}/100 (${dimBand}, ${conf}% confidence)`)
    if (dim.sources.length > 0) {
      lines.push(`    Sources: ${dim.sources.join(', ')}`)
    }
    if (dim.notes) {
      lines.push(`    Notes: ${dim.notes}`)
    }
  }

  return lines.join('\n')
}

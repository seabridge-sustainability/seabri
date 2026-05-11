import { z } from 'zod'

export const ProductOptionSchema = z.object({
  name: z.string().min(1).max(160),
  attributes: z.object({
    cost: z.number().nonnegative().optional(),
    durable: z.boolean().optional(),
    repairable: z.boolean().optional(),
    reusable: z.boolean().optional(),
    recycledContent: z.boolean().optional(),
    minimalPackaging: z.boolean().optional(),
    local: z.boolean().optional(),
    energyEfficient: z.boolean().optional(),
    certifications: z.array(z.string().min(1).max(80)).optional(),
    notes: z.string().max(1000).optional(),
  }).optional(),
})

export const CompareProductsInputSchema = z.object({
  products: z.array(ProductOptionSchema).min(2).max(6),
  priorities: z.array(z.enum([
    'cost',
    'durability',
    'repairability',
    'packaging',
    'locality',
    'energy',
    'recycled-content',
  ])).optional(),
}).strict()

export type CompareProductsInput = z.infer<typeof CompareProductsInputSchema>

export interface ProductComparisonResult {
  recommendation: string
  products: Array<{
    name: string
    sustainabilityScore: number
    confidence: 'low' | 'medium'
    sourceStatus: 'user-provided' | 'unknown'
    considerations: {
      cost: string
      durability: string
      repairability: string
      packaging: string
      locality: string
      recycledContent: string
      certifications: string
    }
    assumptions: string[]
  }>
  saferOrMoreSustainableAlternative?: string
  unknowns: string[]
}

const PRIORITY_WEIGHTS: Record<string, number> = {
  cost: 4,
  durability: 12,
  repairability: 12,
  packaging: 8,
  locality: 8,
  energy: 8,
  'recycled-content': 8,
}

function label(value: boolean | undefined, yes: string, no: string, unknown: string): string {
  if (value === true) return yes
  if (value === false) return no
  return unknown
}

function scoreProduct(
  product: z.infer<typeof ProductOptionSchema>,
  priorities: string[],
): { score: number; assumptions: string[]; confidence: 'low' | 'medium' } {
  const attr = product.attributes ?? {}
  let score = 50
  const assumptions: string[] = []

  const add = (field: string, value: boolean | undefined, points: number) => {
    if (value === true) score += points
    else if (value === false) score -= Math.ceil(points / 2)
    else assumptions.push(`${field} not provided`)
  }

  add('durability', attr.durable, priorities.includes('durability') ? PRIORITY_WEIGHTS.durability : 8)
  add('repairability', attr.repairable, priorities.includes('repairability') ? PRIORITY_WEIGHTS.repairability : 8)
  add('reusability', attr.reusable, 6)
  add('recycled content', attr.recycledContent, priorities.includes('recycled-content') ? PRIORITY_WEIGHTS['recycled-content'] : 6)
  add('minimal packaging', attr.minimalPackaging, priorities.includes('packaging') ? PRIORITY_WEIGHTS.packaging : 6)
  add('local sourcing', attr.local, priorities.includes('locality') ? PRIORITY_WEIGHTS.locality : 5)
  add('energy efficiency', attr.energyEfficient, priorities.includes('energy') ? PRIORITY_WEIGHTS.energy : 5)

  if (attr.cost !== undefined && priorities.includes('cost')) {
    score += 2
  } else if (attr.cost === undefined) {
    assumptions.push('cost not provided')
  }

  if (attr.certifications?.length) {
    score += 4
  } else {
    assumptions.push('certifications not provided or not verified')
  }

  const knownFields = Object.values({
    durable: attr.durable,
    repairable: attr.repairable,
    reusable: attr.reusable,
    recycledContent: attr.recycledContent,
    minimalPackaging: attr.minimalPackaging,
    local: attr.local,
    energyEfficient: attr.energyEfficient,
    cost: attr.cost,
    certifications: attr.certifications?.length ? true : undefined,
  }).filter((v) => v !== undefined).length

  return {
    score: Math.max(0, Math.min(100, score)),
    assumptions,
    confidence: knownFields >= 5 ? 'medium' : 'low',
  }
}

export function compareProducts(input: unknown): ProductComparisonResult {
  const parsed = CompareProductsInputSchema.parse(input)
  const priorities = parsed.priorities ?? []

  const products = parsed.products.map((product) => {
    const attr = product.attributes ?? {}
    const scored = scoreProduct(product, priorities)
    return {
      name: product.name,
      sustainabilityScore: scored.score,
      confidence: scored.confidence,
      sourceStatus: product.attributes ? 'user-provided' as const : 'unknown' as const,
      considerations: {
        cost: attr.cost === undefined ? 'unknown' : `$${attr.cost}`,
        durability: label(attr.durable, 'durable', 'not marked durable', 'unknown'),
        repairability: label(attr.repairable, 'repairable', 'not marked repairable', 'unknown'),
        packaging: label(attr.minimalPackaging, 'minimal packaging', 'packaging concern', 'unknown'),
        locality: label(attr.local, 'local or nearby', 'not local', 'unknown'),
        recycledContent: label(attr.recycledContent, 'uses recycled content', 'no recycled content noted', 'unknown'),
        certifications: attr.certifications?.length
          ? `user-provided: ${attr.certifications.join(', ')}`
          : 'none verified; no certifications invented',
      },
      assumptions: scored.assumptions,
    }
  })

  const ranked = [...products].sort((a, b) => b.sustainabilityScore - a.sustainabilityScore)
  const winner = ranked[0]
  const runnerUp = ranked[1]
  const margin = winner.sustainabilityScore - runnerUp.sustainabilityScore
  const recommendation =
    margin < 5
      ? `No clear winner. ${winner.name} is slightly ahead, but missing data could change the result.`
      : `${winner.name} is the more sustainable choice based on provided attributes.`

  return {
    recommendation,
    products,
    saferOrMoreSustainableAlternative:
      winner.confidence === 'low'
        ? 'Ask for durability, repairability, packaging, locality, and certification evidence before buying.'
        : winner.name,
    unknowns: Array.from(
      new Set(products.flatMap((p) => p.assumptions)),
    ),
  }
}

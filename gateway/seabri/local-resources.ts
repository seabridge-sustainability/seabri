import { readFile } from 'fs/promises'
import { z } from 'zod'

export const ResourceCategorySchema = z.enum([
  'plumber',
  'water_mitigation',
  'city_public_works',
  'city_hall',
  'utility_emergency',
  'hotel',
  'insurance_claim_line',
])

export type ResourceCategory = z.infer<typeof ResourceCategorySchema>

export const LocalResourceSearchInputSchema = z.object({
  category: ResourceCategorySchema,
  location: z.string().trim().min(2).max(160),
  insurer: z.string().trim().max(120).optional(),
}).strict()

export interface LocalResource {
  id: string
  name: string
  category: ResourceCategory
  rank: number
  phone?: string
  website?: string
  address?: string
  hours?: string
  source: string
  sourceUrl?: string
  confidence: 'high' | 'medium' | 'low'
  notes?: string
}

export interface LocalResourceSearchResult {
  status: 'ok' | 'fallback'
  query: {
    category: ResourceCategory
    location: string
    insurer?: string
  }
  resources: LocalResource[]
  fallbackMessage?: string
  assumptions: string[]
}

const CATEGORY_TERMS: Record<ResourceCategory, string[]> = {
  plumber: ['plumber', 'plumbing', 'water shutoff'],
  water_mitigation: ['water mitigation', 'water damage', 'restoration', 'IICRC'],
  city_public_works: ['public works', 'water emergency'],
  city_hall: ['city hall', 'building department'],
  utility_emergency: ['utility emergency', 'water utility'],
  hotel: ['hotel', 'motel', 'temporary stay'],
  insurance_claim_line: ['claim', 'insurance'],
}

const SAFE_FALLBACK =
  'Local search is not configured on this gateway. I will not invent contacts. Use your city/ZIP with the listed search terms, verify the phone number on the provider website, and keep receipts for insurance.'

function normalizePhone(phone: unknown): string | undefined {
  if (typeof phone !== 'string') return undefined
  const trimmed = phone.trim()
  if (!trimmed) return undefined
  if (!/^[+()\d\s.-]{7,24}$/.test(trimmed)) return undefined
  return trimmed
}

function toResource(raw: unknown, category: ResourceCategory, rank: number): LocalResource | null {
  if (!raw || typeof raw !== 'object') return null
  const rec = raw as Record<string, unknown>
  const name = typeof rec.name === 'string' ? rec.name.trim() : ''
  if (!name) return null
  const rawCategory = typeof rec.category === 'string' ? rec.category : category
  const parsedCategory = ResourceCategorySchema.safeParse(rawCategory)
  if (!parsedCategory.success) return null
  return {
    id: typeof rec.id === 'string' && rec.id.trim() ? rec.id.trim() : `${parsedCategory.data}-${rank}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name,
    category: parsedCategory.data,
    rank,
    phone: normalizePhone(rec.phone),
    website: typeof rec.website === 'string' ? rec.website : undefined,
    address: typeof rec.address === 'string' ? rec.address : undefined,
    hours: typeof rec.hours === 'string' ? rec.hours : undefined,
    source: typeof rec.source === 'string' ? rec.source : 'configured-local-directory',
    sourceUrl: typeof rec.sourceUrl === 'string' ? rec.sourceUrl : undefined,
    confidence: rec.confidence === 'high' || rec.confidence === 'medium' || rec.confidence === 'low' ? rec.confidence : 'medium',
    notes: typeof rec.notes === 'string' ? rec.notes : undefined,
  }
}

async function readConfiguredFile(category: ResourceCategory, location: string): Promise<LocalResource[]> {
  const filePath = process.env.OPENSEABRI_LOCAL_RESOURCE_FILE
  if (!filePath) return []
  const raw = await readFile(filePath, 'utf8')
  const parsed = JSON.parse(raw) as unknown
  const rows = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { resources?: unknown[] }).resources)
      ? (parsed as { resources: unknown[] }).resources
      : []
  const locationLower = location.toLowerCase()
  return rows
    .map((row, idx) => toResource(row, category, idx + 1))
    .filter((r): r is LocalResource => Boolean(r))
    .filter((r) => r.category === category)
    .filter((r) => {
      const haystack = `${r.address ?? ''} ${r.notes ?? ''} ${r.source ?? ''}`.toLowerCase()
      return haystack.includes(locationLower) || locationLower.split(/[,\s]+/).some((part) => part.length >= 3 && haystack.includes(part))
    })
    .slice(0, 5)
    .map((r, idx) => ({ ...r, rank: idx + 1 }))
}

async function readConfiguredSearchEndpoint(input: z.infer<typeof LocalResourceSearchInputSchema>): Promise<LocalResource[]> {
  const endpoint = process.env.OPENSEABRI_LOCAL_RESOURCE_SEARCH_URL
  if (!endpoint) return []
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(8_000),
  })
  if (!response.ok) return []
  const parsed = await response.json() as unknown
  const rows = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { resources?: unknown[] }).resources)
      ? (parsed as { resources: unknown[] }).resources
      : []
  return rows
    .map((row, idx) => toResource(row, input.category, idx + 1))
    .filter((r): r is LocalResource => Boolean(r))
    .slice(0, 5)
    .map((r, idx) => ({ ...r, rank: idx + 1, source: r.source || 'configured-search-endpoint' }))
}

export async function searchLocalResources(input: unknown): Promise<LocalResourceSearchResult> {
  const parsed = LocalResourceSearchInputSchema.parse(input)
  const assumptions = [
    'Only configured local/search sources are used.',
    'Phone numbers are returned only when supplied by the configured source.',
    'The user should verify availability before relying on a provider.',
  ]

  try {
    const endpointResults = await readConfiguredSearchEndpoint(parsed)
    const fileResults = endpointResults.length > 0 ? [] : await readConfiguredFile(parsed.category, parsed.location)
    const resources = endpointResults.length > 0 ? endpointResults : fileResults
    if (resources.length > 0) {
      return { status: 'ok', query: parsed, resources, assumptions }
    }
  } catch {
    // Fall through to safe fallback. Do not leak provider/config details.
  }

  return {
    status: 'fallback',
    query: parsed,
    resources: [],
    fallbackMessage: `${SAFE_FALLBACK} Search terms: ${CATEGORY_TERMS[parsed.category].join(', ')} near ${parsed.location}.`,
    assumptions,
  }
}

export function createResourceActionCard(resource: LocalResource, purpose = 'request urgent water damage help'): string {
  if (!resource.phone) {
    return [
      'ACTION SCRIPT READY:',
      `To: ${resource.name}`,
      'Via: call or SMS',
      'Approval gate: this resource has no verified phone number in the configured source.',
    ].join('\n')
  }
  return [
    'PROPOSED ACTION',
    `To: ${resource.name}`,
    'Via: call',
    `Number/Address: ${resource.phone}`,
    'Script/Message: Hello, I have an active bathroom water loss. I need urgent help stopping the source, documenting damage, and starting drying/mitigation. Please confirm earliest arrival time and emergency fee.',
    `Purpose: ${purpose}.`,
    'Confirm? Reply YES to proceed, NO to cancel.',
  ].join('\n')
}

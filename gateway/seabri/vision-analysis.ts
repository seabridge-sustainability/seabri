import { z } from 'zod'

export const IncidentImageInputSchema = z.object({
  imageBase64: z.string().min(8).max(8_000_000),
  mimeType: z.string().min(3).max(80).default('image/jpeg'),
  prompt: z.string().trim().max(1000).optional(),
  incidentContext: z.string().trim().max(2000).optional(),
}).strict()

export interface IncidentImageAnalysis {
  status: 'analyzed' | 'fallback'
  summary: string
  visibleFindings: string[]
  confidence: 'high' | 'medium' | 'low'
  source: 'configured-vision-provider' | 'fallback'
  recommendedAngles: string[]
  clientSafeNotice?: string
}

const FALLBACK_ANGLES = [
  'wide room view showing the water source and affected area',
  'close-up of the shutoff/fixture or failed pipe',
  'baseboards, walls, flooring, and ceiling below the bathroom',
  'damaged items with serial/model numbers when relevant',
  'one photo with a tape measure or common object for scale',
]

function fallback(): IncidentImageAnalysis {
  return {
    status: 'fallback',
    summary: 'Image analysis is not configured on this gateway. I will not guess what is visible.',
    visibleFindings: [],
    confidence: 'low',
    source: 'fallback',
    recommendedAngles: FALLBACK_ANGLES,
    clientSafeNotice: 'Upload or describe the key damage areas and I can still create a claim-ready documentation checklist.',
  }
}

export async function analyzeIncidentImage(input: unknown): Promise<IncidentImageAnalysis> {
  const parsed = IncidentImageInputSchema.parse(input)
  const endpoint = process.env.OPENSEABRI_VISION_PROVIDER_URL
  if (!endpoint) return fallback()

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        imageBase64: parsed.imageBase64,
        mimeType: parsed.mimeType,
        prompt: parsed.prompt ?? 'Analyze this incident photo for water damage documentation. Avoid certainty beyond visible evidence.',
        incidentContext: parsed.incidentContext,
      }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) return fallback()
    const raw = await response.json() as Record<string, unknown>
    const findings = Array.isArray(raw.visibleFindings)
      ? raw.visibleFindings.filter((x): x is string => typeof x === 'string').slice(0, 8)
      : []
    const summary = typeof raw.summary === 'string' && raw.summary.trim()
      ? raw.summary.trim()
      : 'Configured vision provider returned no summary.'
    return {
      status: 'analyzed',
      summary,
      visibleFindings: findings,
      confidence: raw.confidence === 'high' || raw.confidence === 'medium' || raw.confidence === 'low' ? raw.confidence : 'medium',
      source: 'configured-vision-provider',
      recommendedAngles: Array.isArray(raw.recommendedAngles)
        ? raw.recommendedAngles.filter((x): x is string => typeof x === 'string').slice(0, 8)
        : FALLBACK_ANGLES,
    }
  } catch {
    return fallback()
  }
}

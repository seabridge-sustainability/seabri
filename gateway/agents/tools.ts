import { TAVILY_API_KEY } from '../config.js'
import { ALL_PERIL_TOOLS, executePerilTool } from './perils.js'

export interface AnthropicTool {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, { type: string; description: string }>
    required: string[]
  }
}

// --- Tool definitions ---

const WEB_SEARCH_TOOL: AnthropicTool = {
  name: 'web_search',
  description:
    'Search the web for current information about climate risk, sustainability regulations, energy incentives, flood zones, wildfire data, carbon markets, or any sustainability topic. Use this to find up-to-date data the user is asking about.',
  input_schema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The search query' },
    },
    required: ['query'],
  },
}

const GEOCODE_ADDRESS_TOOL: AnthropicTool = {
  name: 'geocode_address',
  description:
    'Convert a US street address to latitude and longitude coordinates using the US Census geocoder. Call this before lookup_flood_zone whenever the user mentions a specific US address.',
  input_schema: {
    type: 'object',
    properties: {
      address: {
        type: 'string',
        description: 'Full US address (e.g. "123 Main St, Springfield, IL 62701")',
      },
    },
    required: ['address'],
  },
}

const LOOKUP_FLOOD_ZONE_TOOL: AnthropicTool = {
  name: 'lookup_flood_zone',
  description:
    'Look up the FEMA National Flood Hazard Layer (NFHL) flood zone designation for a latitude/longitude point. Returns the flood zone type (AE, X, VE, etc.), whether the location is in a Special Flood Hazard Area (SFHA), and the Base Flood Elevation when available. Requires numeric latitude and longitude — use geocode_address first if you only have a street address.',
  input_schema: {
    type: 'object',
    properties: {
      latitude: { type: 'number', description: 'Latitude in decimal degrees (e.g. 30.2672)' },
      longitude: { type: 'number', description: 'Longitude in decimal degrees (e.g. -97.7431)' },
    },
    required: ['latitude', 'longitude'],
  },
}

// Agent → tool list mapping.
// climate-risk and home-community get all peril tools + the foundational geo tools.
// investment-screening gets peril tools for portfolio physical risk assessment.
const AGENT_TOOLS: Record<string, AnthropicTool[]> = {
  'climate-risk': [WEB_SEARCH_TOOL, GEOCODE_ADDRESS_TOOL, LOOKUP_FLOOD_ZONE_TOOL, ...ALL_PERIL_TOOLS],
  'nature-biodiversity': [WEB_SEARCH_TOOL, GEOCODE_ADDRESS_TOOL],
  'sustainability-reporting': [WEB_SEARCH_TOOL],
  'investment-screening': [WEB_SEARCH_TOOL, ...ALL_PERIL_TOOLS],
  'home-community': [WEB_SEARCH_TOOL, GEOCODE_ADDRESS_TOOL, LOOKUP_FLOOD_ZONE_TOOL, ...ALL_PERIL_TOOLS],
  'net-zero': [WEB_SEARCH_TOOL],
  'natural-capital': [WEB_SEARCH_TOOL, GEOCODE_ADDRESS_TOOL],
  'general': [WEB_SEARCH_TOOL],
}

export function getToolsForAgent(agentId: string): AnthropicTool[] {
  return AGENT_TOOLS[agentId] ?? [WEB_SEARCH_TOOL]
}

// --- Tool implementations ---

interface TavilyResult {
  title: string
  url: string
  content: string
  score: number
}

async function webSearch(query: string): Promise<string> {
  if (!TAVILY_API_KEY) {
    return 'Web search unavailable (TAVILY_API_KEY not configured). Answering from training knowledge.'
  }
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TAVILY_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query, max_results: 5, search_depth: 'basic' }),
    signal: AbortSignal.timeout(12000),
  })
  if (!response.ok) {
    return `Web search failed (HTTP ${response.status}). Answering from training knowledge.`
  }
  const data = (await response.json()) as { results?: TavilyResult[] }
  const results = data.results ?? []
  if (results.length === 0) return 'No search results found.'
  return results
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.content}`)
    .join('\n\n')
}

interface CensusGeocodeResult {
  result?: {
    addressMatches?: Array<{
      coordinates: { x: number; y: number }
      matchedAddress: string
    }>
  }
}

async function geocodeAddress(address: string): Promise<string> {
  const url = new URL('https://geocoding.geo.census.gov/geocoder/locations/onelineaddress')
  url.searchParams.set('address', address)
  url.searchParams.set('benchmark', 'Public_AR_Current')
  url.searchParams.set('format', 'json')
  const response = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) })
  if (!response.ok) return `Geocoding failed (HTTP ${response.status}).`
  const data = (await response.json()) as CensusGeocodeResult
  const matches = data.result?.addressMatches ?? []
  if (matches.length === 0) {
    return `No match found for "${address}". Try a more complete address (include city, state, ZIP).`
  }
  const match = matches[0]
  return JSON.stringify({
    latitude: match.coordinates.y,
    longitude: match.coordinates.x,
    matchedAddress: match.matchedAddress,
  })
}

interface FEMAFeature {
  attributes: {
    FLD_ZONE?: string
    ZONE_SUBTY?: string
    SFHA_TF?: string
    STATIC_BFE?: number | null
  }
}

const FLOOD_ZONE_DESCRIPTIONS: Record<string, string> = {
  AE: 'Special Flood Hazard Area — 1% annual chance flood with Base Flood Elevation mapped',
  A: 'Special Flood Hazard Area — 1% annual chance flood, no BFE established',
  AO: 'Special Flood Hazard Area — shallow sheet-flow flooding',
  AH: 'Special Flood Hazard Area — shallow ponding flood',
  VE: 'Special Flood Hazard Area — coastal high-velocity wave action with BFE',
  V: 'Special Flood Hazard Area — coastal high-velocity wave action',
  X: 'Minimal or Moderate Flood Hazard — outside the SFHA',
  D: 'Undetermined flood hazard',
}

async function lookupFloodZone(latitude: number, longitude: number): Promise<string> {
  const url = new URL(
    'https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/28/query'
  )
  url.searchParams.set('geometry', `${longitude},${latitude}`)
  url.searchParams.set('geometryType', 'esriGeometryPoint')
  url.searchParams.set('inSR', '4326')
  url.searchParams.set('spatialRel', 'esriSpatialRelIntersects')
  url.searchParams.set('outFields', 'FLD_ZONE,ZONE_SUBTY,SFHA_TF,STATIC_BFE')
  url.searchParams.set('returnGeometry', 'false')
  url.searchParams.set('f', 'json')

  const response = await fetch(url.toString(), { signal: AbortSignal.timeout(12000) })
  if (!response.ok) return `FEMA flood zone lookup failed (HTTP ${response.status}).`

  const data = (await response.json()) as { features?: FEMAFeature[] }
  const features = data.features ?? []
  if (features.length === 0) {
    return 'No FEMA flood zone data found. The location may be outside NFHL coverage (common in rural or tribal areas).'
  }

  const attrs = features[0].attributes
  const zone = attrs.FLD_ZONE ?? 'Unknown'
  const subtype = attrs.ZONE_SUBTY ?? null
  const inSFHA = attrs.SFHA_TF === 'T' ? true : attrs.SFHA_TF === 'F' ? false : null
  const bfe = attrs.STATIC_BFE != null ? `${attrs.STATIC_BFE} ft NAVD88` : null
  const description = FLOOD_ZONE_DESCRIPTIONS[zone] ?? zone
  const requiresInsurance =
    inSFHA === true
      ? 'Federally-backed mortgage holders are required to carry flood insurance.'
      : 'Flood insurance is not federally required but is available and may be advisable.'

  return JSON.stringify({ flood_zone: zone, subtype, in_sfha: inSFHA, base_flood_elevation: bfe, description, requiresInsurance })
}

// --- Dispatcher ---

export async function executeTool(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  try {
    switch (name) {
      case 'web_search': {
        if (typeof input.query !== 'string' || input.query.trim() === '') {
          return 'Invalid input: query must be a non-empty string.'
        }
        return await webSearch(input.query.trim())
      }
      case 'geocode_address': {
        if (typeof input.address !== 'string' || input.address.trim() === '') {
          return 'Invalid input: address must be a non-empty string.'
        }
        return await geocodeAddress(input.address.trim())
      }
      case 'lookup_flood_zone': {
        const lat = Number(input.latitude)
        const lon = Number(input.longitude)
        if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
          return 'Invalid input: latitude must be a finite number between -90 and 90.'
        }
        if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
          return 'Invalid input: longitude must be a finite number between -180 and 180.'
        }
        return await lookupFloodZone(lat, lon)
      }
      default: {
        // Delegate to physical risk peril tools
        const perilResult = await executePerilTool(name, input)
        if (perilResult !== null) return perilResult
        return `Unknown tool: ${name}`
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return `Tool ${name} error: ${message}`
  }
}

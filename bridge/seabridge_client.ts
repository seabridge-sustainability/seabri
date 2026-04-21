/**
 * seabridge_client.ts
 *
 * HTTP client for the OpenSeaBri bridge layer.
 * Connects to the SeaBridgeAI FastAPI backend via the /api/v1/openseabri/* proxy
 * endpoints, authenticating with an API key rather than a user JWT.
 *
 * Environment variables:
 *   SEABRIDGE_API_URL   — base URL of the SeaBridgeAI backend (default: http://localhost:8000)
 *   SEABRIDGE_API_KEY   — API key sent as X-OpenSeaBri-Key header (optional in dev mode)
 */

import axios, { AxiosInstance } from 'axios'

const SEABRIDGE_API_URL = process.env.SEABRIDGE_API_URL || 'http://localhost:8000'
const SEABRIDGE_API_KEY = process.env.SEABRIDGE_API_KEY || null
const TIMEOUT_MS = 8000

// Availability cache — recheck at most every 60 seconds to avoid hammering /health
let _available: boolean | null = null
let _lastCheck = 0
const CHECK_INTERVAL = 60_000

function createClient(): AxiosInstance {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (SEABRIDGE_API_KEY) {
    headers['X-OpenSeaBri-Key'] = SEABRIDGE_API_KEY
  }
  return axios.create({
    baseURL: `${SEABRIDGE_API_URL}/api/v1`,
    timeout: TIMEOUT_MS,
    headers,
  })
}

const client = createClient()

/**
 * Check whether the SeaBridgeAI backend is reachable.
 * Result is cached for CHECK_INTERVAL milliseconds.
 */
export async function isSeaBridgeAvailable(): Promise<boolean> {
  const now = Date.now()
  if (_available !== null && now - _lastCheck < CHECK_INTERVAL) {
    return _available
  }
  try {
    await axios.get(`${SEABRIDGE_API_URL}/health`, { timeout: 3000 })
    _available = true
  } catch {
    _available = false
    console.warn(
      '[OpenSeaBri] SeaBridgeAI backend not available — running in standalone mode'
    )
  }
  _lastCheck = now
  return _available
}

/**
 * Fetch climate risk data for a company via the OpenSeaBri proxy route.
 * Returns raw response data, or null on any error.
 */
export async function getClimateRiskData(companyId: string): Promise<any> {
  try {
    const { data } = await client.get(`/openseabri/climate-risk/${companyId}`)
    return data
  } catch (err) {
    console.warn('[OpenSeaBri] Could not fetch climate risk data:', err)
    return null
  }
}

/**
 * Fetch a sustainability intelligence brief for the given sector.
 * Sector defaults to 'General'. Returns raw response data, or null on error.
 */
export async function getSustainabilityBrief(sector = 'General'): Promise<any> {
  try {
    const { data } = await client.get(`/openseabri/sustainability-brief`, {
      params: { sector },
    })
    return data
  } catch (err) {
    console.warn('[OpenSeaBri] Could not fetch sustainability brief:', err)
    return null
  }
}

/**
 * Fetch Composite Instability Index scores for all 35 tracked countries.
 * Returns raw response data, or null on error.
 */
export async function getWorldRiskScores(): Promise<any> {
  try {
    const { data } = await client.get(`/openseabri/world-risk/scores`)
    return data
  } catch (err) {
    console.warn('[OpenSeaBri] Could not fetch world risk scores:', err)
    return null
  }
}

/**
 * Fetch the CII risk score for a single country by ISO-3166 alpha-2 code.
 * Returns raw response data, or null on error.
 */
export async function getCountryRisk(isoCode: string): Promise<any> {
  try {
    const { data } = await client.get(
      `/openseabri/world-risk/country/${isoCode}`
    )
    return data
  } catch (err) {
    console.warn('[OpenSeaBri] Could not fetch country risk:', err)
    return null
  }
}

/**
 * Fetch nature risk analysis data for a company.
 * Returns raw response data, or null on error.
 */
export async function getNatureRiskData(companyId: string): Promise<any> {
  try {
    const { data } = await client.get(`/openseabri/nature-risk/${companyId}`)
    return data
  } catch (err) {
    console.warn('[OpenSeaBri] Could not fetch nature risk data:', err)
    return null
  }
}

/**
 * Fetch transition risk data for a company.
 * Returns raw response data, or null on error.
 */
export async function getTransitionRiskData(companyId: string): Promise<any> {
  try {
    const { data } = await client.get(
      `/openseabri/transition-risk/${companyId}`
    )
    return data
  } catch (err) {
    console.warn('[OpenSeaBri] Could not fetch transition risk data:', err)
    return null
  }
}

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

/**
 * Fetch sustainability targets for an asset.
 * Path parameter is asset_id (targets are bound to assets, not companies).
 * Optional filters: category, target_status, limit.
 * Returns raw response data, or null on error.
 */
export async function getTargets(
  assetId: string,
  opts: { category?: string; status?: string; limit?: number } = {}
): Promise<any> {
  try {
    const params: Record<string, string | number> = {}
    if (opts.category) params.category = opts.category
    if (opts.status) params.target_status = opts.status
    if (opts.limit) params.limit = opts.limit
    const { data } = await client.get(`/openseabri/targets/${assetId}`, {
      params,
    })
    return data
  } catch (err) {
    console.warn('[OpenSeaBri] Could not fetch targets:', err)
    return null
  }
}

/**
 * Fetch the materiality assessment for a company.
 * Year is optional; backend defaults to the current year when omitted.
 * Returns raw response data, or null on error.
 */
export async function getMateriality(
  companyId: string,
  year?: string
): Promise<any> {
  try {
    const params: Record<string, string> = {}
    if (year) params.year = year
    const { data } = await client.get(`/openseabri/materiality/${companyId}`, {
      params,
    })
    return data
  } catch (err) {
    console.warn('[OpenSeaBri] Could not fetch materiality assessment:', err)
    return null
  }
}

/**
 * Fetch the persisted regulation monitoring report for a company.
 * Year is optional; backend defaults to the current year when omitted.
 * Returns raw response data ({ status, report } when completed), or null on error.
 * Does NOT trigger a live agent run — only returns previously persisted reports.
 */
export async function getRegulationMonitoring(
  companyId: string,
  year?: string
): Promise<any> {
  try {
    const params: Record<string, string> = {}
    if (year) params.year = year
    const { data } = await client.get(
      `/openseabri/regulation-monitoring/${companyId}`,
      { params }
    )
    return data
  } catch (err) {
    console.warn(
      '[OpenSeaBri] Could not fetch regulation monitoring report:',
      err
    )
    return null
  }
}

// ── Agent execution surface ────────────────────────────────────────────────
//
// The endpoints below target the /openseabri/agent/* execution tier exposed
// by the SeaBridgeAI backend. They are read-tier except for runAgent(), which
// requires a minted HMAC approval token sent as X-OpenSeaBri-Run-Approval.
// All functions follow the existing "return null on error" convention and
// never throw — callers can treat null as "unavailable / denied / not found".

/**
 * List executable agents and their current gating state (kill switch,
 * approval_required, allow-list). Returns raw response data, or null on error.
 */
export async function listAgents(): Promise<any> {
  try {
    const { data } = await client.get(`/openseabri/agent/catalog`)
    return data
  } catch (err) {
    console.warn('[OpenSeaBri] Could not fetch agent catalog:', err)
    return null
  }
}

/**
 * Fetch the latest cached run result for an agent/scope pair.
 *
 * The scope path segment is agent-specific:
 *   - esg_brief : sector          (e.g. "General")
 *   - insights  : company_id      (with assistant_type passed via `opts.params`)
 *
 * Optional query parameters are forwarded verbatim so callers can supply
 * agent-specific discriminators (e.g. { assistant_type: "climate_risk" }).
 *
 * Returns raw response data, or null on error (including 404 when no
 * cached result exists).
 */
export async function getAgentLatest(
  name: string,
  scope: string,
  opts: { params?: Record<string, string | number> } = {}
): Promise<any> {
  try {
    const { data } = await client.get(
      `/openseabri/agent/${name}/latest/${scope}`,
      { params: opts.params }
    )
    return data
  } catch (err) {
    console.warn(`[OpenSeaBri] Could not fetch latest result for ${name}:`, err)
    return null
  }
}

/**
 * Trigger an agent run synchronously. Requires a minted HMAC approval token
 * (see the backend _mint_approval_token helper) supplied as the
 * X-OpenSeaBri-Run-Approval header.
 *
 * The body schema is agent-specific and must include acknowledge_paid: true
 * when the run would dispatch a paid LLM call. Callers are responsible for
 * constructing the correct body shape — this method is a thin pass-through.
 *
 * Returns raw response data on success, or null on any error (403 scope
 * mismatch, 401 bad token, 503 kill switch / secret unset, 422 validation).
 */
export async function runAgent(
  name: string,
  body: Record<string, unknown>,
  approvalToken: string
): Promise<any> {
  try {
    const { data } = await client.post(
      `/openseabri/agent/${name}/run`,
      body,
      { headers: { 'X-OpenSeaBri-Run-Approval': approvalToken } }
    )
    return data
  } catch (err) {
    console.warn(`[OpenSeaBri] Agent run failed for ${name}:`, err)
    return null
  }
}

/**
 * Fetch a specific past run by run_id for the given agent. Returns raw
 * response data, or null on error (including 404 when the run has aged out
 * of the cache or the agent is outside the execution allow-list).
 */
export async function getAgentRun(name: string, runId: string): Promise<any> {
  try {
    const { data } = await client.get(
      `/openseabri/agent/${name}/run/${runId}`
    )
    return data
  } catch (err) {
    console.warn(`[OpenSeaBri] Could not fetch run ${runId} for ${name}:`, err)
    return null
  }
}

// ── MCP proxy surface ──────────────────────────────────────────────────────
//
// The endpoints below target /openseabri/mcp/*, which proxies the seabridge_ai
// MCPToolRouter (stdio/SSE transports across Axion, Sequential Thinking,
// MongoDB, AWS S3, Tavily). Discovery routes are read-tier; callMcpTool
// requires an HMAC approval token minted with scope="mcp".

/**
 * List configured MCP servers and their connection state.
 * Returns raw response data, or null on error.
 */
export async function listMcpServers(): Promise<any> {
  try {
    const { data } = await client.get(`/openseabri/mcp/servers`)
    return data
  } catch (err) {
    console.warn('[OpenSeaBri] Could not fetch MCP servers:', err)
    return null
  }
}

/**
 * List all MCP tools available across connected servers. Each entry includes
 * name, description, input_schema, and server_id.
 * Returns raw response data, or null on error.
 */
export async function listMcpTools(): Promise<any> {
  try {
    const { data } = await client.get(`/openseabri/mcp/tools`)
    return data
  } catch (err) {
    console.warn('[OpenSeaBri] Could not fetch MCP tools:', err)
    return null
  }
}

/**
 * Invoke an MCP tool by name. Requires an HMAC approval token minted with
 * scope="mcp" (see backend _mint_approval_token), supplied as the
 * X-OpenSeaBri-Run-Approval header. Body must set acknowledge_paid: true —
 * some MCP tools dispatch paid third-party API calls.
 *
 * Returns raw response data on success, or null on any error (401 bad token,
 * 403 scope mismatch, 503 kill switch / MCP disabled, 500 tool failure).
 */
export async function callMcpTool(
  toolName: string,
  args: Record<string, unknown>,
  approvalToken: string
): Promise<any> {
  try {
    const { data } = await client.post(
      `/openseabri/mcp/call`,
      { tool_name: toolName, arguments: args, acknowledge_paid: true },
      { headers: { 'X-OpenSeaBri-Run-Approval': approvalToken } }
    )
    return data
  } catch (err) {
    console.warn(`[OpenSeaBri] MCP call failed for ${toolName}:`, err)
    return null
  }
}

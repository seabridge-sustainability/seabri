/**
 * HTTP adapter for the SeaBridgeAI OpenSeaBri proxy.
 *
 * Read operations require SEABRIDGE_API_KEY. Execution operations additionally
 * require an operator-minted, scope-bound approval token. Missing configuration
 * or a failed request resolves to null so callers preserve their existing
 * unavailable/denied fallback instead of bypassing backend policy.
 */

export interface DocumentExecutionSigner {
  name: string
  email?: string
  phone?: string
  role?: string
  externalId?: string
  sendEmail?: boolean
  sendSms?: boolean
  metadata?: Record<string, unknown>
}

export interface DocumentExecutionInput {
  tenantId: string
  workflow: string
  templateId: string | number
  title: string
  signers: DocumentExecutionSigner[]
  externalId?: string
  sendEmail?: boolean
  sendSms?: boolean
  dryRun?: boolean
  metadata?: Record<string, unknown>
  prefillValues?: Record<string, unknown>
  approvalToken?: string
}

export type RetrievalStrategy = 'vector' | 'hybrid' | 'pageindex'

export interface StructuredDocumentRunInput {
  query: string
  companyId: string
  approvalToken: string
  tenantId?: string
  dealId?: string
  propertyId?: string
  sourceScope?: string
  fileIds?: string[]
  sourceTypeFilter?: string[]
  retrievalStrategy?: RetrievalStrategy
  requireTraceability?: boolean
  requireMultiFileReasoning?: boolean
}

const DEFAULT_API_URL = 'http://localhost:8000'
const TIMEOUT_MS = 8_000
const HEALTH_TIMEOUT_MS = 3_000
const CHECK_INTERVAL_MS = 60_000
let availability: boolean | null = null
let lastAvailabilityCheck = 0

function apiBaseUrl(): string {
  return (process.env.SEABRIDGE_API_URL || DEFAULT_API_URL).replace(/\/+$/, '') + '/api/v1'
}

function apiKey(): string | null {
  const key = process.env.SEABRIDGE_API_KEY?.trim()
  return key || null
}

function buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
  const url = new URL(`${apiBaseUrl()}${path}`)
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value))
  }
  return url.toString()
}

async function request(
  path: string,
  init: RequestInit = {},
  approvalToken?: string,
): Promise<any | null> {
  const key = apiKey()
  if (!key) {
    console.warn('[OpenSeaBri] SeaBridgeAI proxy disabled: SEABRIDGE_API_KEY is not configured')
    return null
  }
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  headers.set('X-OpenSeaBri-Key', key)
  if (init.body) headers.set('Content-Type', 'application/json')
  if (approvalToken) headers.set('X-OpenSeaBri-Run-Approval', approvalToken)
  try {
    const response = await fetch(buildUrl(path), {
      ...init,
      headers,
      signal: init.signal ?? AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!response.ok) {
      console.warn(`[OpenSeaBri] SeaBridgeAI proxy ${path} failed (HTTP ${response.status})`)
      return null
    }
    return await response.json()
  } catch (error) {
    console.warn(`[OpenSeaBri] SeaBridgeAI proxy ${path} unavailable:`, error)
    return null
  }
}

function get(path: string, params?: Record<string, string | number | undefined>): Promise<any | null> {
  const suffix = new URLSearchParams(
    Object.entries(params ?? {}).flatMap(([key, value]) => value === undefined ? [] : [[key, String(value)]])
  ).toString()
  return request(`${path}${suffix ? `?${suffix}` : ''}`)
}

function post(path: string, body: unknown, approvalToken?: string): Promise<any | null> {
  return request(path, { method: 'POST', body: JSON.stringify(body) }, approvalToken)
}

export async function isSeaBridgeAvailable(): Promise<boolean> {
  const now = Date.now()
  if (availability !== null && now - lastAvailabilityCheck < CHECK_INTERVAL_MS) return availability
  if (!apiKey()) {
    availability = false
    lastAvailabilityCheck = now
    return false
  }
  try {
    const response = await fetch(buildUrl('/openseabri/health'), { signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS) })
    availability = response.ok
  } catch {
    availability = false
  }
  lastAvailabilityCheck = now
  return availability
}

export const getClimateRiskData = (companyId: string) => get(`/openseabri/climate-risk/${encodeURIComponent(companyId)}`)
export const getSustainabilityBrief = (sector = 'General') => get('/openseabri/sustainability-brief', { sector })
export const getWorldRiskScores = () => get('/openseabri/world-risk/scores')
export const getCountryRisk = (isoCode: string) => get(`/openseabri/world-risk/country/${encodeURIComponent(isoCode)}`)
export const getNatureRiskData = (companyId: string) => get(`/openseabri/nature-risk/${encodeURIComponent(companyId)}`)
export const getTransitionRiskData = (companyId: string) => get(`/openseabri/transition-risk/${encodeURIComponent(companyId)}`)

export function getTargets(assetId: string, opts: { category?: string; status?: string; limit?: number } = {}): Promise<any | null> {
  return get(`/openseabri/targets/${encodeURIComponent(assetId)}`, {
    category: opts.category,
    target_status: opts.status,
    limit: opts.limit,
  })
}

export const getMateriality = (companyId: string, year?: string) => get(`/openseabri/materiality/${encodeURIComponent(companyId)}`, { year })
export const getRegulationMonitoring = (companyId: string, year?: string) => get(`/openseabri/regulation-monitoring/${encodeURIComponent(companyId)}`, { year })

export function scanWebsite(input: {
  tenantId: string
  url: string
  purpose?: string
  schemaType?: 'general' | 'contact' | 'authority' | 'emergency_guidance'
  useFirecrawl?: boolean
}): Promise<any | null> {
  return post('/openseabri/web-ingestion/scan', {
    tenant_id: input.tenantId,
    url: input.url,
    purpose: input.purpose,
    schema_type: input.schemaType,
    use_firecrawl: input.useFirecrawl,
    acknowledge_external_fetch: true,
  })
}

export function createDocumentExecutionRequest(input: DocumentExecutionInput): Promise<any | null> {
  return post('/openseabri/document-execution/requests', {
    tenant_id: input.tenantId,
    workflow: input.workflow,
    template_id: input.templateId,
    title: input.title,
    signers: input.signers.map((signer) => ({
      name: signer.name, email: signer.email, phone: signer.phone, role: signer.role,
      external_id: signer.externalId, send_email: signer.sendEmail,
      send_sms: signer.sendSms, metadata: signer.metadata,
    })),
    external_id: input.externalId,
    send_email: input.sendEmail,
    send_sms: input.sendSms,
    dry_run: input.dryRun ?? true,
    metadata: input.metadata,
    prefill_values: input.prefillValues,
  }, input.approvalToken)
}

export const listAgents = () => get('/openseabri/agent/catalog')
export const getAgentLatest = (name: string, scope: string, opts: { params?: Record<string, string | number> } = {}) =>
  get(`/openseabri/agent/${encodeURIComponent(name)}/latest/${encodeURIComponent(scope)}`, opts.params)
export const runAgent = (name: string, body: Record<string, unknown>, approvalToken: string) =>
  post(`/openseabri/agent/${encodeURIComponent(name)}/run`, body, approvalToken)

export function runStructuredDocumentReader(input: StructuredDocumentRunInput): Promise<any | null> {
  return post('/openseabri/agent/structured_rag/run', {
    query: input.query,
    company_id: input.companyId,
    tenant_id: input.tenantId,
    deal_id: input.dealId,
    property_id: input.propertyId,
    source_scope: input.sourceScope,
    file_ids: input.fileIds,
    source_type_filter: input.sourceTypeFilter,
    retrieval_strategy: input.retrievalStrategy ?? 'hybrid',
    require_traceability: input.requireTraceability ?? false,
    require_multi_file_reasoning: input.requireMultiFileReasoning ?? false,
    acknowledge_paid: true,
  }, input.approvalToken)
}

export const getAgentRun = (name: string, runId: string) => get(`/openseabri/agent/${encodeURIComponent(name)}/run/${encodeURIComponent(runId)}`)
export const listMcpServers = () => get('/openseabri/mcp/servers')
export const listMcpTools = () => get('/openseabri/mcp/tools')

/**
 * The backend binds MCP approval to a tenant. args.tenant_id is deliberately
 * required instead of guessing from a company or a global default.
 */
export function callMcpTool(toolName: string, args: Record<string, unknown>, approvalToken: string): Promise<any | null> {
  const tenantId = typeof args.tenant_id === 'string' ? args.tenant_id : null
  if (!tenantId) {
    console.warn('[OpenSeaBri] MCP call denied locally: arguments.tenant_id is required')
    return Promise.resolve(null)
  }
  const { acknowledge_mutation: acknowledgeMutation, ...toolArguments } = args
  return post('/openseabri/mcp/call', {
    tenant_id: tenantId,
    tool_name: toolName,
    arguments: { tenant_id: tenantId, ...toolArguments },
    acknowledge_paid: true,
    acknowledge_mutation: acknowledgeMutation === true,
  }, approvalToken)
}

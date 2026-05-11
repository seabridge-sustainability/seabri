/**
 * seabridge_client.ts — DISCONNECTED
 *
 * OpenSeaBri runs as a fully independent product. This module no longer
 * makes HTTP requests to the SeaBridgeAI backend. All functions return null
 * so existing callers degrade gracefully without any code changes on their side.
 */

// ── Type exports (preserved so callers compile without changes) ────────────

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

// ── Stubs — all return null (standalone mode) ──────────────────────────────

export async function isSeaBridgeAvailable(): Promise<boolean> { return false }

export async function getClimateRiskData(_companyId: string): Promise<any> { return null }

export async function getSustainabilityBrief(_sector = 'General'): Promise<any> { return null }

export async function getWorldRiskScores(): Promise<any> { return null }

export async function getCountryRisk(_isoCode: string): Promise<any> { return null }

export async function getNatureRiskData(_companyId: string): Promise<any> { return null }

export async function getTransitionRiskData(_companyId: string): Promise<any> { return null }

export async function getTargets(
  _assetId: string,
  _opts: { category?: string; status?: string; limit?: number } = {}
): Promise<any> { return null }

export async function getMateriality(_companyId: string, _year?: string): Promise<any> { return null }

export async function getRegulationMonitoring(_companyId: string, _year?: string): Promise<any> { return null }

export async function scanWebsite(_input: {
  tenantId: string
  url: string
  purpose?: string
  schemaType?: 'general' | 'contact' | 'authority' | 'emergency_guidance'
  useFirecrawl?: boolean
}): Promise<any> { return null }

export async function createDocumentExecutionRequest(_input: DocumentExecutionInput): Promise<any> { return null }

export async function listAgents(): Promise<any> { return null }

export async function getAgentLatest(
  _name: string,
  _scope: string,
  _opts: { params?: Record<string, string | number> } = {}
): Promise<any> { return null }

export async function runAgent(
  _name: string,
  _body: Record<string, unknown>,
  _approvalToken: string
): Promise<any> { return null }

export async function runStructuredDocumentReader(_input: StructuredDocumentRunInput): Promise<any> { return null }

export async function getAgentRun(_name: string, _runId: string): Promise<any> { return null }

export async function listMcpServers(): Promise<any> { return null }

export async function listMcpTools(): Promise<any> { return null }

export async function callMcpTool(
  _toolName: string,
  _args: Record<string, unknown>,
  _approvalToken: string
): Promise<any> { return null }

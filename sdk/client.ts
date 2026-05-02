type FetchFn = typeof globalThis.fetch

export interface SeaBriClientOptions {
  baseUrl: string
  token?: string
  fetch?: FetchFn
}

export interface ChatResponse {
  reply: string
  agentId: string
  sessionId: string
}

export interface AgentInfo {
  id: string
  name: string
}

export interface MetricsResponse {
  totalRequests: number
  totalCostUsd: number
  [key: string]: unknown
}

export interface SustainabilityResponse {
  totalCarbonGrams: number
  sustainabilityScore: number
  [key: string]: unknown
}

export interface WorkflowCreateInput {
  name: string
  steps: unknown[]
  [key: string]: unknown
}

export interface WorkflowResponse {
  id: string
  name: string
  [key: string]: unknown
}

export interface WorkflowRunResponse {
  runId: string
  status: string
  [key: string]: unknown
}

export class SeaBriClientError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(`${status}: ${message}`)
    this.name = 'SeaBriClientError'
  }
}

export interface SeaBriClient {
  chat(input: { message: string; agentId?: string }): Promise<ChatResponse>
  listAgents(): Promise<AgentInfo[]>
  getMetrics(): Promise<MetricsResponse>
  getSustainability(): Promise<SustainabilityResponse>
  createWorkflow(input: WorkflowCreateInput): Promise<WorkflowResponse>
  runWorkflow(id: string): Promise<WorkflowRunResponse>
}

// ── SeaBri OS client (uses live /api/seabri/* routes) ──────────────────────

export interface OSAgentInfo {
  id: string
  name: string
  description: string
  capabilities: string[]
  builtin: boolean
}

export interface OSModelInfo {
  id: string
  name: string
  tier: string
  contextWindow: number
  costPer1kInputUsd: number
  costPer1kOutputUsd: number
  carbonPer1kTokensGrams: number
  strengths: string[]
}

export interface OSRoutingDecision {
  taskId: string
  agentId: string
  modelId: string
  modelTier: string
  routingReason: string
  estimatedCostUsd: number
  estimatedCarbonGrams: number
  classificationConfidence: number
  sustainability: { composite: number; tier: string }
}

export interface OSTelemetrySnapshot {
  aggregated: {
    totalRequests: number
    totalCostUsd: number
    totalCarbonGrams: number
    avgLatencyMs: number
  }
  sustainabilityScore: {
    avgComposite: number
    totalCostUsd: number
    totalCarbonGrams: number
  }
  recentCount: number
}

export interface OSFeedbackEntry {
  id: string
  sessionId: string
  agentId?: string
  taskId?: string
  rating: 'up' | 'down'
  correction?: string
  timestamp: string
}

export interface OSFeedbackSummary {
  total: number
  upvotes: number
  downvotes: number
  upvoteRate: number
  byAgent: Record<string, { up: number; down: number }>
}

export interface OSDailyBucket {
  date: string
  requestCount: number
  costUsd: number
  carbonGrams: number
  avgLatencyMs: number
}

export interface OSToolInfo {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export interface OSPluginManifest {
  id: string
  name: string
  version: string
  type: 'agent' | 'tool' | 'workflow-template' | 'dashboard-widget'
  capabilities: string[]
  entrypoint: string
  description?: string
}

export interface OSWorkflowSummary {
  name: string
  description?: string
  stepCount: number
  trigger?: string
}

export interface OSWorkflowRunResult {
  workflowId: string
  status: 'completed' | 'failed' | 'cancelled' | 'running' | 'pending'
  stepResults: Array<{
    stepId: string
    status: 'completed' | 'failed' | 'skipped'
    output?: unknown
    error?: string
    durationMs: number
    attempts: number
  }>
  durationMs?: number
  error?: string
}

// ── Sprint 4: Improvement & Sustainability ────────────────────────────────────

export interface OSAgentMetrics {
  agentId: string
  totalTasks: number
  successfulTasks: number
  totalLatencyMs: number
  totalCostUsd: number
  satisfactionRate: number
}

export interface OSAgentScorecard {
  agentId: string
  successRate: number
  avgLatencyMs: number
  costPerSuccessUsd: number
  satisfactionRate: number
  overallScore: number
}

export interface OSScorecardsResponse {
  scorecards: OSAgentScorecard[]
  underperformers: OSAgentScorecard[]
}

export interface OSFailurePattern {
  category: string
  count: number
  examples: string[]
}

export interface OSRefinementProposal {
  id: string
  agentId: string
  improvedSystemPrompt: string
  reasoning: string
  expectedImprovements: string[]
  status: 'pending' | 'applied' | 'rejected'
  createdAt: number
}

export interface OSStepProfile {
  stepId: string
  model: string
  avgLatencyMs: number
  avgCostUsd: number
  successRate: number
  dependsOn: string[]
}

export interface OSWorkflowProfile {
  workflowId: string
  steps: OSStepProfile[]
  totalAvgLatencyMs: number
  totalAvgCostUsd: number
}

export interface OSOptimizationSuggestion {
  type: 'downgrade_model' | 'parallelize' | 'cache'
  stepId?: string
  stepIds?: string[]
  description: string
  estimatedCostSavingUsd?: number
  estimatedLatencySavingMs?: number
}

export interface OSCarbonInput {
  model: string
  inputTokens?: number
  outputTokens?: number
  region?: string
  toolCallCount?: number
}

export interface OSDecisionInput {
  carbonGrams: number
  model: string
  inputTokens: number
  outputTokens: number
  taskComplexity: 'simple' | 'medium' | 'complex'
  userFollowedRecommendation: boolean | null
}

export interface OSDecisionScore {
  carbonScore: number
  efficiencyScore: number
  recommendationScore: number
  overallScore: number
  recommendations: string[]
}

export interface OSInferenceScoreInput {
  costUsd: number
  carbonGrams: number
  modelTier: 'haiku' | 'sonnet' | 'opus'
}

export interface OSInferenceScore {
  composite: number
  tier: 'excellent' | 'good' | 'fair' | 'poor'
  costEfficiency: number
  carbonEfficiency: number
  breakdown: {
    costUsd: number
    carbonGrams: number
    modelTier: 'haiku' | 'sonnet' | 'opus'
  }
}

export interface SeaBriOSClient {
  listAgents(): Promise<OSAgentInfo[]>
  listModels(): Promise<OSModelInfo[]>
  routeTask(input: { task: string; agentId?: string; modelId?: string }): Promise<OSRoutingDecision>
  getTelemetry(): Promise<OSTelemetrySnapshot>
  getTelemetryHistory(days?: number): Promise<OSDailyBucket[]>
  submitFeedback(input: {
    sessionId: string
    rating: 'up' | 'down'
    agentId?: string
    taskId?: string
    correction?: string
  }): Promise<OSFeedbackEntry>
  getFeedbackSummary(): Promise<OSFeedbackSummary>
  listTools(): Promise<OSToolInfo[]>
  listPlugins(): Promise<OSPluginManifest[]>
  registerPlugin(manifest: OSPluginManifest): Promise<OSPluginManifest>
  listWorkflows(): Promise<OSWorkflowSummary[]>
  registerWorkflow(definition: unknown): Promise<OSWorkflowSummary>
  runWorkflow(name: string, input?: Record<string, unknown>): Promise<OSWorkflowRunResult>
  // Sprint 4: improvement & sustainability
  getScorecards(agents: OSAgentMetrics[], threshold?: number): Promise<OSScorecardsResponse>
  refineAgent(agentId: string, patterns: OSFailurePattern[]): Promise<OSRefinementProposal>
  optimizeWorkflow(profile: OSWorkflowProfile): Promise<OSOptimizationSuggestion[]>
  estimateCarbon(input: OSCarbonInput): Promise<{ carbonGrams: number }>
  scoreDecision(input: OSDecisionInput): Promise<OSDecisionScore>
  // Sprint 5: per-inference sustainability scoring & research findings
  scoreInference(input: OSInferenceScoreInput): Promise<OSInferenceScore>
  getResearchFindings(date?: string): Promise<{ date: string; content: string } | { dates: string[] }>
}

export function createSeaBriOSClient(opts: SeaBriClientOptions): SeaBriOSClient {
  const { baseUrl, token } = opts
  const fetchFn: FetchFn = opts.fetch ?? globalThis.fetch

  function headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) h['Authorization'] = `Bearer ${token}`
    return h
  }

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const resp = await fetchFn(`${baseUrl}${path}`, {
      method,
      headers: headers(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    const data = await resp.json()
    if (!resp.ok) {
      throw new SeaBriClientError(resp.status, (data as any)?.error ?? String(resp.status))
    }
    return data as T
  }

  return {
    async listAgents() {
      const data = await request<{ agents: OSAgentInfo[] }>('GET', '/api/seabri/agents')
      return data.agents
    },

    async listModels() {
      const data = await request<{ models: OSModelInfo[] }>('GET', '/api/seabri/models')
      return data.models
    },

    routeTask(input) {
      return request<OSRoutingDecision>('POST', '/api/seabri/route', input)
    },

    getTelemetry() {
      return request<OSTelemetrySnapshot>('GET', '/api/seabri/telemetry')
    },

    submitFeedback(input) {
      return request<OSFeedbackEntry>('POST', '/api/seabri/feedback', input)
    },

    getFeedbackSummary() {
      return request<OSFeedbackSummary>('GET', '/api/seabri/feedback/summary')
    },

    async getTelemetryHistory(days = 7) {
      const data = await request<{ history: OSDailyBucket[] }>('GET', `/api/seabri/telemetry/history?days=${days}`)
      return data.history
    },

    async listTools() {
      const data = await request<{ tools: OSToolInfo[] }>('GET', '/api/seabri/tools')
      return data.tools
    },

    async listPlugins() {
      const data = await request<{ plugins: OSPluginManifest[] }>('GET', '/api/seabri/plugins')
      return data.plugins
    },

    registerPlugin(manifest) {
      return request<OSPluginManifest>('POST', '/api/seabri/plugins', manifest)
    },

    async listWorkflows() {
      const data = await request<{ workflows: OSWorkflowSummary[] }>('GET', '/api/seabri/workflows')
      return data.workflows
    },

    registerWorkflow(definition) {
      return request<OSWorkflowSummary>('POST', '/api/seabri/workflows', definition)
    },

    runWorkflow(name, input = {}) {
      return request<OSWorkflowRunResult>(`POST`, `/api/seabri/workflows/${encodeURIComponent(name)}/run`, { input })
    },

    getScorecards(agents, threshold) {
      return request<OSScorecardsResponse>('POST', '/api/seabri/improvement/scorecards', { agents, threshold })
    },

    refineAgent(agentId, patterns) {
      return request<OSRefinementProposal>('POST', '/api/seabri/improvement/refine', { agentId, patterns })
    },

    async optimizeWorkflow(profile) {
      const data = await request<{ suggestions: OSOptimizationSuggestion[] }>('POST', '/api/seabri/improvement/optimize-workflow', profile)
      return data.suggestions
    },

    estimateCarbon(input) {
      return request<{ carbonGrams: number }>('POST', '/api/seabri/sustainability/estimate', input)
    },

    scoreDecision(input) {
      return request<OSDecisionScore>('POST', '/api/seabri/sustainability/score', input)
    },

    scoreInference(input) {
      return request<OSInferenceScore>('POST', '/api/seabri/sustainability/score-inference', input)
    },

    getResearchFindings(date?: string) {
      const path = date
        ? `/api/seabri/research/findings?date=${encodeURIComponent(date)}`
        : '/api/seabri/research/findings'
      return request<{ date: string; content: string } | { dates: string[] }>('GET', path)
    },
  }
}

export function createSeaBriClient(opts: SeaBriClientOptions): SeaBriClient {
  const { baseUrl, token } = opts
  const fetchFn: FetchFn = opts.fetch ?? globalThis.fetch

  function headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) h['Authorization'] = `Bearer ${token}`
    return h
  }

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const resp = await fetchFn(`${baseUrl}${path}`, {
      method,
      headers: headers(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    const data = await resp.json()
    if (!resp.ok) {
      throw new SeaBriClientError(resp.status, (data as any)?.error ?? String(resp.status))
    }
    return data as T
  }

  return {
    chat(input) {
      return request<ChatResponse>('POST', '/api/v1/chat', input)
    },

    async listAgents() {
      const data = await request<{ agents: AgentInfo[] }>('GET', '/api/v1/agents')
      return data.agents
    },

    getMetrics() {
      return request<MetricsResponse>('GET', '/api/v1/metrics')
    },

    getSustainability() {
      return request<SustainabilityResponse>('GET', '/api/v1/sustainability')
    },

    createWorkflow(input) {
      return request<WorkflowResponse>('POST', '/api/v1/workflows', input)
    },

    runWorkflow(id) {
      return request<WorkflowRunResponse>('POST', `/api/v1/workflows/${id}/run`)
    },
  }
}

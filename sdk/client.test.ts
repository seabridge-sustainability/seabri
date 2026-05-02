import { describe, it, expect, vi } from 'vitest'
import {
  createSeaBriClient,
  createSeaBriOSClient,
  SeaBriClientError,
  type SeaBriClientOptions,
  type ChatResponse,
} from './client.js'

// Minimal fetch mock that returns pre-defined responses
function mockFetch(responses: Record<string, { status: number; body: unknown }>) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    const key = `${method} ${url}`
    const resp = responses[key] ?? { status: 404, body: { error: 'Not Found' } }
    return {
      ok: resp.status >= 200 && resp.status < 300,
      status: resp.status,
      json: async () => resp.body,
    }
  })
}

function simpleMock(status: number, body: unknown): typeof globalThis.fetch {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response)
}

const BASE = 'http://localhost:4000'
const OS_BASE = 'http://localhost:3000'

describe('createSeaBriClient', () => {
  describe('chat()', () => {
    it('sends a POST to /api/v1/chat and returns the response', async () => {
      const fetch = mockFetch({
        [`POST ${BASE}/api/v1/chat`]: {
          status: 200,
          body: { reply: 'Hello from SeaBri', agentId: 'general', sessionId: 'sess1' },
        },
      })
      const client = createSeaBriClient({ baseUrl: BASE, fetch: fetch as any })
      const result = await client.chat({ message: 'Hi' })
      expect(result.reply).toBe('Hello from SeaBri')
      expect(result.agentId).toBe('general')
    })

    it('includes bearer token in Authorization header when provided', async () => {
      const fetch = mockFetch({
        [`POST ${BASE}/api/v1/chat`]: { status: 200, body: { reply: 'ok', agentId: 'general', sessionId: 's1' } },
      })
      const client = createSeaBriClient({ baseUrl: BASE, token: 'my-token', fetch: fetch as any })
      await client.chat({ message: 'test' })
      const callArgs = (fetch as any).mock.calls[0]
      const headers = callArgs[1]?.headers as Record<string, string>
      expect(headers['Authorization']).toBe('Bearer my-token')
    })

    it('throws SeaBriClientError on non-2xx response', async () => {
      const fetch = mockFetch({
        [`POST ${BASE}/api/v1/chat`]: { status: 500, body: { error: 'Internal Server Error' } },
      })
      const client = createSeaBriClient({ baseUrl: BASE, fetch: fetch as any })
      await expect(client.chat({ message: 'hi' })).rejects.toThrow('500')
    })
  })

  describe('listAgents()', () => {
    it('fetches available agents', async () => {
      const fetch = mockFetch({
        [`GET ${BASE}/api/v1/agents`]: {
          status: 200,
          body: { agents: [{ id: 'climate-risk', name: 'Climate Risk' }] },
        },
      })
      const client = createSeaBriClient({ baseUrl: BASE, fetch: fetch as any })
      const agents = await client.listAgents()
      expect(agents).toHaveLength(1)
      expect(agents[0].id).toBe('climate-risk')
    })
  })

  describe('getMetrics()', () => {
    it('fetches usage metrics', async () => {
      const fetch = mockFetch({
        [`GET ${BASE}/api/v1/metrics`]: {
          status: 200,
          body: { totalRequests: 42, totalCostUsd: 1.23 },
        },
      })
      const client = createSeaBriClient({ baseUrl: BASE, fetch: fetch as any })
      const metrics = await client.getMetrics()
      expect(metrics.totalRequests).toBe(42)
    })
  })

  describe('getSustainability()', () => {
    it('fetches sustainability data', async () => {
      const fetch = mockFetch({
        [`GET ${BASE}/api/v1/sustainability`]: {
          status: 200,
          body: { totalCarbonGrams: 0.5, sustainabilityScore: 78 },
        },
      })
      const client = createSeaBriClient({ baseUrl: BASE, fetch: fetch as any })
      const data = await client.getSustainability()
      expect(data.sustainabilityScore).toBe(78)
    })
  })

  describe('createWorkflow() / runWorkflow()', () => {
    it('creates a workflow via POST', async () => {
      const fetch = mockFetch({
        [`POST ${BASE}/api/v1/workflows`]: {
          status: 201,
          body: { id: 'wf-1', name: 'My Workflow' },
        },
      })
      const client = createSeaBriClient({ baseUrl: BASE, fetch: fetch as any })
      const wf = await client.createWorkflow({ name: 'My Workflow', steps: [] })
      expect(wf.id).toBe('wf-1')
    })

    it('runs a workflow via POST to /workflows/:id/run', async () => {
      const fetch = mockFetch({
        [`POST ${BASE}/api/v1/workflows/wf-1/run`]: {
          status: 200,
          body: { runId: 'run-42', status: 'started' },
        },
      })
      const client = createSeaBriClient({ baseUrl: BASE, fetch: fetch as any })
      const result = await client.runWorkflow('wf-1')
      expect(result.runId).toBe('run-42')
    })
  })
})

// ── SeaBriOSClient ────────────────────────────────────────────────────────────

describe('createSeaBriOSClient', () => {
  it('listAgents returns agents array from GET /api/seabri/agents', async () => {
    const agents = [{ id: 'a1', name: 'Agent 1', description: '', capabilities: [], builtin: true }]
    const fetch = simpleMock(200, { agents })
    const client = createSeaBriOSClient({ baseUrl: OS_BASE, fetch })
    const result = await client.listAgents()
    expect(result).toEqual(agents)
    expect(fetch).toHaveBeenCalledWith(`${OS_BASE}/api/seabri/agents`, expect.objectContaining({ method: 'GET' }))
  })

  it('routeTask sends task body to POST /api/seabri/route', async () => {
    const decision = { taskId: 't1', agentId: 'climate-risk', modelId: 'haiku', modelTier: 'haiku', routingReason: 'simple', estimatedCostUsd: 0.001, estimatedCarbonGrams: 0.01, classificationConfidence: 0.9, sustainability: { composite: 80, tier: 'excellent' } }
    const fetch = simpleMock(200, decision)
    const client = createSeaBriOSClient({ baseUrl: OS_BASE, fetch })
    await client.routeTask({ task: 'Carbon footprint?' })
    expect(fetch).toHaveBeenCalledWith(`${OS_BASE}/api/seabri/route`, expect.objectContaining({ method: 'POST', body: JSON.stringify({ task: 'Carbon footprint?' }) }))
  })

  it('getTelemetryHistory appends days query param', async () => {
    const fetch = simpleMock(200, { history: [] })
    const client = createSeaBriOSClient({ baseUrl: OS_BASE, fetch })
    await client.getTelemetryHistory(14)
    expect(fetch).toHaveBeenCalledWith(`${OS_BASE}/api/seabri/telemetry/history?days=14`, expect.anything())
  })

  it('getScorecards posts agents array', async () => {
    const response = { scorecards: [], underperformers: [] }
    const fetch = simpleMock(200, response)
    const client = createSeaBriOSClient({ baseUrl: OS_BASE, fetch })
    const agents = [{ agentId: 'a1', totalTasks: 5, successfulTasks: 5, totalLatencyMs: 1000, totalCostUsd: 0.01, satisfactionRate: 100 }]
    const result = await client.getScorecards(agents, 60)
    expect(result).toEqual(response)
    expect(fetch).toHaveBeenCalledWith(
      `${OS_BASE}/api/seabri/improvement/scorecards`,
      expect.objectContaining({ body: JSON.stringify({ agents, threshold: 60 }) }),
    )
  })

  it('refineAgent posts agentId and patterns', async () => {
    const proposal = { id: 'r1', agentId: 'lca', improvedSystemPrompt: 'x', reasoning: 'y', expectedImprovements: [], status: 'pending', createdAt: 0 }
    const fetch = simpleMock(200, proposal)
    const client = createSeaBriOSClient({ baseUrl: OS_BASE, fetch })
    const patterns = [{ category: 'hallucination', count: 2, examples: ['e1'] }]
    const result = await client.refineAgent('lca', patterns)
    expect(result).toEqual(proposal)
    expect(fetch).toHaveBeenCalledWith(
      `${OS_BASE}/api/seabri/improvement/refine`,
      expect.objectContaining({ body: JSON.stringify({ agentId: 'lca', patterns }) }),
    )
  })

  it('optimizeWorkflow returns suggestions array', async () => {
    const suggestions = [{ type: 'parallelize', stepIds: ['s1', 's2'], description: 'Run in parallel' }]
    const fetch = simpleMock(200, { suggestions })
    const client = createSeaBriOSClient({ baseUrl: OS_BASE, fetch })
    const profile = { workflowId: 'wf1', steps: [], totalAvgLatencyMs: 0, totalAvgCostUsd: 0 }
    const result = await client.optimizeWorkflow(profile)
    expect(result).toEqual(suggestions)
  })

  it('estimateCarbon returns carbonGrams', async () => {
    const fetch = simpleMock(200, { carbonGrams: 0.042 })
    const client = createSeaBriOSClient({ baseUrl: OS_BASE, fetch })
    const result = await client.estimateCarbon({ model: 'claude-sonnet-4-6', inputTokens: 1000, outputTokens: 500 })
    expect(result.carbonGrams).toBe(0.042)
  })

  it('scoreDecision returns full DecisionScore', async () => {
    const score = { carbonScore: 90, efficiencyScore: 85, recommendationScore: 100, overallScore: 91, recommendations: [] }
    const fetch = simpleMock(200, score)
    const client = createSeaBriOSClient({ baseUrl: OS_BASE, fetch })
    const result = await client.scoreDecision({ carbonGrams: 0.001, model: 'claude-haiku-4-5', inputTokens: 500, outputTokens: 200, taskComplexity: 'simple', userFollowedRecommendation: true })
    expect(result).toEqual(score)
  })

  it('scoreInference posts to /api/seabri/sustainability/score-inference', async () => {
    const score = { composite: 90, tier: 'excellent', costEfficiency: 95, carbonEfficiency: 88, breakdown: { costUsd: 0.0001, carbonGrams: 0.001, modelTier: 'haiku' } }
    const fetch = simpleMock(200, score)
    const client = createSeaBriOSClient({ baseUrl: OS_BASE, fetch })
    const result = await client.scoreInference({ costUsd: 0.0001, carbonGrams: 0.001, modelTier: 'haiku' })
    expect(result).toEqual(score)
    expect(fetch).toHaveBeenCalledWith(`${OS_BASE}/api/seabri/sustainability/score-inference`, expect.objectContaining({ method: 'POST' }))
  })

  it('getResearchFindings without date calls /api/seabri/research/findings', async () => {
    const fetch = simpleMock(200, { dates: ['2026-05-02'] })
    const client = createSeaBriOSClient({ baseUrl: OS_BASE, fetch })
    const result = await client.getResearchFindings()
    expect(result).toEqual({ dates: ['2026-05-02'] })
    expect(fetch).toHaveBeenCalledWith(`${OS_BASE}/api/seabri/research/findings`, expect.anything())
  })

  it('getResearchFindings with date appends query param', async () => {
    const findings = { date: '2026-05-02', content: '# Findings' }
    const fetch = simpleMock(200, findings)
    const client = createSeaBriOSClient({ baseUrl: OS_BASE, fetch })
    await client.getResearchFindings('2026-05-02')
    expect(fetch).toHaveBeenCalledWith(`${OS_BASE}/api/seabri/research/findings?date=2026-05-02`, expect.anything())
  })

  it('throws SeaBriClientError with status on non-2xx', async () => {
    const fetch = simpleMock(404, { error: 'Not found' })
    const client = createSeaBriOSClient({ baseUrl: OS_BASE, fetch })
    try {
      await client.listAgents()
      expect.fail('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(SeaBriClientError)
      expect((err as SeaBriClientError).status).toBe(404)
    }
  })

  it('sends Authorization header when token provided', async () => {
    const fetch = simpleMock(200, { agents: [] })
    const client = createSeaBriOSClient({ baseUrl: OS_BASE, token: 'tok-123', fetch })
    await client.listAgents()
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer tok-123' }) }),
    )
  })
})

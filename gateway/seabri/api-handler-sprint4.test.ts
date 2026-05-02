import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createServer, type Server } from 'http'
import { handleSeabriApiRequest } from './api-handler.js'

function makeServer(): { server: Server; baseUrl: () => string } {
  const server = createServer(async (req, res) => {
    await handleSeabriApiRequest(req, res)
  })
  return {
    server,
    baseUrl: () => `http://localhost:${(server.address() as { port: number }).port}`,
  }
}

async function listen(server: Server): Promise<void> {
  return new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
}

async function close(server: Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()))
}

describe('Sprint 4 API — improvement & sustainability', () => {
  let server: Server
  let baseUrl: () => string

  beforeEach(async () => {
    ;({ server, baseUrl } = makeServer())
    await listen(server)
  })

  afterEach(async () => {
    await close(server)
  })

  // ── Improvement: scorecards ───────────────────────────────────────────────

  it('POST /api/seabri/improvement/scorecards returns ranked scorecards', async () => {
    const agents = [
      { agentId: 'climate-risk', totalTasks: 10, successfulTasks: 9, totalLatencyMs: 5000, totalCostUsd: 0.05, satisfactionRate: 80 },
      { agentId: 'lca', totalTasks: 5, successfulTasks: 2, totalLatencyMs: 30000, totalCostUsd: 0.50, satisfactionRate: 40 },
    ]
    const res = await fetch(`${baseUrl()}/api/seabri/improvement/scorecards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agents }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { scorecards: Array<{ agentId: string; overallScore: number }>; underperformers: unknown[] }
    expect(Array.isArray(body.scorecards)).toBe(true)
    expect(body.scorecards).toHaveLength(2)
    // Ranked highest first — climate-risk should score higher
    expect(body.scorecards[0].agentId).toBe('climate-risk')
    expect(Array.isArray(body.underperformers)).toBe(true)
  })

  it('POST /api/seabri/improvement/scorecards returns underperformers below threshold', async () => {
    const agents = [
      { agentId: 'bad-agent', totalTasks: 10, successfulTasks: 1, totalLatencyMs: 60000, totalCostUsd: 2.0, satisfactionRate: 10 },
    ]
    const res = await fetch(`${baseUrl()}/api/seabri/improvement/scorecards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agents, threshold: 80 }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { underperformers: Array<{ agentId: string }> }
    expect(body.underperformers.some((u) => u.agentId === 'bad-agent')).toBe(true)
  })

  it('POST /api/seabri/improvement/scorecards 400 when agents missing', async () => {
    const res = await fetch(`${baseUrl()}/api/seabri/improvement/scorecards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })

  // ── Improvement: refine ───────────────────────────────────────────────────

  it('POST /api/seabri/improvement/refine returns a RefinementProposal', async () => {
    const res = await fetch(`${baseUrl()}/api/seabri/improvement/refine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: 'climate-risk',
        patterns: [{ category: 'hallucination', count: 3, examples: ['Example 1', 'Example 2'] }],
      }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { id: string; agentId: string; status: string; improvedSystemPrompt: string }
    expect(body.agentId).toBe('climate-risk')
    expect(body.status).toBe('pending')
    expect(typeof body.id).toBe('string')
    expect(typeof body.improvedSystemPrompt).toBe('string')
  })

  it('POST /api/seabri/improvement/refine 400 when agentId missing', async () => {
    const res = await fetch(`${baseUrl()}/api/seabri/improvement/refine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patterns: [] }),
    })
    expect(res.status).toBe(400)
  })

  it('POST /api/seabri/improvement/refine 400 when patterns missing', async () => {
    const res = await fetch(`${baseUrl()}/api/seabri/improvement/refine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'climate-risk' }),
    })
    expect(res.status).toBe(400)
  })

  // ── Improvement: optimize-workflow ────────────────────────────────────────

  it('POST /api/seabri/improvement/optimize-workflow returns suggestions array', async () => {
    const profile = {
      workflowId: 'wf-1',
      steps: [
        { stepId: 's1', model: 'claude-opus-4-7', avgLatencyMs: 3000, avgCostUsd: 0.5, successRate: 95, dependsOn: [] },
        { stepId: 's2', model: 'claude-haiku-4-5', avgLatencyMs: 500, avgCostUsd: 0.01, successRate: 99, dependsOn: [] },
      ],
      totalAvgLatencyMs: 3500,
      totalAvgCostUsd: 0.51,
    }
    const res = await fetch(`${baseUrl()}/api/seabri/improvement/optimize-workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { suggestions: Array<{ type: string }> }
    expect(Array.isArray(body.suggestions)).toBe(true)
    // s1 uses opus (tier 3) → should get downgrade suggestion
    expect(body.suggestions.some((s) => s.type === 'downgrade_model')).toBe(true)
    // s1 and s2 have no deps → should get parallelize suggestion
    expect(body.suggestions.some((s) => s.type === 'parallelize')).toBe(true)
  })

  it('POST /api/seabri/improvement/optimize-workflow 400 on invalid profile', async () => {
    const res = await fetch(`${baseUrl()}/api/seabri/improvement/optimize-workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflowId: 'bad' }), // missing steps
    })
    expect(res.status).toBe(400)
  })

  // ── Sustainability: estimate ──────────────────────────────────────────────

  it('POST /api/seabri/sustainability/estimate returns carbonGrams', async () => {
    const res = await fetch(`${baseUrl()}/api/seabri/sustainability/estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', inputTokens: 1000, outputTokens: 500 }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { carbonGrams: number }
    expect(typeof body.carbonGrams).toBe('number')
    expect(body.carbonGrams).toBeGreaterThanOrEqual(0)
  })

  it('POST /api/seabri/sustainability/estimate uses region grid intensity', async () => {
    const [lowRes, highRes] = await Promise.all([
      fetch(`${baseUrl()}/api/seabri/sustainability/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-6', inputTokens: 1000, outputTokens: 1000, region: 'sa-east-1' }),
      }),
      fetch(`${baseUrl()}/api/seabri/sustainability/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-6', inputTokens: 1000, outputTokens: 1000, region: 'ap-south-1' }),
      }),
    ])
    const low = await lowRes.json() as { carbonGrams: number }
    const high = await highRes.json() as { carbonGrams: number }
    // São Paulo (74 gCO2e/kWh) should be lower than Mumbai (713 gCO2e/kWh)
    expect(low.carbonGrams).toBeLessThan(high.carbonGrams)
  })

  it('POST /api/seabri/sustainability/estimate 400 when model missing', async () => {
    const res = await fetch(`${baseUrl()}/api/seabri/sustainability/estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputTokens: 1000 }),
    })
    expect(res.status).toBe(400)
  })

  // ── Sustainability: score ─────────────────────────────────────────────────

  it('POST /api/seabri/sustainability/score returns DecisionScore', async () => {
    const res = await fetch(`${baseUrl()}/api/seabri/sustainability/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        carbonGrams: 0.001,
        model: 'claude-haiku-4-5',
        inputTokens: 500,
        outputTokens: 200,
        taskComplexity: 'simple',
        userFollowedRecommendation: true,
      }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { carbonScore: number; efficiencyScore: number; overallScore: number; recommendations: string[] }
    expect(typeof body.carbonScore).toBe('number')
    expect(typeof body.efficiencyScore).toBe('number')
    expect(typeof body.overallScore).toBe('number')
    expect(Array.isArray(body.recommendations)).toBe(true)
  })

  it('POST /api/seabri/sustainability/score penalizes over-powered model', async () => {
    const [efficientRes, wastedRes] = await Promise.all([
      fetch(`${baseUrl()}/api/seabri/sustainability/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carbonGrams: 0.001, model: 'claude-haiku-4-5', inputTokens: 500, outputTokens: 200, taskComplexity: 'simple', userFollowedRecommendation: null }),
      }),
      fetch(`${baseUrl()}/api/seabri/sustainability/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carbonGrams: 0.001, model: 'claude-opus-4-7', inputTokens: 500, outputTokens: 200, taskComplexity: 'simple', userFollowedRecommendation: null }),
      }),
    ])
    const efficient = await efficientRes.json() as { efficiencyScore: number }
    const wasted = await wastedRes.json() as { efficiencyScore: number }
    expect(efficient.efficiencyScore).toBeGreaterThan(wasted.efficiencyScore)
  })

  it('POST /api/seabri/sustainability/score 400 when model missing', async () => {
    const res = await fetch(`${baseUrl()}/api/seabri/sustainability/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ carbonGrams: 0.001, taskComplexity: 'simple', userFollowedRecommendation: null }),
    })
    expect(res.status).toBe(400)
  })
})

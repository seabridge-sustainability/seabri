import type { IncomingMessage, ServerResponse } from 'http'
import { agentRegistry } from './agent-registry.js'
import { modelRegistry } from './model-registry.js'
import { routeTask } from './task-router.js'
import { getTelemetrySnapshot, getTelemetryHistory } from './telemetry.js'
import { submitFeedback, getFeedbackSummary } from './feedback.js'
import { listTools } from '../tools/registry.js'
import { pluginRegistry } from './plugin-registry-singleton.js'
import { registerWorkflow, listWorkflows, runWorkflow } from './workflow-store.js'
import { validatePluginManifest } from '../../plugins/loader.js'
import { rankAgents, identifyUnderperformers } from '../../improvement/evaluator.js'
import { createRefiner } from '../../improvement/refiner.js'
import { buildOptimizationSuggestions } from '../../improvement/workflow-optimizer.js'
import { estimateCarbonGrams } from '../../sustainability/carbon-model.js'
import { scoreDecision } from '../../sustainability/scorer.js'
import { scoreSustainability } from './sustainability-scoring.js'
import { readFindings, listFindingsDates } from './research-reader.js'

function json(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  })
  res.end(payload)
}

async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

/**
 * Handle SeaBri OS REST API requests.
 * Returns true if the request matched a SeaBri route, false otherwise.
 *
 * Routes:
 *   GET  /api/seabri/agents                    — list all registered agents
 *   GET  /api/seabri/models                    — list all registered models
 *   POST /api/seabri/route                     — route a task (body: { task, agentId?, modelId? })
 *   GET  /api/seabri/telemetry                 — telemetry snapshot
 *   GET  /api/seabri/telemetry/history         — bucketed daily history (query: days=7)
 *   POST /api/seabri/feedback                  — submit feedback
 *   GET  /api/seabri/feedback/summary          — aggregated feedback summary
 *   GET  /api/seabri/tools                     — list registered tools
 *   GET  /api/seabri/plugins                   — list registered plugins
 *   POST /api/seabri/plugins                   — register a plugin (body: PluginManifest)
 *   GET  /api/seabri/workflows                 — list registered workflow definitions
 *   POST /api/seabri/workflows                 — register a workflow definition
 *   POST /api/seabri/workflows/:name/run       — run a workflow (body: { input? })
 *   POST /api/seabri/improvement/scorecards    — rank agents by scorecard (body: { agents: AgentMetrics[], threshold? })
 *   POST /api/seabri/improvement/refine        — propose improved system prompt (body: { agentId, patterns })
 *   POST /api/seabri/improvement/optimize-workflow — optimization suggestions (body: WorkflowProfile)
 *   POST /api/seabri/sustainability/estimate       — estimate carbon for a request (body: CarbonInput)
 *   POST /api/seabri/sustainability/score          — score a routing decision (body: DecisionInput)
 *   POST /api/seabri/sustainability/score-inference — per-inference sustainability score (body: { costUsd, carbonGrams, modelTier })
 *   GET  /api/seabri/research/findings             — list finding dates, or fetch one (query: date=YYYY-MM-DD)
 */
export async function handleSeabriApiRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  const url = req.url ?? ''
  const method = req.method ?? 'GET'

  if (!url.startsWith('/api/seabri')) return false

  try {
    // GET /api/seabri/agents
    if (url === '/api/seabri/agents' && method === 'GET') {
      const agents = agentRegistry.list().map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        capabilities: a.capabilities,
        builtin: a.builtin,
      }))
      json(res, 200, { agents })
      return true
    }

    // GET /api/seabri/models
    if (url === '/api/seabri/models' && method === 'GET') {
      const models = modelRegistry.list().map((m) => ({
        id: m.id,
        name: m.name,
        tier: m.tier,
        contextWindow: m.contextWindow,
        costPer1kInputUsd: m.costPer1kInputUsd,
        costPer1kOutputUsd: m.costPer1kOutputUsd,
        carbonPer1kTokensGrams: m.carbonPer1kTokensGrams,
        strengths: m.strengths,
      }))
      json(res, 200, { models })
      return true
    }

    // POST /api/seabri/route
    if (url === '/api/seabri/route' && method === 'POST') {
      const body = await readBody(req)
      let parsed: { task?: unknown; agentId?: unknown; modelId?: unknown; conversationDepth?: unknown }
      try {
        parsed = JSON.parse(body)
      } catch {
        json(res, 400, { error: 'Invalid JSON body' })
        return true
      }

      const task = typeof parsed.task === 'string' ? parsed.task.trim() : ''
      if (!task) {
        json(res, 400, { error: '"task" string is required' })
        return true
      }

      const decision = routeTask({
        task,
        agentId: typeof parsed.agentId === 'string' ? parsed.agentId : undefined,
        modelId: typeof parsed.modelId === 'string' ? parsed.modelId : undefined,
        conversationDepth: typeof parsed.conversationDepth === 'number' ? parsed.conversationDepth : undefined,
      })

      json(res, 200, decision)
      return true
    }

    // GET /api/seabri/telemetry
    if (url === '/api/seabri/telemetry' && method === 'GET') {
      json(res, 200, getTelemetrySnapshot())
      return true
    }

    // GET /api/seabri/telemetry/history
    if (url.startsWith('/api/seabri/telemetry/history') && method === 'GET') {
      const qs = url.includes('?') ? new URLSearchParams(url.slice(url.indexOf('?') + 1)) : null
      const days = qs ? parseInt(qs.get('days') ?? '7', 10) : 7
      json(res, 200, { history: getTelemetryHistory(Number.isFinite(days) && days > 0 ? days : 7) })
      return true
    }

    // GET /api/seabri/feedback/summary
    if (url === '/api/seabri/feedback/summary' && method === 'GET') {
      json(res, 200, getFeedbackSummary())
      return true
    }

    // POST /api/seabri/feedback
    if (url === '/api/seabri/feedback' && method === 'POST') {
      const body = await readBody(req)
      let parsed: { sessionId?: unknown; rating?: unknown; agentId?: unknown; taskId?: unknown; correction?: unknown }
      try {
        parsed = JSON.parse(body)
      } catch {
        json(res, 400, { error: 'Invalid JSON body' })
        return true
      }

      const sessionId = typeof parsed.sessionId === 'string' ? parsed.sessionId.trim() : ''
      if (!sessionId) {
        json(res, 400, { error: '"sessionId" string is required' })
        return true
      }
      const rating = parsed.rating === 'up' || parsed.rating === 'down' ? parsed.rating : null
      if (!rating) {
        json(res, 400, { error: '"rating" must be "up" or "down"' })
        return true
      }

      const entry = submitFeedback({
        sessionId,
        rating,
        agentId: typeof parsed.agentId === 'string' ? parsed.agentId : undefined,
        taskId: typeof parsed.taskId === 'string' ? parsed.taskId : undefined,
        correction: typeof parsed.correction === 'string' ? parsed.correction : undefined,
      })

      json(res, 201, entry)
      return true
    }

    // GET /api/seabri/tools
    if (url === '/api/seabri/tools' && method === 'GET') {
      json(res, 200, { tools: listTools() })
      return true
    }

    // GET /api/seabri/plugins
    if (url === '/api/seabri/plugins' && method === 'GET') {
      json(res, 200, { plugins: pluginRegistry.list() })
      return true
    }

    // POST /api/seabri/plugins
    if (url === '/api/seabri/plugins' && method === 'POST') {
      const body = await readBody(req)
      let parsed: unknown
      try {
        parsed = JSON.parse(body)
      } catch {
        json(res, 400, { error: 'Invalid JSON body' })
        return true
      }
      try {
        validatePluginManifest(parsed as Parameters<typeof validatePluginManifest>[0])
        pluginRegistry.register(parsed as Parameters<typeof pluginRegistry.register>[0])
      } catch (err: unknown) {
        json(res, 400, { error: err instanceof Error ? err.message : String(err) })
        return true
      }
      json(res, 201, parsed)
      return true
    }

    // GET /api/seabri/workflows
    if (url === '/api/seabri/workflows' && method === 'GET') {
      const workflows = listWorkflows().map((w) => ({
        name: w.name,
        description: w.description,
        stepCount: w.steps.length,
        trigger: w.trigger?.type,
      }))
      json(res, 200, { workflows })
      return true
    }

    // POST /api/seabri/workflows
    if (url === '/api/seabri/workflows' && method === 'POST') {
      const body = await readBody(req)
      let parsed: unknown
      try {
        parsed = JSON.parse(body)
      } catch {
        json(res, 400, { error: 'Invalid JSON body' })
        return true
      }
      try {
        const def = registerWorkflow(parsed)
        json(res, 201, { name: def.name, description: def.description, stepCount: def.steps.length })
      } catch (err: unknown) {
        json(res, 400, { error: err instanceof Error ? err.message : String(err) })
      }
      return true
    }

    // POST /api/seabri/workflows/:name/run
    if (url.startsWith('/api/seabri/workflows/') && url.endsWith('/run') && method === 'POST') {
      const name = decodeURIComponent(url.slice('/api/seabri/workflows/'.length, -'/run'.length))
      if (!name) {
        json(res, 400, { error: 'Workflow name is required' })
        return true
      }
      const body = await readBody(req)
      let input: Record<string, unknown> = {}
      if (body) {
        try {
          const parsed = JSON.parse(body) as { input?: Record<string, unknown> }
          if (parsed.input && typeof parsed.input === 'object') input = parsed.input
        } catch {
          json(res, 400, { error: 'Invalid JSON body' })
          return true
        }
      }
      try {
        const result = await runWorkflow(name, input)
        json(res, 200, result)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        const status = message.includes('not found') ? 404 : 500
        json(res, status, { error: message })
      }
      return true
    }

    // POST /api/seabri/improvement/scorecards
    if (url === '/api/seabri/improvement/scorecards' && method === 'POST') {
      const body = await readBody(req)
      let parsed: { agents?: unknown; threshold?: unknown }
      try {
        parsed = JSON.parse(body)
      } catch {
        json(res, 400, { error: 'Invalid JSON body' })
        return true
      }
      if (!Array.isArray(parsed.agents)) {
        json(res, 400, { error: '"agents" array is required' })
        return true
      }
      const threshold = typeof parsed.threshold === 'number' ? parsed.threshold : undefined
      const ranked = rankAgents(parsed.agents as Parameters<typeof rankAgents>[0])
      const underperformers = identifyUnderperformers(
        parsed.agents as Parameters<typeof identifyUnderperformers>[0],
        threshold !== undefined ? { threshold } : {},
      )
      json(res, 200, { scorecards: ranked, underperformers })
      return true
    }

    // POST /api/seabri/improvement/refine
    if (url === '/api/seabri/improvement/refine' && method === 'POST') {
      const body = await readBody(req)
      let parsed: { agentId?: unknown; patterns?: unknown }
      try {
        parsed = JSON.parse(body)
      } catch {
        json(res, 400, { error: 'Invalid JSON body' })
        return true
      }
      if (typeof parsed.agentId !== 'string' || !parsed.agentId.trim()) {
        json(res, 400, { error: '"agentId" string is required' })
        return true
      }
      if (!Array.isArray(parsed.patterns)) {
        json(res, 400, { error: '"patterns" array is required' })
        return true
      }
      const proposal = await createRefiner().refine(
        parsed.agentId,
        parsed.patterns as Parameters<ReturnType<typeof createRefiner>['refine']>[1],
      )
      json(res, 200, proposal)
      return true
    }

    // POST /api/seabri/improvement/optimize-workflow
    if (url === '/api/seabri/improvement/optimize-workflow' && method === 'POST') {
      const body = await readBody(req)
      let parsed: unknown
      try {
        parsed = JSON.parse(body)
      } catch {
        json(res, 400, { error: 'Invalid JSON body' })
        return true
      }
      const profile = parsed as Parameters<typeof buildOptimizationSuggestions>[0]
      if (!profile || typeof profile !== 'object' || !Array.isArray((profile as { steps?: unknown }).steps)) {
        json(res, 400, { error: 'Valid WorkflowProfile with "steps" array is required' })
        return true
      }
      const suggestions = buildOptimizationSuggestions(profile)
      json(res, 200, { suggestions })
      return true
    }

    // POST /api/seabri/sustainability/estimate
    if (url === '/api/seabri/sustainability/estimate' && method === 'POST') {
      const body = await readBody(req)
      let parsed: unknown
      try {
        parsed = JSON.parse(body)
      } catch {
        json(res, 400, { error: 'Invalid JSON body' })
        return true
      }
      const input = parsed as Parameters<typeof estimateCarbonGrams>[0]
      if (!input || typeof (input as { model?: unknown }).model !== 'string') {
        json(res, 400, { error: 'Valid CarbonInput with "model" string is required' })
        return true
      }
      const carbonGrams = estimateCarbonGrams(input)
      json(res, 200, { carbonGrams })
      return true
    }

    // POST /api/seabri/sustainability/score
    if (url === '/api/seabri/sustainability/score' && method === 'POST') {
      const body = await readBody(req)
      let parsed: unknown
      try {
        parsed = JSON.parse(body)
      } catch {
        json(res, 400, { error: 'Invalid JSON body' })
        return true
      }
      const input = parsed as Parameters<typeof scoreDecision>[0]
      if (!input || typeof (input as { model?: unknown }).model !== 'string' || typeof (input as { taskComplexity?: unknown }).taskComplexity !== 'string') {
        json(res, 400, { error: 'Valid DecisionInput with "model" and "taskComplexity" is required' })
        return true
      }
      const score = scoreDecision(input)
      json(res, 200, score)
      return true
    }

    // POST /api/seabri/sustainability/score-inference
    if (url === '/api/seabri/sustainability/score-inference' && method === 'POST') {
      const body = await readBody(req)
      let parsed: unknown
      try {
        parsed = JSON.parse(body)
      } catch {
        json(res, 400, { error: 'Invalid JSON body' })
        return true
      }
      const input = parsed as { costUsd?: unknown; carbonGrams?: unknown; modelTier?: unknown }
      if (!input || typeof input.costUsd !== 'number' || typeof input.carbonGrams !== 'number') {
        json(res, 400, { error: 'Valid input with "costUsd" and "carbonGrams" numbers is required' })
        return true
      }
      const tier = input.modelTier
      if (tier !== 'haiku' && tier !== 'sonnet' && tier !== 'opus') {
        json(res, 400, { error: '"modelTier" must be "haiku", "sonnet", or "opus"' })
        return true
      }
      const score = scoreSustainability(input.costUsd, input.carbonGrams, tier)
      json(res, 200, score)
      return true
    }

    // GET /api/seabri/research/findings
    if (url.startsWith('/api/seabri/research/findings') && method === 'GET') {
      const qs = url.includes('?') ? new URLSearchParams(url.slice(url.indexOf('?') + 1)) : null
      const date = qs?.get('date') ?? undefined
      if (date) {
        const result = readFindings(date)
        if (!result) {
          json(res, 404, { error: `No findings for date ${date}` })
        } else {
          json(res, 200, result)
        }
      } else {
        const dates = listFindingsDates()
        json(res, 200, { dates })
      }
      return true
    }

    // Unknown /api/seabri/* route
    json(res, 404, { error: `No SeaBri route for ${method} ${url}` })
    return true
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    json(res, 500, { error: message })
    return true
  }
}

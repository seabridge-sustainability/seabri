import type { IncomingMessage, ServerResponse } from 'http'
import { timingSafeEqual } from 'crypto'
import { z } from 'zod'
import { modelRegistry } from './model-registry.js'
import { routeTask } from './task-router.js'
import { getTelemetrySnapshot, getTelemetryHistory } from './telemetry.js'
import { submitFeedback, getFeedbackSummary } from './feedback.js'
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
import { generateCarbonReport } from './carbon-report.js'
import { checkDailyBudget, checkSessionBudget, checkBudgetAlert } from './carbon-budget.js'
import { scanWebsite } from '../../bridge/seabridge_client.js'
import {
  getAgentView,
  listAgentViews,
  listCapabilityViews,
  listMcpViews,
  listSkillViews,
  listToolViews,
} from './registry-views.js'
import { buildRegistrySnapshot } from './registry-snapshot.js'
import { getProviderReadiness, validateProviderReadiness } from './provider-readiness.js'
import { runIncidentWorkflow } from './incident-workflow.js'
import { analyzeIncidentImage, IncidentImageInputSchema } from './vision-analysis.js'
import { createResourceActionCard, searchLocalResources, LocalResourceSearchInputSchema, ResourceCategorySchema } from './local-resources.js'
import { compareProducts, CompareProductsInputSchema } from '../sustainability/product-comparison.js'
import { optimizeSustainableCompute, SustainableComputeInputSchema } from './sustainable-compute.js'
import {
  CarbonOffsetCheckerInputSchema,
  CertificationNavigatorInputSchema,
  CommunityResilienceInputSchema,
  CommunityProjectInputSchema,
  HomeEnergyInputSchema,
  HouseholdCarbonInputSchema,
  SustainablePurchasingInputSchema,
  buildCommunityResilienceChecklist,
  buildSustainablePurchasingChecklist,
  checkCarbonOffsetQuality,
  estimateHouseholdCarbon,
  navigateCertification,
  planCommunityProject,
  planHomeEnergyActions,
} from './practical-sustainability.js'
import { deleteProfile, getProfile, upsertProfile } from './user-profile.js'
import { recordTelemetryEvent } from '../telemetry/store.js'

const RouteBodySchema = z.object({
  task: z.string().trim().min(1, '"task" string is required'),
  agentId: z.string().trim().optional(),
  modelId: z.string().trim().optional(),
  conversationDepth: z.number().int().nonnegative().optional(),
  channelId: z.string().trim().optional(),
})

const FeedbackBodySchema = z.object({
  sessionId: z.string().trim().min(1, '"sessionId" string is required'),
  rating: z.enum(['up', 'down']),
  agentId: z.string().trim().optional(),
  taskId: z.string().trim().optional(),
  correction: z.string().optional(),
})

const WorkflowRunBodySchema = z.object({
  input: z.record(z.string(), z.unknown()).optional(),
})

const ProviderValidateBodySchema = z.object({
  provider: z.string().trim().optional(),
  testTarget: z.string().trim().optional(),
  liveTestRequested: z.boolean().optional(),
})

const IncidentWorkflowBodySchema = z.object({
  message: z.string().trim().min(1, '"message" string is required').max(100_000),
  history: z.array(z.object({
    role: z.string().trim(),
    content: z.string(),
  })).optional(),
  profile: z.record(z.string(), z.unknown()).optional(),
})

const ResourceActionCardBodySchema = z.object({
  resource: z.object({
    id: z.string(),
    name: z.string(),
    category: ResourceCategorySchema,
    rank: z.number().int().positive(),
    phone: z.string().optional(),
    website: z.string().optional(),
    address: z.string().optional(),
    hours: z.string().optional(),
    source: z.string(),
    sourceUrl: z.string().optional(),
    confidence: z.enum(['high', 'medium', 'low']),
    notes: z.string().optional(),
  }),
  purpose: z.string().trim().max(240).optional(),
}).strict()

const ProfileQuerySchema = z.object({
  userId: z.string().trim().min(1).max(120),
  channel: z.string().trim().min(1).max(40).default('web'),
})

const ProfileUpdateSchema = ProfileQuerySchema.extend({
  name: z.string().trim().max(120).optional(),
  address: z.string().trim().max(240).optional(),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(80).optional(),
  zip: z.string().trim().max(20).optional(),
  phone: z.string().trim().max(40).optional(),
  preferredLanguage: z.string().trim().max(40).optional(),
  emergencyContact: z.string().trim().max(160).optional(),
  householdNotes: z.string().trim().max(500).optional(),
}).strict()

function json(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  })
  res.end(payload)
}

const MAX_BODY_BYTES = 1 * 1024 * 1024 // 1 MB

async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let total = 0
    req.on('data', (c: Buffer) => {
      total += c.length
      if (total > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Payload too large'), { status: 413 }))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

async function parseJsonWithSchema<T>(
  req: IncomingMessage,
  schema: z.ZodType<T>,
): Promise<{ ok: true; value: T } | { ok: false; status: number; error: string }> {
  const body = await readBody(req)
  let parsed: unknown
  if (!body.trim()) {
    parsed = {}
  } else {
    try {
      parsed = JSON.parse(body)
    } catch {
      return { ok: false, status: 400, error: 'Invalid JSON body' }
    }
  }

  const result = schema.safeParse(parsed)
  if (!result.success) {
    const first = result.error.issues[0]
    if (first?.path[0] === 'task') {
      return { ok: false, status: 400, error: '"task" string is required' }
    }
    return { ok: false, status: 400, error: first?.message ?? 'Invalid request body' }
  }
  return { ok: true, value: result.data }
}

function isAuthorized(req: IncomingMessage): boolean {
  const apiKey = process.env.OPENSEABRI_API_KEY
  if (!apiKey) return false
  const header = req.headers['x-openseabri-key'] as string | undefined
  if (!header) return false
  try {
    return timingSafeEqual(Buffer.from(header), Buffer.from(apiKey))
  } catch {
    return false
  }
}

function queryParams(url: string): URLSearchParams {
  return url.includes('?') ? new URLSearchParams(url.slice(url.indexOf('?') + 1)) : new URLSearchParams()
}

/**
 * Handle SeaBri OS REST API requests.
 * Returns true if the request matched a SeaBri route, false otherwise.
 *
 * Routes:
 *   GET  /api/seabri/capabilities              - sanitized capability registry
 *   GET  /api/seabri/agents/:id                - sanitized agent detail
 *   GET  /api/seabri/skills                    - sanitized skill registry
 *   GET  /api/seabri/mcp                       - sanitized MCP registry
 *   GET  /api/seabri/registry-snapshot         - versioned sanitized registry snapshot
 *   GET  /api/seabri/admin/provider-readiness  - sanitized provider readiness
 *   POST /api/seabri/admin/provider-validate   - safe provider config validation only
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

  if (!isAuthorized(req)) {
    json(res, 401, { error: 'Unauthorized' })
    return true
  }

  try {
    // GET /api/seabri/capabilities
    if (url === '/api/seabri/capabilities' && method === 'GET') {
      json(res, 200, { capabilities: listCapabilityViews() })
      return true
    }

    // GET /api/seabri/agents
    if (url === '/api/seabri/agents' && method === 'GET') {
      json(res, 200, { agents: listAgentViews() })
      return true
    }

    // GET /api/seabri/agents/:id
    if (url.startsWith('/api/seabri/agents/') && method === 'GET') {
      const id = decodeURIComponent(url.slice('/api/seabri/agents/'.length))
      const agent = getAgentView(id)
      if (!agent) {
        json(res, 404, { error: `Agent "${id}" not found` })
      } else {
        json(res, 200, { agent })
      }
      return true
    }

    // GET /api/seabri/skills
    if (url === '/api/seabri/skills' && method === 'GET') {
      json(res, 200, { skills: await listSkillViews() })
      return true
    }

    // GET /api/seabri/mcp
    if (url === '/api/seabri/mcp' && method === 'GET') {
      json(res, 200, { mcp: listMcpViews() })
      return true
    }

    // GET /api/seabri/registry-snapshot
    if (url === '/api/seabri/registry-snapshot' && method === 'GET') {
      json(res, 200, { snapshot: await buildRegistrySnapshot() })
      return true
    }

    // GET /api/seabri/admin/provider-readiness
    if (url === '/api/seabri/admin/provider-readiness' && method === 'GET') {
      json(res, 200, { providers: getProviderReadiness() })
      return true
    }

    // POST /api/seabri/admin/provider-validate
    if (url === '/api/seabri/admin/provider-validate' && method === 'POST') {
      const parsed = await parseJsonWithSchema(req, ProviderValidateBodySchema)
      if (!parsed.ok) {
        json(res, parsed.status, { error: parsed.error })
        return true
      }
      json(res, 200, await validateProviderReadiness(parsed.value))
      return true
    }

    if (url === '/api/seabri/living-companion/incident' && method === 'POST') {
      const parsed = await parseJsonWithSchema(req, IncidentWorkflowBodySchema)
      if (!parsed.ok) {
        json(res, parsed.status, { error: parsed.error })
        return true
      }
      const result = runIncidentWorkflow({
        message: parsed.value.message,
        history: parsed.value.history,
        profile: parsed.value.profile,
      })
      if (!result.handled) {
        json(res, 422, {
          handled: false,
          error: 'Message did not match a Living Companion incident workflow.',
        })
        return true
      }
      json(res, 200, result)
      return true
    }

    if (url === '/api/seabri/living-companion/local-resources' && method === 'POST') {
      const parsed = await parseJsonWithSchema(req, LocalResourceSearchInputSchema)
      if (!parsed.ok) {
        json(res, parsed.status, { error: parsed.error })
        return true
      }
      json(res, 200, await searchLocalResources(parsed.value))
      return true
    }

    if (url === '/api/seabri/living-companion/local-resources/action-card' && method === 'POST') {
      const parsed = await parseJsonWithSchema(req, ResourceActionCardBodySchema)
      if (!parsed.ok) {
        json(res, parsed.status, { error: parsed.error })
        return true
      }
      json(res, 200, { actionCard: createResourceActionCard(parsed.value.resource, parsed.value.purpose) })
      return true
    }

    if (url === '/api/seabri/living-companion/incident-image' && method === 'POST') {
      const parsed = await parseJsonWithSchema(req, IncidentImageInputSchema)
      if (!parsed.ok) {
        json(res, parsed.status, { error: parsed.error })
        return true
      }
      json(res, 200, await analyzeIncidentImage(parsed.value))
      return true
    }

    if (url.startsWith('/api/seabri/profile') && method === 'GET') {
      const params = queryParams(url)
      const parsed = ProfileQuerySchema.safeParse({
        userId: params.get('userId'),
        channel: params.get('channel') ?? 'web',
      })
      if (!parsed.success) {
        json(res, 400, { error: 'Valid userId is required' })
        return true
      }
      json(res, 200, { profile: await getProfile(parsed.data.userId, parsed.data.channel) })
      return true
    }

    if ((url === '/api/seabri/profile' || url === '/api/seabri/update_profile') && method === 'POST') {
      const parsed = await parseJsonWithSchema(req, ProfileUpdateSchema)
      if (!parsed.ok) {
        json(res, parsed.status, { error: parsed.error })
        return true
      }
      const { userId, channel, ...updates } = parsed.value
      json(res, 200, { profile: await upsertProfile(userId, channel, updates) })
      return true
    }

    if ((url.startsWith('/api/seabri/profile') || url.startsWith('/api/seabri/delete_profile')) && method === 'DELETE') {
      const params = queryParams(url)
      const parsed = ProfileQuerySchema.safeParse({
        userId: params.get('userId'),
        channel: params.get('channel') ?? 'web',
      })
      if (!parsed.success) {
        json(res, 400, { error: 'Valid userId is required' })
        return true
      }
      json(res, 200, { deleted: await deleteProfile(parsed.data.userId, parsed.data.channel) })
      return true
    }

    if (url === '/api/seabri/living-companion/product-comparison' && method === 'POST') {
      const parsed = await parseJsonWithSchema(req, CompareProductsInputSchema)
      if (!parsed.ok) {
        json(res, parsed.status, { error: parsed.error })
        return true
      }
      const result = compareProducts(parsed.value)
      recordTelemetryEvent({
        type: 'sustainability_scored',
        data: { workflow: 'product_comparison', productCount: parsed.value.products.length },
      }).catch(() => {})
      json(res, 200, result)
      return true
    }

    if (url === '/api/seabri/harness/optimize-sustainable-compute' && method === 'POST') {
      const parsed = await parseJsonWithSchema(req, SustainableComputeInputSchema)
      if (!parsed.ok) {
        json(res, parsed.status, { error: parsed.error })
        return true
      }
      json(res, 200, await optimizeSustainableCompute(parsed.value))
      return true
    }

    if (url === '/api/seabri/living-companion/household-carbon-footprint' && method === 'POST') {
      const parsed = await parseJsonWithSchema(req, HouseholdCarbonInputSchema)
      if (!parsed.ok) {
        json(res, parsed.status, { error: parsed.error })
        return true
      }
      json(res, 200, await estimateHouseholdCarbon(parsed.value))
      return true
    }

    if (url === '/api/seabri/living-companion/home-energy-plan' && method === 'POST') {
      const parsed = await parseJsonWithSchema(req, HomeEnergyInputSchema)
      if (!parsed.ok) {
        json(res, parsed.status, { error: parsed.error })
        return true
      }
      json(res, 200, await planHomeEnergyActions(parsed.value))
      return true
    }

    if (url === '/api/seabri/living-companion/community-project-plan' && method === 'POST') {
      const parsed = await parseJsonWithSchema(req, CommunityProjectInputSchema)
      if (!parsed.ok) {
        json(res, parsed.status, { error: parsed.error })
        return true
      }
      json(res, 200, await planCommunityProject(parsed.value))
      return true
    }

    if (url === '/api/seabri/living-companion/certification-navigator' && method === 'POST') {
      const parsed = await parseJsonWithSchema(req, CertificationNavigatorInputSchema)
      if (!parsed.ok) {
        json(res, parsed.status, { error: parsed.error })
        return true
      }
      json(res, 200, await navigateCertification(parsed.value))
      return true
    }

    if (url === '/api/seabri/living-companion/carbon-offset-checker' && method === 'POST') {
      const parsed = await parseJsonWithSchema(req, CarbonOffsetCheckerInputSchema)
      if (!parsed.ok) {
        json(res, parsed.status, { error: parsed.error })
        return true
      }
      json(res, 200, await checkCarbonOffsetQuality(parsed.value))
      return true
    }

    if (url === '/api/seabri/living-companion/sustainable-purchasing-checklist' && method === 'POST') {
      const parsed = await parseJsonWithSchema(req, SustainablePurchasingInputSchema)
      if (!parsed.ok) {
        json(res, parsed.status, { error: parsed.error })
        return true
      }
      json(res, 200, await buildSustainablePurchasingChecklist(parsed.value))
      return true
    }

    if (url === '/api/seabri/living-companion/community-resilience-checklist' && method === 'POST') {
      const parsed = await parseJsonWithSchema(req, CommunityResilienceInputSchema)
      if (!parsed.ok) {
        json(res, parsed.status, { error: parsed.error })
        return true
      }
      json(res, 200, await buildCommunityResilienceChecklist(parsed.value))
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
      const parsed = await parseJsonWithSchema(req, RouteBodySchema)
      if (!parsed.ok) {
        json(res, parsed.status, { error: parsed.error })
        return true
      }

      const decision = routeTask({
        task: parsed.value.task,
        agentId: parsed.value.agentId,
        modelId: parsed.value.modelId,
        conversationDepth: parsed.value.conversationDepth,
        channelId: parsed.value.channelId ?? 'api',
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

    // GET /api/seabri/carbon/report
    if (url.startsWith('/api/seabri/carbon/report') && method === 'GET') {
      const qs = url.includes('?') ? new URLSearchParams(url.slice(url.indexOf('?') + 1)) : null
      const days = qs ? parseInt(qs.get('days') ?? '7', 10) : 7
      json(res, 200, generateCarbonReport(Number.isFinite(days) && days > 0 ? days : 7))
      return true
    }

    // GET /api/seabri/carbon/budget
    if (url.startsWith('/api/seabri/carbon/budget') && method === 'GET') {
      const qs = url.includes('?') ? new URLSearchParams(url.slice(url.indexOf('?') + 1)) : null
      const sessionId = qs?.get('sessionId') ?? undefined
      const budget = sessionId ? checkSessionBudget(sessionId) : checkDailyBudget()
      const alert = checkBudgetAlert(budget)
      json(res, 200, { budget, alert })
      return true
    }

    // GET /api/seabri/feedback/summary
    if (url === '/api/seabri/feedback/summary' && method === 'GET') {
      json(res, 200, getFeedbackSummary())
      return true
    }

    // POST /api/seabri/feedback
    if (url === '/api/seabri/feedback' && method === 'POST') {
      const parsed = await parseJsonWithSchema(req, FeedbackBodySchema)
      if (!parsed.ok) {
        json(res, parsed.status, { error: parsed.error })
        return true
      }

      const entry = submitFeedback({
        sessionId: parsed.value.sessionId,
        rating: parsed.value.rating,
        agentId: parsed.value.agentId,
        taskId: parsed.value.taskId,
        correction: parsed.value.correction,
      })

      json(res, 201, entry)
      return true
    }

    // GET /api/seabri/tools
    if (url === '/api/seabri/tools' && method === 'GET') {
      json(res, 200, { tools: listToolViews() })
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
      const parsed = await parseJsonWithSchema(req, WorkflowRunBodySchema)
      if (!parsed.ok) {
        json(res, parsed.status, { error: parsed.error })
        return true
      }
      try {
        const result = await runWorkflow(name, parsed.value.input ?? {})
        json(res, 200, result)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        const status = message.includes('not found') ? 404 : 500
        json(res, status, { error: message })
      }
      return true
    }

    // POST /api/seabri/web-ingestion/scan
    if (url === '/api/seabri/web-ingestion/scan' && method === 'POST') {
      const body = await readBody(req)
      let parsed: {
        tenantId?: unknown
        url?: unknown
        purpose?: unknown
        schemaType?: unknown
        useFirecrawl?: unknown
      }
      try {
        parsed = JSON.parse(body)
      } catch {
        json(res, 400, { error: 'Invalid JSON body' })
        return true
      }
      if (typeof parsed.tenantId !== 'string' || !parsed.tenantId.trim()) {
        json(res, 400, { error: '"tenantId" string is required' })
        return true
      }
      if (typeof parsed.url !== 'string' || !/^https?:\/\//i.test(parsed.url)) {
        json(res, 400, { error: '"url" must be an http(s) URL string' })
        return true
      }
      const schemaType = parsed.schemaType
      if (
        schemaType !== undefined &&
        schemaType !== 'general' &&
        schemaType !== 'contact' &&
        schemaType !== 'authority' &&
        schemaType !== 'emergency_guidance'
      ) {
        json(res, 400, { error: '"schemaType" is invalid' })
        return true
      }
      const result = await scanWebsite({
        tenantId: parsed.tenantId,
        url: parsed.url,
        purpose: typeof parsed.purpose === 'string' ? parsed.purpose : undefined,
        schemaType: schemaType as 'general' | 'contact' | 'authority' | 'emergency_guidance' | undefined,
        useFirecrawl: typeof parsed.useFirecrawl === 'boolean' ? parsed.useFirecrawl : undefined,
      })
      if (!result) {
        json(res, 502, { error: 'Website scan unavailable' })
        return true
      }
      json(res, 200, result)
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
    const status = (err as { status?: number })?.status ?? 500
    if (status === 413) {
      json(res, 413, { error: 'Payload too large' })
    } else {
      json(res, 500, { error: 'Internal server error' })
    }
    return true
  }
}

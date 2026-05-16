/**
 * MCP (Model Context Protocol) stdio server for OpenSeaBri.
 *
 * Exposes OpenSeaBri sustainability specialists and skills as MCP tools,
 * so Claude Desktop (or any MCP client) can call them directly:
 *
 *   client → stdin (JSON-RPC 2.0) → this process → routeMessage(agentId, …)
 *                                                  ↓
 *                                             Anthropic API
 *                                                  ↓
 *   client ← stdout (JSON-RPC 2.0) ← tool result
 *
 * Zero external deps — we speak JSON-RPC 2.0 + MCP framing directly over
 * stdio using length-prefixed line-delimited messages. This keeps the
 * gateway install weightless and degrades gracefully when the MCP SDK is
 * unavailable.
 *
 * Wire format (MCP stdio transport): each message is a single line of
 * UTF-8 JSON, terminated by '\n'. No Content-Length headers — stdio
 * transport uses newline-delimited JSON per the spec.
 */

import { routeMessage } from '../agents/router.js'
import { getAgentName } from '../agents/agents.js'
import { AGENTS } from '../config.js'
import { loadSession } from '../sessions/store.js'
import { routeTask } from '../seabri/task-router.js'
import { loadSkillMetadata, getSkillBody } from '../skills/loader.js'
import { runIncidentWorkflow } from '../seabri/incident-workflow.js'
import { searchLocalResources } from '../seabri/local-resources.js'
import { analyzeIncidentImage } from '../seabri/vision-analysis.js'
import { compareProducts } from '../sustainability/product-comparison.js'
import { optimizeSustainableCompute } from '../seabri/sustainable-compute.js'
import {
  adviseRepairVsReplace,
  buildCommunityResilienceChecklist,
  buildSustainablePurchasingChecklist,
  buildWasteRecyclingGuide,
  checkCarbonOffsetQuality,
  compareBuildingMaterials,
  estimateHouseholdCarbon,
  findGrantOpportunities,
  interpretUtilityBill,
  navigateCertification,
  planEmergencyPreparedness,
  planCommunityProject,
  planHomeEnergyActions,
  planHomeResilienceRetrofits,
  planWaterConservation,
} from '../seabri/practical-sustainability.js'
import { fileURLToPath } from 'url'

type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue }

interface JsonRpcRequest {
  jsonrpc: '2.0'
  id?: string | number | null
  method: string
  params?: Record<string, unknown>
}

interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: string | number | null
  result?: JsonValue
  error?: { code: number; message: string; data?: JsonValue }
}

const PROTOCOL_VERSION = '2024-11-05'
const SERVER_NAME = 'openseabri'
const SERVER_VERSION = '1.0.0'

function write(msg: JsonRpcResponse): void {
  process.stdout.write(JSON.stringify(msg) + '\n')
}

function log(msg: string): void {
  // stderr is safe — stdout is reserved for JSON-RPC frames
  process.stderr.write(`[mcp] ${msg}\n`)
}

function toolsForAgents(): JsonValue {
  const agentTools = AGENTS.map((agent) => ({
    name: agent.id,
    description: `Ask the ${getAgentName(agent.id)} specialist a sustainability question. ` +
      `Returns a grounded, cited answer from the ${getAgentName(agent.id)} agent.`,
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The question or task to send to this specialist.',
        },
        sessionId: {
          type: 'string',
          description:
            'Optional session id. When provided, prior history for the session is loaded and included.',
        },
      },
      required: ['prompt'],
    },
  }))

  return [
    {
      name: 'living_companion_incident',
      description:
        'Run the deterministic Living Companion sustainability and resilience incident specialist workflow for flooding, water damage, policy review, photo follow-up, local help, and approval-gated action scripts. Does not send messages or place calls.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'Alias for message, for clients that expect prompt-style inputs.',
          },
          message: {
            type: 'string',
            description: 'The user message, for example "My bathroom is flooding."',
          },
          history: {
            type: 'array',
            description: 'Optional prior conversation messages with role/content.',
          },
          sessionId: {
            type: 'string',
            description: 'Optional session id for MCP context continuity. The deterministic incident tool does not require it.',
          },
        },
        required: ['prompt'],
      },
    },
    {
      name: 'search_local_resources',
      description: 'Search configured real local sustainability and resilience resources such as plumbers, water mitigation, city contacts, utilities, hotels, and insurer claim lines. Returns safe fallback when search is unavailable.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Optional natural language request.' },
          category: { type: 'string', description: 'plumber, water_mitigation, city_public_works, city_hall, utility_emergency, hotel, or insurance_claim_line.' },
          location: { type: 'string', description: 'City, ZIP, or address context.' },
          sessionId: { type: 'string', description: 'Optional session id for context continuity.' },
        },
        required: ['prompt', 'category', 'location'],
      },
    },
    {
      name: 'analyze_incident_image',
      description: 'Analyze a Living Companion sustainability and resilience incident image through a configured vision provider, or return a safe fallback with required photo angles.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Image analysis request.' },
          imageBase64: { type: 'string', description: 'Base64 image bytes.' },
          mimeType: { type: 'string', description: 'Image MIME type.' },
          incidentContext: { type: 'string', description: 'Incident context.' },
          sessionId: { type: 'string', description: 'Optional session id for context continuity.' },
        },
        required: ['prompt', 'imageBase64'],
      },
    },
    {
      name: 'compare_products',
      description: 'Compare product options for sustainability using user-provided attributes only, with assumptions, unknowns, scores, and no invented certifications.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Optional comparison request.' },
          products: { type: 'array', description: 'Product options with attributes.' },
          priorities: { type: 'array', description: 'Optional priorities.' },
          sessionId: { type: 'string', description: 'Optional session id for context continuity.' },
        },
        required: ['prompt', 'products'],
      },
    },
    {
      name: 'optimize_sustainable_compute',
      description: 'Optimize an agent or model workflow for sustainability, cost, tokens, caching, batching, local-model use, and carbon proxy reduction.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Optional workflow optimization request.' },
          workflow_name: { type: 'string', description: 'Workflow name.' },
          task_type: { type: 'string', description: 'chat, classification, extraction, summarization, coding, analysis, reporting, vision, or other.' },
          current_model: { type: 'string', description: 'Current model name.' },
          estimated_tokens: { type: 'number', description: 'Estimated token volume.' },
          latency_priority: { type: 'string', description: 'low, medium, or high.' },
          cost_priority: { type: 'string', description: 'low, medium, or high.' },
          privacy_priority: { type: 'string', description: 'low, medium, or high.' },
          sustainability_priority: { type: 'string', description: 'low, medium, or high.' },
          repeated_task: { type: 'boolean', description: 'Whether the workflow repeats.' },
          cacheable: { type: 'boolean', description: 'Whether stable inputs can be cached.' },
          batchable: { type: 'boolean', description: 'Whether runs can be batched.' },
          sessionId: { type: 'string', description: 'Optional session id for context continuity.' },
        },
        required: ['prompt'],
      },
    },
    {
      name: 'estimate_household_carbon',
      description: 'Estimate household sustainability emissions from electricity, heating, travel, food, and waste using broad ranges and transparent assumptions.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Optional natural language request.' },
          householdSize: { type: 'number', description: 'Number of people in household.' },
          zip: { type: 'string', description: 'ZIP or location.' },
          monthlyElectricityKwh: { type: 'number', description: 'Monthly electricity use if known.' },
          preferredLanguage: { type: 'string', description: 'Preferred language, e.g. Spanish.' },
          sessionId: { type: 'string', description: 'Optional session id.' },
        },
        required: ['prompt'],
      },
    },
    {
      name: 'plan_home_energy_actions',
      description: 'Create a practical home sustainability and energy-saving action plan with no-cost, low-cost, upgrade, utility lookup, assumptions, and unknowns.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Optional natural language request.' },
          homeType: { type: 'string', description: 'single_family, apartment, condo, mobile_home, small_business, or unknown.' },
          budgetLevel: { type: 'string', description: 'no_cost, low, medium, or high.' },
          preferredLanguage: { type: 'string', description: 'Preferred language, e.g. Spanish.' },
          sessionId: { type: 'string', description: 'Optional session id.' },
        },
        required: ['prompt'],
      },
    },
    {
      name: 'plan_community_sustainability_project',
      description: 'Plan an NGO, school, neighborhood, or community sustainability project with stakeholders, grants, permits, volunteers, and metrics.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Optional natural language request.' },
          organizationType: { type: 'string', description: 'Organization or community type.' },
          goal: { type: 'string', description: 'Project goal.' },
          preferredLanguage: { type: 'string', description: 'Preferred language, e.g. Spanish.' },
          sessionId: { type: 'string', description: 'Optional session id.' },
        },
        required: ['prompt'],
      },
    },
    {
      name: 'navigate_sustainability_certification',
      description: 'Navigate sustainability certification or framework options such as ENERGY STAR, LEED, WELL, utility rebates, or ESG readiness without inventing eligibility.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Optional natural language request.' },
          userType: { type: 'string', description: 'household, school, ngo, small_business, building_owner, community_group, or unknown.' },
          goal: { type: 'string', description: 'Certification or readiness goal.' },
          preferredLanguage: { type: 'string', description: 'Preferred language, e.g. Spanish.' },
          sessionId: { type: 'string', description: 'Optional session id.' },
        },
        required: ['prompt'],
      },
    },
    {
      name: 'check_carbon_offset_quality',
      description: 'Check carbon offset sustainability quality and greenwashing risk from user-provided attributes without inventing registry verification status.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Optional natural language request.' },
          projectType: { type: 'string', description: 'forest, soil, renewable_energy, cookstove, direct_air_capture, methane, or unknown.' },
          registry: { type: 'string', description: 'Registry if known.' },
          preferredLanguage: { type: 'string', description: 'Preferred language, e.g. Spanish.' },
          sessionId: { type: 'string', description: 'Optional session id.' },
        },
        required: ['prompt'],
      },
    },
    {
      name: 'build_sustainable_purchasing_checklist',
      description: 'Build a practical sustainability purchasing checklist with red flags, better alternatives, questions, and end-of-life considerations without inventing certifications.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Optional natural language request.' },
          productCategory: { type: 'string', description: 'Product category.' },
          budgetUsd: { type: 'number', description: 'Budget if known.' },
          durabilityNeed: { type: 'string', description: 'low, medium, high, or unknown.' },
          preferredLanguage: { type: 'string', description: 'Preferred language.' },
          sessionId: { type: 'string', description: 'Optional session id.' },
        },
        required: ['prompt'],
      },
    },
    {
      name: 'advise_repair_vs_replace',
      description: 'Advise on repair versus replacement for household products and appliances with sustainability, financial, waste, assumptions, and confidence guidance.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Optional natural language request.' },
          productType: { type: 'string', description: 'Product or appliance type.' },
          ageYears: { type: 'number', description: 'Approximate age in years.' },
          estimatedRepairCostUsd: { type: 'number', description: 'Estimated repair cost.' },
          replacementBudgetUsd: { type: 'number', description: 'Replacement quote or budget.' },
          energyEfficiency: { type: 'string', description: 'poor, average, good, or unknown.' },
          condition: { type: 'string', description: 'working, repairable, broken, unsafe, or unknown.' },
          preferredLanguage: { type: 'string', description: 'Preferred language.' },
          sessionId: { type: 'string', description: 'Optional session id.' },
        },
        required: ['prompt', 'productType'],
      },
    },
    {
      name: 'plan_home_resilience_retrofits',
      description: 'Plan practical homeowner sustainability and resilience retrofits for flood, storm, heat, outage, smoke, and other hazards without inventing local risk or insurance facts.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Optional natural language request.' },
          homeType: { type: 'string', description: 'single_family, apartment, condo, mobile_home, townhouse, or unknown.' },
          location: { type: 'string', description: 'ZIP, city, or location.' },
          hazards: { type: 'array', description: 'Hazards of concern.' },
          budgetLevel: { type: 'string', description: 'no_cost, low, medium, or high.' },
          painPoints: { type: 'array', description: 'Known home weak points or recurring problems.' },
          preferredLanguage: { type: 'string', description: 'Preferred language.' },
          sessionId: { type: 'string', description: 'Optional session id.' },
        },
        required: ['prompt', 'homeType', 'hazards', 'budgetLevel'],
      },
    },
    {
      name: 'compare_building_materials',
      description: 'Compare sustainability-focused building and renovation material choices using durability, moisture, fire, maintenance, embodied-carbon caveats, and indoor-air guidance.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Optional natural language request.' },
          materialCategory: { type: 'string', description: 'Material category such as flooring, roofing, insulation, or paint.' },
          durabilityNeed: { type: 'string', description: 'low, medium, high, or unknown.' },
          moistureConcern: { type: 'boolean', description: 'Whether moisture exposure is a concern.' },
          fireConcern: { type: 'boolean', description: 'Whether fire/code exposure is a concern.' },
          budgetLevel: { type: 'string', description: 'low, medium, high, or unknown.' },
          maintenanceTolerance: { type: 'string', description: 'low, medium, high, or unknown.' },
          preferredLanguage: { type: 'string', description: 'Preferred language.' },
          sessionId: { type: 'string', description: 'Optional session id.' },
        },
        required: ['prompt', 'materialCategory'],
      },
    },
    {
      name: 'plan_emergency_preparedness',
      description: 'Build a household emergency preparedness sustainability and resilience plan with supplies, communication, evacuation considerations, assumptions, and official-guidance caveats.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Optional natural language request.' },
          householdSize: { type: 'number', description: 'Number of people in the household.' },
          location: { type: 'string', description: 'ZIP, city, or location.' },
          hazards: { type: 'array', description: 'Hazards of concern.' },
          hasPets: { type: 'boolean', description: 'Whether pets are present.' },
          hasChildren: { type: 'boolean', description: 'Whether children are present.' },
          hasOlderAdults: { type: 'boolean', description: 'Whether older adults are present.' },
          medicalNeeds: { type: 'array', description: 'Medication, device, or support needs.' },
          evacuationConstraints: { type: 'array', description: 'Transportation, mobility, school, work, or caregiver constraints.' },
          preferredLanguage: { type: 'string', description: 'Preferred language.' },
          sessionId: { type: 'string', description: 'Optional session id.' },
        },
        required: ['prompt', 'householdSize', 'hazards'],
      },
    },
    {
      name: 'build_community_resilience_checklist',
      description: 'Build a community sustainability and resilience checklist with preparedness steps, communication plan, local partner categories, supplies, and drill plan.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Optional natural language request.' },
          communityType: { type: 'string', description: 'Community type.' },
          hazards: { type: 'array', description: 'Hazards of concern.' },
          volunteers: { type: 'number', description: 'Volunteer count if known.' },
          preferredLanguage: { type: 'string', description: 'Preferred language.' },
          sessionId: { type: 'string', description: 'Optional session id.' },
        },
        required: ['prompt'],
      },
    },
    {
      name: 'plan_water_conservation',
      description: 'Build a household sustainability water conservation plan with no-cost steps, low-cost fixes, upgrade ideas, outdoor watering actions, leak checks, assumptions, and unverified local-rule status.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Optional natural language request.' },
          householdType: { type: 'string', description: 'single_family, apartment, condo, mobile_home, small_business, or unknown.' },
          location: { type: 'string', description: 'ZIP, city, or location.' },
          monthlyWaterUseGallons: { type: 'number', description: 'Monthly water use if known.' },
          painPoints: { type: 'array', description: 'Pain points such as high bill, leaks, or irrigation.' },
          preferredLanguage: { type: 'string', description: 'Preferred language.' },
          sessionId: { type: 'string', description: 'Optional session id.' },
        },
        required: ['prompt'],
      },
    },
    {
      name: 'build_waste_recycling_guide',
      description: 'Build a safe sustainability reuse, repair, recycling, hazardous, or disposal guide for an item without inventing local recycling acceptance rules.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Optional natural language request.' },
          itemOrMaterial: { type: 'string', description: 'Item or material to route.' },
          location: { type: 'string', description: 'ZIP, city, or location.' },
          condition: { type: 'string', description: 'usable, repairable, broken, expired, or unknown.' },
          quantity: { type: 'string', description: 'Optional quantity.' },
          preferredLanguage: { type: 'string', description: 'Preferred language.' },
          sessionId: { type: 'string', description: 'Optional session id.' },
        },
        required: ['prompt'],
      },
    },
    {
      name: 'interpret_utility_bill',
      description: 'Interpret an electricity, gas, water, or other utility bill for sustainability planning using user-provided fields, transparent assumptions, and no fake savings claim.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Optional natural language request.' },
          utilityType: { type: 'string', description: 'electricity, gas, water, or other.' },
          billingDays: { type: 'number', description: 'Billing period length.' },
          totalCostUsd: { type: 'number', description: 'Total bill cost.' },
          totalUsage: { type: 'number', description: 'Total usage.' },
          usageUnit: { type: 'string', description: 'Usage unit such as kWh, therms, gallons, or CCF.' },
          preferredLanguage: { type: 'string', description: 'Preferred language.' },
          sessionId: { type: 'string', description: 'Optional session id.' },
        },
        required: ['prompt'],
      },
    },
    {
      name: 'find_grant_opportunities',
      description: 'Provide grant-search strategies, funding type guidance, and eligibility questions for sustainability and resilience projects. Does not invent specific grant listings.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Optional natural language request.' },
          organizationType: { type: 'string', description: 'Type of organization (NGO, school, municipality, etc.).' },
          projectDescription: { type: 'string', description: 'Brief description of the project seeking funding.' },
          location: { type: 'string', description: 'Project location (city, state, ZIP).' },
          budgetUsd: { type: 'number', description: 'Approximate project budget in USD if known.' },
          preferredLanguage: { type: 'string', description: 'Preferred language for labels.' },
          sessionId: { type: 'string', description: 'Optional session id.' },
        },
        required: ['prompt'],
      },
    },
    ...agentTools,
  ]
}

async function handleInitialize(): Promise<JsonValue> {
  return {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: {
      tools: {},
      resources: {},
    },
    serverInfo: {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
  }
}

async function handleToolsList(): Promise<JsonValue> {
  return { tools: toolsForAgents() }
}

async function handleResourcesList(): Promise<JsonValue> {
  const skills = await loadSkillMetadata()
  return {
    resources: skills.map((s) => ({
      uri: `openseabri://skills/${s.id}`,
      name: s.name,
      description: s.description ?? s.firstLine,
      mimeType: 'text/markdown',
    })) as JsonValue,
  }
}

const SKILL_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/

async function handleResourcesRead(params: Record<string, unknown>): Promise<JsonValue> {
  const uri = typeof params.uri === 'string' ? params.uri : ''
  const match = uri.match(/^openseabri:\/\/skills\/(.+)$/)
  if (!match) throw new Error(`unknown resource URI: ${uri}`)
  const skillId = match[1]
  if (!SKILL_ID_RE.test(skillId)) throw new Error(`invalid skill ID: ${skillId}`)
  const body = await getSkillBody(skillId)
  if (body === null) throw new Error(`skill not found: ${skillId}`)
  return {
    contents: [
      {
        uri,
        mimeType: 'text/markdown',
        text: body,
      },
    ],
  }
}

const VALID_AGENT_IDS = new Set(AGENTS.map((a) => a.id))

async function handleToolCall(params: Record<string, unknown>): Promise<JsonValue> {
  const name = typeof params.name === 'string' ? params.name : ''
  const args = (params.arguments as Record<string, unknown> | undefined) ?? {}
  const prompt = typeof args.prompt === 'string' ? args.prompt : ''
  const sessionId = typeof args.sessionId === 'string' ? args.sessionId : undefined

  if (!name) throw new Error('missing tool name')
  if (name === 'living_companion_incident') {
    const message = typeof args.message === 'string'
      ? args.message
      : typeof args.prompt === 'string'
        ? args.prompt
        : ''
    const history = Array.isArray(args.history)
      ? args.history.filter((item): item is { role: string; content: string } => {
          if (!item || typeof item !== 'object') return false
          const rec = item as Record<string, unknown>
          return typeof rec.role === 'string' && typeof rec.content === 'string'
        })
      : []
    if (!message) throw new Error('missing message argument')
    const result = runIncidentWorkflow({ message, history })
    return {
      content: [
        {
          type: 'text',
          text: result.handled && result.response
            ? result.response
            : 'Message did not match a Living Companion incident workflow.',
        },
      ],
    }
  }
  if (name === 'search_local_resources') {
    const category = typeof args.category === 'string' ? args.category : 'plumber'
    const location = typeof args.location === 'string' ? args.location : ''
    if (!location) throw new Error('missing location argument')
    const result = await searchLocalResources({ category, location })
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
  if (name === 'analyze_incident_image') {
    if (typeof args.imageBase64 !== 'string') throw new Error('missing imageBase64 argument')
    const result = await analyzeIncidentImage({
      imageBase64: args.imageBase64,
      mimeType: typeof args.mimeType === 'string' ? args.mimeType : 'image/jpeg',
      prompt: typeof args.prompt === 'string' ? args.prompt : undefined,
      incidentContext: typeof args.incidentContext === 'string' ? args.incidentContext : undefined,
    })
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
  if (name === 'compare_products') {
    if (!Array.isArray(args.products)) throw new Error('missing products argument')
    const result = compareProducts({ products: args.products, priorities: args.priorities })
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
  if (name === 'optimize_sustainable_compute') {
    const {
      prompt: _prompt,
      sessionId: _sessionId,
      history: _history,
      ...optimizerInput
    } = args
    const result = await optimizeSustainableCompute(optimizerInput)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
  if (name === 'estimate_household_carbon') {
    const { prompt: _prompt, sessionId: _sessionId, ...toolInput } = args
    const result = await estimateHouseholdCarbon(toolInput)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
  if (name === 'plan_home_energy_actions') {
    const { prompt: _prompt, sessionId: _sessionId, ...toolInput } = args
    const result = await planHomeEnergyActions(toolInput)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
  if (name === 'plan_community_sustainability_project') {
    const { prompt: _prompt, sessionId: _sessionId, ...toolInput } = args
    const result = await planCommunityProject(toolInput)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
  if (name === 'navigate_sustainability_certification') {
    const { prompt: _prompt, sessionId: _sessionId, ...toolInput } = args
    const result = await navigateCertification(toolInput)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
  if (name === 'check_carbon_offset_quality') {
    const { prompt: _prompt, sessionId: _sessionId, ...toolInput } = args
    const result = await checkCarbonOffsetQuality(toolInput)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
  if (name === 'build_sustainable_purchasing_checklist') {
    const { prompt: _prompt, sessionId: _sessionId, ...toolInput } = args
    const result = await buildSustainablePurchasingChecklist(toolInput)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
  if (name === 'advise_repair_vs_replace') {
    const { prompt: _prompt, sessionId: _sessionId, ...toolInput } = args
    const result = await adviseRepairVsReplace(toolInput)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
  if (name === 'plan_home_resilience_retrofits') {
    const { prompt: _prompt, sessionId: _sessionId, ...toolInput } = args
    const result = await planHomeResilienceRetrofits(toolInput)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
  if (name === 'compare_building_materials') {
    const { prompt: _prompt, sessionId: _sessionId, ...toolInput } = args
    const result = await compareBuildingMaterials(toolInput)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
  if (name === 'plan_emergency_preparedness') {
    const { prompt: _prompt, sessionId: _sessionId, ...toolInput } = args
    const result = await planEmergencyPreparedness(toolInput)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
  if (name === 'build_community_resilience_checklist') {
    const { prompt: _prompt, sessionId: _sessionId, ...toolInput } = args
    const result = await buildCommunityResilienceChecklist(toolInput)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
  if (name === 'plan_water_conservation') {
    const { prompt: _prompt, sessionId: _sessionId, ...toolInput } = args
    const result = await planWaterConservation(toolInput)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
  if (name === 'build_waste_recycling_guide') {
    const { prompt: _prompt, sessionId: _sessionId, ...toolInput } = args
    const result = await buildWasteRecyclingGuide(toolInput)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
  if (name === 'interpret_utility_bill') {
    const { prompt: _prompt, sessionId: _sessionId, ...toolInput } = args
    const result = await interpretUtilityBill(toolInput)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
  if (name === 'find_grant_opportunities') {
    const { prompt: _prompt, sessionId: _sessionId, ...toolInput } = args
    const result = await findGrantOpportunities(toolInput as Parameters<typeof findGrantOpportunities>[0])
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
  if (!VALID_AGENT_IDS.has(name)) throw new Error(`unknown agent: ${name}`)
  if (!prompt) throw new Error('missing prompt argument')

  let history: Array<{ role: string; content: string }> = []
  if (sessionId) {
    try {
      const session = await loadSession(sessionId)
      if (session) history = session.history
    } catch {
      // History load is best-effort; empty history is fine
    }
  }

  const routing = routeTask({ task: prompt, agentId: name, channelId: 'mcp' })
  const answer = await routeMessage(name, prompt, history, undefined, undefined, routing.modelId)

  return {
    content: [
      {
        type: 'text',
        text: answer,
      },
    ],
  }
}

export async function dispatch(req: JsonRpcRequest): Promise<JsonRpcResponse | null> {
  const id = req.id ?? null

  try {
    switch (req.method) {
      case 'initialize':
        return { jsonrpc: '2.0', id, result: await handleInitialize() }
      case 'initialized':
      case 'notifications/initialized':
        // Notification — no response
        return null
      case 'tools/list':
        return { jsonrpc: '2.0', id, result: await handleToolsList() }
      case 'tools/call':
        return { jsonrpc: '2.0', id, result: await handleToolCall(req.params ?? {}) }
      case 'resources/list':
        return { jsonrpc: '2.0', id, result: await handleResourcesList() }
      case 'resources/read':
        return { jsonrpc: '2.0', id, result: await handleResourcesRead(req.params ?? {}) }
      case 'ping':
        return { jsonrpc: '2.0', id, result: {} }
      default:
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `method not found: ${req.method}` },
        }
    }
  } catch (err: unknown) {
    const internal = err instanceof Error ? err.message : String(err)
    log(`handler error: ${internal}`)
    const safe = internal.startsWith('unknown') || internal.startsWith('missing') || internal.startsWith('invalid') || internal.startsWith('skill not found')
      ? internal
      : 'internal server error'
    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32603, message: safe },
    }
  }
}

export async function serveStdio(): Promise<void> {
  log(`OpenSeaBri MCP server starting (protocol ${PROTOCOL_VERSION})`)
  log(`Exposing ${AGENTS.length} sustainability specialists as MCP tools`)

  let buffer = ''
  const pending = new Set<Promise<void>>()
  process.stdin.setEncoding('utf-8')

  process.stdin.on('data', (chunk: string) => {
    buffer += chunk
    let idx: number
    while ((idx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, idx).trim()
      buffer = buffer.slice(idx + 1)
      if (!line) continue

      let req: JsonRpcRequest
      try {
        req = JSON.parse(line) as JsonRpcRequest
      } catch {
        log(`skipping non-JSON line`)
        continue
      }

      const task = dispatch(req)
        .then((res) => {
          if (res) write(res)
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err)
          log(`dispatch error: ${message}`)
        })
        .finally(() => {
          pending.delete(task)
        })
      pending.add(task)
    }
  })

  process.stdin.on('end', async () => {
    if (pending.size > 0) {
      await Promise.allSettled([...pending])
    }
    log('stdin closed — shutting down')
    process.exit(0)
  })

  // Keep the event loop alive
  await new Promise<void>(() => { /* never resolves */ })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  serveStdio().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err)
    log(`fatal: ${message}`)
    process.exit(1)
  })
}

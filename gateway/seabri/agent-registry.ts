import type { AgentId } from '../schemas.js'
import { AGENT_IDS } from '../schemas.js'
import { getSystemPrompt, getAgentName } from '../agents/agents.js'

export type AgentCapability =
  | 'climate-risk-analysis'
  | 'nature-biodiversity-risk'
  | 'sustainability-reporting'
  | 'investment-screening'
  | 'home-energy-advice'
  | 'decarbonization-strategy'
  | 'natural-capital-markets'
  | 'general-sustainability'
  | 'emergency-resilience'
  | 'insurance-navigation'
  | 'property-risk'
  | 'damage-documentation'
  | 'contractor-coordination'
  | 'sustainability-companion'

export interface AgentRegistration {
  id: string
  name: string
  description: string
  capabilities: AgentCapability[]
  getSystemPrompt: () => string
  /** true = built-in SeaBri agent; false = externally contributed */
  builtin: boolean
}

const BUILTIN_METADATA: Record<AgentId, { description: string; capabilities: AgentCapability[] }> = {
  // SeaBri core agents
  'seabri-orchestrator': {
    description: 'SeaBri front door — understands your situation and routes to the right specialist',
    capabilities: ['general-sustainability'],
  },
  'emergency-resilience': {
    description: 'Active emergencies: flood, wildfire, hurricane, heat — immediate actions and resources',
    capabilities: ['emergency-resilience'],
  },
  'insurance-navigator': {
    description: 'Insurance policy review, claims filing, coverage gaps, dispute resolution',
    capabilities: ['insurance-navigation'],
  },
  'property-climate-risk': {
    description: 'Property-level climate risk scorecard: flood, fire, heat, hurricane, drought',
    capabilities: ['property-risk', 'climate-risk-analysis'],
  },
  'damage-documentation': {
    description: 'Post-disaster damage documentation for insurance claims and FEMA applications',
    capabilities: ['damage-documentation'],
  },
  'contractor-coordination': {
    description: 'Contractor vetting, red flags, fair pricing, and outreach scripts',
    capabilities: ['contractor-coordination'],
  },
  'sustainability-companion': {
    description: 'Energy bills, solar, heat pumps, IRA tax credits, water, small business sustainability',
    capabilities: ['sustainability-companion', 'home-energy-advice'],
  },
  // Specialist agents
  'climate-risk': {
    description: 'Physical climate risk — flood, wildfire, heat, drought, sea level rise',
    capabilities: ['climate-risk-analysis'],
  },
  'nature-biodiversity': {
    description: 'Nature and biodiversity risk, water stress, TNFD, ecosystem services',
    capabilities: ['nature-biodiversity-risk'],
  },
  'sustainability-reporting': {
    description: 'Sustainability disclosure: TCFD, CSRD, ISSB, GRI, CDP, SEC climate rules',
    capabilities: ['sustainability-reporting'],
  },
  'investment-screening': {
    description: 'ESG investment risk screening, physical + transition risk, portfolio analysis',
    capabilities: ['investment-screening'],
  },
  'home-community': {
    description: 'Home energy efficiency, solar, heat pumps, IRA incentives, resilience',
    capabilities: ['home-energy-advice'],
  },
  'net-zero': {
    description: 'Decarbonization strategy, scope 1/2/3, SBTi, carbon offsets',
    capabilities: ['decarbonization-strategy'],
  },
  'natural-capital': {
    description: 'Natural capital markets, USDA conservation programs, carbon credits',
    capabilities: ['natural-capital-markets'],
  },
  general: {
    description: 'General sustainability advisor — routes to specialists when appropriate',
    capabilities: ['general-sustainability'],
  },
}

export class AgentRegistry {
  private store = new Map<string, AgentRegistration>()

  register(agent: AgentRegistration): void {
    if (!agent.id) throw new Error('AgentRegistryError: "id" is required')
    if (this.store.has(agent.id)) {
      throw new Error(`AgentRegistryError: agent "${agent.id}" is already registered`)
    }
    this.store.set(agent.id, agent)
  }

  get(id: string): AgentRegistration | undefined {
    return this.store.get(id)
  }

  list(): AgentRegistration[] {
    return [...this.store.values()]
  }

  listByCapability(capability: AgentCapability): AgentRegistration[] {
    return [...this.store.values()].filter((a) => a.capabilities.includes(capability))
  }

  has(id: string): boolean {
    return this.store.has(id)
  }

  unregister(id: string): void {
    if (!this.store.has(id)) {
      throw new Error(`AgentRegistryError: agent "${id}" is not registered`)
    }
    this.store.delete(id)
  }
}

function buildBuiltinRegistry(): AgentRegistry {
  const registry = new AgentRegistry()
  for (const agentId of AGENT_IDS) {
    const meta = BUILTIN_METADATA[agentId]
    registry.register({
      id: agentId,
      name: getAgentName(agentId),
      description: meta.description,
      capabilities: meta.capabilities,
      getSystemPrompt: () => getSystemPrompt(agentId),
      builtin: true,
    })
  }
  return registry
}

export const agentRegistry = buildBuiltinRegistry()

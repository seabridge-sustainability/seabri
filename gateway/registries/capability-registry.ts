import type { AgentCapability } from '../seabri/agent-registry.js'

export interface CapabilityDefinition {
  id: AgentCapability
  name: string
  description: string
  category: CapabilityCategory
  requiredTools?: string[]
  minModelTier?: 'haiku' | 'sonnet' | 'opus'
}

export type CapabilityCategory =
  | 'climate'
  | 'sustainability'
  | 'finance'
  | 'resilience'
  | 'community'
  | 'general'

const BUILTIN_CAPABILITIES: CapabilityDefinition[] = [
  {
    id: 'climate-risk-analysis',
    name: 'Climate Risk Analysis',
    description: 'Physical climate risk assessment — flood, wildfire, heat, drought, sea level rise',
    category: 'climate',
    minModelTier: 'sonnet',
  },
  {
    id: 'nature-biodiversity-risk',
    name: 'Nature & Biodiversity Risk',
    description: 'Biodiversity loss, water stress, ecosystem services, TNFD alignment',
    category: 'climate',
    minModelTier: 'sonnet',
  },
  {
    id: 'sustainability-reporting',
    name: 'Sustainability Reporting',
    description: 'Disclosure frameworks: TCFD, CSRD, ISSB, GRI, CDP, SEC climate rules',
    category: 'sustainability',
    minModelTier: 'sonnet',
  },
  {
    id: 'investment-screening',
    name: 'Investment Screening',
    description: 'ESG investment risk screening, physical + transition risk, portfolio analysis',
    category: 'finance',
    minModelTier: 'sonnet',
  },
  {
    id: 'home-energy-advice',
    name: 'Home Energy Advice',
    description: 'Home energy efficiency, solar, heat pumps, IRA incentives',
    category: 'community',
  },
  {
    id: 'decarbonization-strategy',
    name: 'Decarbonization Strategy',
    description: 'Scope 1/2/3 emissions, SBTi targets, carbon offsets, net-zero pathways',
    category: 'sustainability',
    minModelTier: 'sonnet',
  },
  {
    id: 'natural-capital-markets',
    name: 'Natural Capital Markets',
    description: 'USDA conservation programs, carbon credits, nature-based solutions',
    category: 'finance',
  },
  {
    id: 'general-sustainability',
    name: 'General Sustainability',
    description: 'Broad sustainability topics, routing to specialists',
    category: 'general',
  },
  {
    id: 'emergency-resilience',
    name: 'Emergency Resilience',
    description: 'Active emergencies — flood, wildfire, hurricane, heat — immediate actions',
    category: 'resilience',
  },
  {
    id: 'insurance-navigation',
    name: 'Insurance Navigation',
    description: 'Policy review, claims filing, coverage gaps, dispute resolution',
    category: 'resilience',
  },
  {
    id: 'property-risk',
    name: 'Property Risk',
    description: 'Property-level climate risk scorecard',
    category: 'climate',
  },
  {
    id: 'damage-documentation',
    name: 'Damage Documentation',
    description: 'Post-disaster damage documentation for insurance and FEMA applications',
    category: 'resilience',
  },
  {
    id: 'contractor-coordination',
    name: 'Contractor Coordination',
    description: 'Contractor vetting, fair pricing, outreach scripts',
    category: 'resilience',
  },
  {
    id: 'sustainability-companion',
    name: 'Sustainability Companion',
    description: 'Energy bills, solar, heat pumps, IRA tax credits, water, small business',
    category: 'community',
  },
]

export class CapabilityRegistry {
  private readonly store = new Map<AgentCapability, CapabilityDefinition>()

  register(def: CapabilityDefinition): void {
    if (this.store.has(def.id)) {
      throw new Error(`CapabilityRegistryError: capability "${def.id}" already registered`)
    }
    this.store.set(def.id, def)
  }

  get(id: AgentCapability): CapabilityDefinition | undefined {
    return this.store.get(id)
  }

  list(): CapabilityDefinition[] {
    return [...this.store.values()]
  }

  listByCategory(category: CapabilityCategory): CapabilityDefinition[] {
    return [...this.store.values()].filter((c) => c.category === category)
  }

  has(id: AgentCapability): boolean {
    return this.store.has(id)
  }

  unregister(id: AgentCapability): boolean {
    return this.store.delete(id)
  }

  categories(): CapabilityCategory[] {
    const cats = new Set<CapabilityCategory>()
    for (const def of this.store.values()) cats.add(def.category)
    return [...cats]
  }
}

function buildCapabilityRegistry(): CapabilityRegistry {
  const registry = new CapabilityRegistry()
  for (const def of BUILTIN_CAPABILITIES) {
    registry.register(def)
  }
  return registry
}

export const capabilityRegistry = buildCapabilityRegistry()

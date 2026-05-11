import type { ModelTier } from '../orchestrator/model-router.js'

export type ModelProvider = 'anthropic' | 'openai' | 'deepseek' | 'local'

export interface ModelDefinition {
  id: string
  provider: ModelProvider
  tier: ModelTier
  displayName: string
  contextWindow: number
  costPer1kInput: number
  costPer1kOutput: number
  energyPer1kTokens: number
  supportsStreaming: boolean
  supportsTools: boolean
  supportsVision: boolean
  enabled: boolean
}

export interface ModelRoutingPolicy {
  defaultTier: ModelTier
  preferProvider: ModelProvider
  costCeiling?: number
  carbonOptimize: boolean
}

const BUILTIN_MODELS: ModelDefinition[] = [
  {
    id: 'claude-haiku-4-5-20251001',
    provider: 'anthropic',
    tier: 'haiku',
    displayName: 'Claude Haiku 4.5',
    contextWindow: 200_000,
    costPer1kInput: 0.001,
    costPer1kOutput: 0.005,
    energyPer1kTokens: 0.00001,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    enabled: true,
  },
  {
    id: 'claude-sonnet-4-6',
    provider: 'anthropic',
    tier: 'sonnet',
    displayName: 'Claude Sonnet 4.6',
    contextWindow: 200_000,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
    energyPer1kTokens: 0.00004,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    enabled: true,
  },
  {
    id: 'claude-opus-4-6',
    provider: 'anthropic',
    tier: 'opus',
    displayName: 'Claude Opus 4.6',
    contextWindow: 200_000,
    costPer1kInput: 0.015,
    costPer1kOutput: 0.075,
    energyPer1kTokens: 0.00012,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    enabled: true,
  },
]

export class ModelRegistry {
  private readonly store = new Map<string, ModelDefinition>()
  private policy: ModelRoutingPolicy = {
    defaultTier: 'sonnet',
    preferProvider: 'anthropic',
    carbonOptimize: false,
  }

  register(model: ModelDefinition): void {
    if (!model.id) throw new Error('ModelRegistryError: "id" is required')
    if (this.store.has(model.id)) {
      throw new Error(`ModelRegistryError: model "${model.id}" already registered`)
    }
    this.store.set(model.id, model)
  }

  get(id: string): ModelDefinition | undefined {
    return this.store.get(id)
  }

  has(id: string): boolean {
    return this.store.has(id)
  }

  list(): ModelDefinition[] {
    return [...this.store.values()]
  }

  listEnabled(): ModelDefinition[] {
    return [...this.store.values()].filter((m) => m.enabled)
  }

  listByTier(tier: ModelTier): ModelDefinition[] {
    return [...this.store.values()].filter((m) => m.tier === tier && m.enabled)
  }

  listByProvider(provider: ModelProvider): ModelDefinition[] {
    return [...this.store.values()].filter((m) => m.provider === provider && m.enabled)
  }

  selectForTier(tier: ModelTier): ModelDefinition | undefined {
    const candidates = this.listByTier(tier)
    if (candidates.length === 0) return undefined

    if (this.policy.carbonOptimize) {
      return candidates.reduce((best, m) =>
        m.energyPer1kTokens < best.energyPer1kTokens ? m : best
      )
    }

    const preferred = candidates.filter((m) => m.provider === this.policy.preferProvider)
    return preferred[0] ?? candidates[0]
  }

  enable(id: string): void {
    const model = this.store.get(id)
    if (!model) throw new Error(`ModelRegistryError: model "${id}" not found`)
    this.store.set(id, { ...model, enabled: true })
  }

  disable(id: string): void {
    const model = this.store.get(id)
    if (!model) throw new Error(`ModelRegistryError: model "${id}" not found`)
    this.store.set(id, { ...model, enabled: false })
  }

  unregister(id: string): boolean {
    return this.store.delete(id)
  }

  getPolicy(): ModelRoutingPolicy {
    return { ...this.policy }
  }

  setPolicy(updates: Partial<ModelRoutingPolicy>): void {
    this.policy = { ...this.policy, ...updates }
  }

  estimateCost(modelId: string, inputTokens: number, outputTokens: number): number | undefined {
    const model = this.store.get(modelId)
    if (!model) return undefined
    return (inputTokens / 1000) * model.costPer1kInput +
      (outputTokens / 1000) * model.costPer1kOutput
  }

  estimateCarbon(modelId: string, totalTokens: number): number | undefined {
    const model = this.store.get(modelId)
    if (!model) return undefined
    const energyKwh = (totalTokens / 1000) * model.energyPer1kTokens
    return energyKwh * 0.39 * 1000 // grams CO2e (US average grid)
  }
}

function buildModelRegistry(): ModelRegistry {
  const registry = new ModelRegistry()
  for (const model of BUILTIN_MODELS) {
    registry.register(model)
  }
  return registry
}

export const modelRegistry = buildModelRegistry()

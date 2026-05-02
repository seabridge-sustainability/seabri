import type { ModelTier } from '../orchestrator/model-router.js'
import { TIER_MODELS } from '../orchestrator/model-router.js'

export interface ModelRegistration {
  id: string
  name: string
  tier: ModelTier
  contextWindow: number
  costPer1kInputUsd: number
  costPer1kOutputUsd: number
  /** Grams CO2e per 1K tokens (combined input+output estimate) */
  carbonPer1kTokensGrams: number
  strengths: string[]
  provider: 'anthropic'
}

const BUILTIN_MODELS: ModelRegistration[] = [
  {
    id: TIER_MODELS.haiku,
    name: 'Claude Haiku 4.5',
    tier: 'haiku',
    contextWindow: 200_000,
    costPer1kInputUsd: 0.001,
    costPer1kOutputUsd: 0.005,
    carbonPer1kTokensGrams: 0.001 * 39, // ~0.039 gCO2e / 1K tokens (10 Wh/1M * 0.39 kgCO2/kWh)
    strengths: ['fast responses', 'simple Q&A', 'classification', 'cost-efficient'],
    provider: 'anthropic',
  },
  {
    id: TIER_MODELS.sonnet,
    name: 'Claude Sonnet 4.6',
    tier: 'sonnet',
    contextWindow: 200_000,
    costPer1kInputUsd: 0.003,
    costPer1kOutputUsd: 0.015,
    carbonPer1kTokensGrams: 0.004 * 39,
    strengths: ['balanced capability', 'analysis', 'comparisons', 'reports'],
    provider: 'anthropic',
  },
  {
    id: TIER_MODELS.opus,
    name: 'Claude Opus 4.6',
    tier: 'opus',
    contextWindow: 200_000,
    costPer1kInputUsd: 0.015,
    costPer1kOutputUsd: 0.075,
    carbonPer1kTokensGrams: 0.012 * 39,
    strengths: ['complex reasoning', 'multi-step analysis', 'scenario planning', 'research'],
    provider: 'anthropic',
  },
]

export class ModelRegistry {
  private store = new Map<string, ModelRegistration>()

  register(model: ModelRegistration): void {
    if (!model.id) throw new Error('ModelRegistryError: "id" is required')
    if (this.store.has(model.id)) {
      throw new Error(`ModelRegistryError: model "${model.id}" is already registered`)
    }
    this.store.set(model.id, model)
  }

  get(id: string): ModelRegistration | undefined {
    return this.store.get(id)
  }

  getByTier(tier: ModelTier): ModelRegistration | undefined {
    return [...this.store.values()].find((m) => m.tier === tier)
  }

  list(): ModelRegistration[] {
    return [...this.store.values()]
  }

  /** Estimate cost for a known or unknown model id */
  estimateCost(modelId: string, inputTokens: number, outputTokens: number): number {
    const model = this.store.get(modelId)
    if (!model) return 0
    return (inputTokens / 1000) * model.costPer1kInputUsd +
           (outputTokens / 1000) * model.costPer1kOutputUsd
  }

  /** Estimate carbon grams for a given token count */
  estimateCarbon(modelId: string, totalTokens: number): number {
    const model = this.store.get(modelId)
    if (!model) return 0
    return (totalTokens / 1000) * model.carbonPer1kTokensGrams
  }
}

function buildBuiltinModelRegistry(): ModelRegistry {
  const registry = new ModelRegistry()
  for (const model of BUILTIN_MODELS) {
    registry.register(model)
  }
  return registry
}

export const modelRegistry = buildBuiltinModelRegistry()

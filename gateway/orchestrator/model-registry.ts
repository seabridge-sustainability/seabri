import type { NormalizedMessage } from '../types/message.js'

export type ProviderName = 'anthropic' | 'google' | 'openai' | 'deepseek' | 'local'

export interface MultiProviderModelConfig {
  id: string
  provider: ProviderName
  /** Environment variable name that holds the API key for this provider */
  envKey: string
  tier: 'haiku' | 'sonnet' | 'opus'
  supportsVision: boolean
  contextWindow: number
  costPer1kInputUsd: number
  costPer1kOutputUsd: number
}

export const MODEL_REGISTRY: MultiProviderModelConfig[] = [
  // Anthropic
  {
    id: 'claude-haiku-4-5-20251001',
    provider: 'anthropic',
    envKey: 'ANTHROPIC_API_KEY',
    tier: 'haiku',
    supportsVision: true,
    contextWindow: 200_000,
    costPer1kInputUsd: 0.001,
    costPer1kOutputUsd: 0.005,
  },
  {
    id: 'claude-sonnet-4-6',
    provider: 'anthropic',
    envKey: 'ANTHROPIC_API_KEY',
    tier: 'sonnet',
    supportsVision: true,
    contextWindow: 200_000,
    costPer1kInputUsd: 0.003,
    costPer1kOutputUsd: 0.015,
  },
  {
    id: 'claude-opus-4-6',
    provider: 'anthropic',
    envKey: 'ANTHROPIC_API_KEY',
    tier: 'opus',
    supportsVision: true,
    contextWindow: 200_000,
    costPer1kInputUsd: 0.015,
    costPer1kOutputUsd: 0.075,
  },
  // Google Gemini
  {
    id: 'gemini-2.0-flash',
    provider: 'google',
    envKey: 'GOOGLE_API_KEY',
    tier: 'haiku',
    supportsVision: true,
    contextWindow: 1_000_000,
    costPer1kInputUsd: 0.00015,
    costPer1kOutputUsd: 0.0006,
  },
  {
    id: 'gemini-2.5-pro',
    provider: 'google',
    envKey: 'GOOGLE_API_KEY',
    tier: 'opus',
    supportsVision: true,
    contextWindow: 1_000_000,
    costPer1kInputUsd: 0.00125,
    costPer1kOutputUsd: 0.005,
  },
  // OpenAI
  {
    id: 'gpt-4o-mini',
    provider: 'openai',
    envKey: 'OPENAI_API_KEY',
    tier: 'haiku',
    supportsVision: true,
    contextWindow: 128_000,
    costPer1kInputUsd: 0.00015,
    costPer1kOutputUsd: 0.0006,
  },
  {
    id: 'gpt-4o',
    provider: 'openai',
    envKey: 'OPENAI_API_KEY',
    tier: 'sonnet',
    supportsVision: true,
    contextWindow: 128_000,
    costPer1kInputUsd: 0.0025,
    costPer1kOutputUsd: 0.01,
  },
  // DeepSeek
  {
    id: 'deepseek-chat',
    provider: 'deepseek',
    envKey: 'DEEPSEEK_API_KEY',
    tier: 'sonnet',
    supportsVision: false,
    contextWindow: 64_000,
    costPer1kInputUsd: 0.00014,
    costPer1kOutputUsd: 0.00028,
  },
  // Local inference (llama.cpp / liteLLM proxy)
  {
    id: 'local-model',
    provider: 'local',
    envKey: 'LOCAL_INFERENCE_URL',
    tier: 'haiku',
    supportsVision: false,
    contextWindow: 32_000,
    costPer1kInputUsd: 0,
    costPer1kOutputUsd: 0,
  },
]

/**
 * Returns available models for the given message context.
 * Filters to models whose API key (or URL) env var is set.
 * When the message contains an image attachment, further filters to vision-capable models only.
 *
 * @param msg - normalized message context (used to detect vision requirement)
 * @param _tier - preferred tier hint (reserved for future tier filtering; currently unused)
 */
export function selectProvider(
  msg: Pick<NormalizedMessage, 'attachment'>,
  _tier: 'general' | 'fast' | 'deep' = 'general',
): MultiProviderModelConfig[] {
  const preferred = process.env.SEABRI_PREFERRED_PROVIDER as ProviderName | undefined

  // Filter to models with their required env var set
  let candidates = MODEL_REGISTRY.filter((m) => {
    const envVal = process.env[m.envKey]
    return envVal && envVal.trim() !== ''
  })

  // If no API keys set at all, fall back to all Anthropic models (Anthropic key required at startup)
  if (candidates.length === 0) {
    candidates = MODEL_REGISTRY.filter((m) => m.provider === 'anthropic')
  }

  // Vision-only filter when message has an image attachment
  if (msg.attachment?.type === 'image') {
    candidates = candidates.filter((m) => m.supportsVision)
  }

  // Apply preferred-provider ordering without hard exclusion
  if (preferred) {
    const pref = candidates.filter((m) => m.provider === preferred)
    const rest = candidates.filter((m) => m.provider !== preferred)
    candidates = [...pref, ...rest]
  }

  return candidates
}

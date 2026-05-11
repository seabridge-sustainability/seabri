# Multi-LLM Routing Plan

**Date:** 2026-05-03  
**Current state:** Anthropic-only (claude-sonnet-4-x family with internal failover)

---

## Problem

`gateway/orchestrator/model-router.ts` only routes within Anthropic models. If Anthropic is unavailable or a task is better served by a different provider (cost, capability, speed, privacy), there is no fallover path.

---

## Target Architecture

```
NormalizedMessage
    │
    ▼
ModelSelector
    ├── Primary: Anthropic (claude-sonnet-4-6 / claude-opus-4-7)
    ├── Secondary: Google Gemini (gemini-2.0-flash / gemini-2.0-pro)
    ├── Tertiary: OpenAI (gpt-4o / gpt-4o-mini)
    ├── Budget: DeepSeek (deepseek-chat) — low-cost bulk tasks
    └── Local: Ollama/llama.cpp (gemma-3 27B) — privacy-sensitive or offline
```

---

## Model Registry

File: `gateway/orchestrator/model-registry.ts`

```typescript
export interface ModelConfig {
  id: string
  provider: 'anthropic' | 'openai' | 'google' | 'deepseek' | 'local'
  modelId: string
  contextWindow: number
  costPerMToken: number   // input cost, USD
  supportsVision: boolean
  supportsAudio: boolean
  maxRetries: number
  timeoutMs: number
  envKey: string          // required env var name
}

export const MODEL_REGISTRY: ModelConfig[] = [
  {
    id: 'claude-sonnet',
    provider: 'anthropic',
    modelId: 'claude-sonnet-4-6',
    contextWindow: 200_000,
    costPerMToken: 3.0,
    supportsVision: true,
    supportsAudio: false,
    maxRetries: 2,
    timeoutMs: 30_000,
    envKey: 'ANTHROPIC_API_KEY',
  },
  {
    id: 'claude-opus',
    provider: 'anthropic',
    modelId: 'claude-opus-4-7',
    contextWindow: 200_000,
    costPerMToken: 15.0,
    supportsVision: true,
    supportsAudio: false,
    maxRetries: 2,
    timeoutMs: 60_000,
    envKey: 'ANTHROPIC_API_KEY',
  },
  {
    id: 'gemini-flash',
    provider: 'google',
    modelId: 'gemini-2.0-flash',
    contextWindow: 1_048_576,
    costPerMToken: 0.075,
    supportsVision: true,
    supportsAudio: true,
    maxRetries: 2,
    timeoutMs: 20_000,
    envKey: 'GOOGLE_API_KEY',
  },
  {
    id: 'gpt-4o',
    provider: 'openai',
    modelId: 'gpt-4o',
    contextWindow: 128_000,
    costPerMToken: 5.0,
    supportsVision: true,
    supportsAudio: false,
    maxRetries: 2,
    timeoutMs: 30_000,
    envKey: 'OPENAI_API_KEY',
  },
  {
    id: 'deepseek-chat',
    provider: 'deepseek',
    modelId: 'deepseek-chat',
    contextWindow: 64_000,
    costPerMToken: 0.14,
    supportsVision: false,
    supportsAudio: false,
    maxRetries: 3,
    timeoutMs: 30_000,
    envKey: 'DEEPSEEK_API_KEY',
  },
  {
    id: 'local-gemma',
    provider: 'local',
    modelId: 'gemma-3-27b',
    contextWindow: 128_000,
    costPerMToken: 0,
    supportsVision: true,
    supportsAudio: false,
    maxRetries: 1,
    timeoutMs: 60_000,
    envKey: 'LOCAL_INFERENCE_URL',  // liteLLM proxy
  },
]
```

---

## Routing Logic

```typescript
function selectProvider(message: NormalizedMessage, agentId: string): ModelConfig[] {
  // 1. Filter to available providers (env key set)
  const available = MODEL_REGISTRY.filter(m => process.env[m.envKey])

  // 2. If vision required, filter to vision-capable
  const needsVision = !!message.attachment?.type === 'image'
  const candidates = needsVision ? available.filter(m => m.supportsVision) : available

  // 3. For emergency/incident mode, prefer fastest (lowest latency)
  if (message.mode === 'incident') {
    return candidates.sort((a, b) => a.timeoutMs - b.timeoutMs)
  }

  // 4. For bulk/non-critical, prefer cheapest
  if (message.mode === 'general_sustainability' && candidates.find(m => m.provider === 'deepseek')) {
    return [candidates.find(m => m.provider === 'deepseek')!, ...candidates.filter(m => m.provider !== 'deepseek')]
  }

  // 5. Default: Anthropic first, then failover chain
  return candidates.sort((a, b) => {
    const priority = ['anthropic', 'google', 'openai', 'deepseek', 'local']
    return priority.indexOf(a.provider) - priority.indexOf(b.provider)
  })
}
```

---

## Environment Variables (new)

```env
GOOGLE_API_KEY=          # enables Gemini models
DEEPSEEK_API_KEY=        # enables DeepSeek budget model
LOCAL_INFERENCE_URL=     # liteLLM proxy URL (e.g. http://localhost:4000)
SEABRI_PREFERRED_PROVIDER=anthropic  # override default selection
```

---

## Failover Behavior

1. Try primary model
2. On 429/503/timeout → try next in candidate list
3. On all providers exhausted → return user-visible error with retry suggestion
4. Log provider + model + latency + cost per request to `WORKSPACE_DIR/model_usage.jsonl`

---

## Sprint 1 Scope

Sprint 1 implements only:
- `model-registry.ts` — the config table above
- `selectProvider()` — basic availability + vision routing
- Failover loop in `orchestrator/router.ts`
- No cost-based routing yet (Sprint 2)
- No local inference yet (Sprint 2, requires liteLLM proxy running)

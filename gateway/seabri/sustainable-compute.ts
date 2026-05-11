import { randomUUID } from 'crypto'
import { z } from 'zod'
import { recordTelemetryEvent } from '../telemetry/store.js'

export const SustainableComputeInputSchema = z.object({
  workflow_name: z.string().trim().min(1).max(160),
  task_type: z.enum(['chat', 'classification', 'extraction', 'summarization', 'coding', 'analysis', 'reporting', 'vision', 'other']),
  current_model: z.string().trim().min(1).max(120),
  estimated_tokens: z.number().int().positive().max(5_000_000),
  latency_priority: z.enum(['low', 'medium', 'high']).default('medium'),
  cost_priority: z.enum(['low', 'medium', 'high']).default('medium'),
  privacy_priority: z.enum(['low', 'medium', 'high']).default('medium'),
  sustainability_priority: z.enum(['low', 'medium', 'high']).default('high'),
  repeated_task: z.boolean(),
  cacheable: z.boolean(),
  batchable: z.boolean(),
}).strict()

export type SustainableComputeInput = z.infer<typeof SustainableComputeInputSchema>

export interface SustainableComputeResult {
  recommended_model_strategy: string
  smaller_model_option: string
  local_model_option: string
  caching_recommendation: string
  batching_recommendation: string
  context_compression_recommendation: string
  estimated_cost_savings: string
  estimated_compute_reduction: string
  estimated_carbon_proxy_reduction: string
  confidence: 'low' | 'medium' | 'high'
  assumptions: string[]
  telemetry_id: string
}

function isComplex(input: SustainableComputeInput): boolean {
  return input.task_type === 'analysis' || input.task_type === 'reporting' || input.task_type === 'coding' || input.estimated_tokens > 80_000
}

function reductionRange(input: SustainableComputeInput): { cost: number; compute: number; carbon: number } {
  let cost = 10
  let compute = 10
  if (/opus|large|gpt-4|sonnet/i.test(input.current_model) && !isComplex(input)) {
    cost += 45
    compute += 35
  }
  if (input.cacheable && input.repeated_task) {
    cost += 25
    compute += 20
  }
  if (input.batchable) {
    cost += 10
    compute += 12
  }
  if (input.estimated_tokens > 20_000) {
    cost += 10
    compute += 15
  }
  return {
    cost: Math.min(cost, 85),
    compute: Math.min(compute, 75),
    carbon: Math.min(Math.round(compute * 0.9), 70),
  }
}

export async function optimizeSustainableCompute(input: unknown): Promise<SustainableComputeResult> {
  const parsed = SustainableComputeInputSchema.parse(input)
  const complex = isComplex(parsed)
  const reductions = reductionRange(parsed)
  const telemetryId = `sco_${randomUUID()}`
  const simple = parsed.task_type === 'classification' || parsed.task_type === 'extraction' || parsed.task_type === 'summarization'

  const smaller = simple || (!complex && parsed.estimated_tokens < 25_000)
    ? 'Use a small/fast model for first pass; reserve the current model for exceptions or final review.'
    : 'Keep a strong model for the core task, but add a small model for pre-filtering and routing.'

  const local = parsed.privacy_priority === 'high'
    ? 'Prefer a local/private model for preprocessing, redaction, and low-risk classification before any hosted model call.'
    : 'Use a local model only for cheap preprocessing or offline fallback; hosted routing is acceptable when data is non-sensitive.'

  const result: SustainableComputeResult = {
    recommended_model_strategy: complex
      ? 'Hybrid strategy: strong model for high-complexity reasoning, smaller model for routing/extraction, and cached context for repeated sections.'
      : 'Downshift strategy: smaller model by default, escalate only when confidence is low or the user asks for deeper reasoning.',
    smaller_model_option: smaller,
    local_model_option: local,
    caching_recommendation: parsed.cacheable
      ? 'Cache stable system prompts, retrieved context, and repeated workflow inputs.'
      : 'Do not cache user-specific sensitive payloads unless retention and deletion rules are explicit.',
    batching_recommendation: parsed.batchable
      ? 'Batch similar low-priority runs and process them together to reduce overhead.'
      : 'Keep interactive turns unbatched; optimize with smaller models and shorter context instead.',
    context_compression_recommendation: parsed.estimated_tokens > 12_000
      ? 'Compress history and retrieved context before routing; pass only task-relevant excerpts.'
      : 'Context is already moderate; keep history trimmed and avoid repeated boilerplate.',
    estimated_cost_savings: `${reductions.cost}-${Math.min(reductions.cost + 10, 90)}%`,
    estimated_compute_reduction: `${reductions.compute}-${Math.min(reductions.compute + 10, 85)}%`,
    estimated_carbon_proxy_reduction: `${reductions.carbon}-${Math.min(reductions.carbon + 10, 80)}%`,
    confidence: parsed.estimated_tokens > 0 && (parsed.cacheable || parsed.batchable || simple) ? 'high' : 'medium',
    assumptions: [
      'Estimates are proxy ranges, not measured watt-hour readings.',
      'Savings assume quality gates catch low-confidence small-model outputs.',
      'Carbon proxy follows relative compute reduction, not live grid intensity.',
    ],
    telemetry_id: telemetryId,
  }

  await recordTelemetryEvent({
    type: 'sustainability_scored',
    data: {
      telemetryId,
      workflow: parsed.workflow_name,
      taskType: parsed.task_type,
      currentModel: parsed.current_model,
      estimatedTokens: parsed.estimated_tokens,
      recommendedStrategy: result.recommended_model_strategy,
    },
  })

  return result
}

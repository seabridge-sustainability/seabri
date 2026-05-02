import { z } from 'zod'
import { AgentIdSchema } from '../schemas.js'

// ─── Retry / timeout primitives ───────────────────────────────────────────────

export const RetryConfigSchema = z.object({
  maxAttempts: z.number().int().min(1),
  backoffMs: z.number().int().nonnegative().default(500),
})
export type RetryConfig = z.infer<typeof RetryConfigSchema>

// ─── Leaf step schemas ────────────────────────────────────────────────────────

export const AgentStepSchema = z.object({
  id: z.string().min(1),
  type: z.literal('agent'),
  name: z.string().min(1),
  agentId: AgentIdSchema,
  prompt: z.string().min(1),
  timeout: z.number().int().positive().optional(),
  retry: RetryConfigSchema.optional(),
  outputKey: z.string().optional(),
})
export type AgentStep = z.infer<typeof AgentStepSchema>

export const ToolStepSchema = z.object({
  id: z.string().min(1),
  type: z.literal('tool'),
  name: z.string().min(1),
  toolName: z.string().min(1),
  input: z.record(z.string(), z.unknown()),
  timeout: z.number().int().positive().optional(),
  retry: RetryConfigSchema.optional(),
  outputKey: z.string().optional(),
})
export type ToolStep = z.infer<typeof ToolStepSchema>

// ─── Composite step schemas (recursive via z.lazy) ───────────────────────────

export type WorkflowStep = AgentStep | ToolStep | ConditionStep | ParallelStep | LoopStep
export interface ConditionStep {
  id: string
  type: 'condition'
  name: string
  condition: string
  onTrue: WorkflowStep[]
  onFalse?: WorkflowStep[]
}

export interface ParallelStep {
  id: string
  type: 'parallel'
  name: string
  branches: WorkflowStep[][]
  timeout?: number
}

export interface LoopStep {
  id: string
  type: 'loop'
  name: string
  steps: WorkflowStep[]
  condition: string
  maxIterations: number
}

// Forward declaration so recursive schemas can reference it
const WorkflowStepSchemaRef: z.ZodType<WorkflowStep> = z.lazy(() => WorkflowStepSchema)

export const ConditionStepSchema: z.ZodType<ConditionStep> = z.object({
  id: z.string().min(1),
  type: z.literal('condition'),
  name: z.string().min(1),
  condition: z.string().min(1),
  onTrue: z.array(WorkflowStepSchemaRef),
  onFalse: z.array(WorkflowStepSchemaRef).optional(),
})

export const ParallelStepSchema: z.ZodType<ParallelStep> = z.object({
  id: z.string().min(1),
  type: z.literal('parallel'),
  name: z.string().min(1),
  branches: z.array(z.array(WorkflowStepSchemaRef)).min(1),
  timeout: z.number().int().positive().optional(),
})

export const LoopStepSchema: z.ZodType<LoopStep> = z.object({
  id: z.string().min(1),
  type: z.literal('loop'),
  name: z.string().min(1),
  steps: z.array(WorkflowStepSchemaRef).min(1),
  condition: z.string().min(1),
  maxIterations: z.number().int().positive().default(10),
})

export const WorkflowStepSchema: z.ZodType<WorkflowStep> = z.union([
  AgentStepSchema,
  ToolStepSchema,
  ConditionStepSchema,
  ParallelStepSchema,
  LoopStepSchema,
])

// ─── Trigger schemas ──────────────────────────────────────────────────────────

export const CronTriggerSchema = z.object({
  type: z.literal('cron'),
  expression: z.string().min(1),
  timezone: z.string().optional(),
})
export type CronTrigger = z.infer<typeof CronTriggerSchema>

export const WebhookTriggerSchema = z.object({
  type: z.literal('webhook'),
  path: z.string().optional(),
  secret: z.string().optional(),
})
export type WebhookTrigger = z.infer<typeof WebhookTriggerSchema>

export const ManualTriggerSchema = z.object({
  type: z.literal('manual'),
})
export type ManualTrigger = z.infer<typeof ManualTriggerSchema>

export const DataChangeTriggerSchema = z.object({
  type: z.literal('data-change'),
  event: z.enum(['new-session', 'metric-threshold']),
  config: z.record(z.string(), z.unknown()).optional(),
})
export type DataChangeTrigger = z.infer<typeof DataChangeTriggerSchema>

export const TriggerConfigSchema = z.discriminatedUnion('type', [
  CronTriggerSchema,
  WebhookTriggerSchema,
  ManualTriggerSchema,
  DataChangeTriggerSchema,
])
export type TriggerConfig = z.infer<typeof TriggerConfigSchema>

// ─── Workflow definition ──────────────────────────────────────────────────────

export const InputSpecSchema = z.object({
  type: z.string(),
  description: z.string().optional(),
  required: z.boolean().optional(),
  default: z.unknown().optional(),
})
export type InputSpec = z.infer<typeof InputSpecSchema>

export const WorkflowDefinitionSchema = z.object({
  version: z.literal(1),
  name: z.string().min(1),
  description: z.string().optional(),
  steps: z.array(WorkflowStepSchema).min(1),
  inputs: z.record(z.string(), InputSpecSchema).optional(),
  trigger: TriggerConfigSchema.optional(),
})
export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>

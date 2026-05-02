import { z } from 'zod'

export const AGENT_IDS = [
  'climate-risk',
  'nature-biodiversity',
  'sustainability-reporting',
  'investment-screening',
  'home-community',
  'net-zero',
  'natural-capital',
  'general',
] as const

export const AgentIdSchema = z.enum(AGENT_IDS)
export type AgentId = z.infer<typeof AgentIdSchema>

export const InitMessageSchema = z.object({
  type: z.literal('init'),
  agentId: AgentIdSchema,
  sessionId: z.string().optional(),
})

export const ChatMessageSchema = z.object({
  type: z.literal('chat'),
  content: z.string().min(1).max(100_000),
})

export const IncomingMessageSchema = z.discriminatedUnion('type', [
  InitMessageSchema,
  ChatMessageSchema,
])

export type InitMessage = z.infer<typeof InitMessageSchema>
export type ChatMessage = z.infer<typeof ChatMessageSchema>
export type IncomingMessage = z.infer<typeof IncomingMessageSchema>

export const ReadyResponseSchema = z.object({
  type: z.literal('ready'),
  agentId: AgentIdSchema,
  sessionId: z.string(),
  sessionName: z.string(),
})

export const TokenResponseSchema = z.object({
  type: z.literal('token'),
  content: z.string(),
})

export const ThinkingResponseSchema = z.object({
  type: z.literal('thinking'),
})

export const DoneResponseSchema = z.object({
  type: z.literal('done'),
})

export const ErrorResponseSchema = z.object({
  type: z.literal('error'),
  message: z.string(),
})

export const OutgoingMessageSchema = z.discriminatedUnion('type', [
  ReadyResponseSchema,
  TokenResponseSchema,
  ThinkingResponseSchema,
  DoneResponseSchema,
  ErrorResponseSchema,
])

export type OutgoingMessage = z.infer<typeof OutgoingMessageSchema>

export const ToolInputPropertySchema = z.object({
  type: z.string(),
  description: z.string(),
})

export const ToolDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  input_schema: z.object({
    type: z.literal('object'),
    properties: z.record(z.string(), ToolInputPropertySchema),
    required: z.array(z.string()),
  }),
})

export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>

export const WorkflowStepTypeSchema = z.enum([
  'agent',
  'tool',
  'condition',
  'parallel',
  'loop',
])

export const WorkflowStepSchema: z.ZodType<WorkflowStep> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: WorkflowStepTypeSchema,
    name: z.string(),
    config: z.record(z.string(), z.unknown()).optional(),
    agentId: AgentIdSchema.optional(),
    toolName: z.string().optional(),
    condition: z.string().optional(),
    steps: z.array(WorkflowStepSchema).optional(),
    onTrue: z.array(WorkflowStepSchema).optional(),
    onFalse: z.array(WorkflowStepSchema).optional(),
    maxIterations: z.number().int().positive().optional(),
  }),
)

export interface WorkflowStep {
  id: string
  type: z.infer<typeof WorkflowStepTypeSchema>
  name: string
  config?: Record<string, unknown>
  agentId?: z.infer<typeof AgentIdSchema>
  toolName?: string
  condition?: string
  steps?: WorkflowStep[]
  onTrue?: WorkflowStep[]
  onFalse?: WorkflowStep[]
  maxIterations?: number
}

export const WorkflowDefinitionSchema = z.object({
  version: z.literal(1),
  steps: z.array(WorkflowStepSchema).min(1),
  inputs: z.record(z.string(), z.object({
    type: z.string(),
    description: z.string().optional(),
    required: z.boolean().optional(),
  })).optional(),
})

export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>

export const MetricRecordSchema = z.object({
  agentId: z.string().optional(),
  model: z.string(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  costUsd: z.number().nonnegative(),
  latencyMs: z.number().int().nonnegative(),
  carbonGrams: z.number().nonnegative().optional(),
  toolCalls: z.number().int().nonnegative().default(0),
})

export type MetricRecord = z.infer<typeof MetricRecordSchema>

export const FeedbackSchema = z.object({
  sessionId: z.string().optional(),
  messageId: z.string().optional(),
  agentId: z.string().optional(),
  rating: z.number().int().min(-1).max(1).optional(),
  comment: z.string().max(2000).optional(),
  signal: z.enum(['thumbs_up', 'thumbs_down', 'correction', 'abandonment', 'reroute']).optional(),
})

export type Feedback = z.infer<typeof FeedbackSchema>

export function parseIncomingMessage(raw: string): IncomingMessage {
  const parsed = JSON.parse(raw)
  return IncomingMessageSchema.parse(parsed)
}

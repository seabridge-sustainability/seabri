export type {
  RetryConfig,
  AgentStep,
  ToolStep,
  ConditionStep,
  ParallelStep,
  LoopStep,
  WorkflowStep,
  CronTrigger,
  WebhookTrigger,
  ManualTrigger,
  DataChangeTrigger,
  TriggerConfig,
  InputSpec,
  WorkflowDefinition,
} from './schema.js'

// ─── Runtime types (used by executor, not persisted) ─────────────────────────

export type WorkflowRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface WorkflowContext {
  input: Record<string, unknown>
  // Step outputs keyed by outputKey (or step id as fallback)
  [key: string]: unknown
}

export interface StepResult {
  stepId: string
  status: 'completed' | 'failed' | 'skipped'
  output?: unknown
  error?: string
  durationMs: number
  attempts: number
}

export interface WorkflowRunResult {
  workflowId: string
  status: WorkflowRunStatus
  context: WorkflowContext
  stepResults: StepResult[]
  startedAt: Date
  completedAt?: Date
  durationMs?: number
  error?: string
}

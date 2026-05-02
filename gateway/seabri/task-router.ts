import type { AgentId } from '../schemas.js'
import { classifyIntent } from '../orchestrator/classifier.js'
import { selectModel } from '../orchestrator/model-router.js'
import { agentRegistry } from './agent-registry.js'
import { modelRegistry } from './model-registry.js'
import { scoreSustainability } from './sustainability-scoring.js'
import type { SustainabilityScore } from './sustainability-scoring.js'

export interface TaskInput {
  /** Natural language task description */
  task: string
  /** Force a specific agent (skips classification) */
  agentId?: string
  /** Force a specific model id (skips tier selection) */
  modelId?: string
  /** Conversation depth — affects model tier selection */
  conversationDepth?: number
}

export interface RoutingDecision {
  taskId: string
  agentId: string
  agentName: string
  modelId: string
  modelTier: string
  routingReason: string
  classificationConfidence: number
  estimatedCostUsd: number
  estimatedCarbonGrams: number
  sustainability: SustainabilityScore
}

function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

const DEFAULT_ESTIMATED_INPUT_TOKENS = 500
const DEFAULT_ESTIMATED_OUTPUT_TOKENS = 300

export function routeTask(input: TaskInput): RoutingDecision {
  const taskId = generateTaskId()

  // Resolve agent: override → classification → fallback general
  let agentId: string
  let classificationConfidence = 1.0
  let classificationReason: string

  if (input.agentId && agentRegistry.has(input.agentId)) {
    agentId = input.agentId
    classificationReason = 'user-specified agent'
  } else {
    const classification = classifyIntent(input.task)
    agentId = classification.primaryAgent
    classificationConfidence = classification.confidence
    classificationReason = classification.reasoning
  }

  // Resolve model: override → router selection
  let modelId: string
  let modelTier: string
  let modelReason: string

  if (input.modelId && modelRegistry.get(input.modelId)) {
    const reg = modelRegistry.get(input.modelId)!
    modelId = reg.id
    modelTier = reg.tier
    modelReason = 'user-specified model'
  } else {
    const selection = selectModel(
      input.task,
      agentId as AgentId,
      input.conversationDepth ?? 0,
    )
    modelId = selection.model
    modelTier = selection.tier
    modelReason = selection.reason
  }

  // Estimate cost + carbon for a typical request
  const estimatedCostUsd = modelRegistry.estimateCost(
    modelId,
    DEFAULT_ESTIMATED_INPUT_TOKENS,
    DEFAULT_ESTIMATED_OUTPUT_TOKENS,
  )
  const estimatedCarbonGrams = modelRegistry.estimateCarbon(
    modelId,
    DEFAULT_ESTIMATED_INPUT_TOKENS + DEFAULT_ESTIMATED_OUTPUT_TOKENS,
  )

  const sustainability = scoreSustainability(
    estimatedCostUsd,
    estimatedCarbonGrams,
    modelTier as 'haiku' | 'sonnet' | 'opus',
  )

  const agent = agentRegistry.get(agentId)
  const routingReason = `agent: ${classificationReason}; model: ${modelReason}`

  return {
    taskId,
    agentId,
    agentName: agent?.name ?? agentId,
    modelId,
    modelTier,
    routingReason,
    classificationConfidence,
    estimatedCostUsd,
    estimatedCarbonGrams,
    sustainability,
  }
}

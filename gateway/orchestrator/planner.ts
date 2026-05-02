import type { AgentId } from '../schemas.js'
import type { ClassificationResult } from './classifier.js'
import type { ModelSelection } from './model-router.js'

export type StepType = 'agent' | 'parallel' | 'aggregate'

export interface ExecutionStep {
  id: string
  type: StepType
  agentId?: AgentId
  agentIds?: AgentId[]
  model: ModelSelection
  dependsOn: string[]
  description: string
}

export interface ExecutionPlan {
  steps: ExecutionStep[]
  estimatedCalls: number
  strategy: 'single' | 'sequential' | 'parallel' | 'fan-out-aggregate'
}

let stepCounter = 0

function nextStepId(): string {
  return `step_${++stepCounter}`
}

export function buildExecutionPlan(
  classification: ClassificationResult,
  modelSelection: ModelSelection,
): ExecutionPlan {
  if (!classification.isMultiAgent || classification.secondaryAgents.length === 0) {
    const stepId = nextStepId()
    return {
      steps: [{
        id: stepId,
        type: 'agent',
        agentId: classification.primaryAgent,
        model: modelSelection,
        dependsOn: [],
        description: `route to ${classification.primaryAgent}`,
      }],
      estimatedCalls: 1,
      strategy: 'single',
    }
  }

  const allAgents = [classification.primaryAgent, ...classification.secondaryAgents]

  if (allAgents.length === 2) {
    const step1Id = nextStepId()
    const step2Id = nextStepId()
    const aggregateId = nextStepId()

    return {
      steps: [
        {
          id: step1Id,
          type: 'agent',
          agentId: allAgents[0],
          model: modelSelection,
          dependsOn: [],
          description: `primary: ${allAgents[0]}`,
        },
        {
          id: step2Id,
          type: 'agent',
          agentId: allAgents[1],
          model: modelSelection,
          dependsOn: [],
          description: `secondary: ${allAgents[1]}`,
        },
        {
          id: aggregateId,
          type: 'aggregate',
          agentIds: allAgents as AgentId[],
          model: modelSelection,
          dependsOn: [step1Id, step2Id],
          description: `synthesize ${allAgents.join(' + ')}`,
        },
      ],
      estimatedCalls: 3,
      strategy: 'fan-out-aggregate',
    }
  }

  const parallelSteps: ExecutionStep[] = allAgents.map((agentId) => ({
    id: nextStepId(),
    type: 'agent' as StepType,
    agentId: agentId as AgentId,
    model: modelSelection,
    dependsOn: [],
    description: `parallel: ${agentId}`,
  }))

  const aggregateStep: ExecutionStep = {
    id: nextStepId(),
    type: 'aggregate',
    agentIds: allAgents as AgentId[],
    model: modelSelection,
    dependsOn: parallelSteps.map((s) => s.id),
    description: `synthesize ${allAgents.length} agent responses`,
  }

  return {
    steps: [...parallelSteps, aggregateStep],
    estimatedCalls: allAgents.length + 1,
    strategy: 'fan-out-aggregate',
  }
}

export function getExecutableSteps(plan: ExecutionPlan, completedStepIds: Set<string>): ExecutionStep[] {
  return plan.steps.filter((step) => {
    if (completedStepIds.has(step.id)) return false
    return step.dependsOn.every((dep) => completedStepIds.has(dep))
  })
}

export function resetStepCounter(): void {
  stepCounter = 0
}

import { StateGraph, Annotation, END, START } from '@langchain/langgraph'
import { classifyIntent } from './classifier.js'
import { buildExecutionPlan } from './planner.js'
import { selectModel } from './model-router.js'
import { routeMessage } from '../agents/router.js'
import type { ClassificationResult } from './classifier.js'
import type { ExecutionPlan } from './planner.js'
import type { AgentId } from '../schemas.js'

interface ConvMessage {
  role: string
  content: string
}

const GraphAnnotation = Annotation.Root({
  userMessage: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => '',
  }),
  agentId: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => 'general',
  }),
  history: Annotation<ConvMessage[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
  additionalContext: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => '',
  }),
  forceModel: Annotation<string | undefined>({
    reducer: (_prev, next) => next,
    default: () => undefined,
  }),
  classification: Annotation<ClassificationResult | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  plan: Annotation<ExecutionPlan | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  agentResults: Annotation<Record<string, string>>({
    reducer: (prev, next) => ({ ...prev, ...next }),
    default: () => ({}),
  }),
  finalResponse: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => '',
  }),
})

type GraphState = typeof GraphAnnotation.State

async function classifyNode(state: GraphState): Promise<Partial<GraphState>> {
  const classification = classifyIntent(state.userMessage)
  return { classification }
}

async function planNode(state: GraphState): Promise<Partial<GraphState>> {
  const { classification, userMessage, agentId, history, forceModel } = state
  if (!classification) return {}
  const conversationDepth = history.filter((m) => m.role === 'user').length
  const modelSelection = selectModel(userMessage, agentId as AgentId, conversationDepth, forceModel)
  const plan = buildExecutionPlan(classification, modelSelection)
  return { plan }
}

async function executeNode(state: GraphState): Promise<Partial<GraphState>> {
  const { plan, userMessage, history, additionalContext, forceModel } = state
  if (!plan) return {}

  if (plan.strategy === 'single') {
    const step = plan.steps[0]
    if (!step) return {}
    const targetAgent = step.agentId ?? state.agentId ?? 'general'
    const result = await routeMessage(
      targetAgent, userMessage, history, additionalContext, undefined, forceModel
    )
    return { agentResults: { [step.id]: result }, finalResponse: result }
  }

  // Fan-out: run all agent-type steps in parallel
  const agentSteps = plan.steps.filter((s) => s.type === 'agent')
  const settled = await Promise.allSettled(
    agentSteps.map(async (step) => {
      const targetAgent = step.agentId ?? 'general'
      const result = await routeMessage(
        targetAgent, userMessage, history, additionalContext, undefined, forceModel
      )
      return [step.id, result] as [string, string]
    })
  )

  const agentResults: Record<string, string> = {}
  for (const outcome of settled) {
    if (outcome.status === 'fulfilled') {
      const [id, result] = outcome.value
      agentResults[id] = result
    }
  }

  return { agentResults }
}

async function aggregateNode(state: GraphState): Promise<Partial<GraphState>> {
  const { agentResults, userMessage, history, additionalContext, forceModel } = state
  const responses = Object.values(agentResults)
  if (responses.length === 0) return { finalResponse: '' }

  const synthesisContext = [
    additionalContext || null,
    [
      'Multiple specialist agents have analyzed this query.',
      'Synthesize their insights into a single coherent, comprehensive answer.',
      '',
      ...responses.map((r, i) => `=== Agent ${i + 1} ===\n${r}`),
    ].join('\n'),
  ]
    .filter(Boolean)
    .join('\n\n---\n\n')

  const finalResponse = await routeMessage(
    'general', userMessage, history, synthesisContext, undefined, forceModel
  )
  return { finalResponse }
}

function routeAfterExecute(state: GraphState): 'aggregate' | typeof END {
  return state.plan?.strategy === 'fan-out-aggregate' ? 'aggregate' : END
}

const compiledGraph = new StateGraph(GraphAnnotation)
  .addNode('classify', classifyNode)
  .addNode('build_plan', planNode)
  .addNode('execute', executeNode)
  .addNode('aggregate', aggregateNode)
  .addEdge(START, 'classify')
  .addEdge('classify', 'build_plan')
  .addEdge('build_plan', 'execute')
  .addConditionalEdges('execute', routeAfterExecute)
  .addEdge('aggregate', END)
  .compile()

export interface GraphInput {
  userMessage: string
  agentId?: string
  history?: ConvMessage[]
  additionalContext?: string
  forceModel?: string
}

export type { ConvMessage as GraphConvMessage }

export async function runGraph(input: GraphInput): Promise<string> {
  const result = await compiledGraph.invoke({
    userMessage: input.userMessage,
    agentId: input.agentId ?? 'general',
    history: input.history ?? [],
    additionalContext: input.additionalContext ?? '',
    forceModel: input.forceModel,
  })
  return result.finalResponse ?? ''
}

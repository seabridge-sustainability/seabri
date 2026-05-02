import type {
  WorkflowDefinition,
  WorkflowStep,
  AgentStep,
  ToolStep,
  ConditionStep,
  ParallelStep,
  LoopStep,
} from './schema.js'
import type { WorkflowContext, StepResult, WorkflowRunResult } from './types.js'
import type { AgentId } from '../schemas.js'

export type AgentRunner = (agentId: AgentId, prompt: string) => Promise<string>
export type ToolRunner = (name: string, input: Record<string, unknown>) => Promise<unknown>

export interface ExecutorOptions {
  agentRunner?: AgentRunner
  toolRunner?: ToolRunner
}

// Interpolate {{input.x}} and {{context.x}} template vars from the workflow context
function interpolate(template: string, ctx: WorkflowContext): string {
  return template.replace(/\{\{([\w.]+)\}\}/g, (_match, path: string) => {
    const parts = path.split('.')
    let val: unknown = ctx
    for (const p of parts) val = (val as Record<string, unknown>)?.[p]
    return val == null ? '' : String(val)
  })
}

// Evaluate a safe condition expression with `context` in scope.
function evaluateCondition(expression: string, ctx: WorkflowContext): boolean {
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function('context', `"use strict"; return Boolean(${expression})`)
    return fn(ctx) as boolean
  } catch {
    return false
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function defaultAgentRunner(agentId: AgentId, prompt: string): Promise<string> {
  const { routeMessage } = await import('../agents/router.js')
  return routeMessage(agentId, prompt, [])
}

async function defaultToolRunner(name: string, _input: Record<string, unknown>): Promise<unknown> {
  throw new Error(`No tool runner configured — cannot execute tool "${name}"`)
}

export class WorkflowExecutor {
  private readonly agentRunner: AgentRunner
  private readonly toolRunner: ToolRunner

  constructor(opts: ExecutorOptions = {}) {
    this.agentRunner = opts.agentRunner ?? defaultAgentRunner
    this.toolRunner = opts.toolRunner ?? defaultToolRunner
  }

  async run(
    workflow: WorkflowDefinition,
    input: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<WorkflowRunResult> {
    const startedAt = new Date()
    const ctx: WorkflowContext = { input, ...input }
    const stepResults: StepResult[] = []

    const result: WorkflowRunResult = {
      workflowId: workflow.name,
      status: 'running',
      context: ctx,
      stepResults,
      startedAt,
    }

    try {
      for (const step of workflow.steps) {
        if (signal?.aborted) {
          result.status = 'cancelled'
          result.completedAt = new Date()
          return result
        }
        await this.executeStep(step, ctx, stepResults, signal)
      }
      result.status = 'completed'
    } catch (err: unknown) {
      if (signal?.aborted) {
        result.status = 'cancelled'
      } else {
        result.status = 'failed'
        result.error = err instanceof Error ? err.message : String(err)
      }
    }

    result.completedAt = new Date()
    result.durationMs = result.completedAt.getTime() - startedAt.getTime()
    return result
  }

  private async executeStep(
    step: WorkflowStep,
    ctx: WorkflowContext,
    stepResults: StepResult[],
    signal?: AbortSignal,
  ): Promise<void> {
    switch (step.type) {
      case 'agent': return this.executeAgentStep(step, ctx, stepResults)
      case 'tool': return this.executeToolStep(step, ctx, stepResults)
      case 'condition': return this.executeConditionStep(step, ctx, stepResults, signal)
      case 'parallel': return this.executeParallelStep(step, ctx, stepResults, signal)
      case 'loop': return this.executeLoopStep(step, ctx, stepResults, signal)
    }
  }

  private async executeAgentStep(
    step: AgentStep,
    ctx: WorkflowContext,
    stepResults: StepResult[],
  ): Promise<void> {
    const maxAttempts = step.retry?.maxAttempts ?? 1
    const backoffMs = step.retry?.backoffMs ?? 500
    const start = Date.now()
    let lastError = ''

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const prompt = interpolate(step.prompt, ctx)
        const output = await this.agentRunner(step.agentId, prompt)
        const key = step.outputKey ?? step.id
        ctx[key] = output
        stepResults.push({ stepId: step.id, status: 'completed', output, durationMs: Date.now() - start, attempts: attempt })
        return
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err)
        if (attempt < maxAttempts) await sleep(backoffMs)
      }
    }

    stepResults.push({ stepId: step.id, status: 'failed', error: lastError, durationMs: Date.now() - start, attempts: maxAttempts })
    throw new Error(lastError)
  }

  private async executeToolStep(
    step: ToolStep,
    ctx: WorkflowContext,
    stepResults: StepResult[],
  ): Promise<void> {
    const maxAttempts = step.retry?.maxAttempts ?? 1
    const backoffMs = step.retry?.backoffMs ?? 500
    const start = Date.now()
    let lastError = ''

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const resolvedInput = Object.fromEntries(
          Object.entries(step.input).map(([k, v]) => [k, typeof v === 'string' ? interpolate(v, ctx) : v])
        )
        const output = await this.toolRunner(step.toolName, resolvedInput)
        const key = step.outputKey ?? step.id
        ctx[key] = output
        stepResults.push({ stepId: step.id, status: 'completed', output, durationMs: Date.now() - start, attempts: attempt })
        return
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err)
        if (attempt < maxAttempts) await sleep(backoffMs)
      }
    }

    stepResults.push({ stepId: step.id, status: 'failed', error: lastError, durationMs: Date.now() - start, attempts: maxAttempts })
    throw new Error(lastError)
  }

  private async executeConditionStep(
    step: ConditionStep,
    ctx: WorkflowContext,
    stepResults: StepResult[],
    signal?: AbortSignal,
  ): Promise<void> {
    const branch = evaluateCondition(step.condition, ctx) ? step.onTrue : (step.onFalse ?? [])
    for (const subStep of branch) {
      if (signal?.aborted) throw new Error('Workflow cancelled')
      await this.executeStep(subStep, ctx, stepResults, signal)
    }
    stepResults.push({ stepId: step.id, status: 'completed', durationMs: 0, attempts: 1 })
  }

  private async executeParallelStep(
    step: ParallelStep,
    ctx: WorkflowContext,
    stepResults: StepResult[],
    signal?: AbortSignal,
  ): Promise<void> {
    const start = Date.now()
    const branchContexts = step.branches.map(() => ({ ...ctx }))

    const results = await Promise.allSettled(
      step.branches.map((branch, i) =>
        (async () => {
          for (const subStep of branch) {
            await this.executeStep(subStep, branchContexts[i], stepResults, signal)
          }
        })()
      )
    )

    // Merge branch contexts back (last-write wins on colliding keys)
    for (const bc of branchContexts) {
      Object.assign(ctx, bc)
    }

    const failed = results.find((r) => r.status === 'rejected')
    if (failed) {
      const reason = (failed as PromiseRejectedResult).reason
      throw new Error(reason instanceof Error ? reason.message : String(reason))
    }

    stepResults.push({ stepId: step.id, status: 'completed', durationMs: Date.now() - start, attempts: 1 })
  }

  private async executeLoopStep(
    step: LoopStep,
    ctx: WorkflowContext,
    stepResults: StepResult[],
    signal?: AbortSignal,
  ): Promise<void> {
    const maxIter = step.maxIterations ?? 10
    for (let i = 0; i < maxIter; i++) {
      if (signal?.aborted) throw new Error('Workflow cancelled')
      for (const subStep of step.steps) {
        await this.executeStep(subStep, ctx, stepResults, signal)
      }
      if (evaluateCondition(step.condition, ctx)) break
    }
    stepResults.push({ stepId: step.id, status: 'completed', durationMs: 0, attempts: 1 })
  }
}

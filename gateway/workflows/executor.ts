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

function resolvePath(path: string, obj: Record<string, unknown>): unknown {
  const normalizedPath = path.startsWith('context.') ? path.slice('context.'.length) : path
  return normalizedPath.replace(/\[(\d+)\]/g, '.$1').split('.').reduce<unknown>((cur, key) => {
    if (cur == null) return undefined
    return (cur as Record<string, unknown>)[key]
  }, obj)
}

function resolveValue(raw: string, obj: Record<string, unknown>): unknown {
  const expr = raw.trim()
  const numberCall = expr.match(/^Number\(([\w$.[\]]+)\)$/)
  if (numberCall) return Number(resolvePath(numberCall[1], obj))
  const literal = parseLiteral(expr)
  if (literal !== undefined || expr === 'undefined') return literal
  return resolvePath(expr, obj)
}

function parseLiteral(raw: string): unknown {
  const s = raw.trim()
  if (s === 'true') return true
  if (s === 'false') return false
  if (s === 'null') return null
  if (s === 'undefined') return undefined
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s)
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1)
  return undefined
}

function evalAtom(expr: string, ctx: Record<string, unknown>): boolean {
  const s = expr.trim()
  const literal = parseLiteral(s)
  if (literal !== undefined || s === 'undefined') return Boolean(literal)
  const negPath = s.match(/^!\s*([\w$.[\]]+)$/)
  if (negPath) return !resolvePath(negPath[1], ctx)
  const bin = s.match(/^(.+?)\s*(===|!==|==|!=|>=|<=|>|<)\s*(.+)$/)
  if (bin) {
    const left = resolveValue(bin[1], ctx)
    const right = resolveValue(bin[3], ctx)
    switch (bin[2]) {
      case '===': case '==': return left === right
      case '!==': case '!=': return left !== right
      case '>': return (left as number) > (right as number)
      case '<': return (left as number) < (right as number)
      case '>=': return (left as number) >= (right as number)
      case '<=': return (left as number) <= (right as number)
    }
  }
  if (/^[\w$.[\]]+$/.test(s)) return Boolean(resolvePath(s, ctx))
  return false
}

// Evaluate a condition expression with `context` in scope.
// Supports: path truthy checks, binary comparisons (===, !==, >, <, >=, <=),
// negation (!path), and && / || of the above. No eval or Function constructor used.
// Precedence: && binds tighter than ||, matching standard operator precedence.
function evaluateCondition(expression: string, ctx: WorkflowContext): boolean {
  const c = ctx as Record<string, unknown>
  // Split on || first (lowest precedence) then evaluate each && clause
  return expression.split('||').some((orClause) =>
    orClause.split('&&').every((atom) => evalAtom(atom, c))
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function withTimeout<T>(promise: Promise<T>, timeoutMs?: number): Promise<T> {
  if (!timeoutMs) return promise
  return Promise.race([
    promise,
    sleep(timeoutMs).then(() => { throw new Error(`Step timed out after ${timeoutMs}ms`) }),
  ])
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
        const raw = err instanceof Error ? err.message : String(err)
        result.error = raw.replace(/([A-Za-z0-9+/=]{40,})/g, '[redacted]').slice(0, 500)
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
        const output = await withTimeout(this.agentRunner(step.agentId, prompt), step.timeout)
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
        const output = await withTimeout(this.toolRunner(step.toolName, resolvedInput), step.timeout)
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
    const branchContexts = step.branches.map(() => structuredClone(ctx) as WorkflowContext)

    const branchPromise = Promise.allSettled(
      step.branches.map((branch, i) =>
        (async () => {
          for (const subStep of branch) {
            await this.executeStep(subStep, branchContexts[i], stepResults, signal)
          }
        })()
      )
    )
    const results = await withTimeout(branchPromise, step.timeout)

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

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WorkflowExecutor } from './executor.js'
import type { AgentRunner } from './executor.js'
import type { WorkflowDefinition } from './schema.js'

const mockRoute: AgentRunner = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function agentStep(id: string, outputKey?: string) {
  return {
    id,
    type: 'agent' as const,
    name: `Step ${id}`,
    agentId: 'general' as const,
    prompt: `Run ${id}`,
    ...(outputKey ? { outputKey } : {}),
  }
}

// ─── Sequential execution ─────────────────────────────────────────────────────

describe('WorkflowExecutor — sequential', () => {
  it('executes a single agent step', async () => {
    vi.mocked(mockRoute).mockResolvedValueOnce('result-a')
    const wf: WorkflowDefinition = { version: 1, name: 'Test', steps: [agentStep('s1', 'out')] }
    const executor = new WorkflowExecutor({ agentRunner: mockRoute })
    const result = await executor.run(wf, {})
    expect(result.status).toBe('completed')
    expect(result.context['out']).toBe('result-a')
    expect(result.stepResults).toHaveLength(1)
    expect(result.stepResults[0].status).toBe('completed')
  })

  it('passes outputs between sequential steps via context', async () => {
    vi.mocked(mockRoute)
      .mockResolvedValueOnce('first-output')
      .mockResolvedValueOnce('second-output')
    const wf: WorkflowDefinition = {
      version: 1, name: 'Pipeline',
      steps: [agentStep('s1', 'step1_out'), agentStep('s2', 'step2_out')],
    }
    const executor = new WorkflowExecutor({ agentRunner: mockRoute })
    const result = await executor.run(wf, {})
    expect(result.context['step1_out']).toBe('first-output')
    expect(result.context['step2_out']).toBe('second-output')
  })

  it('uses step id as fallback output key when outputKey not set', async () => {
    vi.mocked(mockRoute).mockResolvedValueOnce('output-val')
    const wf: WorkflowDefinition = { version: 1, name: 'Test', steps: [agentStep('myStep')] }
    const executor = new WorkflowExecutor({ agentRunner: mockRoute })
    const result = await executor.run(wf, {})
    expect(result.context['myStep']).toBe('output-val')
  })

  it('passes initial input into context', async () => {
    vi.mocked(mockRoute).mockImplementationOnce(async (_agent, prompt) => {
      expect(prompt).toContain('test-address')
      return 'ok'
    })
    const wf: WorkflowDefinition = {
      version: 1, name: 'With Input',
      steps: [{ id: 's1', type: 'agent', name: 'Step', agentId: 'general', prompt: '{{input.address}}' }],
    }
    const executor = new WorkflowExecutor({ agentRunner: mockRoute })
    const result = await executor.run(wf, { address: 'test-address' })
    expect(result.context.input).toMatchObject({ address: 'test-address' })
  })
})

// ─── Tool steps ───────────────────────────────────────────────────────────────

describe('WorkflowExecutor — tool steps', () => {
  it('executes a tool step and stores output', async () => {
    const wf: WorkflowDefinition = {
      version: 1, name: 'Tool Test',
      steps: [{ id: 't1', type: 'tool', name: 'Search', toolName: 'web_search', input: { query: 'floods' }, outputKey: 'search_result' }],
    }
    const executor = new WorkflowExecutor({
      toolRunner: async (name, input) => ({ tool: name, input }),
    })
    const result = await executor.run(wf, {})
    expect(result.status).toBe('completed')
    expect((result.context['search_result'] as { tool: string }).tool).toBe('web_search')
  })
})

// ─── Parallel branches ────────────────────────────────────────────────────────

describe('WorkflowExecutor — parallel', () => {
  it('runs branches concurrently and merges context', async () => {
    vi.mocked(mockRoute)
      .mockResolvedValueOnce('climate-result')
      .mockResolvedValueOnce('nature-result')
    const wf: WorkflowDefinition = {
      version: 1, name: 'Parallel',
      steps: [{
        id: 'p1', type: 'parallel', name: 'Fan-out',
        branches: [
          [{ id: 'b1', type: 'agent', name: 'Climate', agentId: 'climate-risk', prompt: 'Climate', outputKey: 'climate' }],
          [{ id: 'b2', type: 'agent', name: 'Nature', agentId: 'nature-biodiversity', prompt: 'Nature', outputKey: 'nature' }],
        ],
      }],
    }
    const executor = new WorkflowExecutor({ agentRunner: mockRoute })
    const result = await executor.run(wf, {})
    expect(result.status).toBe('completed')
    expect(result.context['climate']).toBe('climate-result')
    expect(result.context['nature']).toBe('nature-result')
  })

  it('marks run failed if any branch fails', async () => {
    vi.mocked(mockRoute).mockResolvedValueOnce('ok').mockRejectedValueOnce(new Error('branch error'))
    const wf: WorkflowDefinition = {
      version: 1, name: 'Failing Parallel',
      steps: [{
        id: 'p1', type: 'parallel', name: 'Fan-out',
        branches: [
          [agentStep('b1', 'r1')],
          [agentStep('b2', 'r2')],
        ],
      }],
    }
    const executor = new WorkflowExecutor({ agentRunner: mockRoute })
    const result = await executor.run(wf, {})
    expect(result.status).toBe('failed')
    expect(result.error).toMatch(/branch error/)
  })
})

// ─── Conditional branches ─────────────────────────────────────────────────────

describe('WorkflowExecutor — condition', () => {
  it('takes onTrue branch when condition is truthy', async () => {
    vi.mocked(mockRoute).mockResolvedValueOnce('true-branch')
    const wf: WorkflowDefinition = {
      version: 1, name: 'Condition',
      steps: [{
        id: 'c1', type: 'condition', name: 'Check',
        condition: 'true',
        onTrue: [agentStep('yes', 'yes_out')],
        onFalse: [agentStep('no', 'no_out')],
      }],
    }
    const executor = new WorkflowExecutor({ agentRunner: mockRoute })
    const result = await executor.run(wf, {})
    expect(result.context['yes_out']).toBe('true-branch')
    expect(result.context['no_out']).toBeUndefined()
  })

  it('takes onFalse branch when condition is falsy', async () => {
    vi.mocked(mockRoute).mockResolvedValueOnce('false-branch')
    const wf: WorkflowDefinition = {
      version: 1, name: 'Condition',
      steps: [{
        id: 'c1', type: 'condition', name: 'Check',
        condition: 'false',
        onTrue: [agentStep('yes', 'yes_out')],
        onFalse: [agentStep('no', 'no_out')],
      }],
    }
    const executor = new WorkflowExecutor({ agentRunner: mockRoute })
    const result = await executor.run(wf, {})
    expect(result.context['no_out']).toBe('false-branch')
    expect(result.context['yes_out']).toBeUndefined()
  })

  it('evaluates context variable in condition', async () => {
    vi.mocked(mockRoute)
      .mockResolvedValueOnce('9')
      .mockResolvedValueOnce('alert sent')
    const wf: WorkflowDefinition = {
      version: 1, name: 'Smart Condition',
      steps: [
        agentStep('score_step', 'score'),
        {
          id: 'check', type: 'condition', name: 'High Risk?',
          condition: 'Number(context.score) > 7',
          onTrue: [agentStep('alert', 'alert_out')],
        },
      ],
    }
    const executor = new WorkflowExecutor({ agentRunner: mockRoute })
    const result = await executor.run(wf, {})
    expect(result.context['alert_out']).toBe('alert sent')
  })
})

// ─── Loop steps ───────────────────────────────────────────────────────────────

describe('WorkflowExecutor — loop', () => {
  it('loops until condition is true', async () => {
    let callCount = 0
    vi.mocked(mockRoute).mockImplementation(async () => {
      callCount++
      return callCount >= 3 ? 'done' : 'not done'
    })
    const wf: WorkflowDefinition = {
      version: 1, name: 'Loop',
      steps: [{
        id: 'l1', type: 'loop', name: 'Retry',
        steps: [{ id: 'poll', type: 'agent', name: 'Poll', agentId: 'general', prompt: 'Poll', outputKey: 'result' }],
        condition: 'context.result === "done"',
        maxIterations: 5,
      }],
    }
    const executor = new WorkflowExecutor({ agentRunner: mockRoute })
    const result = await executor.run(wf, {})
    expect(result.status).toBe('completed')
    expect(callCount).toBe(3)
  })

  it('stops at maxIterations even if condition never true', async () => {
    vi.mocked(mockRoute).mockResolvedValue('never-done')
    const wf: WorkflowDefinition = {
      version: 1, name: 'Max Iter',
      steps: [{
        id: 'l1', type: 'loop', name: 'Loop',
        steps: [agentStep('s', 'result')],
        condition: 'false',
        maxIterations: 3,
      }],
    }
    const executor = new WorkflowExecutor({ agentRunner: mockRoute })
    const result = await executor.run(wf, {})
    expect(vi.mocked(mockRoute)).toHaveBeenCalledTimes(3)
    expect(result.status).toBe('completed')
  })
})

// ─── Retry on failure ─────────────────────────────────────────────────────────

describe('WorkflowExecutor — retry', () => {
  it('retries a failing step and succeeds on retry', async () => {
    vi.mocked(mockRoute)
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce('recovered')
    const wf: WorkflowDefinition = {
      version: 1, name: 'Retry Test',
      steps: [{
        id: 's1', type: 'agent', name: 'Flaky', agentId: 'general', prompt: 'Try',
        retry: { maxAttempts: 2, backoffMs: 0 },
        outputKey: 'out',
      }],
    }
    const executor = new WorkflowExecutor({ agentRunner: mockRoute })
    const result = await executor.run(wf, {})
    expect(result.status).toBe('completed')
    expect(result.context['out']).toBe('recovered')
    expect(result.stepResults[0].attempts).toBe(2)
  })

  it('marks run failed after all retries exhausted', async () => {
    vi.mocked(mockRoute).mockRejectedValue(new Error('always fails'))
    const wf: WorkflowDefinition = {
      version: 1, name: 'Fail All',
      steps: [{
        id: 's1', type: 'agent', name: 'Broken', agentId: 'general', prompt: 'Try',
        retry: { maxAttempts: 2, backoffMs: 0 },
      }],
    }
    const executor = new WorkflowExecutor({ agentRunner: mockRoute })
    const result = await executor.run(wf, {})
    expect(result.status).toBe('failed')
    expect(result.stepResults[0].attempts).toBe(2)
    expect(result.stepResults[0].error).toContain('always fails')
  })
})

// ─── Abort signal ─────────────────────────────────────────────────────────────

describe('WorkflowExecutor — cancellation', () => {
  it('respects abort signal', async () => {
    vi.mocked(mockRoute).mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve('ok'), 100)))
    const wf: WorkflowDefinition = { version: 1, name: 'Cancel', steps: [agentStep('s1', 'out')] }
    const controller = new AbortController()
    controller.abort()
    const executor = new WorkflowExecutor({ agentRunner: mockRoute })
    const result = await executor.run(wf, {}, controller.signal)
    expect(result.status).toBe('cancelled')
  })
})

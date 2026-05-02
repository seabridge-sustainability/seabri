import { describe, it, expect } from 'vitest'
import {
  WorkflowDefinitionSchema,
  AgentStepSchema,
  ToolStepSchema,
  ConditionStepSchema,
  ParallelStepSchema,
  LoopStepSchema,
  WorkflowStepSchema,
  CronTriggerSchema,
  WebhookTriggerSchema,
  TriggerConfigSchema,
  RetryConfigSchema,
} from './schema.js'

// ─── Step schemas ────────────────────────────────────────────────────────────

describe('AgentStepSchema', () => {
  it('parses a minimal agent step', () => {
    const step = { id: 's1', type: 'agent' as const, name: 'Run climate analysis', agentId: 'climate-risk' as const, prompt: 'Analyze flood risk for {{input.address}}' }
    expect(AgentStepSchema.parse(step)).toMatchObject(step)
  })

  it('accepts optional retry and timeout', () => {
    const step = {
      id: 's1', type: 'agent' as const, name: 'Step', agentId: 'general' as const, prompt: 'Hello',
      timeout: 30_000,
      retry: { maxAttempts: 3, backoffMs: 1000 },
      outputKey: 'analysis',
    }
    const result = AgentStepSchema.parse(step)
    expect(result.retry?.maxAttempts).toBe(3)
    expect(result.outputKey).toBe('analysis')
  })

  it('rejects missing agentId', () => {
    expect(() => AgentStepSchema.parse({ id: 's1', type: 'agent', name: 'Step', prompt: 'Hi' })).toThrow()
  })

  it('rejects invalid agentId', () => {
    expect(() => AgentStepSchema.parse({ id: 's1', type: 'agent', name: 'Step', agentId: 'unknown-agent', prompt: 'Hi' })).toThrow()
  })
})

describe('ToolStepSchema', () => {
  it('parses a tool step', () => {
    const step = { id: 't1', type: 'tool' as const, name: 'Web search', toolName: 'web_search', input: { query: '{{context.topic}}' } }
    expect(ToolStepSchema.parse(step)).toMatchObject(step)
  })

  it('rejects missing toolName', () => {
    expect(() => ToolStepSchema.parse({ id: 't1', type: 'tool', name: 'Step', input: {} })).toThrow()
  })
})

describe('ConditionStepSchema', () => {
  it('parses a condition step with onTrue and onFalse', () => {
    const step = {
      id: 'c1', type: 'condition' as const, name: 'Check score',
      condition: '{{context.score}} > 7',
      onTrue: [{ id: 'alert', type: 'agent' as const, name: 'Alert', agentId: 'general' as const, prompt: 'Send alert' }],
      onFalse: [],
    }
    const result = ConditionStepSchema.parse(step)
    expect(result.onTrue).toHaveLength(1)
  })

  it('accepts condition without onFalse', () => {
    const step = {
      id: 'c1', type: 'condition' as const, name: 'Check',
      condition: '{{context.ok}}',
      onTrue: [{ id: 's1', type: 'agent' as const, name: 'A', agentId: 'net-zero' as const, prompt: 'Go' }],
    }
    expect(() => ConditionStepSchema.parse(step)).not.toThrow()
  })

  it('rejects missing condition expression', () => {
    expect(() => ConditionStepSchema.parse({
      id: 'c1', type: 'condition', name: 'Check',
      onTrue: [],
    })).toThrow()
  })
})

describe('ParallelStepSchema', () => {
  it('parses parallel branches', () => {
    const step = {
      id: 'p1', type: 'parallel' as const, name: 'Fan-out',
      branches: [
        [{ id: 'b1', type: 'agent' as const, name: 'Branch A', agentId: 'climate-risk' as const, prompt: 'Climate' }],
        [{ id: 'b2', type: 'agent' as const, name: 'Branch B', agentId: 'nature-biodiversity' as const, prompt: 'Nature' }],
      ],
    }
    const result = ParallelStepSchema.parse(step)
    expect(result.branches).toHaveLength(2)
  })

  it('rejects parallel with no branches', () => {
    expect(() => ParallelStepSchema.parse({ id: 'p1', type: 'parallel', name: 'Fan-out', branches: [] })).toThrow()
  })
})

describe('LoopStepSchema', () => {
  it('parses a loop step', () => {
    const step = {
      id: 'l1', type: 'loop' as const, name: 'Retry until done',
      steps: [{ id: 's1', type: 'agent' as const, name: 'Poll', agentId: 'general' as const, prompt: 'Check status' }],
      condition: '{{context.done}} === true',
      maxIterations: 5,
    }
    const result = LoopStepSchema.parse(step)
    expect(result.maxIterations).toBe(5)
  })

  it('defaults maxIterations to 10', () => {
    const step = {
      id: 'l1', type: 'loop' as const, name: 'Loop',
      steps: [{ id: 's1', type: 'agent' as const, name: 'Step', agentId: 'general' as const, prompt: 'Go' }],
      condition: '{{context.done}}',
    }
    const result = LoopStepSchema.parse(step)
    expect(result.maxIterations).toBe(10)
  })

  it('rejects loop with no steps', () => {
    expect(() => LoopStepSchema.parse({ id: 'l1', type: 'loop', name: 'Loop', steps: [], condition: 'true' })).toThrow()
  })
})

describe('WorkflowStepSchema (discriminated union)', () => {
  it('dispatches to correct schema by type', () => {
    const agent = WorkflowStepSchema.parse({ id: 'a', type: 'agent', name: 'A', agentId: 'general', prompt: 'Hi' })
    expect(agent.type).toBe('agent')

    const tool = WorkflowStepSchema.parse({ id: 'b', type: 'tool', name: 'B', toolName: 'calc', input: {} })
    expect(tool.type).toBe('tool')
  })

  it('rejects unknown step type', () => {
    expect(() => WorkflowStepSchema.parse({ id: 'x', type: 'unknown', name: 'X' })).toThrow()
  })
})

// ─── Trigger schemas ──────────────────────────────────────────────────────────

describe('CronTriggerSchema', () => {
  it('parses a cron trigger', () => {
    const trigger = { type: 'cron' as const, expression: '0 9 * * 1', timezone: 'America/New_York' }
    expect(CronTriggerSchema.parse(trigger)).toMatchObject(trigger)
  })

  it('rejects empty expression', () => {
    expect(() => CronTriggerSchema.parse({ type: 'cron', expression: '' })).toThrow()
  })
})

describe('WebhookTriggerSchema', () => {
  it('parses a webhook trigger with optional path', () => {
    const trigger = { type: 'webhook' as const, path: '/hooks/climate-alert', secret: 'tok_abc' }
    expect(WebhookTriggerSchema.parse(trigger)).toMatchObject(trigger)
  })

  it('parses a minimal webhook trigger', () => {
    expect(() => WebhookTriggerSchema.parse({ type: 'webhook' })).not.toThrow()
  })
})

describe('TriggerConfigSchema (discriminated union)', () => {
  it('accepts manual trigger', () => {
    const t = TriggerConfigSchema.parse({ type: 'manual' })
    expect(t.type).toBe('manual')
  })

  it('accepts data-change trigger', () => {
    const t = TriggerConfigSchema.parse({ type: 'data-change', event: 'new-session' })
    expect(t.type).toBe('data-change')
  })

  it('rejects unknown trigger type', () => {
    expect(() => TriggerConfigSchema.parse({ type: 'unknown' })).toThrow()
  })
})

// ─── RetryConfig ──────────────────────────────────────────────────────────────

describe('RetryConfigSchema', () => {
  it('parses retry config', () => {
    const r = RetryConfigSchema.parse({ maxAttempts: 3, backoffMs: 2000 })
    expect(r.maxAttempts).toBe(3)
  })

  it('defaults backoffMs to 500', () => {
    const r = RetryConfigSchema.parse({ maxAttempts: 2 })
    expect(r.backoffMs).toBe(500)
  })

  it('rejects maxAttempts < 1', () => {
    expect(() => RetryConfigSchema.parse({ maxAttempts: 0 })).toThrow()
  })
})

// ─── WorkflowDefinition ───────────────────────────────────────────────────────

describe('WorkflowDefinitionSchema', () => {
  const agentStep = { id: 's1', type: 'agent' as const, name: 'Analyze', agentId: 'climate-risk' as const, prompt: 'Report' }

  it('parses a minimal workflow', () => {
    const wf = { version: 1 as const, name: 'My Workflow', steps: [agentStep] }
    const result = WorkflowDefinitionSchema.parse(wf)
    expect(result.name).toBe('My Workflow')
    expect(result.steps).toHaveLength(1)
  })

  it('parses a workflow with cron trigger', () => {
    const wf = {
      version: 1 as const, name: 'Weekly Briefing', steps: [agentStep],
      trigger: { type: 'cron' as const, expression: '0 8 * * 1' },
    }
    const result = WorkflowDefinitionSchema.parse(wf)
    expect(result.trigger?.type).toBe('cron')
  })

  it('parses a workflow with input spec', () => {
    const wf = {
      version: 1 as const, name: 'Risk Scan', steps: [agentStep],
      inputs: { address: { type: 'string', description: 'Property address', required: true } },
    }
    const result = WorkflowDefinitionSchema.parse(wf)
    expect(result.inputs?.address.required).toBe(true)
  })

  it('parses a sequential multi-step workflow', () => {
    const wf = {
      version: 1 as const, name: 'Full ESG Assessment', steps: [
        { id: 's1', type: 'agent' as const, name: 'Climate Risk', agentId: 'climate-risk' as const, prompt: 'Assess' },
        { id: 's2', type: 'agent' as const, name: 'Nature Risk', agentId: 'nature-biodiversity' as const, prompt: 'Assess', outputKey: 'nature_result' },
        { id: 's3', type: 'agent' as const, name: 'Report', agentId: 'sustainability-reporting' as const, prompt: 'Summarize {{context.nature_result}}' },
      ],
    }
    const result = WorkflowDefinitionSchema.parse(wf)
    expect(result.steps).toHaveLength(3)
  })

  it('parses a fan-out/fan-in workflow', () => {
    const wf = {
      version: 1 as const, name: 'Parallel Assessment', steps: [
        {
          id: 'p1', type: 'parallel' as const, name: 'Run in parallel',
          branches: [
            [{ id: 'b1', type: 'agent' as const, name: 'Climate', agentId: 'climate-risk' as const, prompt: 'Climate risk', outputKey: 'climate' }],
            [{ id: 'b2', type: 'agent' as const, name: 'Nature', agentId: 'nature-biodiversity' as const, prompt: 'Nature risk', outputKey: 'nature' }],
          ],
        },
        { id: 'report', type: 'agent' as const, name: 'Consolidate', agentId: 'general' as const, prompt: 'Combine {{context.climate}} and {{context.nature}}' },
      ],
    }
    const result = WorkflowDefinitionSchema.parse(wf)
    expect(result.steps[0].type).toBe('parallel')
  })

  it('parses a conditional workflow', () => {
    const wf = {
      version: 1 as const, name: 'Smart Alert', steps: [
        agentStep,
        {
          id: 'check', type: 'condition' as const, name: 'High Risk?',
          condition: '{{context.risk_score}} > 7',
          onTrue: [{ id: 'alert', type: 'agent' as const, name: 'Alert', agentId: 'general' as const, prompt: 'Urgent: high risk detected' }],
          onFalse: [{ id: 'log', type: 'agent' as const, name: 'Log', agentId: 'general' as const, prompt: 'Routine: risk within range' }],
        },
      ],
    }
    const result = WorkflowDefinitionSchema.parse(wf)
    expect(result.steps[1].type).toBe('condition')
  })

  it('rejects workflow with empty steps', () => {
    expect(() => WorkflowDefinitionSchema.parse({ version: 1, name: 'Empty', steps: [] })).toThrow()
  })

  it('rejects workflow with missing name', () => {
    expect(() => WorkflowDefinitionSchema.parse({ version: 1, steps: [agentStep] })).toThrow()
  })

  it('rejects unknown version', () => {
    expect(() => WorkflowDefinitionSchema.parse({ version: 99, name: 'Future', steps: [agentStep] })).toThrow()
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  WorkflowTriggerManager,
  type WorkflowTriggerHandler,
} from './triggers.js'
import type { WorkflowDefinition } from './schema.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeManualWorkflow(name = 'Manual WF'): WorkflowDefinition {
  return {
    version: 1,
    name,
    steps: [{ id: 's1', type: 'agent', name: 'Step', agentId: 'general', prompt: 'Go' }],
    trigger: { type: 'manual' },
  }
}

function makeCronWorkflow(expression: string): WorkflowDefinition {
  return {
    version: 1,
    name: 'Cron WF',
    steps: [{ id: 's1', type: 'agent', name: 'Step', agentId: 'general', prompt: 'Go' }],
    trigger: { type: 'cron', expression },
  }
}

function makeWebhookWorkflow(path?: string): WorkflowDefinition {
  return {
    version: 1,
    name: 'Webhook WF',
    steps: [{ id: 's1', type: 'agent', name: 'Step', agentId: 'general', prompt: 'Go' }],
    trigger: { type: 'webhook', path },
  }
}

function makeDataChangeWorkflow(event: 'new-session' | 'metric-threshold'): WorkflowDefinition {
  return {
    version: 1,
    name: 'DataChange WF',
    steps: [{ id: 's1', type: 'agent', name: 'Step', agentId: 'general', prompt: 'Go' }],
    trigger: { type: 'data-change', event },
  }
}

// ─── Registration & listing ───────────────────────────────────────────────────

describe('WorkflowTriggerManager — registration', () => {
  it('registers a workflow and returns its id', () => {
    const mgr = new WorkflowTriggerManager()
    const id = mgr.register(makeManualWorkflow())
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })

  it('lists registered workflows', () => {
    const mgr = new WorkflowTriggerManager()
    mgr.register(makeManualWorkflow('A'))
    mgr.register(makeManualWorkflow('B'))
    const list = mgr.list()
    expect(list).toHaveLength(2)
    expect(list.map((e) => e.workflow.name)).toContain('A')
    expect(list.map((e) => e.workflow.name)).toContain('B')
  })

  it('unregisters a workflow by id', () => {
    const mgr = new WorkflowTriggerManager()
    const id = mgr.register(makeManualWorkflow())
    expect(mgr.unregister(id)).toBe(true)
    expect(mgr.list()).toHaveLength(0)
  })

  it('returns false when unregistering unknown id', () => {
    const mgr = new WorkflowTriggerManager()
    expect(mgr.unregister('nonexistent')).toBe(false)
  })
})

// ─── Manual trigger ───────────────────────────────────────────────────────────

describe('WorkflowTriggerManager — manual trigger', () => {
  it('fires handler when manually triggered', async () => {
    const handler: WorkflowTriggerHandler = vi.fn().mockResolvedValue(undefined)
    const mgr = new WorkflowTriggerManager({ handler })
    const id = mgr.register(makeManualWorkflow())
    await mgr.triggerManual(id, { foo: 'bar' })
    expect(handler).toHaveBeenCalledOnce()
    const [wf, input] = (handler as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(wf.name).toBe('Manual WF')
    expect(input).toMatchObject({ foo: 'bar' })
  })

  it('throws when triggering unknown id', async () => {
    const mgr = new WorkflowTriggerManager()
    await expect(mgr.triggerManual('bad-id', {})).rejects.toThrow(/not found/)
  })

  it('throws when workflow trigger type is not manual', async () => {
    const mgr = new WorkflowTriggerManager()
    const id = mgr.register(makeCronWorkflow('0 9 * * 1'))
    await expect(mgr.triggerManual(id, {})).rejects.toThrow(/not a manual/)
  })
})

// ─── Webhook trigger ──────────────────────────────────────────────────────────

describe('WorkflowTriggerManager — webhook trigger', () => {
  it('fires handler when webhook is received for matching path', async () => {
    const handler: WorkflowTriggerHandler = vi.fn().mockResolvedValue(undefined)
    const mgr = new WorkflowTriggerManager({ handler })
    mgr.register(makeWebhookWorkflow('/hooks/climate'))
    await mgr.triggerWebhook('/hooks/climate', { event: 'flood' })
    expect(handler).toHaveBeenCalledOnce()
    const [, input] = (handler as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(input).toMatchObject({ event: 'flood' })
  })

  it('does not fire handler for non-matching path', async () => {
    const handler: WorkflowTriggerHandler = vi.fn().mockResolvedValue(undefined)
    const mgr = new WorkflowTriggerManager({ handler })
    mgr.register(makeWebhookWorkflow('/hooks/climate'))
    await mgr.triggerWebhook('/hooks/nature', {})
    expect(handler).not.toHaveBeenCalled()
  })

  it('fires handler for webhook with no path (wildcard)', async () => {
    const handler: WorkflowTriggerHandler = vi.fn().mockResolvedValue(undefined)
    const mgr = new WorkflowTriggerManager({ handler })
    mgr.register(makeWebhookWorkflow())
    await mgr.triggerWebhook('/anything', { x: 1 })
    expect(handler).toHaveBeenCalledOnce()
  })

  it('fires multiple workflows matching same path', async () => {
    const handler: WorkflowTriggerHandler = vi.fn().mockResolvedValue(undefined)
    const mgr = new WorkflowTriggerManager({ handler })
    mgr.register(makeWebhookWorkflow('/shared'))
    mgr.register(makeWebhookWorkflow('/shared'))
    await mgr.triggerWebhook('/shared', {})
    expect(handler).toHaveBeenCalledTimes(2)
  })
})

// ─── Data-change trigger ──────────────────────────────────────────────────────

describe('WorkflowTriggerManager — data-change trigger', () => {
  it('fires handler when matching data-change event emitted', async () => {
    const handler: WorkflowTriggerHandler = vi.fn().mockResolvedValue(undefined)
    const mgr = new WorkflowTriggerManager({ handler })
    mgr.register(makeDataChangeWorkflow('new-session'))
    await mgr.emitDataChange('new-session', { userId: 'u1' })
    expect(handler).toHaveBeenCalledOnce()
    const [, input] = (handler as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(input).toMatchObject({ userId: 'u1' })
  })

  it('does not fire handler for non-matching event', async () => {
    const handler: WorkflowTriggerHandler = vi.fn().mockResolvedValue(undefined)
    const mgr = new WorkflowTriggerManager({ handler })
    mgr.register(makeDataChangeWorkflow('metric-threshold'))
    await mgr.emitDataChange('new-session', {})
    expect(handler).not.toHaveBeenCalled()
  })
})

// ─── No trigger ──────────────────────────────────────────────────────────────

describe('WorkflowTriggerManager — workflow without trigger', () => {
  it('registers workflow without trigger (ad-hoc runnable)', () => {
    const mgr = new WorkflowTriggerManager()
    const id = mgr.register({
      version: 1,
      name: 'No Trigger',
      steps: [{ id: 's1', type: 'agent', name: 'Step', agentId: 'general', prompt: 'Go' }],
    })
    expect(mgr.list()).toHaveLength(1)
    expect(mgr.list()[0].id).toBe(id)
  })
})

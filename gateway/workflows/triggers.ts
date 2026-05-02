import type { WorkflowDefinition } from './schema.js'

export type WorkflowTriggerHandler = (
  workflow: WorkflowDefinition,
  input: Record<string, unknown>,
) => Promise<void>

export interface TriggerEntry {
  id: string
  workflow: WorkflowDefinition
}

export interface TriggerManagerOptions {
  handler?: WorkflowTriggerHandler
}

function generateId(): string {
  return `wf_${Date.now()}_${Math.floor(Math.random() * 100_000)}`
}

async function noopHandler(_wf: WorkflowDefinition, _input: Record<string, unknown>): Promise<void> {
  // No-op: caller is expected to inject a real handler via constructor options
}

export class WorkflowTriggerManager {
  private readonly entries = new Map<string, TriggerEntry>()
  private readonly handler: WorkflowTriggerHandler

  constructor(opts: TriggerManagerOptions = {}) {
    this.handler = opts.handler ?? noopHandler
  }

  register(workflow: WorkflowDefinition): string {
    const id = generateId()
    this.entries.set(id, { id, workflow })
    return id
  }

  unregister(id: string): boolean {
    return this.entries.delete(id)
  }

  list(): TriggerEntry[] {
    return Array.from(this.entries.values())
  }

  async triggerManual(id: string, input: Record<string, unknown>): Promise<void> {
    const entry = this.entries.get(id)
    if (!entry) throw new Error(`Workflow "${id}" not found`)
    if (entry.workflow.trigger?.type !== 'manual') {
      throw new Error(`Workflow "${id}" is not a manual trigger`)
    }
    await this.handler(entry.workflow, input)
  }

  async triggerWebhook(path: string, payload: Record<string, unknown>): Promise<void> {
    const matches = Array.from(this.entries.values()).filter((e) => {
      const t = e.workflow.trigger
      if (t?.type !== 'webhook') return false
      // Wildcard: no path configured matches any incoming path
      if (!t.path) return true
      return t.path === path
    })
    await Promise.all(matches.map((e) => this.handler(e.workflow, payload)))
  }

  async emitDataChange(
    event: 'new-session' | 'metric-threshold',
    payload: Record<string, unknown>,
  ): Promise<void> {
    const matches = Array.from(this.entries.values()).filter((e) => {
      const t = e.workflow.trigger
      return t?.type === 'data-change' && t.event === event
    })
    await Promise.all(matches.map((e) => this.handler(e.workflow, payload)))
  }
}

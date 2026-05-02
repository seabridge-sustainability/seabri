import { WorkflowDefinitionSchema, type WorkflowDefinition } from '../workflows/schema.js'
import { WorkflowExecutor } from '../workflows/executor.js'
import type { WorkflowRunResult } from '../workflows/types.js'

const store = new Map<string, WorkflowDefinition>()

export function registerWorkflow(raw: unknown): WorkflowDefinition {
  const def = WorkflowDefinitionSchema.parse(raw)
  store.set(def.name, def)
  return def
}

export function getWorkflow(name: string): WorkflowDefinition | undefined {
  return store.get(name)
}

export function listWorkflows(): WorkflowDefinition[] {
  return [...store.values()]
}

export function clearWorkflows(): void {
  store.clear()
}

export async function runWorkflow(
  name: string,
  input: Record<string, unknown> = {},
  signal?: AbortSignal,
): Promise<WorkflowRunResult> {
  const def = store.get(name)
  if (!def) throw new Error(`Workflow "${name}" not found`)
  const executor = new WorkflowExecutor()
  return executor.run(def, input, signal)
}

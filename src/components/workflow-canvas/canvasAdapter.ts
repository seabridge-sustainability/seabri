import type { WorkflowDefinition, WorkflowStep } from '../../../gateway/workflows/schema.js'

// ─── ReactFlow-compatible types (avoids importing @xyflow/react in test env) ─

export interface CanvasNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: Record<string, unknown>
}

export interface CanvasEdge {
  id: string
  source: string
  target: string
  type?: string
  label?: string
  animated?: boolean
}

export interface WorkflowGraph {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

const NODE_WIDTH = 240
const NODE_HEIGHT = 80
const V_GAP = 40
const H_CENTER = 300

function stepToNode(step: WorkflowStep, index: number): CanvasNode {
  const y = index * (NODE_HEIGHT + V_GAP)
  const base = { id: step.id, position: { x: H_CENTER, y } }

  switch (step.type) {
    case 'agent':
      return { ...base, type: 'agent', data: { label: step.name, agentId: step.agentId, prompt: step.prompt, outputKey: step.outputKey } }
    case 'tool':
      return { ...base, type: 'tool', data: { label: step.name, toolName: step.toolName, input: step.input, outputKey: step.outputKey } }
    case 'condition':
      return { ...base, type: 'condition', data: { label: step.name, condition: step.condition, onTrue: step.onTrue, onFalse: step.onFalse } }
    case 'parallel':
      return { ...base, type: 'parallel', data: { label: step.name, branches: step.branches, branchCount: step.branches.length } }
    case 'loop':
      return { ...base, type: 'loop', data: { label: step.name, steps: step.steps, condition: step.condition, maxIterations: step.maxIterations } }
    default:
      throw new Error(`Unsupported workflow step type: ${(step as { type?: string }).type}`)
  }
}

export function workflowToGraph(workflow: WorkflowDefinition): WorkflowGraph {
  const nodes: CanvasNode[] = workflow.steps.map((step, i) => stepToNode(step, i))

  const edges: CanvasEdge[] = []
  for (let i = 0; i < workflow.steps.length - 1; i++) {
    const src = workflow.steps[i]
    const tgt = workflow.steps[i + 1]
    edges.push({ id: `e-${src.id}-${tgt.id}`, source: src.id, target: tgt.id })
  }

  return { nodes, edges }
}

// ─── graphToWorkflow ──────────────────────────────────────────────────────────
// Reconstructs a WorkflowDefinition from a canvas graph.
// Edge topology determines step order; node data carries step fields.

export function graphToWorkflow(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  name: string,
): WorkflowDefinition {
  // Build adjacency: source → target
  const successors = new Map<string, string>()
  const hasIncoming = new Set<string>()
  for (const e of edges) {
    successors.set(e.source, e.target)
    hasIncoming.add(e.target)
  }

  // Find root(s) — nodes with no incoming edges
  const roots = nodes.filter((n) => !hasIncoming.has(n.id))

  // Traverse chain(s) in topological order
  const ordered: CanvasNode[] = []
  const visited = new Set<string>()

  function visit(nodeId: string) {
    if (visited.has(nodeId)) return
    visited.add(nodeId)
    const node = nodes.find((n) => n.id === nodeId)
    if (node) ordered.push(node)
    const next = successors.get(nodeId)
    if (next) visit(next)
  }

  for (const root of roots) visit(root.id)

  // Any disconnected nodes not reached via roots
  for (const node of nodes) {
    if (!visited.has(node.id)) ordered.push(node)
  }

  const steps: WorkflowStep[] = ordered.map((node) => nodeToStep(node))
  return { version: 1, name, steps }
}

function nodeToStep(node: CanvasNode): WorkflowStep {
  const d = node.data
  switch (node.type) {
    case 'agent':
      return {
        id: node.id,
        type: 'agent',
        name: String(d.label ?? node.id),
        agentId: String(d.agentId ?? ''),
        prompt: String(d.prompt ?? ''),
        ...(d.outputKey ? { outputKey: String(d.outputKey) } : {}),
      } as WorkflowStep
    case 'tool':
      return {
        id: node.id,
        type: 'tool',
        name: String(d.label ?? node.id),
        toolName: String(d.toolName ?? ''),
        input: (d.input as Record<string, unknown>) ?? {},
        ...(d.outputKey ? { outputKey: String(d.outputKey) } : {}),
      } as WorkflowStep
    case 'condition':
      return {
        id: node.id,
        type: 'condition',
        name: String(d.label ?? node.id),
        condition: String(d.condition ?? 'false'),
        onTrue: (d.onTrue as WorkflowStep[]) ?? [],
        onFalse: d.onFalse as WorkflowStep[] | undefined,
      } as WorkflowStep
    case 'parallel':
      return {
        id: node.id,
        type: 'parallel',
        name: String(d.label ?? node.id),
        branches: (d.branches as WorkflowStep[][]) ?? [[]],
      } as WorkflowStep
    case 'loop':
      return {
        id: node.id,
        type: 'loop',
        name: String(d.label ?? node.id),
        steps: (d.steps as WorkflowStep[]) ?? [],
        condition: String(d.condition ?? 'false'),
        maxIterations: (d.maxIterations as number) ?? 10,
      } as WorkflowStep
    default:
      throw new Error(`Unsupported canvas node type: ${node.type}`)
  }
}

import { describe, it, expect } from 'vitest'
import { workflowToGraph, graphToWorkflow } from './canvasAdapter.js'
import type { WorkflowDefinition } from '../../../gateway/workflows/schema.js'

// ─── workflowToGraph ──────────────────────────────────────────────────────────

describe('workflowToGraph', () => {
  it('converts a single agent step to one node with no edges', () => {
    const wf: WorkflowDefinition = {
      version: 1, name: 'Single',
      steps: [{ id: 's1', type: 'agent', name: 'Analyze', agentId: 'general', prompt: 'Go' }],
    }
    const { nodes, edges } = workflowToGraph(wf)
    expect(nodes).toHaveLength(1)
    expect(nodes[0].id).toBe('s1')
    expect(nodes[0].type).toBe('agent')
    expect(nodes[0].data.label).toBe('Analyze')
    expect(edges).toHaveLength(0)
  })

  it('creates sequential edges for multi-step workflows', () => {
    const wf: WorkflowDefinition = {
      version: 1, name: 'Pipeline',
      steps: [
        { id: 's1', type: 'agent', name: 'Step 1', agentId: 'general', prompt: 'A' },
        { id: 's2', type: 'agent', name: 'Step 2', agentId: 'climate-risk', prompt: 'B' },
        { id: 's3', type: 'agent', name: 'Step 3', agentId: 'general', prompt: 'C' },
      ],
    }
    const { nodes, edges } = workflowToGraph(wf)
    expect(nodes).toHaveLength(3)
    expect(edges).toHaveLength(2)
    expect(edges[0].source).toBe('s1')
    expect(edges[0].target).toBe('s2')
    expect(edges[1].source).toBe('s2')
    expect(edges[1].target).toBe('s3')
  })

  it('converts a tool step with correct type', () => {
    const wf: WorkflowDefinition = {
      version: 1, name: 'Tool',
      steps: [{ id: 't1', type: 'tool', name: 'Search', toolName: 'web_search', input: { q: 'floods' } }],
    }
    const { nodes } = workflowToGraph(wf)
    expect(nodes[0].type).toBe('tool')
    expect(nodes[0].data.toolName).toBe('web_search')
  })

  it('converts a condition step with correct type and branch info', () => {
    const wf: WorkflowDefinition = {
      version: 1, name: 'Cond',
      steps: [{
        id: 'c1', type: 'condition', name: 'Check',
        condition: 'context.score > 7',
        onTrue: [{ id: 'yes', type: 'agent', name: 'Alert', agentId: 'general', prompt: 'Alert' }],
        onFalse: [{ id: 'no', type: 'agent', name: 'Log', agentId: 'general', prompt: 'Log' }],
      }],
    }
    const { nodes } = workflowToGraph(wf)
    const condNode = nodes.find((n) => n.id === 'c1')
    expect(condNode).toBeDefined()
    expect(condNode?.type).toBe('condition')
    expect(condNode?.data.condition).toBe('context.score > 7')
  })

  it('converts a parallel step with correct type', () => {
    const wf: WorkflowDefinition = {
      version: 1, name: 'Parallel',
      steps: [{
        id: 'p1', type: 'parallel', name: 'Fan-out',
        branches: [
          [{ id: 'b1', type: 'agent', name: 'Climate', agentId: 'climate-risk', prompt: 'C' }],
          [{ id: 'b2', type: 'agent', name: 'Nature', agentId: 'nature-biodiversity', prompt: 'N' }],
        ],
      }],
    }
    const { nodes } = workflowToGraph(wf)
    const parallelNode = nodes.find((n) => n.id === 'p1')
    expect(parallelNode?.type).toBe('parallel')
    expect(parallelNode?.data.branchCount).toBe(2)
  })

  it('converts a loop step with correct type', () => {
    const wf: WorkflowDefinition = {
      version: 1, name: 'Loop',
      steps: [{
        id: 'l1', type: 'loop', name: 'Poll',
        steps: [{ id: 'inner', type: 'agent', name: 'Check', agentId: 'general', prompt: 'Poll' }],
        condition: 'context.done',
        maxIterations: 5,
      }],
    }
    const { nodes } = workflowToGraph(wf)
    const loopNode = nodes.find((n) => n.id === 'l1')
    expect(loopNode?.type).toBe('loop')
    expect(loopNode?.data.maxIterations).toBe(5)
  })

  it('assigns increasing y positions to sequential nodes', () => {
    const wf: WorkflowDefinition = {
      version: 1, name: 'Layout',
      steps: [
        { id: 's1', type: 'agent', name: 'A', agentId: 'general', prompt: 'A' },
        { id: 's2', type: 'agent', name: 'B', agentId: 'general', prompt: 'B' },
      ],
    }
    const { nodes } = workflowToGraph(wf)
    expect(nodes[1].position.y).toBeGreaterThan(nodes[0].position.y)
  })
})

// ─── graphToWorkflow ──────────────────────────────────────────────────────────

describe('graphToWorkflow', () => {
  it('round-trips a single agent step', () => {
    const wf: WorkflowDefinition = {
      version: 1, name: 'RT',
      steps: [{ id: 's1', type: 'agent', name: 'Step', agentId: 'general', prompt: 'Go' }],
    }
    const graph = workflowToGraph(wf)
    const restored = graphToWorkflow(graph.nodes, graph.edges, wf.name)
    expect(restored.name).toBe('RT')
    expect(restored.steps).toHaveLength(1)
    expect(restored.steps[0].id).toBe('s1')
    expect(restored.steps[0].type).toBe('agent')
  })

  it('round-trips a sequential pipeline in correct order', () => {
    const wf: WorkflowDefinition = {
      version: 1, name: 'Pipeline',
      steps: [
        { id: 'a', type: 'agent', name: 'A', agentId: 'general', prompt: 'A' },
        { id: 'b', type: 'agent', name: 'B', agentId: 'general', prompt: 'B' },
        { id: 'c', type: 'agent', name: 'C', agentId: 'general', prompt: 'C' },
      ],
    }
    const graph = workflowToGraph(wf)
    const restored = graphToWorkflow(graph.nodes, graph.edges, wf.name)
    expect(restored.steps.map((s) => s.id)).toEqual(['a', 'b', 'c'])
  })

  it('round-trips a tool step preserving toolName and input', () => {
    const wf: WorkflowDefinition = {
      version: 1, name: 'Tool',
      steps: [{ id: 't1', type: 'tool', name: 'Search', toolName: 'web_search', input: { q: 'floods' } }],
    }
    const graph = workflowToGraph(wf)
    const restored = graphToWorkflow(graph.nodes, graph.edges, wf.name)
    const step = restored.steps[0]
    expect(step.type).toBe('tool')
    if (step.type === 'tool') {
      expect(step.toolName).toBe('web_search')
      expect(step.input).toMatchObject({ q: 'floods' })
    }
  })
})

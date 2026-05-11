import { useCallback, useEffect, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { AgentNode } from './nodes/AgentNode.js'
import { ToolNode } from './nodes/ToolNode.js'
import { ConditionNode } from './nodes/ConditionNode.js'
import { ParallelNode } from './nodes/ParallelNode.js'
import { LoopNode } from './nodes/LoopNode.js'
import { workflowToGraph, graphToWorkflow } from './canvasAdapter.js'
import type { WorkflowDefinition } from '../../../gateway/workflows/schema.js'
import type { StepResult } from '../../../gateway/workflows/types.js'

const NODE_TYPES: NodeTypes = {
  agent: AgentNode,
  tool: ToolNode,
  condition: ConditionNode,
  parallel: ParallelNode,
  loop: LoopNode,
}

interface WorkflowCanvasProps {
  workflow: WorkflowDefinition
  stepResults?: StepResult[]
  onExport?: (updated: WorkflowDefinition) => void
  readOnly?: boolean
}

export function WorkflowCanvas({ workflow, stepResults = [], onExport, readOnly = false }: WorkflowCanvasProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => workflowToGraph(workflow), [workflow])

  // Overlay execution status onto node data
  const statusedNodes = useMemo(() => {
    const statusMap = new Map(stepResults.map((r) => [r.stepId, r.status]))
    return initialNodes.map((n) => ({
      ...n,
      data: { ...n.data, status: statusMap.get(n.id) ?? 'idle' },
    }))
  }, [initialNodes, stepResults])

  const [nodes, setNodes, onNodesChange] = useNodesState(statusedNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  useEffect(() => { setNodes(statusedNodes) }, [statusedNodes, setNodes])
  useEffect(() => { setEdges(initialEdges) }, [initialEdges, setEdges])

  const onConnect = useCallback(
    (params: Connection) => {
      if (readOnly) return
      setEdges((eds) => addEdge({ ...params, animated: true }, eds))
    },
    [readOnly, setEdges],
  )

  const handleExport = useCallback(() => {
    if (!onExport) return
    const updated = graphToWorkflow(nodes, edges, workflow.name)
    onExport(updated)
  }, [nodes, edges, workflow.name, onExport])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={readOnly ? undefined : onNodesChange}
        onEdgesChange={readOnly ? undefined : onEdgesChange}
        onConnect={onConnect}
        nodeTypes={NODE_TYPES}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} color="var(--border-muted, #DCE3EE)" />
        <Controls />
        <MiniMap
          nodeColor={(n) => {
            const t = n.type ?? ''
            const colors: Record<string, string> = {
              agent: '#a78bfa', tool: '#fbbf24', condition: '#38bdf8',
              parallel: '#fb923c', loop: '#e879f9',
            }
            return colors[t] ?? '#888'
          }}
          maskColor="rgba(240,245,252,0.75)"
        />
      </ReactFlow>

      {onExport && !readOnly && (
        <button
          onClick={handleExport}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 10,
            padding: '6px 14px',
            fontSize: 12,
            background: 'var(--accent-green, #059669)',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Export Workflow
        </button>
      )}
    </div>
  )
}

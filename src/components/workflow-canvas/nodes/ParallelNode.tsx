import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'

export interface ParallelNodeData {
  label: string
  branchCount: number
  status?: 'idle' | 'running' | 'completed' | 'failed'
}

export function ParallelNode({ data, selected }: NodeProps) {
  const d = data as unknown as ParallelNodeData

  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: `2px solid ${selected ? '#60a5fa' : '#fb923c'}`,
        borderRadius: 8,
        padding: '10px 14px',
        minWidth: 200,
        fontFamily: 'var(--font-mono, monospace)',
      }}
    >
      <Handle type="target" position={Position.Top} />
      <div style={{ fontSize: 10, color: '#fb923c', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 }}>
        parallel
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>{d.label}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
        {d.branchCount} branch{d.branchCount !== 1 ? 'es' : ''}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

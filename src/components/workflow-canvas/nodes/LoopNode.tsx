import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'

export interface LoopNodeData {
  label: string
  condition: string
  maxIterations: number
  status?: 'idle' | 'running' | 'completed' | 'failed'
}

export function LoopNode({ data, selected }: NodeProps) {
  const d = data as unknown as LoopNodeData

  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: `2px solid ${selected ? '#60a5fa' : '#e879f9'}`,
        borderRadius: 8,
        padding: '10px 14px',
        minWidth: 200,
        fontFamily: 'var(--font-mono, monospace)',
      }}
    >
      <Handle type="target" position={Position.Top} />
      <div style={{ fontSize: 10, color: '#e879f9', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 }}>
        loop
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>{d.label}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
        max {d.maxIterations} iterations
      </div>
      <div
        style={{
          fontSize: 10,
          color: 'var(--text-faint)',
          marginTop: 4,
          fontFamily: 'monospace',
          wordBreak: 'break-all',
        }}
      >
        until: {d.condition}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

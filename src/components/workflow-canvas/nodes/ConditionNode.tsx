import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'

export interface ConditionNodeData {
  label: string
  condition: string
  status?: 'idle' | 'running' | 'completed' | 'failed'
}

export function ConditionNode({ data, selected }: NodeProps) {
  const d = data as unknown as ConditionNodeData

  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: `2px solid ${selected ? '#60a5fa' : '#38bdf8'}`,
        borderRadius: 8,
        padding: '10px 14px',
        minWidth: 200,
        fontFamily: 'var(--font-mono, monospace)',
      }}
    >
      <Handle type="target" position={Position.Top} />
      <div style={{ fontSize: 10, color: '#38bdf8', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 }}>
        condition
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>{d.label}</div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          marginTop: 4,
          padding: '3px 6px',
          background: 'var(--bg-surface)',
          borderRadius: 4,
          fontFamily: 'monospace',
          wordBreak: 'break-all',
        }}
      >
        {d.condition}
      </div>
      {/* Two source handles for true/false branches */}
      <Handle type="source" position={Position.Bottom} id="true" style={{ left: '30%' }} />
      <Handle type="source" position={Position.Bottom} id="false" style={{ left: '70%' }} />
    </div>
  )
}

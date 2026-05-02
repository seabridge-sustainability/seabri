import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'

export interface ToolNodeData {
  label: string
  toolName: string
  outputKey?: string
  status?: 'idle' | 'running' | 'completed' | 'failed'
}

const STATUS_COLOR: Record<string, string> = {
  running: '#fbbf24',
  completed: '#34d399',
  failed: '#f87171',
  idle: 'var(--border-muted)',
}

export function ToolNode({ data, selected }: NodeProps) {
  const d = data as unknown as ToolNodeData
  const borderColor = STATUS_COLOR[d.status ?? 'idle']

  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: `2px solid ${selected ? '#60a5fa' : borderColor}`,
        borderRadius: 8,
        padding: '10px 14px',
        minWidth: 200,
        fontFamily: 'var(--font-mono, monospace)',
      }}
    >
      <Handle type="target" position={Position.Top} />
      <div style={{ fontSize: 10, color: '#fbbf24', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 }}>
        tool
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>{d.label}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{d.toolName}</div>
      {d.outputKey && (
        <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 4 }}>→ {d.outputKey}</div>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

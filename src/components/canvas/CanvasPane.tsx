import { useEffect, type ReactNode } from 'react'
import { useCanvasStore } from '../../store/canvas'
import type { CanvasBlock } from '../../types/canvas'

/**
 * A2UI / Live Canvas Sustainability Pane.
 *
 * Right-hand pane that renders streamed sustainability blocks (text,
 * chart, table, citations) next to the chat. Connects to the optional
 * gateway WebSocket at VITE_CANVAS_WS_URL when present; otherwise
 * stays inert and can be fed programmatically via useCanvasStore.
 */
export function CanvasPane({ onClose }: { onClose: () => void }) {
  const blocks = useCanvasStore((s) => s.blocks)
  const connected = useCanvasStore((s) => s.connected)
  const status = useCanvasStore((s) => s.status)
  const connect = useCanvasStore((s) => s.connect)
  const disconnect = useCanvasStore((s) => s.disconnect)
  const clear = useCanvasStore((s) => s.clear)

  useEffect(() => {
    const url = import.meta.env.VITE_CANVAS_WS_URL
    if (url) connect(url)
    return () => disconnect()
  }, [connect, disconnect])

  return (
    <aside
      style={{
        width: 380,
        borderLeft: '1px solid var(--border-default)',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        background: 'var(--bg-surface)',
      }}
    >
      <header
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <strong style={{ color: 'var(--text-primary)', fontSize: 14 }}>Sustainability Canvas</strong>
        <span
          style={{
            fontSize: 11,
            padding: '2px 6px',
            borderRadius: 4,
            background: connected ? 'rgba(42,148,153,0.15)' : 'var(--bg-surface-hover)',
            color: connected ? 'var(--sb-aqua-700, #3A9499)' : 'var(--text-faint)',
          }}
        >
          {connected ? 'live' : status}
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={clear}
          title="Clear canvas"
          style={{
            background: 'transparent',
            border: '1px solid var(--border-muted)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-muted)',
            fontSize: 12,
            padding: '2px 8px',
            cursor: 'pointer',
          }}
        >
          clear
        </button>
        <button
          onClick={onClose}
          title="Hide canvas"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          ×
        </button>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {blocks.length === 0 ? (
          <EmptyState />
        ) : (
          blocks.map((b) => <BlockView key={b.id} block={b} />)
        )}
      </div>
    </aside>
  )
}

function EmptyState() {
  return (
    <div
      style={{
        color: 'var(--text-faint)',
        fontSize: 13,
        padding: 20,
        border: '1px dashed var(--border-muted)',
        borderRadius: 'var(--radius-md)',
        textAlign: 'center',
      }}
    >
      Waiting for sustainability insights. Charts, tables, and citations streamed by agents will appear here.
    </div>
  )
}

function BlockShell({ title, tags, children }: { title?: string; tags?: string[]; children: ReactNode }) {
  return (
    <div
      style={{
        border: '1px solid var(--border-muted)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-elevated)',
        padding: 12,
      }}
    >
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <strong style={{ color: 'var(--text-primary)', fontSize: 13 }}>{title}</strong>
          {tags?.map((t) => (
            <span
              key={t}
              style={{
                fontSize: 10,
                padding: '1px 5px',
                borderRadius: 3,
                background: 'var(--bg-surface-hover)',
                color: 'var(--text-muted)',
                letterSpacing: 0.4,
              }}
            >
              {t}
            </span>
          ))}
        </div>
      )}
      {children}
    </div>
  )
}

function BlockView({ block }: { block: CanvasBlock }) {
  if (block.kind === 'text') {
    return (
      <BlockShell title={block.title} tags={block.tags}>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
          {block.body}
        </p>
      </BlockShell>
    )
  }
  if (block.kind === 'chart') {
    const max = Math.max(...block.series.map((s) => s.value), 1)
    return (
      <BlockShell title={block.title} tags={block.tags}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {block.series.map((s, i) => (
            <div key={`${s.label}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 90, flexShrink: 0 }}>{s.label}</span>
              <div style={{ flex: 1, background: 'var(--bg-surface-hover)', borderRadius: 3, height: 10 }}>
                <div
                  style={{
                    width: `${(s.value / max) * 100}%`,
                    height: '100%',
                    borderRadius: 3,
                    background: 'var(--accent-green)',
                  }}
                />
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', width: 60, textAlign: 'right' }}>
                {s.value}
                {block.unit ? ` ${block.unit}` : ''}
              </span>
            </div>
          ))}
        </div>
      </BlockShell>
    )
  }
  if (block.kind === 'table') {
    return (
      <BlockShell title={block.title} tags={block.tags}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {block.columns.map((c) => (
                  <th
                    key={c}
                    style={{
                      textAlign: 'left',
                      padding: '4px 6px',
                      borderBottom: '1px solid var(--border-muted)',
                      color: 'var(--text-muted)',
                      fontWeight: 500,
                    }}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((cell, j) => (
                    <td
                      key={j}
                      style={{
                        padding: '4px 6px',
                        borderBottom: '1px solid var(--border-muted)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </BlockShell>
    )
  }
  // citations
  return (
    <BlockShell title={block.title ?? 'Sources'}>
      <ul style={{ margin: 0, paddingLeft: 16, color: 'var(--text-secondary)', fontSize: 12 }}>
        {block.sources.map((s, i) => (
          <li key={i}>
            {s.url ? (
              <a href={s.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-green)' }}>
                {s.label}
              </a>
            ) : (
              s.label
            )}
            {s.note && <span style={{ color: 'var(--text-faint)' }}> — {s.note}</span>}
          </li>
        ))}
      </ul>
    </BlockShell>
  )
}

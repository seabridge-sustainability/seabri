import type { Session } from '../types/openseabri'
import { getAgent } from '../lib/agents'
import { useChatStore } from '../store/chat'

function formatRelative(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  return `${days}d ago`
}

export function SessionsSidebar({
  onNewChat,
  onClose,
}: {
  onNewChat: () => void
  onClose?: () => void
}) {
  const sessions = useChatStore((s) => s.sessions)
  const activeSessionId = useChatStore((s) => s.activeSessionId)
  const selectSession = useChatStore((s) => s.selectSession)
  const deleteSession = useChatStore((s) => s.deleteSession)

  const sorted = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt)

  return (
    <aside
      style={{
        width: 260,
        flexShrink: 0,
        borderRight: '1px solid var(--border-default)',
        background: 'var(--bg-surface)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <div
        style={{
          padding: '12px 14px',
          borderBottom: '1px solid var(--border-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>Sessions</strong>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={onNewChat}
            title="New chat"
            style={{
              background: 'var(--accent-green)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '4px 10px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            + New
          </button>
          {onClose && (
            <button
              onClick={onClose}
              title="Hide sidebar"
              style={{
                background: 'transparent',
                border: '1px solid var(--border-muted)',
                borderRadius: 'var(--radius-md)',
                padding: '4px 8px',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {sorted.length === 0 ? (
          <div style={{ padding: 12, fontSize: 12, color: 'var(--text-faint)', lineHeight: 1.5 }}>
            No saved sessions yet. Start a chat to see it here.
          </div>
        ) : (
          sorted.map((s: Session) => {
            const agent = getAgent(s.agentId)
            const isActive = s.id === activeSessionId
            return (
              <div
                key={s.id}
                onClick={() => selectSession(s.id)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-md)',
                  background: isActive ? 'var(--bg-surface-hover)' : 'transparent',
                  border: isActive
                    ? `1px solid var(--border-default)`
                    : '1px solid transparent',
                  borderLeft: agent ? `3px solid ${agent.color}` : '3px solid transparent',
                  cursor: 'pointer',
                  marginBottom: 4,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--text-primary)',
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {s.title || 'New chat'}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text-faint)',
                      marginTop: 2,
                      display: 'flex',
                      gap: 6,
                    }}
                  >
                    {agent && <span>{agent.name}</span>}
                    <span>·</span>
                    <span>{formatRelative(s.updatedAt)}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteSession(s.id)
                  }}
                  title="Delete session"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-faint)',
                    cursor: 'pointer',
                    fontSize: 14,
                    padding: '0 4px',
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            )
          })
        )}
      </div>
    </aside>
  )
}

import { useEffect, useState } from 'react'

interface AgentInfo {
  id: string
  name: string
  description: string
  builtin: boolean
}

interface ModelInfo {
  id: string
  name: string
  tier: string
}

interface PanelState {
  agents: AgentInfo[]
  models: ModelInfo[]
  loading: boolean
}

interface SeaBriOSPanelProps {
  gatewayUrl: string | undefined
  lastRoutingTier?: string
}

const STAT: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  padding: '10px 16px',
  borderRadius: 8,
  background: 'var(--bg-surface, #1a1f2e)',
  border: '1px solid var(--border-muted, #2a2f3e)',
  minWidth: 100,
}

const LABEL: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--text-muted, #6b7a96)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const VALUE: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: 'var(--accent-green-2, #4ade80)',
  lineHeight: 1.2,
}

const TIER_COLOR: Record<string, string> = {
  haiku: '#4ade80',
  sonnet: '#60a5fa',
  opus: '#c084fc',
}

export function SeaBriOSPanel({ gatewayUrl, lastRoutingTier }: SeaBriOSPanelProps) {
  const [state, setState] = useState<PanelState>({ agents: [], models: [], loading: true })

  useEffect(() => {
    if (!gatewayUrl) {
      setState((prev) => ({ ...prev, loading: false }))
      return
    }

    const base = gatewayUrl.replace(/\/+$/, '')

    Promise.all([
      fetch(`${base}/api/seabri/agents`).then((r) => r.json()),
      fetch(`${base}/api/seabri/models`).then((r) => r.json()),
    ])
      .then(([agentData, modelData]) => {
        setState({
          agents: (agentData as { agents: AgentInfo[] }).agents ?? [],
          models: (modelData as { models: ModelInfo[] }).models ?? [],
          loading: false,
        })
      })
      .catch(() => setState((prev) => ({ ...prev, loading: false })))
  }, [gatewayUrl])

  const tier = lastRoutingTier ?? '—'
  const tierColor = TIER_COLOR[tier] ?? 'var(--text-muted, #6b7a96)'

  return (
    <div
      style={{
        padding: '16px 24px',
        borderTop: '1px solid var(--border-muted, #2a2f3e)',
        background: 'var(--bg-app, #0f1117)',
      }}
    >
      <div style={{ marginBottom: 12, fontSize: 12, fontWeight: 600, color: 'var(--text-muted, #6b7a96)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        SeaBri OS — Registry
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={STAT}>
          <span style={LABEL}>Agents</span>
          <span style={VALUE}>{state.loading ? '…' : state.agents.length}</span>
        </div>
        <div style={STAT}>
          <span style={LABEL}>Models</span>
          <span style={VALUE}>{state.loading ? '…' : state.models.length}</span>
        </div>
        <div style={STAT}>
          <span style={LABEL}>Last Tier</span>
          <span style={{ ...VALUE, color: tierColor }}>{tier}</span>
        </div>
        {!state.loading && state.agents.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              alignItems: 'center',
              padding: '10px 16px',
              borderRadius: 8,
              background: 'var(--bg-surface, #1a1f2e)',
              border: '1px solid var(--border-muted, #2a2f3e)',
              flex: 1,
            }}
          >
            {state.agents.map((a) => (
              <span
                key={a.id}
                title={a.description}
                style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: 'var(--bg-app, #0f1117)',
                  border: '1px solid var(--border-muted, #2a2f3e)',
                  color: 'var(--text-secondary, #94a3b8)',
                }}
              >
                {a.id}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

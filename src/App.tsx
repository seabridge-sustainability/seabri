import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AGENTS, getAgent, DEFAULT_AGENT_ID } from './lib/agents'
import type { Agent, Message, Session } from './types/openseabri'
import { useChatStore } from './store/chat'
import { useCanvasStore } from './store/canvas'
import { ConnectionBadge } from './components/ConnectionBadge'
import { SessionsSidebar } from './components/SessionsSidebar'
import { CanvasPane } from './components/canvas/CanvasPane'
import { SustainabilityDashboard } from './components/sustainability-dashboard/SustainabilityDashboard.js'
import { SeaBriOSPanel } from './components/sustainability-dashboard/SeaBriOSPanel.js'
import { WorkflowCanvas } from './components/workflow-canvas/WorkflowCanvas.js'
import { useLiveTelemetry } from './hooks/useLiveTelemetry.js'
import type { WorkflowDefinition } from '../gateway/workflows/schema.js'

type AppView = 'landing' | 'dashboard' | 'workflow'

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY ?? ''

function SiteHeader({ onNav, activeView }: { onNav?: (v: AppView) => void; activeView?: AppView }) {
  const navLink = (label: string, view: AppView, href?: string) => {
    const active = activeView === view
    const base: React.CSSProperties = { color: active ? 'var(--accent-green-2)' : 'var(--text-muted)', textDecoration: 'none', cursor: 'pointer', fontWeight: active ? 600 : 400 }
    if (onNav) return <span key={view} onClick={() => onNav(view)} style={base}>{label}</span>
    return <a key={href ?? '#'} href={href ?? '#'} style={base}>{label}</a>
  }

  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '18px 32px',
        borderBottom: '1px solid var(--border-default)',
        background: 'rgba(10, 10, 10, 0.85)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src="/img/seabri-icon.png" alt="" width={28} height={28} style={{ borderRadius: 6 }} />
        <span
          style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, letterSpacing: '-0.01em', color: 'var(--text-primary)', cursor: 'pointer' }}
          onClick={() => onNav?.('landing')}
        >
          OpenSeaBri
        </span>
        <span style={{ fontSize: 11, color: 'var(--accent-green-2)', border: '1px solid var(--accent-green)', padding: '2px 8px', borderRadius: 999, letterSpacing: '0.08em', textTransform: 'uppercase', marginLeft: 8 }}>
          Sustainability OS
        </span>
      </div>
      <div style={{ display: 'flex', gap: 24, fontSize: 14, alignItems: 'center' }}>
        {navLink('Specialists', 'landing', '#specialists')}
        {navLink('Dashboard', 'dashboard')}
        {navLink('Workflows', 'workflow')}
        <a href="https://github.com/seabridge-sustainability" target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>GitHub</a>
      </div>
    </nav>
  )
}

function Hero() {
  return (
    <section
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)',
        gap: 48,
        alignItems: 'center',
        padding: '72px 32px 56px',
        maxWidth: 1200,
        margin: '0 auto',
      }}
    >
      <div>
        <div style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--accent-green-2)', marginBottom: 18 }}>
          Open source · Clone-then-adapt · Compliance-gated
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: 'clamp(40px, 6vw, 72px)',
            lineHeight: 1.02,
            letterSpacing: '-0.025em',
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          Your personal<br />
          <span style={{ color: 'var(--accent-green-2)' }}>sustainability</span> intelligence.
        </h1>
        <p
          style={{
            fontSize: 'clamp(16px, 1.4vw, 19px)',
            color: 'var(--text-muted)',
            lineHeight: 1.6,
            maxWidth: 560,
            marginTop: 24,
          }}
        >
          A single interface to 18 ESG specialists — climate, nature, transition risk,
          materiality, targets, regulation, LCA, due diligence, and more. Backed by
          pinned upstreams, HMAC-approved runs, and compliance-tagged skills.
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 32, flexWrap: 'wrap' }}>
          <a
            href="#specialists"
            style={{
              background: 'var(--accent-green)',
              color: '#0a0a0a',
              fontWeight: 600,
              padding: '12px 22px',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              fontSize: 15,
            }}
          >
            Pick a specialist →
          </a>
          <a
            href="https://github.com/seabridge-sustainability"
            target="_blank"
            rel="noreferrer"
            style={{
              border: '1px solid var(--border-muted)',
              color: 'var(--text-secondary)',
              fontWeight: 500,
              padding: '12px 22px',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              fontSize: 15,
            }}
          >
            View on GitHub
          </a>
        </div>
      </div>
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            position: 'absolute',
            inset: '-10% -10% -10% -10%',
            background: 'radial-gradient(circle at 50% 50%, rgba(34,197,94,0.22), transparent 60%)',
            filter: 'blur(40px)',
            zIndex: 0,
          }}
        />
        <img
          src="/img/robot-hero.png"
          alt="OpenSeaBri agent"
          style={{
            position: 'relative',
            zIndex: 1,
            maxWidth: '100%',
            height: 'auto',
            filter: 'drop-shadow(var(--shadow-hero))',
          }}
        />
      </div>
    </section>
  )
}

function SpecialistsSection({ onPick }: { onPick: (agent: Agent) => void }) {
  return (
    <section id="specialists" style={{ padding: '32px 32px 72px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 10 }}>
          The specialists
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>
          Eighteen agents. One sustainability focus.
        </h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {AGENTS.map((a) => (
          <button
            key={a.id}
            onClick={() => onPick(a)}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-muted)',
              borderLeft: `4px solid ${a.color}`,
              borderRadius: 'var(--radius-lg)',
              padding: 20,
              cursor: 'pointer',
              textAlign: 'left',
              color: 'var(--text-secondary)',
              transition: 'transform 120ms ease, border-color 120ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.borderColor = 'var(--accent-green)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.borderColor = 'var(--border-muted)'
            }}
          >
            <span style={{ fontSize: 28, display: 'block', marginBottom: 10 }}>{a.icon}</span>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{a.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-faint)', marginBottom: 10, lineHeight: 1.4 }}>{a.tagline}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{a.description}</div>
          </button>
        ))}
      </div>
    </section>
  )
}

function SiteFooter() {
  return (
    <footer
      id="footer"
      style={{
        borderTop: '1px solid var(--border-default)',
        padding: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
        color: 'var(--text-faint)',
        fontSize: 13,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="/img/isotipo-white.png" alt="" width={20} height={20} style={{ opacity: 0.7 }} />
        <span>OpenSeaBri · Built on SeaBridge · MIT licensed</span>
      </div>
      <div>Pinned upstreams · See <code style={{ fontFamily: 'var(--font-mono)' }}>IMPORT_POLICY.md</code></div>
    </footer>
  )
}

function Landing({ onPick, onNav }: { onPick: (agent: Agent) => void; onNav: (v: AppView) => void }) {
  return (
    <div>
      <SiteHeader onNav={onNav} activeView="landing" />
      <Hero />
      <SpecialistsSection onPick={onPick} />
      <SiteFooter />
    </div>
  )
}

function MissingKeyCard() {
  return (
    <div
      style={{
        border: '1px solid #7f1d1d',
        background: '#1a0a0a',
        borderRadius: 'var(--radius-md)',
        padding: 16,
        color: '#fecaca',
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6, color: '#fca5a5' }}>Anthropic API key not configured</div>
      Set <code style={{ fontFamily: 'var(--font-mono)' }}>VITE_ANTHROPIC_API_KEY</code> in{' '}
      <code style={{ fontFamily: 'var(--font-mono)' }}>.env.local</code> and restart the dev server to enable streaming chat.
    </div>
  )
}

function MessageBubble({ msg, agent, streaming }: { msg: Message; agent: Agent; streaming: boolean }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 16 }}>
      <div
        style={{
          maxWidth: '78%',
          background: isUser ? 'var(--bg-bubble-user)' : 'var(--bg-bubble-assistant)',
          border: `1px solid ${isUser ? 'var(--border-muted)' : 'var(--border-default)'}`,
          borderLeft: isUser ? undefined : `3px solid ${agent.color}`,
          borderRadius: 'var(--radius-lg)',
          padding: '12px 16px',
          color: 'var(--text-secondary)',
          fontSize: 14,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {msg.content || (streaming ? <span style={{ opacity: 0.6 }}>…</span> : '')}
        {streaming && msg.content && <span style={{ opacity: 0.6, marginLeft: 4 }}>▍</span>}
      </div>
    </div>
  )
}

function StarterChips({ agent, onPick }: { agent: Agent; onPick: (q: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 24 }}>
      <div style={{ fontSize: 12, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
        Try asking
      </div>
      {agent.starterQuestions.map((q) => (
        <button
          key={q}
          onClick={() => onPick(q)}
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-muted)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            textAlign: 'left',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            fontSize: 13,
          }}
        >
          {q}
        </button>
      ))}
    </div>
  )
}

function Composer({ onSend, disabled, streaming, onAbort }: {
  onSend: (text: string) => void
  disabled: boolean
  streaming: boolean
  onAbort: () => void
}) {
  const [value, setValue] = useState('')
  const ref = useRef<HTMLTextAreaElement | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [value])

  const submit = (): void => {
    const t = value.trim()
    if (!t || disabled) return
    onSend(t)
    setValue('')
  }

  return (
    <div style={{ borderTop: '1px solid var(--border-default)', padding: 16, background: 'var(--bg-app)' }}>
      <div
        style={{
          maxWidth: 820,
          margin: '0 auto',
          display: 'flex',
          gap: 8,
          alignItems: 'flex-end',
          background: 'var(--bg-input)',
          border: '1px solid var(--border-muted)',
          borderRadius: 'var(--radius-lg)',
          padding: 8,
        }}
      >
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder={disabled ? 'API key required…' : 'Ask anything about sustainability…'}
          rows={1}
          style={{
            flex: 1,
            resize: 'none',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontSize: 14,
            lineHeight: 1.5,
            padding: '8px 10px',
            fontFamily: 'var(--font-sans)',
            maxHeight: 200,
          }}
        />
        {streaming ? (
          <button
            onClick={onAbort}
            style={{
              background: '#7f1d1d',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              color: '#fecaca',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Stop
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={!value.trim() || disabled}
            style={{
              background: value.trim() && !disabled ? 'var(--accent-green)' : 'var(--bg-surface-hover)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              color: value.trim() && !disabled ? '#fff' : 'var(--text-faint)',
              cursor: value.trim() && !disabled ? 'pointer' : 'not-allowed',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Send
          </button>
        )}
      </div>
    </div>
  )
}

function ChatShell({
  session,
  agent,
  onBack,
  onNewChat,
  onDashboard,
}: {
  session: Session
  agent: Agent
  onBack: () => void
  onNewChat: () => void
  onDashboard: () => void
}) {
  const isStreaming = useChatStore((s) => s.isStreaming)
  const apiError = useChatStore((s) => s.apiError)
  const sendMessage = useChatStore((s) => s.sendMessage)
  const abort = useChatStore((s) => s.abort)
  const clearError = useChatStore((s) => s.clearError)
  const sessionCount = useChatStore((s) => s.sessions.length)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const canvasOpen = useCanvasStore((s) => s.open)
  const toggleCanvas = useCanvasStore((s) => s.toggle)
  const setCanvasOpen = useCanvasStore((s) => s.setOpen)

  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [session.messages, isStreaming])

  const lastAssistantId = [...session.messages].reverse().find((m) => m.role === 'assistant')?.id
  const hasKey = Boolean(API_KEY)

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {sidebarOpen && (
        <SessionsSidebar onNewChat={onNewChat} onClose={() => setSidebarOpen(false)} />
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <header
        style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            title="Show sessions"
            style={{
              background: 'transparent',
              border: '1px solid var(--border-muted)',
              borderRadius: 'var(--radius-md)',
              padding: '4px 8px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            ☰
          </button>
        )}
        <button
          onClick={onBack}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}
        >
          ← Back
        </button>
        <button
          onClick={onDashboard}
          title="Sustainability Dashboard"
          style={{ background: 'transparent', border: '1px solid var(--border-muted)', borderRadius: 'var(--radius-md)', padding: '4px 10px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}
        >
          📊 Dashboard
        </button>
        <span style={{ fontSize: 20 }}>{agent.icon}</span>
        <strong style={{ color: 'var(--text-primary)' }}>{agent.name}</strong>
        <span style={{ color: 'var(--text-faint)', fontSize: 13 }}>{agent.tagline}</span>
        <div style={{ flex: 1 }} />
        <button
          onClick={toggleCanvas}
          title={canvasOpen ? 'Hide sustainability canvas' : 'Show sustainability canvas'}
          style={{
            background: canvasOpen ? 'var(--bg-surface-hover)' : 'transparent',
            border: '1px solid var(--border-muted)',
            borderRadius: 'var(--radius-md)',
            padding: '4px 10px',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          Canvas
        </button>
        <ConnectionBadge sessionCount={sessionCount} />
      </header>

      <main ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '24px 16px' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          {!hasKey && (
            <div style={{ marginBottom: 16 }}>
              <MissingKeyCard />
            </div>
          )}

          {apiError && apiError !== 'missing_key' && (
            <div
              style={{
                marginBottom: 16,
                border: '1px solid #7f1d1d',
                background: '#1a0a0a',
                borderRadius: 'var(--radius-md)',
                padding: 12,
                color: '#fecaca',
                fontSize: 13,
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <span>{apiError}</span>
              <button
                onClick={clearError}
                style={{ background: 'transparent', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: 13 }}
              >
                dismiss
              </button>
            </div>
          )}

          {session.messages.length === 0 ? (
            <StarterChips agent={agent} onPick={(q) => sendMessage(q, API_KEY)} />
          ) : (
            session.messages.map((m) => (
              <MessageBubble
                key={m.id}
                msg={m}
                agent={agent}
                streaming={isStreaming && m.id === lastAssistantId}
              />
            ))
          )}
        </div>
      </main>

      <Composer
        onSend={(t) => sendMessage(t, API_KEY)}
        disabled={!hasKey || isStreaming}
        streaming={isStreaming}
        onAbort={abort}
      />
      </div>
      {canvasOpen && <CanvasPane onClose={() => setCanvasOpen(false)} />}
    </div>
  )
}

const DEMO_METRICS = [
  { date: '2025-04-26', carbonGrams: 1.8, costUsd: 0.0021, requestCount: 12 },
  { date: '2025-04-27', carbonGrams: 2.4, costUsd: 0.0034, requestCount: 18 },
  { date: '2025-04-28', carbonGrams: 1.1, costUsd: 0.0015, requestCount: 8 },
  { date: '2025-04-29', carbonGrams: 3.2, costUsd: 0.0048, requestCount: 24 },
  { date: '2025-04-30', carbonGrams: 2.9, costUsd: 0.0041, requestCount: 21 },
  { date: '2025-05-01', carbonGrams: 1.5, costUsd: 0.0019, requestCount: 11 },
  { date: '2025-05-02', carbonGrams: 2.0, costUsd: 0.0028, requestCount: 15 },
]

const DEMO_RECOMMENDATIONS = [
  'Route simple ESG queries to claude-haiku-4-5 to reduce carbon 60–70%.',
  'Enable prompt caching for materiality assessment runs — repeated context is ~40% of tokens.',
  'Batch daily CSRD report generation into off-peak hours to lower grid carbon intensity.',
  'Switch science-based targets agent to haiku for first-pass screening, opus only for final validation.',
]

const DEMO_WORKFLOW: WorkflowDefinition = {
  version: 1,
  name: 'ESG Risk Assessment',
  description: 'Parallel climate + nature risk assessment with materiality gate',
  steps: [
    {
      id: 'climate-risk',
      type: 'agent',
      name: 'Climate Risk Analysis',
      agentId: 'climate-risk',
      prompt: 'Assess physical and transition climate risks for the portfolio.',
    },
    {
      id: 'nature-risk',
      type: 'agent',
      name: 'Nature & Biodiversity Risk',
      agentId: 'nature-biodiversity',
      prompt: 'Assess biodiversity and natural capital dependencies.',
    },
    {
      id: 'parallel-risk',
      type: 'parallel',
      name: 'Parallel Risk Streams',
      branches: [
        [{ id: 'climate-risk', type: 'agent', name: 'Climate Risk Analysis', agentId: 'climate-risk', prompt: 'Assess physical and transition climate risks.' }],
        [{ id: 'nature-risk', type: 'agent', name: 'Nature & Biodiversity Risk', agentId: 'nature-biodiversity', prompt: 'Assess biodiversity and natural capital dependencies.' }],
      ],
    },
    {
      id: 'materiality-gate',
      type: 'condition',
      name: 'Materiality Gate',
      condition: 'riskScore > 0.7',
      onTrue: [
        { id: 'deep-dive', type: 'agent', name: 'Deep Dive Analysis', agentId: 'general', prompt: 'Conduct full double materiality assessment.' },
      ],
      onFalse: [
        { id: 'summary', type: 'agent', name: 'Summary Report', agentId: 'sustainability-reporting', prompt: 'Generate executive summary of risk findings.' },
      ],
    },
  ],
}

function DashboardView({ onNav }: { onNav: (v: AppView) => void }) {
  const gatewayUrl = import.meta.env.VITE_GATEWAY_URL as string | undefined
  const live = useLiveTelemetry(gatewayUrl)

  const metrics = live.totalRequests > 0 ? live.metrics : DEMO_METRICS
  const avgScore = live.totalRequests > 0 ? live.avgScore : 74

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <SiteHeader onNav={onNav} activeView="dashboard" />
      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-app)' }}>
        <SustainabilityDashboard
          metrics={metrics}
          baselineCostUsd={0.05}
          baselineCarbonGrams={15}
          recommendations={DEMO_RECOMMENDATIONS}
          avgScore={avgScore}
        />
        <SeaBriOSPanel gatewayUrl={gatewayUrl} lastRoutingTier={live.lastRoutingTier} />
      </div>
    </div>
  )
}

function WorkflowView({ onNav }: { onNav: (v: AppView) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <SiteHeader onNav={onNav} activeView="workflow" />
      <div style={{ flex: 1, padding: '16px 24px', background: 'var(--bg-app)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Workflow Canvas</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>Visualize and edit ESG agent workflows. Drag nodes to rearrange. Connect nodes to define execution flow.</p>
        </div>
        <div style={{ flex: 1, borderRadius: 8, border: '1px solid var(--border-muted)', overflow: 'hidden' }}>
          <WorkflowCanvas
            workflow={DEMO_WORKFLOW}
            readOnly={false}
            onExport={(updated) => console.info('Workflow exported:', updated.name)}
          />
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const activeSession = useChatStore((s) => s.getActiveSession())
  const sessionCount = useChatStore((s) => s.sessions.length)
  const startSession = useChatStore((s) => s.startSession)
  const clearActiveSession = useChatStore((s) => s.clearActiveSession)
  const [view, setView] = useState<AppView>('landing')

  if (activeSession) {
    const agent = getAgent(activeSession.agentId) ?? getAgent(DEFAULT_AGENT_ID)!
    return (
      <ChatShell
        session={activeSession}
        agent={agent}
        onBack={clearActiveSession}
        onNewChat={clearActiveSession}
        onDashboard={() => { clearActiveSession(); setView('dashboard') }}
      />
    )
  }

  if (view === 'dashboard') return <DashboardView onNav={setView} />
  if (view === 'workflow') return <WorkflowView onNav={setView} />

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {sessionCount > 0 && (
        <SessionsSidebar onNewChat={clearActiveSession} />
      )}
      <div style={{ flex: 1, overflowY: 'auto', minWidth: 0, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 16, right: 20, zIndex: 1 }}>
          <ConnectionBadge sessionCount={sessionCount} />
        </div>
        <Landing
          onPick={(a) => {
            startSession(a)
          }}
          onNav={setView}
        />
      </div>
    </div>
  )
}

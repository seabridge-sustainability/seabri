import { useEffect, useLayoutEffect, useRef, useState, useCallback, lazy, Suspense } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { AGENTS, getAgent, DEFAULT_AGENT_ID } from './lib/agents'
import type { Agent, Message, Session } from './types/openseabri'
import { useChatStore } from './store/chat'
import { useCanvasStore } from './store/canvas'
import { ConnectionBadge } from './components/ConnectionBadge'
import { SessionsSidebar } from './components/SessionsSidebar'
import { CanvasPane } from './components/canvas/CanvasPane'
import { SustainabilityDashboard } from './components/sustainability-dashboard/SustainabilityDashboard.js'
import { SeaBriOSPanel } from './components/sustainability-dashboard/SeaBriOSPanel.js'
import { useLiveTelemetry } from './hooks/useLiveTelemetry.js'
import type { WorkflowDefinition } from '../gateway/workflows/schema.js'
import { ClaimCockpit } from './components/claim/ClaimCockpit.js'
import { VoiceButton } from './components/claim/VoiceButton.js'
import type { RawAttachment } from './lib/anthropic.js'
import {
  addPilotActivity,
  buildProfileLocation,
  emptyPilotState,
  isProfileReady,
  pilotIncidentPrompt,
  profilePayload,
  type PilotActivity,
  type PilotProfile,
  type PilotState,
} from './lib/pilot.js'

import remarkGfm from 'remark-gfm'
const LazyReactMarkdown = lazy(() => import('react-markdown'))
const LazyWorkflowCanvas = lazy(() => import('./components/workflow-canvas/WorkflowCanvas.js').then(m => ({ default: m.WorkflowCanvas })))

type AppView = 'landing' | 'dashboard' | 'workflow' | 'claim' | 'demos'

function SeabriMascot() {
  return (
    <img
      src="/img/seabri-mascot.png"
      alt="Seabri"
      style={{ width: 340, height: 340, objectFit: 'contain', position: 'relative', zIndex: 1 }}
    />
  )
}

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY ?? ''
const GATEWAY_URL = (import.meta.env.VITE_GATEWAY_URL as string | undefined) ?? ''
const GATEWAY_API_KEY = (import.meta.env.VITE_OPENSEABRI_API_KEY as string | undefined) ?? ''

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
        background: 'rgba(240, 245, 252, 0.92)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 22 }}>🌱</span>
        <span
          style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 20, letterSpacing: '-0.02em', color: 'var(--sb-navy)', cursor: 'pointer' }}
          onClick={() => onNav?.('landing')}
        >
          Seabri
        </span>
        <span style={{ fontSize: 11, color: 'var(--accent-green-2)', border: '1px solid var(--accent-green)', padding: '2px 8px', borderRadius: 999, letterSpacing: '0.08em', textTransform: 'uppercase', marginLeft: 8 }}>
          Free &amp; Open Source
        </span>
      </div>
      <div style={{ display: 'flex', gap: 24, fontSize: 14, alignItems: 'center' }}>
        {navLink('Specialists', 'landing', '#specialists')}
        {navLink('Dashboard', 'dashboard')}
        {navLink('Workflows', 'workflow')}
        {navLink('Demos', 'demos')}
        {navLink('File a Claim', 'claim')}
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
          Free · Open Source · For Everyone
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
            fontSize: 'clamp(38px, 5.5vw, 66px)',
            lineHeight: 1.08,
            letterSpacing: '-0.03em',
            color: 'var(--sb-navy)',
            margin: 0,
          }}
        >
          Sustainability intelligence<br />
          for <span style={{ color: 'var(--accent-green-2)' }}>everyone.</span>
        </h1>
        <p
          style={{
            fontSize: 'clamp(16px, 1.4vw, 18px)',
            color: 'var(--text-muted)',
            lineHeight: 1.65,
            maxWidth: 540,
            marginTop: 24,
          }}
        >
          Seabri is a free, open-source sustainability AI for individuals, homeowners,
          farmers, small businesses, and communities. Understand flood, wildfire, heat,
          drought, insurance, and nature risk — in plain language, not consultant-speak.
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
          {[
            { emoji: '🏠', label: 'Homeowners' },
            { emoji: '🌾', label: 'Farmers' },
            { emoji: '🏪', label: 'Small business' },
            { emoji: '🌍', label: 'Communities' },
          ].map(({ emoji, label }) => (
            <span
              key={label}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--text-muted)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-muted)',
                borderRadius: 999,
                padding: '4px 10px',
              }}
            >
              {emoji} {label}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
          <a
            href="#specialists"
            style={{
              background: 'var(--accent-green)',
              color: '#fff',
              fontWeight: 600,
              padding: '13px 24px',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              fontSize: 15,
            }}
          >
            Talk to a specialist →
          </a>
          <a
            href="https://github.com/seabridge-sustainability"
            target="_blank"
            rel="noreferrer"
            style={{
              border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)',
              fontWeight: 500,
              padding: '13px 24px',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              fontSize: 15,
            }}
          >
            View on GitHub
          </a>
        </div>
      </div>
      {/* Hero illustration — smiley face iterations */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div
          style={{
            position: 'absolute',
            inset: '-10% -10% -10% -10%',
            background: 'radial-gradient(circle at 50% 50%, rgba(113,202,205,0.22), transparent 65%)',
            filter: 'blur(40px)',
            zIndex: 0,
          }}
        />
        <SeabriMascot />
      </div>
    </section>
  )
}

function SpecialistsSection({ onPick }: { onPick: (agent: Agent) => void }) {
  return (
    <section id="specialists" style={{ padding: '32px 32px 72px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 10 }}>
          Free specialists
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 500, letterSpacing: '-0.03em', color: 'var(--sb-navy)', margin: 0 }}>
          One question. The right specialist.
        </h2>
        <p style={{ fontSize: 15, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.6, maxWidth: 540 }}>
          Pick a topic and start talking. Each specialist understands your situation and speaks in plain language — no jargon, no consultant fees.
        </p>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16,
        alignItems: 'stretch',
      }}>
        {AGENTS.map((a) => (
          <button
            key={a.id}
            onClick={() => onPick(a)}
            style={{
              background: '#fff',
              border: '1px solid var(--sb-slate-200)',
              borderTop: `3px solid ${a.color}`,
              borderRadius: 8,
              padding: '20px 20px 18px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'box-shadow 140ms var(--ease-standard), transform 140ms var(--ease-standard)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = 'var(--shadow-3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'var(--shadow-1)'
            }}
          >
            <span style={{ fontSize: 22, display: 'block', marginBottom: 10 }}>{a.icon}</span>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 15,
              fontWeight: 500,
              color: 'var(--sb-navy)',
              letterSpacing: '-0.015em',
              lineHeight: 1.2,
              marginBottom: 6,
            }}>{a.name}</div>
            <div style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              color: 'var(--sb-slate-500)',
              lineHeight: 1.5,
              marginTop: 'auto',
            }}>{a.tagline}</div>
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
        <span style={{ fontSize: 16 }}>🌱</span>
        <span>Seabri · Free sustainability intelligence for everyone · MIT licensed</span>
      </div>
      <div>Built on SeaBridge · Open source forever</div>
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
        border: '1px solid var(--sb-signal-risk, #B1454A)',
        background: 'rgba(177, 69, 74, 0.06)',
        borderRadius: 'var(--radius-md)',
        padding: 16,
        color: 'var(--sb-signal-risk, #B1454A)',
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--sb-signal-risk, #B1454A)' }}>API key not configured</div>
      Set <code style={{ fontFamily: 'var(--font-mono)' }}>VITE_ANTHROPIC_API_KEY</code> in{' '}
      <code style={{ fontFamily: 'var(--font-mono)' }}>.env.local</code> and restart the dev server to enable streaming chat.
    </div>
  )
}

const mdComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p style={{ margin: '0 0 8px', lineHeight: 1.6 }}>{children}</p>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 style={{ fontSize: 18, fontWeight: 700, margin: '12px 0 6px' }}>{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 style={{ fontSize: 16, fontWeight: 700, margin: '10px 0 4px' }}>{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 style={{ fontSize: 14, fontWeight: 700, margin: '8px 0 4px' }}>{children}</h3>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul style={{ margin: '4px 0 8px', paddingLeft: 20 }}>{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol style={{ margin: '4px 0 8px', paddingLeft: 20 }}>{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li style={{ marginBottom: 2 }}>{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em style={{ fontStyle: 'italic' }}>{children}</em>
  ),
  code: ({ inline, children }: { inline?: boolean; children?: React.ReactNode }) =>
    inline ? (
      <code style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-muted)',
        borderRadius: 4,
        padding: '1px 5px',
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
      }}>{children}</code>
    ) : (
      <pre style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-muted)',
        borderRadius: 6,
        padding: '10px 12px',
        overflowX: 'auto',
        margin: '6px 0',
      }}>
        <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{children}</code>
      </pre>
    ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div style={{ overflowX: 'auto', margin: '8px 0' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead style={{ background: 'var(--bg-surface)' }}>{children}</thead>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th style={{ border: '1px solid var(--border-muted)', padding: '6px 10px', textAlign: 'left', fontWeight: 600 }}>{children}</th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td style={{ border: '1px solid var(--border-muted)', padding: '5px 10px' }}>{children}</td>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote style={{
      borderLeft: '3px solid var(--border-default)',
      margin: '6px 0',
      paddingLeft: 12,
      color: 'var(--text-faint)',
      fontStyle: 'italic',
    }}>{children}</blockquote>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--sb-signal-risk, #4a90d9)', textDecoration: 'underline' }}>{children}</a>
  ),
}

function ActionCardBanner({
  cards,
  gatewayUrl,
}: {
  cards: import('./store/chat').ActionCard[]
  gatewayUrl: string
}) {
  const resolveApproval = useChatStore((s) => s.resolveApproval)
  const isStreaming = useChatStore((s) => s.isStreaming)
  if (cards.length === 0) return null

  const kindLabel: Record<string, string> = {
    outbound_call: '📞 Outbound Call',
    send_sms: '💬 Send SMS',
    send_email: '📧 Send Email',
    send_whatsapp: '💚 WhatsApp',
    document_damage: '📋 Damage Report',
    schedule_appointment: '📅 Schedule',
    notify_emergency: '🚨 Emergency Alert',
    general: '✅ Action',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
      {cards.map((card) => (
        <div
          key={card.id}
          style={{
            border: '1px solid var(--sb-signal-risk, #B1454A)',
            background: 'rgba(177, 69, 74, 0.06)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--sb-signal-risk, #B1454A)', marginBottom: 8 }}>
            {kindLabel[card.kind] ?? '⚡ Action Required'} — confirm before executing
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12, whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {card.card.slice(0, 400)}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              disabled={isStreaming}
              onClick={() => resolveApproval(card.id, true, gatewayUrl)}
              style={{
                background: 'var(--sb-signal-low, #27AE60)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: '8px 20px',
                cursor: isStreaming ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: 13,
                opacity: isStreaming ? 0.5 : 1,
              }}
            >
              YES — Execute
            </button>
            <button
              disabled={isStreaming}
              onClick={() => resolveApproval(card.id, false, gatewayUrl)}
              style={{
                background: 'var(--sb-signal-risk, #B1454A)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: '8px 20px',
                cursor: isStreaming ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: 13,
                opacity: isStreaming ? 0.5 : 1,
              }}
            >
              NO — Cancel
            </button>
          </div>
        </div>
      ))}
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
          wordBreak: 'break-word',
        }}
      >
        {isUser ? (
          <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
        ) : msg.content ? (
          <>
            <Suspense fallback={<span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>}>
              <LazyReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents as never}>
                {msg.content}
              </LazyReactMarkdown>
            </Suspense>
            {streaming && <span style={{ opacity: 0.6, marginLeft: 2 }}>▍</span>}
          </>
        ) : (
          streaming ? <span style={{ opacity: 0.6 }}>…</span> : ''
        )}
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

interface PendingFile {
  id: string
  name: string
  mime: string
  kind: 'image' | 'document' | 'file'
  data: string // base64
  preview?: string // object URL for images
}

function Composer({ onSend, disabled, streaming, onAbort }: {
  onSend: (text: string, attachments: RawAttachment[]) => void
  disabled: boolean
  streaming: boolean
  onAbort: () => void
}) {
  const [value, setValue] = useState('')
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [voiceActive, setVoiceActive] = useState(false)
  const ref = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [value])

  const submit = (): void => {
    const t = value.trim()
    if ((!t && pendingFiles.length === 0) || disabled) return
    const atts: RawAttachment[] = pendingFiles.map(f => ({ kind: f.kind, mime: f.mime, name: f.name, data: f.data }))
    onSend(t, atts)
    setValue('')
    setPendingFiles(f => {
      f.forEach(p => { if (p.preview) URL.revokeObjectURL(p.preview) })
      return []
    })
  }

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        const base64 = result.split(',')[1]
        const kind: PendingFile['kind'] = file.type.startsWith('image/') ? 'image'
          : file.type === 'application/pdf' ? 'document' : 'file'
        const preview = kind === 'image' ? URL.createObjectURL(file) : undefined
        setPendingFiles(prev => [...prev, {
          id: `${Date.now()}-${Math.random()}`,
          name: file.name,
          mime: file.type,
          kind,
          data: base64,
          preview,
        }])
      }
      reader.readAsDataURL(file)
    })
  }, [])

  const removeFile = (id: string) => {
    setPendingFiles(prev => {
      const f = prev.find(p => p.id === id)
      if (f?.preview) URL.revokeObjectURL(f.preview)
      return prev.filter(p => p.id !== id)
    })
  }

  const handleVoiceTranscript = useCallback((text: string) => {
    setValue(v => v ? `${v} ${text}` : text)
  }, [])

  const canSend = (value.trim() || pendingFiles.length > 0) && !disabled

  return (
    <div style={{ borderTop: '1px solid var(--border-default)', padding: '12px 16px', background: 'var(--bg-app)' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        {/* Attachment preview strip */}
        {pendingFiles.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            {pendingFiles.map(f => (
              <div
                key={f.id}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-muted)',
                  borderRadius: 8,
                  padding: f.preview ? 4 : '6px 10px',
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  maxWidth: 200,
                }}
              >
                {f.preview ? (
                  <img src={f.preview} alt={f.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />
                ) : (
                  <span style={{ fontSize: 18 }}>{f.kind === 'document' ? '📄' : '📎'}</span>
                )}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>{f.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(f.id)}
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: 'var(--sb-slate-500)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 10,
                    lineHeight: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input row */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'flex-end',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-muted)',
            borderRadius: 'var(--radius-lg)',
            padding: 8,
          }}
        >
          {/* Attachment button */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf,audio/*,video/*"
            style={{ display: 'none' }}
            onChange={e => handleFiles(e.target.files)}
            onClick={e => { (e.target as HTMLInputElement).value = '' }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            title="Attach file"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: '1px solid var(--border-muted)',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              opacity: disabled ? 0.5 : 1,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>

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
            onPaste={(e) => {
              const items = Array.from(e.clipboardData.items)
              const imageItem = items.find(i => i.type.startsWith('image/'))
              if (imageItem) {
                e.preventDefault()
                const file = imageItem.getAsFile()
                if (file) {
                  const dt = new DataTransfer()
                  dt.items.add(file)
                  handleFiles(dt.files)
                }
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
              padding: '6px 8px',
              fontFamily: 'var(--font-sans)',
              maxHeight: 200,
            }}
          />

          {/* Voice button */}
          <VoiceButton
            active={voiceActive}
            onToggle={() => setVoiceActive(v => !v)}
            onTranscript={handleVoiceTranscript}
            disabled={disabled}
          />

          {streaming ? (
            <button
              type="button"
              onClick={onAbort}
              style={{
                background: 'rgba(177, 69, 74, 0.12)',
                border: '1px solid var(--sb-signal-risk, #B1454A)',
                borderRadius: 'var(--radius-md)',
                padding: '8px 14px',
                color: 'var(--sb-signal-risk, #B1454A)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!canSend}
              style={{
                background: canSend ? 'var(--accent-green)' : 'var(--bg-surface-hover)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: '8px 14px',
                color: canSend ? '#fff' : 'var(--text-faint)',
                cursor: canSend ? 'pointer' : 'not-allowed',
                fontSize: 13,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              Send
            </button>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 6, textAlign: 'center' }}>
          Attach images or PDFs · Paste from clipboard · Press mic to speak
        </div>
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
  const pendingApprovals = useChatStore((s) => s.pendingApprovals)
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
  const hasKey = Boolean(API_KEY) || Boolean(GATEWAY_URL)

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
                border: '1px solid var(--sb-signal-risk, #B1454A)',
                background: 'rgba(177, 69, 74, 0.06)',
                borderRadius: 'var(--radius-md)',
                padding: 12,
                color: 'var(--sb-signal-risk, #B1454A)',
                fontSize: 13,
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <span>{apiError}</span>
              <button
                onClick={clearError}
                style={{ background: 'transparent', border: 'none', color: 'var(--sb-signal-risk, #B1454A)', cursor: 'pointer', fontSize: 13 }}
              >
                dismiss
              </button>
            </div>
          )}

          {session.messages.length === 0 ? (
            <StarterChips agent={agent} onPick={(q) => sendMessage(q, API_KEY, GATEWAY_URL || undefined)} />
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

      {GATEWAY_URL && pendingApprovals.length > 0 && (
        <div style={{ padding: '0 16px 8px' }}>
          <ActionCardBanner cards={pendingApprovals} gatewayUrl={GATEWAY_URL} />
        </div>
      )}
      <Composer
        onSend={(t, atts) => sendMessage(t, API_KEY, GATEWAY_URL || undefined, atts)}
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

function ClaimView({ onNav }: { onNav: (v: AppView) => void }) {
  const gatewayUrl = (import.meta.env.VITE_GATEWAY_URL as string | undefined) ?? 'http://localhost:3001'
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const role = params.get('role') === 'adjuster' ? 'adjuster' : 'claimant'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <SiteHeader onNav={onNav} activeView="claim" />
      <div style={{ flex: 1, overflow: 'hidden', background: 'var(--bg-app)' }}>
        <ClaimCockpit gatewayUrl={gatewayUrl} initialRole={role} />
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
          <Suspense fallback={<div style={{ padding: 24, color: 'var(--text-muted)' }}>Loading workflow canvas...</div>}>
            <LazyWorkflowCanvas
              workflow={DEMO_WORKFLOW}
              readOnly={false}
              onExport={(updated) => console.info('Workflow exported:', updated.name)}
            />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

const PILOT_STATE_KEY = 'openseabri.pilot.state.v1'

type PilotTab = 'living' | 'comparison' | 'carbon' | 'energy' | 'community' | 'certification' | 'offset' | 'purchasing' | 'resilience' | 'compute' | 'catalog'

const panelStyle: CSSProperties = {
  border: '1px solid var(--border-muted)',
  borderRadius: 8,
  background: 'var(--bg-surface)',
  padding: 16,
}

const inputStyle: CSSProperties = {
  width: '100%',
  border: '1px solid var(--border-muted)',
  borderRadius: 8,
  padding: '9px 10px',
  background: '#fff',
  color: 'var(--text-primary)',
  fontSize: 13,
  boxSizing: 'border-box',
}

function WorkflowButton({ children, onClick, disabled = false }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        border: '1px solid var(--border-default)',
        background: disabled ? 'var(--bg-app)' : 'var(--accent-green)',
        color: disabled ? 'var(--text-faint)' : '#fff',
        borderRadius: 8,
        padding: '9px 12px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 600,
        fontSize: 13,
      }}
    >
      {children}
    </button>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5, color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>
      {label}
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
    </label>
  )
}

function ResultBox({ title, value }: { title: string; value?: string }) {
  let parsed: Record<string, unknown> | null = null
  try {
    parsed = value ? JSON.parse(value) as Record<string, unknown> : null
  } catch {
    parsed = null
  }
  const list = (key: string): string[] => Array.isArray(parsed?.[key]) ? (parsed[key] as unknown[]).map((x) => typeof x === 'string' ? x : JSON.stringify(x)) : []
  const unknowns = list('unknowns')
  const assumptions = list('assumptions')
  const actions = [
    ...list('reductionActions'),
    ...list('noCostActions'),
    ...list('buyingChecklist'),
    ...list('preparednessChecklist'),
    ...list('nextSteps'),
  ].slice(0, 5)
  return (
    <section style={{ ...panelStyle, minHeight: 120 }}>
      <h4 style={{ margin: '0 0 8px', color: 'var(--sb-navy)', fontSize: 14 }}>{title}</h4>
      {!value ? (
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>No result yet. Start with your profile or try a safe scenario.</p>
      ) : parsed ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {typeof parsed.summary === 'string' && <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.5 }}>{parsed.summary}</p>}
          {actions.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>Next actions</div>
              <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.45 }}>
                {actions.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
            <div style={{ border: '1px solid var(--border-muted)', borderRadius: 8, padding: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase' }}>Confidence</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{String(parsed.confidence ?? 'n/a')}</div>
            </div>
            <div style={{ border: '1px solid var(--border-muted)', borderRadius: 8, padding: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase' }}>Unknowns</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{unknowns.length ? unknowns.join(', ') : 'none listed'}</div>
            </div>
          </div>
          {assumptions.length > 0 && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Assumptions: {assumptions.join(' ')}</div>}
          <details>
            <summary style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12 }}>Structured details</summary>
            <pre style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--text-secondary)', fontSize: 11, lineHeight: 1.5, maxHeight: 240, overflow: 'auto' }}>{value}</pre>
          </details>
        </div>
      ) : (
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.5, maxHeight: 300, overflow: 'auto' }}>
          {value}
        </pre>
      )}
    </section>
  )
}

function ActivityPanel({ activity }: { activity: PilotActivity[] }) {
  return (
    <section style={panelStyle} aria-label="Recent activity">
      <h3 style={{ margin: 0, color: 'var(--sb-navy)', fontSize: 16 }}>Recent activity</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
        {activity.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>Run a workflow to build pilot history.</p>
        ) : activity.map((item) => (
          <div key={item.id} style={{ borderLeft: '3px solid var(--accent-green)', paddingLeft: 10 }}>
            <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 700 }}>{item.title}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.4 }}>{item.detail}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function DemosView({ onNav }: { onNav: (v: AppView) => void }) {
  const [tab, setTab] = useState<PilotTab>('living')
  const [state, setState] = useState<PilotState>(() => {
    try {
      const raw = localStorage.getItem(PILOT_STATE_KEY)
      return raw ? { ...emptyPilotState(), ...JSON.parse(raw) } : emptyPilotState()
    } catch {
      return emptyPilotState()
    }
  })
  const [status, setStatus] = useState('')
  const [incidentChoice, setIncidentChoice] = useState('My bathroom is flooding')
  const [mediaName, setMediaName] = useState('')
  const [resourceCategory, setResourceCategory] = useState('water_mitigation')
  const [products, setProducts] = useState([
    { name: 'Durable steel bottle', cost: '28', durable: true, repairable: true, minimalPackaging: true, certifications: '' },
    { name: 'Disposable plastic bottle pack', cost: '7', durable: false, repairable: false, minimalPackaging: false, certifications: '' },
  ])
  const [priorities, setPriorities] = useState(['durability', 'packaging'])
  const [computeForm, setComputeForm] = useState({
    workflow_name: 'daily incident triage',
    task_type: 'classification',
    current_model: 'claude-opus-4-6',
    estimated_tokens: '8000',
    latency_priority: 'medium',
    cost_priority: 'high',
    privacy_priority: 'medium',
    sustainability_priority: 'high',
    repeated_task: true,
    cacheable: true,
    batchable: true,
  })
  const [carbonForm, setCarbonForm] = useState({ householdSize: '3', monthlyElectricityKwh: '800', vehicleMiles: '120', dietPattern: 'average' })
  const [energyForm, setEnergyForm] = useState({ homeType: 'single_family', monthlyBillUsd: '220', heatingCoolingType: 'central AC and gas heat', budgetLevel: 'low' })
  const [communityForm, setCommunityForm] = useState({ organizationType: 'school', goal: 'plan a community cleanup', timeline: 'one month', budgetUsd: '500', volunteers: '20' })
  const [certificationForm, setCertificationForm] = useState({ userType: 'small_business', goal: 'reduce energy use and prepare ESG documents', budgetLevel: 'low' })
  const [offsetForm, setOffsetForm] = useState({ projectName: 'Forest offset option', projectType: 'forest', registry: '', pricePerTonUsd: '2' })
  const [purchasingForm, setPurchasingForm] = useState({ productCategory: 'backpack', budgetUsd: '80', durabilityNeed: 'high', repairabilityPreference: 'high' })
  const [resilienceForm, setResilienceForm] = useState({ communityType: 'neighborhood', hazards: 'flood, heat', volunteers: '8', vulnerableGroups: 'older adults, renters' })
  const base = GATEWAY_URL.replace(/\/+$/, '')
  const profile = state.profile

  useEffect(() => {
    localStorage.setItem(PILOT_STATE_KEY, JSON.stringify(state))
  }, [state])

  const pushActivity = (activity: Omit<PilotActivity, 'id' | 'timestamp'>, extra?: Partial<PilotState>) => {
    setState((current) => ({ ...addPilotActivity(current, activity), ...extra }))
  }

  const updateProfile = (updates: Partial<PilotProfile>) => {
    setState((current) => ({ ...current, profile: { ...current.profile, ...updates } }))
  }

  const callGateway = async <T,>(path: string, body?: unknown, method = 'POST'): Promise<T> => {
    if (!base) throw new Error('Set VITE_GATEWAY_URL to call the local gateway.')
    if (!GATEWAY_API_KEY) throw new Error('Set VITE_OPENSEABRI_API_KEY for authenticated pilot calls.')
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { 'content-type': 'application/json', 'x-openseabri-key': GATEWAY_API_KEY },
      body: body ? JSON.stringify(body) : undefined,
    })
    const json = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    if (!res.ok) throw new Error(typeof json.error === 'string' ? json.error : 'Request failed safely.')
    return json as T
  }

  const saveProfile = async () => {
    const payload = profilePayload(profile)
    try {
      if (base && GATEWAY_API_KEY) await callGateway('/api/seabri/profile', payload)
      setStatus(base && GATEWAY_API_KEY ? 'Profile saved to the pilot gateway.' : 'Profile saved locally. Configure gateway env to sync.')
      pushActivity({ workflow: 'profile', title: 'Profile updated', detail: 'Pilot profile saved for workflow continuity.' })
    } catch {
      setStatus('Profile stayed local because the gateway returned a safe error.')
      pushActivity({ workflow: 'profile', title: 'Profile saved locally', detail: 'Gateway sync unavailable; no profile details logged.' })
    }
  }

  const deleteProfile = async () => {
    try {
      if (base && GATEWAY_API_KEY) {
        await callGateway(`/api/seabri/profile?userId=${encodeURIComponent(profile.userId)}&channel=web`, undefined, 'DELETE')
      }
    } catch {
      // Local deletion still succeeds; do not expose gateway details.
    }
    setState({ ...emptyPilotState(), activity: addPilotActivity(emptyPilotState(), { workflow: 'profile', title: 'Profile deleted', detail: 'Pilot profile removed from this browser.' }).activity })
    setStatus('Profile deleted from this browser and delete was attempted on the gateway when configured.')
  }

  const runIncident = async () => {
    const message = pilotIncidentPrompt(incidentChoice, mediaName)
    try {
      const incident = await callGateway<Record<string, unknown>>('/api/seabri/living-companion/incident', {
        message,
        profile: profilePayload(profile),
      })
      const location = buildProfileLocation(profile) || profile.zip
      let localHelp = 'Local help not searched because address or ZIP is missing.'
      let actionPlan = typeof incident.response === 'string' ? incident.response : JSON.stringify(incident, null, 2)
      if (location) {
        const resources = await callGateway<Record<string, unknown>>('/api/seabri/living-companion/local-resources', {
          category: resourceCategory,
          location,
        })
        localHelp = JSON.stringify(resources, null, 2)
        const first = Array.isArray(resources.resources) ? resources.resources[0] : null
        if (first) {
          const card = await callGateway<{ actionCard: string }>('/api/seabri/living-companion/local-resources/action-card', { resource: first })
          actionPlan = `${actionPlan}\n\nLOCAL HELP\n${localHelp}\n\nAPPROVAL CARD\n${card.actionCard}`
          pushActivity({ workflow: 'action', title: 'Action card prepared', detail: 'Approval required before any outbound contact.' })
        }
      }
      pushActivity(
        { workflow: 'incident', title: 'Incident workflow run', detail: `${incidentChoice}; local help source checked without live outreach.` },
        { lastIncident: actionPlan, lastActionPlan: actionPlan },
      )
      setStatus('Incident workflow completed. No outbound calls or messages were sent.')
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Incident workflow unavailable.'
      setStatus(detail)
      pushActivity({ workflow: 'incident', title: 'Incident fallback shown', detail: 'Provider unavailable fallback returned safely.' }, { lastIncident: detail })
    }
  }

  const runComparison = async () => {
    try {
      const body = {
        products: products.map((p) => ({
          name: p.name,
          attributes: {
            cost: p.cost ? Number(p.cost) : undefined,
            durable: p.durable,
            repairable: p.repairable,
            minimalPackaging: p.minimalPackaging,
            certifications: p.certifications.split(',').map((c) => c.trim()).filter(Boolean),
          },
        })),
        priorities,
      }
      const result = await callGateway<Record<string, unknown>>('/api/seabri/living-companion/product-comparison', body)
      const text = JSON.stringify(result, null, 2)
      pushActivity({ workflow: 'comparison', title: 'Product comparison run', detail: `${products.length} products compared; unknowns preserved.` }, { lastComparison: text })
      setStatus('Product comparison completed with transparent assumptions.')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Product comparison unavailable.')
    }
  }

  const preferredLanguage = profile.preferredLanguage || 'English'

  const runCarbon = async () => {
    try {
      const result = await callGateway<Record<string, unknown>>('/api/seabri/living-companion/household-carbon-footprint', {
        householdSize: Number(carbonForm.householdSize),
        zip: profile.zip || undefined,
        monthlyElectricityKwh: Number(carbonForm.monthlyElectricityKwh),
        vehicles: [{ milesPerWeek: Number(carbonForm.vehicleMiles), fuel: 'gasoline' }],
        dietPattern: carbonForm.dietPattern,
        preferredLanguage,
      })
      const text = JSON.stringify(result, null, 2)
      pushActivity({ workflow: 'carbon', title: 'Carbon footprint estimated', detail: 'Household emissions range generated with broad assumptions.' }, { lastCarbon: text })
      setStatus('Household carbon footprint estimated without fake precision.')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Carbon footprint estimator unavailable.')
    }
  }

  const runEnergy = async () => {
    try {
      const result = await callGateway<Record<string, unknown>>('/api/seabri/living-companion/home-energy-plan', {
        homeType: energyForm.homeType,
        zip: profile.zip || undefined,
        heatingCoolingType: energyForm.heatingCoolingType,
        monthlyBillUsd: Number(energyForm.monthlyBillUsd),
        knownIssues: ['high bill'],
        budgetLevel: energyForm.budgetLevel,
        preferredLanguage,
      })
      const text = JSON.stringify(result, null, 2)
      pushActivity({ workflow: 'energy', title: 'Home energy plan created', detail: 'No-cost, low-cost, and upgrade actions generated.' }, { lastEnergy: text })
      setStatus('Home energy action plan completed.')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Home energy planner unavailable.')
    }
  }

  const runCommunity = async () => {
    try {
      const result = await callGateway<Record<string, unknown>>('/api/seabri/living-companion/community-project-plan', {
        organizationType: communityForm.organizationType,
        goal: communityForm.goal,
        location: profile.city || profile.zip || undefined,
        timeline: communityForm.timeline,
        budgetUsd: Number(communityForm.budgetUsd),
        volunteers: Number(communityForm.volunteers),
        stakeholders: ['school staff', 'neighbors'],
        preferredLanguage,
      })
      const text = JSON.stringify(result, null, 2)
      pushActivity({ workflow: 'community', title: 'Community project planned', detail: 'Stakeholders, grants, permits, volunteer tasks, and metrics generated.' }, { lastCommunity: text })
      setStatus('Community sustainability project plan completed.')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Community planner unavailable.')
    }
  }

  const runCertification = async () => {
    try {
      const result = await callGateway<Record<string, unknown>>('/api/seabri/living-companion/certification-navigator', {
        userType: certificationForm.userType,
        goal: certificationForm.goal,
        location: profile.city || profile.zip || undefined,
        budgetLevel: certificationForm.budgetLevel,
        documentationReady: false,
        preferredLanguage,
      })
      const text = JSON.stringify(result, null, 2)
      pushActivity({ workflow: 'certification', title: 'Certification path checked', detail: 'Fit, documents, complexity, and next steps generated without approval claims.' }, { lastCertification: text })
      setStatus('Certification navigator completed without inventing eligibility.')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Certification navigator unavailable.')
    }
  }

  const runOffset = async () => {
    try {
      const result = await callGateway<Record<string, unknown>>('/api/seabri/living-companion/carbon-offset-checker', {
        projectName: offsetForm.projectName,
        projectType: offsetForm.projectType,
        registry: offsetForm.registry || undefined,
        pricePerTonUsd: Number(offsetForm.pricePerTonUsd),
        preferredLanguage,
      })
      const text = JSON.stringify(result, null, 2)
      pushActivity({ workflow: 'offset', title: 'Offset quality checked', detail: 'Greenwashing risk and verification questions generated.' }, { lastOffset: text })
      setStatus('Carbon offset quality check completed without inventing verification status.')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Offset checker unavailable.')
    }
  }

  const runPurchasing = async () => {
    try {
      const result = await callGateway<Record<string, unknown>>('/api/seabri/living-companion/sustainable-purchasing-checklist', {
        productCategory: purchasingForm.productCategory,
        budgetUsd: Number(purchasingForm.budgetUsd),
        durabilityNeed: purchasingForm.durabilityNeed,
        repairabilityPreference: purchasingForm.repairabilityPreference,
        preferredLanguage,
      })
      const text = JSON.stringify(result, null, 2)
      pushActivity({ workflow: 'purchasing', title: 'Purchasing checklist built', detail: 'Buying criteria, red flags, alternatives, and end-of-life questions generated.' }, { lastPurchasing: text })
      setStatus('Sustainable purchasing checklist completed without inventing certifications.')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Purchasing checklist unavailable.')
    }
  }

  const runResilience = async () => {
    try {
      const result = await callGateway<Record<string, unknown>>('/api/seabri/living-companion/community-resilience-checklist', {
        communityType: resilienceForm.communityType,
        hazards: resilienceForm.hazards.split(',').map((h) => h.trim()).filter(Boolean),
        vulnerableGroups: resilienceForm.vulnerableGroups.split(',').map((g) => g.trim()).filter(Boolean),
        volunteers: Number(resilienceForm.volunteers),
        preferredLanguage,
      })
      const text = JSON.stringify(result, null, 2)
      pushActivity({ workflow: 'resilience', title: 'Resilience checklist built', detail: 'Preparedness, communication, partner categories, supplies, and drill plan generated.' }, { lastResilience: text })
      setStatus('Community resilience checklist completed without fake partner names.')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Resilience checklist unavailable.')
    }
  }

  const loadCatalog = async () => {
    try {
      const snapshot = await callGateway<{ snapshot: { counts: Record<string, number>; tools: Array<Record<string, unknown>>; agents: unknown[]; skills: unknown[]; mcp: unknown[] } }>('/api/seabri/registry-snapshot', undefined, 'GET')
      const safeTools = snapshot.snapshot.tools.map((tool) => ({
        name: tool.name,
        status: tool.status,
        invocationSurfaces: tool.invocationSurfaces,
        sustainabilityRelevance: tool.sustainabilityRelevance,
      }))
      const text = JSON.stringify({ counts: snapshot.snapshot.counts, tools: safeTools.slice(0, 40) }, null, 2)
      pushActivity({ workflow: 'catalog', title: 'Skills & Tools catalog loaded', detail: 'Sanitized registry snapshot loaded without profile or secrets.' }, { lastCatalog: text })
      setStatus('Skills & Tools catalog loaded from sanitized registry snapshot.')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Skills & Tools catalog unavailable.')
    }
  }

  const runCompute = async () => {
    try {
      const result = await callGateway<Record<string, unknown>>('/api/seabri/harness/optimize-sustainable-compute', {
        ...computeForm,
        estimated_tokens: Number(computeForm.estimated_tokens),
      })
      const text = JSON.stringify(result, null, 2)
      pushActivity({ workflow: 'compute', title: 'Compute optimization run', detail: 'Model routing and sustainability recommendations generated.' }, { lastCompute: text })
      setStatus('Sustainable compute optimization completed and telemetry was requested.')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Compute optimizer unavailable.')
    }
  }

  const tabButton = (id: PilotTab, label: string) => (
    <button
      key={id}
      onClick={() => setTab(id)}
      style={{
        border: '1px solid var(--border-muted)',
        background: tab === id ? 'var(--sb-navy)' : '#fff',
        color: tab === id ? '#fff' : 'var(--text-secondary)',
        borderRadius: 8,
        padding: '9px 12px',
        cursor: 'pointer',
        fontWeight: 700,
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-app)' }}>
      <SiteHeader onNav={onNav} activeView="demos" />
      <main style={{ width: 'min(1180px, calc(100% - 32px))', margin: '0 auto', padding: '24px 0 48px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, color: 'var(--sb-navy)', fontSize: 24 }}>OpenSeaBri Pilot Workspace</h2>
            <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 14, maxWidth: 720 }}>
              Guided Living Companion and Agent Harness workflows with profile continuity, action history, approval gates, and live providers disabled by default.
            </p>
          </div>
          <span style={{ border: '1px solid var(--border-muted)', borderRadius: 999, padding: '6px 10px', color: 'var(--text-muted)', fontSize: 12 }}>
            {isProfileReady(profile) ? 'Profile ready' : 'Profile needed'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 330px) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <section style={panelStyle} aria-label="Pilot profile">
              <h3 style={{ margin: 0, color: 'var(--sb-navy)', fontSize: 16 }}>Profile onboarding</h3>
              <p style={{ margin: '6px 0 12px', color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.5 }}>
                Used for local help and incident continuity. Phone is only used when you approve an outbound action.
              </p>
              <div style={{ display: 'grid', gap: 9 }}>
                <Field label="Name" value={profile.name} onChange={(name) => updateProfile({ name })} />
                <Field label="Street address" value={profile.address} onChange={(address) => updateProfile({ address })} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 72px', gap: 8 }}>
                  <Field label="City" value={profile.city} onChange={(city) => updateProfile({ city })} />
                  <Field label="State" value={profile.state} onChange={(state) => updateProfile({ state })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <Field label="ZIP" value={profile.zip} onChange={(zip) => updateProfile({ zip })} />
                  <Field label="Phone" value={profile.phone} onChange={(phone) => updateProfile({ phone })} />
                </div>
                <Field label="Preferred language" value={profile.preferredLanguage} onChange={(preferredLanguage) => updateProfile({ preferredLanguage })} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <WorkflowButton onClick={saveProfile}>Save profile</WorkflowButton>
                <button onClick={deleteProfile} style={{ border: '1px solid var(--border-muted)', background: '#fff', color: 'var(--text-secondary)', borderRadius: 8, padding: '9px 12px', cursor: 'pointer', fontWeight: 600 }}>
                  Delete profile
                </button>
              </div>
            </section>
            <ActivityPanel activity={state.activity} />
          </aside>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gap: 10 }}>
              {[
                ['Living Companion', [['living', 'Incident Help']]],
                ['Personal Sustainability', [['comparison', 'Product Comparison'], ['carbon', 'Carbon Footprint'], ['energy', 'Home Energy'], ['certification', 'Certification'], ['offset', 'Offset Checker'], ['purchasing', 'Purchasing']]],
                ['Community & NGO Tools', [['community', 'Project Planner'], ['resilience', 'Resilience']]],
                ['Sustainable AI / Agent Harness', [['compute', 'Sustainable Compute'], ['catalog', 'Skills & Tools']]],
              ].map(([section, rows]) => (
                <div key={section as string}>
                  <div style={{ color: 'var(--text-faint)', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 5 }}>{section as string}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(rows as [PilotTab, string][]).map(([id, label]) => tabButton(id, label))}
                  </div>
                </div>
              ))}
            </div>

            {status && (
              <div style={{ border: '1px solid var(--border-muted)', background: '#fff', color: 'var(--text-secondary)', borderRadius: 8, padding: 10, fontSize: 13 }}>
                {status}
              </div>
            )}

            {tab === 'living' && (
              <section style={{ ...panelStyle, display: 'grid', gap: 14 }} aria-label="Living Companion workflow">
                <div>
                  <h3 style={{ margin: 0, color: 'var(--sb-navy)', fontSize: 18 }}>Living Companion incident workflow</h3>
                  <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
                    Action-first guidance, media continuity, local-help lookup, insurance checklist, and approval-gated outreach.
                  </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(180px, 0.8fr)', gap: 12 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 5, color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700 }}>
                    Incident
                    <select value={incidentChoice} onChange={(e) => setIncidentChoice(e.target.value)} style={inputStyle}>
                      <option>My bathroom is flooding</option>
                      <option>My basement is flooding</option>
                      <option>Storm damage hit my home</option>
                      <option>My power is out</option>
                      <option>I need help reviewing an insurance document</option>
                    </select>
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 5, color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700 }}>
                    Local-help category
                    <select value={resourceCategory} onChange={(e) => setResourceCategory(e.target.value)} style={inputStyle}>
                      <option value="plumber">Plumber</option>
                      <option value="water_mitigation">Water mitigation</option>
                      <option value="city_public_works">City public works</option>
                      <option value="utility_emergency">Utility emergency</option>
                      <option value="hotel">Nearby hotel/temp stay</option>
                    </select>
                  </label>
                </div>
                <Field label="Photo/document/audio reference" value={mediaName} onChange={setMediaName} placeholder="photo.jpg, policy.pdf, audio note" />
                {!isProfileReady(profile) && (
                  <div style={{ border: '1px solid var(--border-muted)', borderRadius: 8, padding: 10, color: 'var(--text-muted)', fontSize: 13 }}>
                    Profile is incomplete. You can still run the workflow, but local help works better with address and ZIP.
                  </div>
                )}
                <WorkflowButton onClick={runIncident}>Create action plan</WorkflowButton>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                  <ResultBox title="Last action plan" value={state.lastActionPlan} />
                  <ResultBox title="Last incident context" value={state.lastIncident} />
                </div>
              </section>
            )}

            {tab === 'comparison' && (
              <section style={{ ...panelStyle, display: 'grid', gap: 14 }} aria-label="Product comparison workflow">
                <div>
                  <h3 style={{ margin: 0, color: 'var(--sb-navy)', fontSize: 18 }}>Sustainable product comparison</h3>
                  <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
                    Compare user-provided attributes. Unknown data stays unknown; certifications are never invented.
                  </p>
                </div>
                {products.map((product, idx) => (
                  <div key={idx} style={{ border: '1px solid var(--border-muted)', borderRadius: 8, padding: 12, display: 'grid', gap: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 110px', gap: 10 }}>
                      <Field label={`Product ${idx + 1}`} value={product.name} onChange={(name) => setProducts((rows) => rows.map((r, i) => i === idx ? { ...r, name } : r))} />
                      <Field label="Price" value={product.cost} onChange={(cost) => setProducts((rows) => rows.map((r, i) => i === idx ? { ...r, cost } : r))} type="number" />
                    </div>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', color: 'var(--text-secondary)', fontSize: 12 }}>
                      {(['durable', 'repairable', 'minimalPackaging'] as const).map((key) => (
                        <label key={key} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                          <input type="checkbox" checked={product[key]} onChange={(e) => setProducts((rows) => rows.map((r, i) => i === idx ? { ...r, [key]: e.target.checked } : r))} />
                          {key === 'minimalPackaging' ? 'minimal packaging' : key}
                        </label>
                      ))}
                    </div>
                    <Field label="Certifications claimed by user/source" value={product.certifications} onChange={(certifications) => setProducts((rows) => rows.map((r, i) => i === idx ? { ...r, certifications } : r))} placeholder="comma-separated, optional" />
                  </div>
                ))}
                <Field label="Priorities" value={priorities.join(', ')} onChange={(value) => setPriorities(value.split(',').map((p) => p.trim()).filter(Boolean))} placeholder="durability, packaging, cost" />
                <WorkflowButton onClick={runComparison}>Compare products</WorkflowButton>
                <ResultBox title="Last comparison" value={state.lastComparison} />
              </section>
            )}

            {tab === 'carbon' && (
              <section style={{ ...panelStyle, display: 'grid', gap: 14 }} aria-label="Household carbon footprint workflow">
                <div>
                  <h3 style={{ margin: 0, color: 'var(--sb-navy)', fontSize: 18 }}>Household carbon footprint estimator</h3>
                  <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
                    Estimate a broad household emissions range from utility, travel, food, and waste inputs.
                  </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                  <Field label="Household size" type="number" value={carbonForm.householdSize} onChange={(householdSize) => setCarbonForm((f) => ({ ...f, householdSize }))} />
                  <Field label="Monthly electricity kWh" type="number" value={carbonForm.monthlyElectricityKwh} onChange={(monthlyElectricityKwh) => setCarbonForm((f) => ({ ...f, monthlyElectricityKwh }))} />
                  <Field label="Vehicle miles/week" type="number" value={carbonForm.vehicleMiles} onChange={(vehicleMiles) => setCarbonForm((f) => ({ ...f, vehicleMiles }))} />
                </div>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 5, color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700 }}>
                  Diet pattern
                  <select value={carbonForm.dietPattern} onChange={(e) => setCarbonForm((f) => ({ ...f, dietPattern: e.target.value }))} style={inputStyle}>
                    <option value="meat_heavy">meat heavy</option>
                    <option value="average">average</option>
                    <option value="low_meat">low meat</option>
                    <option value="vegetarian">vegetarian</option>
                    <option value="vegan">vegan</option>
                  </select>
                </label>
                <WorkflowButton onClick={runCarbon}>Estimate footprint</WorkflowButton>
                <ResultBox title="Last footprint estimate" value={state.lastCarbon} />
              </section>
            )}

            {tab === 'energy' && (
              <section style={{ ...panelStyle, display: 'grid', gap: 14 }} aria-label="Home energy planner workflow">
                <div>
                  <h3 style={{ margin: 0, color: 'var(--sb-navy)', fontSize: 18 }}>Home energy action planner</h3>
                  <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
                    Turn home details into no-cost, low-cost, and upgrade actions.
                  </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 5, color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700 }}>
                    Home type
                    <select value={energyForm.homeType} onChange={(e) => setEnergyForm((f) => ({ ...f, homeType: e.target.value }))} style={inputStyle}>
                      <option value="single_family">single family</option>
                      <option value="apartment">apartment</option>
                      <option value="condo">condo</option>
                      <option value="mobile_home">mobile home</option>
                    </select>
                  </label>
                  <Field label="Monthly bill" type="number" value={energyForm.monthlyBillUsd} onChange={(monthlyBillUsd) => setEnergyForm((f) => ({ ...f, monthlyBillUsd }))} />
                  <Field label="Heating/cooling" value={energyForm.heatingCoolingType} onChange={(heatingCoolingType) => setEnergyForm((f) => ({ ...f, heatingCoolingType }))} />
                </div>
                <WorkflowButton onClick={runEnergy}>Plan energy actions</WorkflowButton>
                <ResultBox title="Last energy plan" value={state.lastEnergy} />
              </section>
            )}

            {tab === 'community' && (
              <section style={{ ...panelStyle, display: 'grid', gap: 14 }} aria-label="Community project workflow">
                <div>
                  <h3 style={{ margin: 0, color: 'var(--sb-navy)', fontSize: 18 }}>Community sustainability project planner</h3>
                  <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
                    Build a practical project plan for schools, NGOs, neighborhoods, and community groups.
                  </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                  <Field label="Organization type" value={communityForm.organizationType} onChange={(organizationType) => setCommunityForm((f) => ({ ...f, organizationType }))} />
                  <Field label="Goal" value={communityForm.goal} onChange={(goal) => setCommunityForm((f) => ({ ...f, goal }))} />
                  <Field label="Timeline" value={communityForm.timeline} onChange={(timeline) => setCommunityForm((f) => ({ ...f, timeline }))} />
                  <Field label="Budget" type="number" value={communityForm.budgetUsd} onChange={(budgetUsd) => setCommunityForm((f) => ({ ...f, budgetUsd }))} />
                  <Field label="Volunteers" type="number" value={communityForm.volunteers} onChange={(volunteers) => setCommunityForm((f) => ({ ...f, volunteers }))} />
                </div>
                <WorkflowButton onClick={runCommunity}>Plan project</WorkflowButton>
                <ResultBox title="Last community project plan" value={state.lastCommunity} />
              </section>
            )}

            {tab === 'certification' && (
              <section style={{ ...panelStyle, display: 'grid', gap: 14 }} aria-label="Certification navigator workflow">
                <div>
                  <h3 style={{ margin: 0, color: 'var(--sb-navy)', fontSize: 18 }}>Sustainability certification navigator</h3>
                  <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
                    Understand likely fit, documents, complexity, and next steps without invented eligibility.
                  </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 5, color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700 }}>
                    User type
                    <select value={certificationForm.userType} onChange={(e) => setCertificationForm((f) => ({ ...f, userType: e.target.value }))} style={inputStyle}>
                      <option value="household">household</option>
                      <option value="school">school</option>
                      <option value="ngo">NGO</option>
                      <option value="small_business">small business</option>
                      <option value="building_owner">building owner</option>
                      <option value="community_group">community group</option>
                    </select>
                  </label>
                  <Field label="Goal" value={certificationForm.goal} onChange={(goal) => setCertificationForm((f) => ({ ...f, goal }))} />
                </div>
                <WorkflowButton onClick={runCertification}>Find certification path</WorkflowButton>
                <ResultBox title="Last certification guidance" value={state.lastCertification} />
              </section>
            )}

            {tab === 'offset' && (
              <section style={{ ...panelStyle, display: 'grid', gap: 14 }} aria-label="Carbon offset checker workflow">
                <div>
                  <h3 style={{ margin: 0, color: 'var(--sb-navy)', fontSize: 18 }}>Carbon offset quality checker</h3>
                  <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
                    Screen offsets for quality flags and greenwashing risk without inventing registry verification.
                  </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                  <Field label="Project name" value={offsetForm.projectName} onChange={(projectName) => setOffsetForm((f) => ({ ...f, projectName }))} />
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 5, color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700 }}>
                    Project type
                    <select value={offsetForm.projectType} onChange={(e) => setOffsetForm((f) => ({ ...f, projectType: e.target.value }))} style={inputStyle}>
                      <option value="forest">forest</option>
                      <option value="soil">soil</option>
                      <option value="renewable_energy">renewable energy</option>
                      <option value="cookstove">cookstove</option>
                      <option value="direct_air_capture">direct air capture</option>
                      <option value="methane">methane</option>
                    </select>
                  </label>
                  <Field label="Registry if known" value={offsetForm.registry} onChange={(registry) => setOffsetForm((f) => ({ ...f, registry }))} />
                  <Field label="Price per ton" type="number" value={offsetForm.pricePerTonUsd} onChange={(pricePerTonUsd) => setOffsetForm((f) => ({ ...f, pricePerTonUsd }))} />
                </div>
                <WorkflowButton onClick={runOffset}>Check offset quality</WorkflowButton>
                <ResultBox title="Last offset check" value={state.lastOffset} />
              </section>
            )}

            {tab === 'purchasing' && (
              <section style={{ ...panelStyle, display: 'grid', gap: 14 }} aria-label="Sustainable purchasing workflow">
                <div>
                  <h3 style={{ margin: 0, color: 'var(--sb-navy)', fontSize: 18 }}>Sustainable purchasing checklist</h3>
                  <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
                    Make a practical buying checklist with red flags, better alternatives, and end-of-life questions.
                  </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                  <Field label="Product category" value={purchasingForm.productCategory} onChange={(productCategory) => setPurchasingForm((f) => ({ ...f, productCategory }))} />
                  <Field label="Budget" type="number" value={purchasingForm.budgetUsd} onChange={(budgetUsd) => setPurchasingForm((f) => ({ ...f, budgetUsd }))} />
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 5, color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700 }}>
                    Durability need
                    <select value={purchasingForm.durabilityNeed} onChange={(e) => setPurchasingForm((f) => ({ ...f, durabilityNeed: e.target.value }))} style={inputStyle}>
                      <option value="low">low</option>
                      <option value="medium">medium</option>
                      <option value="high">high</option>
                      <option value="unknown">unknown</option>
                    </select>
                  </label>
                </div>
                <WorkflowButton onClick={runPurchasing}>Build buying checklist</WorkflowButton>
                <ResultBox title="Last purchasing checklist" value={state.lastPurchasing} />
              </section>
            )}

            {tab === 'resilience' && (
              <section style={{ ...panelStyle, display: 'grid', gap: 14 }} aria-label="Community resilience workflow">
                <div>
                  <h3 style={{ margin: 0, color: 'var(--sb-navy)', fontSize: 18 }}>Community resilience checklist</h3>
                  <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
                    Build preparedness, communication, partner-category, supply, and drill plans without fake local partners.
                  </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                  <Field label="Community type" value={resilienceForm.communityType} onChange={(communityType) => setResilienceForm((f) => ({ ...f, communityType }))} />
                  <Field label="Hazards" value={resilienceForm.hazards} onChange={(hazards) => setResilienceForm((f) => ({ ...f, hazards }))} />
                  <Field label="Volunteers" type="number" value={resilienceForm.volunteers} onChange={(volunteers) => setResilienceForm((f) => ({ ...f, volunteers }))} />
                  <Field label="Vulnerable groups" value={resilienceForm.vulnerableGroups} onChange={(vulnerableGroups) => setResilienceForm((f) => ({ ...f, vulnerableGroups }))} />
                </div>
                <WorkflowButton onClick={runResilience}>Build resilience checklist</WorkflowButton>
                <ResultBox title="Last resilience checklist" value={state.lastResilience} />
              </section>
            )}

            {tab === 'compute' && (
              <section style={{ ...panelStyle, display: 'grid', gap: 14 }} aria-label="Sustainable compute workflow">
                <div>
                  <h3 style={{ margin: 0, color: 'var(--sb-navy)', fontSize: 18 }}>Agent Harness sustainable compute optimizer</h3>
                  <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
                    Route model usage toward lower cost and lower compute where the task allows it.
                  </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                  <Field label="Workflow name" value={computeForm.workflow_name} onChange={(workflow_name) => setComputeForm((f) => ({ ...f, workflow_name }))} />
                  <Field label="Current model" value={computeForm.current_model} onChange={(current_model) => setComputeForm((f) => ({ ...f, current_model }))} />
                  <Field label="Estimated tokens" type="number" value={computeForm.estimated_tokens} onChange={(estimated_tokens) => setComputeForm((f) => ({ ...f, estimated_tokens }))} />
                </div>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', color: 'var(--text-secondary)', fontSize: 12 }}>
                  {(['repeated_task', 'cacheable', 'batchable'] as const).map((key) => (
                    <label key={key} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                      <input type="checkbox" checked={computeForm[key]} onChange={(e) => setComputeForm((f) => ({ ...f, [key]: e.target.checked }))} />
                      {key.replace('_', ' ')}
                    </label>
                  ))}
                </div>
                <WorkflowButton onClick={runCompute}>Optimize workflow</WorkflowButton>
                <ResultBox title="Last compute optimization" value={state.lastCompute} />
              </section>
            )}

            {tab === 'catalog' && (
              <section style={{ ...panelStyle, display: 'grid', gap: 14 }} aria-label="Skills and tools catalog">
                <div>
                  <h3 style={{ margin: 0, color: 'var(--sb-navy)', fontSize: 18 }}>Skills & Tools catalog</h3>
                  <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
                    Sanitized registry view for developers and advanced pilot users. Shows available tools and surfaces without secrets.
                  </p>
                </div>
                <WorkflowButton onClick={loadCatalog}>Load catalog</WorkflowButton>
                <ResultBox title="Registry snapshot summary" value={state.lastCatalog} />
              </section>
            )}
          </section>
        </div>
      </main>
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
  if (view === 'claim') return <ClaimView onNav={setView} />
  if (view === 'demos') return <DemosView onNav={setView} />

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

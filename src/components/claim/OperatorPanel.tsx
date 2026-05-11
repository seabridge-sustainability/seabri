import { useState } from 'react'
import type { RoutingRecommendation } from '../../store/claim'

interface Props {
  nextBestQuestion: string | null
  routing: RoutingRecommendation
  crisisDetected: boolean
  catDetected: boolean
  onHandoff: (note: string | undefined) => void
  isLoading: boolean
  handedOff: boolean
  claimReference: string | null
}

export function OperatorPanel({
  nextBestQuestion,
  routing,
  crisisDetected,
  catDetected,
  onHandoff,
  isLoading,
  handedOff,
  claimReference,
}: Props) {
  const [note, setNote] = useState('')

  const routingLabel =
    routing === 'siu' ? 'SIU Referral' :
    routing === 'senior_review' ? 'Senior Adjuster' :
    routing === 'catastrophe' ? 'CAT Queue' :
    'Standard'

  const routingColor =
    routing === 'siu' ? '#B1454A' :
    routing === 'senior_review' ? '#C28A2B' :
    routing === 'catastrophe' ? '#8b5cf6' :
    '#2F8F6B'

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-muted)',
      borderRadius: 12,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      height: '100%',
      overflowY: 'auto',
    }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Operator Panel
      </span>

      {/* Crisis alert */}
      {crisisDetected && (
        <div style={{
          background: 'rgba(239,68,68,0.12)',
          border: '1px solid #ef4444',
          borderRadius: 8,
          padding: '10px 12px',
          fontSize: 12,
          color: '#fca5a5',
          lineHeight: 1.5,
        }}>
          <strong>⚠ Crisis language detected.</strong> Pause intake. Provide 988 Suicide &amp; Crisis Lifeline before continuing.
        </div>
      )}

      {/* CAT alert */}
      {catDetected && (
        <div style={{
          background: 'rgba(139,92,246,0.12)',
          border: '1px solid #8b5cf6',
          borderRadius: 8,
          padding: '10px 12px',
          fontSize: 12,
          color: '#c4b5fd',
          lineHeight: 1.5,
        }}>
          <strong>🌪 CAT event keywords detected.</strong> Route to catastrophe queue. Extend SLA to 5–7 business days.
        </div>
      )}

      {/* Routing recommendation */}
      <div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
          Routing
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 14,
          fontWeight: 600,
          color: routingColor,
        }}>
          <span style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: routingColor,
            flexShrink: 0,
          }} />
          {routingLabel}
        </div>
      </div>

      {/* Next best question */}
      <div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
          Suggested Next Question
        </div>
        {nextBestQuestion ? (
          <div style={{
            fontSize: 13,
            color: 'var(--sb-deep-blue, #1E3A8A)',
            background: 'rgba(30,58,138,0.06)',
            borderRadius: 8,
            padding: '10px 12px',
            lineHeight: 1.6,
            fontStyle: 'italic',
          }}>
            "{nextBestQuestion}"
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Listening…</div>
        )}
      </div>

      {/* Adjuster note */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Adjuster Note
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add internal note for the claims file…"
          disabled={handedOff}
          rows={4}
          style={{
            flex: 1,
            background: 'var(--bg-input)',
            border: '1px solid var(--border-default)',
            borderRadius: 8,
            color: 'var(--text-primary)',
            fontSize: 12,
            padding: '8px 10px',
            resize: 'none',
            fontFamily: 'inherit',
            lineHeight: 1.5,
          }}
        />
      </div>

      {/* Handoff */}
      {handedOff ? (
        <div style={{
          background: 'rgba(47,143,107,0.1)',
          border: '1px solid #2F8F6B',
          borderRadius: 8,
          padding: '12px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#2F8F6B' }}>Handed Off</div>
          {claimReference && (
            <div style={{ fontSize: 12, color: '#57B0B4', marginTop: 4 }}>
              Ref: {claimReference}
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onHandoff(note.trim() || undefined)}
          disabled={isLoading}
          style={{
            background: 'var(--sb-signal-positive, #2F8F6B)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 16px',
            fontSize: 13,
            fontWeight: 600,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          {isLoading ? 'Processing…' : 'Hand Off to Adjuster'}
        </button>
      )}
    </div>
  )
}

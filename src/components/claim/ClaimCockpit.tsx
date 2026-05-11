import { useState, useRef, useEffect } from 'react'
import { useClaimStore } from '../../store/claim'
import { ClaimPacketPanel } from './ClaimPacketPanel'
import { OperatorPanel } from './OperatorPanel'
interface Props {
  gatewayUrl: string
  initialRole?: 'claimant' | 'adjuster'
}

export function ClaimCockpit({ gatewayUrl, initialRole = 'claimant' }: Props) {
  const {
    sessionId,
    packet,
    transcript,
    nextBestQuestion,
    routingRecommendation,
    userRole,
    isLoading,
    error,
    crisisDetected,
    catDetected,
    handedOff,
    claimReference,
    setRole,
    startClaim,
    sendTurn,
    handoff,
    clearError,
    reset,
  } = useClaimStore()

  const [policyInput, setPolicyInput] = useState('')
  const [messageInput, setMessageInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setRole(initialRole)
  }, [initialRole, setRole])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  const handleStart = async () => {
    if (!policyInput.trim()) return
    await startClaim(policyInput.trim(), gatewayUrl)
  }

  const handleSend = async () => {
    if (!messageInput.trim() || isLoading) return
    const msg = messageInput.trim()
    setMessageInput('')
    await sendTurn(msg, gatewayUrl)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isAdjuster = userRole === 'adjuster'

  // ── Intake gate ────────────────────────────────────────────────────────────
  if (!sessionId) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: 32,
        gap: 24,
      }}>
        <div style={{ textAlign: 'center', maxWidth: 480 }}>
          <h2 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontSize: 28, margin: 0 }}>
            File a Claim
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
            Enter your policy number to begin the intake process. A claim specialist will guide you through each step.
          </p>
        </div>

        {/* Role toggle */}
        <div style={{ display: 'flex', gap: 8 }}>
          {(['claimant', 'adjuster'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              style={{
                padding: '8px 20px',
                borderRadius: 8,
                border: `2px solid ${userRole === r ? '#2F8F6B' : 'var(--border-default)'}`,
                background: userRole === r ? 'rgba(47,143,107,0.12)' : 'transparent',
                color: userRole === r ? '#2F8F6B' : 'var(--text-muted)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {r}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 420 }}>
          <input
            type="text"
            value={policyInput}
            onChange={(e) => setPolicyInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleStart()}
            placeholder="Policy number (e.g. HO-2024-88821)"
            style={{
              flex: 1,
              background: 'var(--bg-input)',
              border: '1px solid var(--border-default)',
              borderRadius: 8,
              color: 'var(--text-primary)',
              fontSize: 14,
              padding: '12px 14px',
            }}
          />
          <button
            type="button"
            onClick={handleStart}
            disabled={isLoading || !policyInput.trim()}
            style={{
              background: 'var(--sb-signal-positive, #2F8F6B)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '12px 20px',
              fontSize: 14,
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading || !policyInput.trim() ? 0.6 : 1,
              flexShrink: 0,
            }}
          >
            {isLoading ? 'Starting…' : 'Start Claim'}
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(177,69,74,0.08)',
            border: '1px solid var(--sb-signal-risk, #B1454A)',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 12,
            color: 'var(--sb-signal-risk, #B1454A)',
            maxWidth: 420,
            width: '100%',
          }}>
            {error}
            <button type="button" onClick={clearError} style={{ marginLeft: 8, color: 'var(--sb-signal-risk, #B1454A)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11 }}>
              Dismiss
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Active session ─────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isAdjuster ? '1fr 280px 280px' : '1fr',
      gap: 16,
      height: '100%',
      padding: 16,
      overflow: 'hidden',
    }}>
      {/* Main chat column */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-muted)',
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        {/* Chat header */}
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Claim Intake</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
              {packet?.policyNumber ?? 'Loading…'}
              {packet?.status && (
                <span style={{ marginLeft: 8, color: 'var(--text-secondary)' }}>
                  · {packet.status.replace(/_/g, ' ')}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {handedOff && claimReference && (
              <span style={{ fontSize: 11, color: 'var(--sb-signal-positive, #2F8F6B)', fontWeight: 600 }}>
                {claimReference}
              </span>
            )}
            <button
              type="button"
              onClick={reset}
              style={{
                background: 'none',
                border: '1px solid var(--border-default)',
                borderRadius: 6,
                color: 'var(--text-muted)',
                fontSize: 11,
                padding: '4px 10px',
                cursor: 'pointer',
              }}
            >
              New claim
            </button>
          </div>
        </div>

        {/* Transcript */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          {transcript.map((entry, i) => {
            const isAgent = entry.role === 'agent'
            const isOperator = entry.role === 'operator'
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: isAgent || isOperator ? 'flex-start' : 'flex-end',
                }}
              >
                <div style={{
                  maxWidth: '78%',
                  background: isAgent ? 'var(--bg-bubble-assistant)' : isOperator ? 'rgba(139,92,246,0.1)' : 'var(--bg-bubble-user)',
                  border: `1px solid ${isAgent ? 'var(--border-muted)' : isOperator ? '#8b5cf6' : 'var(--border-default)'}`,
                  borderRadius: isAgent ? '12px 12px 12px 4px' : '12px 12px 4px 12px',
                  padding: '10px 14px',
                  fontSize: 13,
                  color: isOperator ? '#8b5cf6' : 'var(--text-primary)',
                  lineHeight: 1.6,
                }}>
                  {isOperator && (
                    <div style={{ fontSize: 10, color: '#8b5cf6', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Operator note
                    </div>
                  )}
                  {entry.content}
                </div>
              </div>
            )
          })}
          {isLoading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                background: 'var(--bg-bubble-assistant)',
                border: '1px solid var(--border-muted)',
                borderRadius: '12px 12px 12px 4px',
                padding: '10px 14px',
                display: 'flex',
                gap: 4,
                alignItems: 'center',
              }}>
                {[0, 1, 2].map((d) => (
                  <span
                    key={d}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--sb-slate-300, #CBD5E1)',
                      animation: 'pulse 1.4s ease-in-out infinite',
                      animationDelay: `${d * 0.2}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Crisis banner */}
        {crisisDetected && (
          <div style={{
            padding: '10px 16px',
            background: 'rgba(177,69,74,0.10)',
            borderTop: '1px solid var(--sb-signal-risk, #B1454A)',
            fontSize: 12,
            color: 'var(--sb-signal-risk, #B1454A)',
          }}>
            ⚠ Crisis language detected — please call or text <strong>988</strong> if you need immediate support.
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            padding: '10px 16px',
            background: 'rgba(177,69,74,0.08)',
            borderTop: '1px solid var(--sb-signal-risk, #B1454A)',
            fontSize: 12,
            color: 'var(--sb-signal-risk, #B1454A)',
            display: 'flex',
            justifyContent: 'space-between',
          }}>
            {error}
            <button type="button" onClick={clearError} style={{ background: 'none', border: 'none', color: 'var(--sb-signal-risk, #B1454A)', cursor: 'pointer', fontSize: 11 }}>
              Dismiss
            </button>
          </div>
        )}

        {/* Input bar */}
        {!handedOff && (
          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--border-muted)',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}>
            <input
              ref={inputRef}
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message…"
              disabled={isLoading}
              style={{
                flex: 1,
                background: 'var(--bg-input)',
                border: '1px solid var(--border-default)',
                borderRadius: 8,
                color: 'var(--text-primary)',
                fontSize: 13,
                padding: '10px 12px',
              }}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={isLoading || !messageInput.trim()}
              style={{
                background: 'var(--sb-signal-positive, #2F8F6B)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 16px',
                fontSize: 13,
                fontWeight: 600,
                cursor: isLoading || !messageInput.trim() ? 'not-allowed' : 'pointer',
                opacity: isLoading || !messageInput.trim() ? 0.5 : 1,
                flexShrink: 0,
              }}
            >
              Send
            </button>
          </div>
        )}
      </div>

      {/* Adjuster-only panels */}
      {isAdjuster && packet && (
        <>
          <ClaimPacketPanel
            packet={packet}
            nextBestQuestion={nextBestQuestion}
            routing={routingRecommendation}
          />
          <OperatorPanel
            nextBestQuestion={nextBestQuestion}
            routing={routingRecommendation}
            crisisDetected={crisisDetected}
            catDetected={catDetected}
            onHandoff={(note) => handoff(note, gatewayUrl)}
            isLoading={isLoading}
            handedOff={handedOff}
            claimReference={claimReference}
          />
        </>
      )}
    </div>
  )
}

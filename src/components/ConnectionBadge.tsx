import { useEffect, useState } from 'react'

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL ?? ''

type Status = 'direct' | 'connecting' | 'connected' | 'offline'

function statusColor(status: Status): string {
  switch (status) {
    case 'connected':
      return 'var(--accent-green)'
    case 'connecting':
      return '#d4a017'
    case 'offline':
      return '#7f1d1d'
    case 'direct':
    default:
      return 'var(--text-faint)'
  }
}

function statusLabel(status: Status): string {
  switch (status) {
    case 'connected':
      return 'Gateway'
    case 'connecting':
      return 'Connecting…'
    case 'offline':
      return 'Gateway offline'
    case 'direct':
    default:
      return 'Direct API'
  }
}

export function ConnectionBadge({ sessionCount }: { sessionCount: number }) {
  const [status, setStatus] = useState<Status>(GATEWAY_URL ? 'connecting' : 'direct')

  useEffect(() => {
    if (!GATEWAY_URL) {
      setStatus('direct')
      return
    }

    let cancelled = false
    const check = async (): Promise<void> => {
      try {
        const res = await fetch(`${GATEWAY_URL.replace(/\/$/, '')}/health`, {
          method: 'GET',
          headers: { accept: 'application/json' },
        })
        if (cancelled) return
        setStatus(res.ok ? 'connected' : 'offline')
      } catch {
        if (!cancelled) setStatus('offline')
      }
    }

    void check()
    const id = window.setInterval(check, 15000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  const color = statusColor(status)
  return (
    <div
      title={GATEWAY_URL || 'No gateway configured — using direct Anthropic API'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 10px',
        borderRadius: 999,
        border: '1px solid var(--border-muted)',
        background: 'var(--bg-surface)',
        fontSize: 12,
        color: 'var(--text-muted)',
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: color,
          boxShadow: status === 'connecting' ? `0 0 0 3px ${color}22` : undefined,
        }}
      />
      <span>{statusLabel(status)}</span>
      {sessionCount > 0 && (
        <span style={{ color: 'var(--text-faint)' }}>
          · {sessionCount} session{sessionCount === 1 ? '' : 's'}
        </span>
      )}
    </div>
  )
}

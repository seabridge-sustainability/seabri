interface StatCardProps {
  label: string
  value: string
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
  trendLabel?: string
  accentColor?: string
}

const TREND_ICON = { up: '↑', down: '↓', neutral: '→' }
const TREND_COLOR = { up: '#34d399', down: '#f87171', neutral: '#94a3b8' }

export function StatCard({ label, value, subtitle, trend, trendLabel, accentColor = '#a78bfa' }: StatCardProps) {
  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: `1px solid var(--border-muted)`,
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: 8,
        padding: '14px 18px',
        minWidth: 160,
        flex: 1,
      }}
    >
      <div style={{ fontSize: 11, color: 'var(--text-muted, #888)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary, #fff)', lineHeight: 1.2 }}>
        {value}
      </div>
      {subtitle && (
        <div style={{ fontSize: 11, color: 'var(--text-faint, #666)', marginTop: 4 }}>{subtitle}</div>
      )}
      {trend && trendLabel && (
        <div style={{ fontSize: 12, color: TREND_COLOR[trend], marginTop: 6, fontWeight: 600 }}>
          {TREND_ICON[trend]} {trendLabel}
        </div>
      )}
    </div>
  )
}

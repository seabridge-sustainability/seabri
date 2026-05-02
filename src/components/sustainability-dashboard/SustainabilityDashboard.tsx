import { useMemo } from 'react'
import { StatCard } from './StatCard.js'
import { RecommendationList } from './RecommendationList.js'
import { formatCarbonGrams, buildDailyChart, computeSavingsVsBaseline } from './useSustainabilityData.js'
import type { DailyMetric } from './useSustainabilityData.js'

interface SustainabilityDashboardProps {
  metrics: DailyMetric[]
  baselineCostUsd?: number
  baselineCarbonGrams?: number
  recommendations?: string[]
  avgScore?: number
}

export function SustainabilityDashboard({
  metrics,
  baselineCostUsd,
  baselineCarbonGrams,
  recommendations = [],
  avgScore,
}: SustainabilityDashboardProps) {
  const totals = useMemo(() => {
    return metrics.reduce(
      (acc, m) => ({
        carbon: acc.carbon + m.carbonGrams,
        cost: acc.cost + m.costUsd,
        requests: acc.requests + m.requestCount,
      }),
      { carbon: 0, cost: 0, requests: 0 },
    )
  }, [metrics])

  const chart = useMemo(() => buildDailyChart(metrics), [metrics])

  const savings = useMemo(() => {
    if (baselineCostUsd === undefined) return null
    return computeSavingsVsBaseline({
      actualCostUsd: totals.cost,
      baselineCostUsd,
      actualCarbonGrams: totals.carbon,
      baselineCarbonGrams,
    })
  }, [totals, baselineCostUsd, baselineCarbonGrams])

  const scoreColor = avgScore !== undefined
    ? avgScore >= 80 ? '#34d399' : avgScore >= 50 ? '#fbbf24' : '#f87171'
    : '#a78bfa'

  return (
    <div style={{ padding: '20px 24px', background: 'var(--bg-surface, #13131f)', minHeight: '100%' }}>
      <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary, #fff)' }}>
        Sustainability Dashboard
      </h2>

      {/* Stat row */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <StatCard
          label="Total Carbon"
          value={formatCarbonGrams(totals.carbon)}
          subtitle={`across ${totals.requests} requests`}
          accentColor="#34d399"
        />
        <StatCard
          label="Total Cost"
          value={`$${totals.cost.toFixed(4)}`}
          subtitle={savings ? `${savings.savedPercent >= 0 ? 'saved' : 'over'} ${Math.abs(savings.savedPercent).toFixed(0)}% vs baseline` : undefined}
          trend={savings ? (savings.savedUsd >= 0 ? 'down' : 'up') : undefined}
          trendLabel={savings ? `$${Math.abs(savings.savedUsd).toFixed(4)} ${savings.savedUsd >= 0 ? 'saved' : 'over budget'}` : undefined}
          accentColor="#fbbf24"
        />
        {avgScore !== undefined && (
          <StatCard
            label="Sustainability Score"
            value={`${avgScore.toFixed(0)}/100`}
            subtitle="weighted average"
            accentColor={scoreColor}
          />
        )}
        {savings?.savedCarbonGrams !== undefined && (
          <StatCard
            label="Carbon Saved"
            value={formatCarbonGrams(Math.max(0, savings.savedCarbonGrams))}
            subtitle="vs always-opus baseline"
            accentColor="#38bdf8"
          />
        )}
      </div>

      {/* Daily trend table */}
      {chart.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text-muted, #888)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Daily Breakdown
          </h3>
          <div
            style={{
              background: 'var(--bg-elevated, #1e1e2e)',
              borderRadius: 8,
              border: '1px solid var(--border-muted, #333)',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface, #13131f)' }}>
                  {['Date', 'Carbon', 'Cost (USD)', 'Requests'].map((h) => (
                    <th key={h} style={{ padding: '8px 14px', textAlign: 'left', color: 'var(--text-muted, #888)', fontWeight: 600 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chart.map((row) => (
                  <tr key={row.date} style={{ borderTop: '1px solid var(--border-muted, #333)' }}>
                    <td style={{ padding: '7px 14px', color: 'var(--text-primary, #ccc)' }}>{row.date}</td>
                    <td style={{ padding: '7px 14px', color: '#34d399' }}>{formatCarbonGrams(row.carbon)}</td>
                    <td style={{ padding: '7px 14px', color: '#fbbf24' }}>${row.cost.toFixed(4)}</td>
                    <td style={{ padding: '7px 14px', color: 'var(--text-muted, #888)' }}>{row.requests}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div>
        <h3 style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text-muted, #888)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Recommendations
        </h3>
        <div
          style={{
            background: 'var(--bg-elevated, #1e1e2e)',
            borderRadius: 8,
            border: '1px solid var(--border-muted, #333)',
            padding: '10px 6px',
          }}
        >
          <RecommendationList recommendations={recommendations} />
        </div>
      </div>
    </div>
  )
}

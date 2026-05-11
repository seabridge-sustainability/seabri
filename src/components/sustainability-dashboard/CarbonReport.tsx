import { useMemo } from 'react'
import { StatCard } from './StatCard.js'
import { RecommendationList } from './RecommendationList.js'
import { formatCarbonGrams } from './useSustainabilityData.js'
import type { CarbonReport as CarbonReportData, CarbonReportPeriod } from '../../../gateway/seabri/carbon-report.js'

interface CarbonReportProps {
  report: CarbonReportData
}

const TIER_COLORS: Record<string, string> = {
  haiku: '#34d399',
  sonnet: '#fbbf24',
  opus: '#f87171',
}

const SUSTAINABILITY_COLORS: Record<string, string> = {
  excellent: '#34d399',
  good: '#38bdf8',
  fair: '#fbbf24',
  poor: '#f87171',
}

function TierBar({ tier, percentage }: { tier: string; percentage: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 55, textTransform: 'capitalize' }}>
        {tier}
      </span>
      <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--bg-surface)' }}>
        <div
          style={{
            width: `${Math.min(100, percentage)}%`,
            height: '100%',
            borderRadius: 4,
            background: TIER_COLORS[tier] ?? '#a78bfa',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 40, textAlign: 'right' }}>
        {percentage.toFixed(0)}%
      </span>
    </div>
  )
}

function AgentRow({ name, data }: { name: string; data: { requests: number; carbonGrams: number; costUsd: number } }) {
  return (
    <tr style={{ borderTop: '1px solid var(--border-muted)' }}>
      <td style={{ padding: '7px 14px', color: 'var(--text-primary)' }}>{name}</td>
      <td style={{ padding: '7px 14px', color: 'var(--text-muted)' }}>{data.requests}</td>
      <td style={{ padding: '7px 14px', color: '#34d399' }}>{formatCarbonGrams(data.carbonGrams)}</td>
      <td style={{ padding: '7px 14px', color: '#fbbf24' }}>${data.costUsd.toFixed(4)}</td>
    </tr>
  )
}

function DailyRow({ day }: { day: CarbonReportPeriod }) {
  return (
    <tr style={{ borderTop: '1px solid var(--border-muted)' }}>
      <td style={{ padding: '7px 14px', color: 'var(--text-primary)' }}>{day.date}</td>
      <td style={{ padding: '7px 14px', color: 'var(--text-muted)' }}>{day.requests}</td>
      <td style={{ padding: '7px 14px', color: '#34d399' }}>{formatCarbonGrams(day.totalCarbonGrams)}</td>
      <td style={{ padding: '7px 14px', color: '#fbbf24' }}>${day.totalCostUsd.toFixed(4)}</td>
      <td style={{ padding: '7px 14px', color: 'var(--text-muted)' }}>
        {formatCarbonGrams(day.avgCarbonPerRequest)}/req
      </td>
    </tr>
  )
}

export function CarbonReport({ report }: CarbonReportProps) {
  const { summary, daily, byAgent, byTier, recommendations } = report

  const tierEntries = useMemo(
    () => Object.entries(byTier).sort(([, a], [, b]) => b.percentage - a.percentage),
    [byTier],
  )
  const agentEntries = useMemo(
    () => Object.entries(byAgent).sort(([, a], [, b]) => b.carbonGrams - a.carbonGrams),
    [byAgent],
  )

  const sustainabilityColor = SUSTAINABILITY_COLORS[summary.sustainabilityTier] ?? '#a78bfa'

  const sectionHeader: React.CSSProperties = {
    margin: '0 0 10px',
    fontSize: 13,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  }
  const card: React.CSSProperties = {
    background: 'var(--bg-elevated)',
    borderRadius: 8,
    border: '1px solid var(--border-muted)',
    overflow: 'hidden',
  }

  return (
    <div style={{ padding: '20px 24px', background: 'var(--bg-surface)', minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
          Carbon Report
        </h2>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {report.periodDays}-day period
        </span>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <StatCard
          label="Total Carbon"
          value={formatCarbonGrams(summary.totalCarbonGrams)}
          subtitle={summary.carbonEquivalent}
          accentColor="#34d399"
        />
        <StatCard
          label="Total Cost"
          value={`$${summary.totalCostUsd.toFixed(4)}`}
          subtitle={`${summary.totalRequests} requests`}
          accentColor="#fbbf24"
        />
        <StatCard
          label="Sustainability"
          value={`${summary.avgSustainabilityScore.toFixed(0)}/100`}
          subtitle={summary.sustainabilityTier}
          accentColor={sustainabilityColor}
        />
      </div>

      {/* Tier distribution */}
      {tierEntries.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={sectionHeader}>Model Tier Distribution</h3>
          <div style={{ ...card, padding: '14px 18px' }}>
            {tierEntries.map(([tier, data]) => (
              <TierBar key={tier} tier={tier} percentage={data.percentage} />
            ))}
          </div>
        </div>
      )}

      {/* By agent */}
      {agentEntries.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={sectionHeader}>By Agent</h3>
          <div style={card}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface)' }}>
                  {['Agent', 'Requests', 'Carbon', 'Cost'].map((h) => (
                    <th key={h} style={{ padding: '8px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agentEntries.map(([name, data]) => (
                  <AgentRow key={name} name={name} data={data} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Daily breakdown */}
      {daily.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={sectionHeader}>Daily Breakdown</h3>
          <div style={card}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface)' }}>
                  {['Date', 'Requests', 'Carbon', 'Cost', 'Avg/Req'].map((h) => (
                    <th key={h} style={{ padding: '8px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {daily.map((day) => (
                  <DailyRow key={day.date} day={day} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div>
        <h3 style={sectionHeader}>Recommendations</h3>
        <div style={{ ...card, padding: '10px 6px' }}>
          <RecommendationList recommendations={recommendations} />
        </div>
      </div>
    </div>
  )
}

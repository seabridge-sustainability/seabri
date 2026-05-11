import type { ClaimPacket, SIUFlag } from '../../store/claim'

interface Props {
  packet: ClaimPacket
  nextBestQuestion: string | null
  routing: string
}

const CLAIM_TYPE_LABELS: Record<string, string> = {
  HOME_WATER: 'Home — Water Damage',
  HOME_FIRE: 'Home — Fire/Smoke',
  HOME_THEFT: 'Home — Theft',
  AUTO_COLLISION: 'Auto — Collision',
  AUTO_THEFT: 'Auto — Theft',
  TRAVEL_CANCELLATION: 'Travel — Cancellation',
  TRAVEL_MEDICAL: 'Travel — Medical',
  MEDICAL_EXPENSE: 'Medical Expense',
}

const STATUS_COLORS: Record<string, string> = {
  intake: '#6C7FA0',
  pending_documents: '#C28A2B',
  under_review: '#1E3A8A',
  siu_referral: '#B1454A',
  senior_review: '#C28A2B',
  cat_queue: '#8b5cf6',
  closed: '#2F8F6B',
}

const SIU_FLAG_LABELS: Record<SIUFlag, string> = {
  RECENT_POLICY_CHANGE: 'Recent policy change',
  PRIOR_CLAIM_PATTERN: 'Prior claim pattern',
  DELAYED_REPORT: 'Delayed report',
  INCONSISTENT_ACCOUNT: 'Inconsistent account',
  EXCESSIVE_VALUATION: 'Excessive valuation',
  CASH_SETTLEMENT_DEMAND: 'Cash settlement demand',
  NO_POLICE_REPORT: 'No police report',
  MULTIPLE_VEHICLES_INSURED: 'Multiple vehicles insured',
  VACANT_PROPERTY: 'Vacant property',
  UNVERIFIABLE_LOSS: 'Unverifiable loss',
}

function Field({ label, value }: { label: string; value: string | number | boolean | null }) {
  if (value === null || value === undefined) return null
  const display = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-primary)', wordBreak: 'break-word' }}>{display}</div>
    </div>
  )
}

export function ClaimPacketPanel({ packet, nextBestQuestion, routing }: Props) {
  const statusColor = STATUS_COLORS[packet.status] ?? '#6b7280'
  const siuColor = packet.siuFlags.length >= 2 ? '#ef4444' : packet.siuFlags.length === 1 ? '#f97316' : '#22c55e'

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-muted)',
      borderRadius: 12,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      height: '100%',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Claim Packet
        </span>
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          padding: '3px 8px',
          borderRadius: 999,
          background: `${statusColor}22`,
          color: statusColor,
        }}>
          {packet.status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Reference */}
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
        CLM-{packet.sessionId.slice(0, 8).toUpperCase()}
      </div>

      {/* Core fields */}
      <div>
        {packet.claimType && (
          <Field label="Claim Type" value={CLAIM_TYPE_LABELS[packet.claimType] ?? packet.claimType} />
        )}
        <Field label="Claimant" value={packet.claimantName} />
        <Field label="Policy Number" value={packet.policyNumber} />
        <Field label="Date of Loss" value={packet.dateOfLoss} />
        <Field label="Location" value={packet.locationOfLoss} />
        <Field label="Estimated Value" value={packet.estimatedValue != null ? `$${packet.estimatedValue.toLocaleString()}` : null} />
        <Field label="Injuries Reported" value={packet.injuriesReported} />
        <Field label="Witness Present" value={packet.witnessPresent} />
        <Field label="Police Report #" value={packet.policeReportNum} />
        <Field label="Contact Phone" value={packet.contactPhone} />
        <Field label="Contact Email" value={packet.contactEmail} />
      </div>

      {/* Loss description */}
      {packet.lossDescription && (
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            Description
          </div>
          <div style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
            background: 'var(--bg-elevated)',
            borderRadius: 8,
            padding: '8px 10px',
            lineHeight: 1.5,
          }}>
            {packet.lossDescription}
          </div>
        </div>
      )}

      {/* SIU flags */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            SIU Signals
          </span>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            color: siuColor,
          }}>
            {packet.siuFlags.length} / 10
          </span>
        </div>
        {packet.siuFlags.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--sb-signal-positive, #2F8F6B)' }}>No signals detected</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {packet.siuFlags.map((flag) => (
              <div key={flag} style={{
                fontSize: 11,
                color: siuColor,
                background: `${siuColor}15`,
                borderRadius: 6,
                padding: '4px 8px',
              }}>
                ⚠ {SIU_FLAG_LABELS[flag]}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Next best question */}
      {nextBestQuestion && (
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            Next Best Question
          </div>
          <div style={{
            fontSize: 12,
            color: 'var(--sb-deep-blue, #1E3A8A)',
            background: 'rgba(30,58,138,0.06)',
            borderRadius: 8,
            padding: '8px 10px',
            lineHeight: 1.5,
            fontStyle: 'italic',
          }}>
            "{nextBestQuestion}"
          </div>
        </div>
      )}

      {/* Routing */}
      <div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
          Routing
        </div>
        <div style={{
          fontSize: 12,
          fontWeight: 600,
          color: routing === 'siu' ? '#B1454A' :
                 routing === 'senior_review' ? '#C28A2B' :
                 routing === 'catastrophe' ? '#8b5cf6' : '#2F8F6B',
        }}>
          {routing === 'standard' ? 'Standard queue' :
           routing === 'siu' ? 'SIU referral required' :
           routing === 'senior_review' ? 'Senior adjuster review' :
           'Catastrophe queue'}
        </div>
      </div>
    </div>
  )
}

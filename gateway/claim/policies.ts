import type { ClaimPacket, SIUFlag } from './schemas.js'

export type RoutingDecision = 'standard' | 'siu' | 'catastrophe' | 'senior_review'

export interface PolicyResult {
  routing: RoutingDecision
  warnings: string[]
  requiresSeniorReview: boolean
}

// SIU threshold: 2+ flags trigger referral
const SIU_ESCALATION_THRESHOLD = 2

// High-value threshold requiring senior review
const HIGH_VALUE_THRESHOLD = 250_000

export function evaluatePolicies(packet: ClaimPacket): PolicyResult {
  const warnings: string[] = []
  let routing: RoutingDecision = 'standard'

  // SIU escalation check
  if (packet.siuFlags.length >= SIU_ESCALATION_THRESHOLD) {
    routing = 'siu'
    warnings.push(
      `SIU escalation triggered: ${packet.siuFlags.join(', ')} (${packet.siuFlags.length} signals)`
    )
  }

  // High-value claim
  const requiresSeniorReview =
    packet.estimatedValue != null && packet.estimatedValue > HIGH_VALUE_THRESHOLD
  if (requiresSeniorReview) {
    if (routing === 'standard') routing = 'senior_review'
    warnings.push(
      `High-value claim: estimated $${packet.estimatedValue?.toLocaleString()} exceeds $${HIGH_VALUE_THRESHOLD.toLocaleString()} threshold`
    )
  }

  // Injury escalation — note for medical protocol
  if (packet.injuriesReported) {
    warnings.push('Injuries reported — medical protocol required; provide nurse line number')
  }

  // Delayed report signal
  if (packet.dateOfLoss) {
    const lossDate = new Date(packet.dateOfLoss)
    const now = new Date()
    const hoursElapsed = (now.getTime() - lossDate.getTime()) / (1000 * 60 * 60)
    if (hoursElapsed > 72 && !packet.siuFlags.includes('DELAYED_REPORT')) {
      warnings.push(
        `Loss occurred ${Math.round(hoursElapsed)}h ago — consider DELAYED_REPORT flag if no explanation given`
      )
    }
  }

  return { routing, warnings, requiresSeniorReview }
}

// Determine if the packet has enough required fields to be considered complete
export function isPacketComplete(packet: ClaimPacket): boolean {
  return !!(
    packet.claimType &&
    packet.claimantName &&
    packet.policyNumber &&
    packet.dateOfLoss &&
    packet.locationOfLoss &&
    packet.lossDescription &&
    packet.lossDescription.length >= 30
  )
}

// Derive the next status from current packet state and routing
export function deriveStatus(
  packet: ClaimPacket,
  routing: RoutingDecision
): ClaimPacket['status'] {
  if (routing === 'siu') return 'siu_referral'
  if (routing === 'senior_review') return 'senior_review'
  if (routing === 'catastrophe') return 'cat_queue'
  if (isPacketComplete(packet)) return 'pending_documents'
  return 'intake'
}

// Safety / crisis detection on raw message text
export function detectCrisisLanguage(text: string): boolean {
  const crisisTerms = [
    'hurt myself',
    'end my life',
    'suicide',
    'kill myself',
    'want to die',
    "can't go on",
    'no reason to live',
  ]
  const lower = text.toLowerCase()
  return crisisTerms.some((term) => lower.includes(term))
}

// Catastrophe / CAT event detection
const CAT_KEYWORDS = [
  'hurricane',
  'tornado',
  'wildfire',
  'earthquake',
  'flood warning',
  'declared disaster',
  'fema',
  'state of emergency',
]

export function detectCATEvent(text: string): boolean {
  const lower = text.toLowerCase()
  return CAT_KEYWORDS.some((kw) => lower.includes(kw))
}

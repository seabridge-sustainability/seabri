export type ResponseMode =
  | 'property_risk'
  | 'incident'
  | 'insurance'
  | 'photo_damage'
  | 'audio_note'
  | 'action_coordination'
  | 'general_sustainability'

export interface ClassifyInput {
  userMessage: string
  hasImage?: boolean
  hasAudio?: boolean
  agentId?: string
  history?: Array<{ role: string; content: string }>
}

export const FORBIDDEN_PATTERNS: readonly string[] = [
  "I don't have real-time data",
  "As an AI I cannot",
  "I recommend consulting a professional",
  "I understand your concern",
  "I'm just an AI",
  "I cannot provide real-time",
  "please consult a professional",
  "I'm not able to provide",
]

// Classifies the response mode based on message content, attachments, and agent context.
// The returned mode is injected as a [MODE: ...] tag into the system prompt so the model
// can self-regulate output style. The tag is stripped from the final reply before delivery.
export function classifyMode(input: ClassifyInput): ResponseMode {
  const { userMessage, hasImage, hasAudio, agentId } = input
  const lower = userMessage.toLowerCase()

  if (hasAudio) return 'audio_note'
  if (hasImage) return 'photo_damage'

  if (agentId) {
    if (agentId === 'property-climate-risk' || agentId === 'climate-risk') return 'property_risk'
    if (agentId === 'insurance-navigator') return 'insurance'
    if (agentId === 'damage-documentation') return 'photo_damage'
    if (agentId === 'contractor-coordination') return 'action_coordination'
    if (agentId === 'emergency-resilience') return 'incident'
  }

  const incidentTerms = ['emergency', 'evacuate', 'shelter', 'disaster', 'collapsed', 'fire spread', 'mandatory evacuation', 'right now', 'happening', 'water is rising', 'actively']
  if (incidentTerms.some(t => lower.includes(t))) return 'incident'

  const propertyRiskTerms = ['flood', 'wildfire', 'earthquake', 'hurricane', 'storm surge', 'sea level', 'climate risk', 'property risk', 'hazard']
  if (propertyRiskTerms.some(t => lower.includes(t))) return 'property_risk'

  const actionTerms = ['call my', 'contact my', 'schedule', 'contractor', 'repair', 'remediation', 'send', 'email', 'reach out', 'call for me', 'can you call', 'please call', 'call them']
  if (actionTerms.some(t => lower.includes(t))) return 'action_coordination'

  const insuranceTerms = ['claim', 'policy', 'insurer', 'adjuster', 'coverage', 'deductible', 'premium', 'loss', 'damage report']
  if (insuranceTerms.some(t => lower.includes(t))) return 'insurance'

  return 'general_sustainability'
}

const MODE_TAG_PREFIX_REGEX = /^\[MODE:\s*\w+\]\s*/

export function stripModeTag(text: string): string {
  return text.replace(MODE_TAG_PREFIX_REGEX, '')
}

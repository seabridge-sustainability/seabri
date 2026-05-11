export type RiskTier = 'EXTREME' | 'HIGH' | 'MEDIUM' | 'LOW' | 'MINIMAL' | 'UNKNOWN'

export interface PropertyRiskContext {
  address: string
  floodRisk?: RiskTier
  wildfireRisk?: RiskTier
  hurricaneRisk?: RiskTier
  earthquakeRisk?: RiskTier
  heatRisk?: RiskTier
  overallTier?: RiskTier
}

const TIER_EMOJI: Record<RiskTier, string> = {
  EXTREME: '🔴',
  HIGH: '🟠',
  MEDIUM: '🟡',
  LOW: '🟢',
  MINIMAL: '⚪',
  UNKNOWN: '⬜',
}

/** Formats a single risk field as "LABEL: TIER EMOJI". */
function riskLine(label: string, tier?: RiskTier): string | null {
  if (!tier || tier === 'UNKNOWN') return null
  return `${label}: ${tier} ${TIER_EMOJI[tier]}`
}

/**
 * Builds a compact inline context string for the AI system prompt.
 * Example: [PROPERTY: 123 Main St | FLOOD: HIGH 🟠 | HURRICANE: EXTREME 🔴]
 */
export function buildPropertyRiskContext(ctx: PropertyRiskContext): string {
  const parts: string[] = [`PROPERTY: ${ctx.address}`]

  const lines = [
    riskLine('FLOOD', ctx.floodRisk),
    riskLine('WILDFIRE', ctx.wildfireRisk),
    riskLine('HURRICANE', ctx.hurricaneRisk),
    riskLine('EARTHQUAKE', ctx.earthquakeRisk),
    riskLine('HEAT', ctx.heatRisk),
  ].filter((l): l is string => l !== null)

  parts.push(...lines)
  if (ctx.overallTier && ctx.overallTier !== 'UNKNOWN') {
    parts.push(`OVERALL: ${ctx.overallTier} ${TIER_EMOJI[ctx.overallTier]}`)
  }

  return `[${parts.join(' | ')}]`
}

/**
 * Formats a user-facing risk card block suitable for sending as a message.
 * Uses visual risk bars.
 */
export function formatPropertyRiskCard(ctx: PropertyRiskContext): string {
  const lines: string[] = [
    `📍 *Property Risk Assessment*`,
    `*${ctx.address}*`,
    '',
  ]

  const risks: Array<[string, RiskTier | undefined]> = [
    ['🌊 Flood', ctx.floodRisk],
    ['🔥 Wildfire', ctx.wildfireRisk],
    ['🌀 Hurricane', ctx.hurricaneRisk],
    ['⚡ Earthquake', ctx.earthquakeRisk],
    ['🌡️ Heat', ctx.heatRisk],
  ]

  for (const [label, tier] of risks) {
    if (tier && tier !== 'UNKNOWN') {
      lines.push(`${label}: *${tier}* ${TIER_EMOJI[tier]}`)
    }
  }

  if (ctx.overallTier && ctx.overallTier !== 'UNKNOWN') {
    lines.push('')
    lines.push(`Overall Risk: *${ctx.overallTier}* ${TIER_EMOJI[ctx.overallTier]}`)
  }

  lines.push('')
  lines.push('_Powered by SeaBridgeAI climate risk models_')

  return lines.join('\n')
}

/** Normalizes a raw risk string from the backend into a RiskTier. */
export function normalizeRiskTier(raw: string | undefined): RiskTier {
  if (!raw) return 'UNKNOWN'
  const upper = raw.toUpperCase().trim()
  const valid: RiskTier[] = ['EXTREME', 'HIGH', 'MEDIUM', 'LOW', 'MINIMAL']
  return valid.includes(upper as RiskTier) ? (upper as RiskTier) : 'UNKNOWN'
}

/**
 * agent_bridge.ts
 *
 * Augments OpenSeaBri agent responses with quantitative data from the
 * SeaBridgeAI backend when it is reachable.  Each exported function returns
 * a formatted, human-readable context string ready for injection into agent
 * prompts.  All functions return an empty string (never throw) when the
 * backend is unavailable or returns an error.
 */

import {
  isSeaBridgeAvailable,
  getClimateRiskData,
  getNatureRiskData,
  getTransitionRiskData,
  getSustainabilityBrief,
} from './seabridge_client'

// ── Helpers ────────────────────────────────────────────────────────────────

function safeNum(value: any, decimals = 1): string {
  const n = parseFloat(value)
  return isNaN(n) ? 'N/A' : n.toFixed(decimals)
}

function safeStr(value: any, fallback = 'N/A'): string {
  return value != null && String(value).trim() !== '' ? String(value) : fallback
}

// ── Public exports ─────────────────────────────────────────────────────────

/**
 * Build a climate risk context block for agent injection.
 *
 * @param location  Human-readable location label (used in the heading only).
 * @param companyId SeaBridgeAI company ObjectId (optional — omit for location-only context).
 * @returns         Formatted context string, or empty string when unavailable.
 */
export async function augmentClimateRiskContext(
  location: string,
  companyId?: string
): Promise<string> {
  try {
    if (!(await isSeaBridgeAvailable())) return ''
    if (!companyId) return ''

    const raw = await getClimateRiskData(companyId)
    if (!raw) return ''

    // The proxy endpoint returns the climate risk record directly.
    const record = Array.isArray(raw) ? raw[0] : raw

    const lines: string[] = [
      `## SeaBridgeAI Climate Risk Data — ${location}`,
      `Company ID: ${safeStr(record?.company_id ?? companyId)}`,
    ]

    // Physical risk scores (field names from RiskClimateRisk model)
    if (record?.flood_risk != null)
      lines.push(`Flood risk score: ${safeNum(record.flood_risk)}/10`)
    if (record?.wildfire_risk != null)
      lines.push(`Wildfire risk score: ${safeNum(record.wildfire_risk)}/10`)
    if (record?.heat_risk != null)
      lines.push(`Heat stress score: ${safeNum(record.heat_risk)}/10`)
    if (record?.drought_risk != null)
      lines.push(`Drought risk score: ${safeNum(record.drought_risk)}/10`)
    if (record?.overall_score != null)
      lines.push(`Overall climate risk score: ${safeNum(record.overall_score)}/10`)
    if (record?.period)
      lines.push(`Assessment period: ${safeStr(record.period)}`)
    if (record?.notes)
      lines.push(`Notes: ${safeStr(record.notes)}`)

    return lines.join('\n')
  } catch {
    return ''
  }
}

/**
 * Build a nature risk context block for agent injection.
 *
 * @param companyId SeaBridgeAI company ObjectId (optional).
 * @returns         Formatted context string, or empty string when unavailable.
 */
export async function augmentNatureRiskContext(
  companyId?: string
): Promise<string> {
  try {
    if (!(await isSeaBridgeAvailable())) return ''
    if (!companyId) return ''

    const raw = await getNatureRiskData(companyId)
    if (!raw) return ''

    const record = Array.isArray(raw) ? raw[0] : raw

    const lines: string[] = [
      '## SeaBridgeAI Nature Risk Data',
      `Company ID: ${safeStr(record?.company_id ?? companyId)}`,
    ]

    if (record?.leap_phase)
      lines.push(`LEAP phase completed: ${safeStr(record.leap_phase)}`)
    if (record?.risk_ratings) {
      lines.push('Risk ratings:')
      for (const [k, v] of Object.entries(record.risk_ratings)) {
        lines.push(`  ${k}: ${safeStr(v)}`)
      }
    }
    if (record?.executive_summary)
      lines.push(`Executive summary: ${safeStr(record.executive_summary)}`)
    if (record?.period)
      lines.push(`Assessment period: ${safeStr(record.period)}`)

    return lines.join('\n')
  } catch {
    return ''
  }
}

/**
 * Build a transition risk context block for agent injection.
 *
 * @param companyId SeaBridgeAI company ObjectId (optional).
 * @returns         Formatted context string, or empty string when unavailable.
 */
export async function augmentTransitionRiskContext(
  companyId?: string
): Promise<string> {
  try {
    if (!(await isSeaBridgeAvailable())) return ''
    if (!companyId) return ''

    const raw = await getTransitionRiskData(companyId)
    if (!raw) return ''

    const record = Array.isArray(raw) ? raw[0] : raw

    const lines: string[] = [
      '## SeaBridgeAI Transition Risk Data',
      `Company ID: ${safeStr(record?.company_id ?? companyId)}`,
    ]

    if (record?.risk_categories) {
      lines.push('Risk categories:')
      for (const cat of record.risk_categories) {
        lines.push(`  ${safeStr(cat?.name ?? cat)}: ${safeStr(cat?.score ?? cat?.level)}`)
      }
    }
    if (record?.overall_score != null)
      lines.push(`Overall transition risk score: ${safeNum(record.overall_score)}/10`)
    if (record?.period)
      lines.push(`Assessment period: ${safeStr(record.period)}`)

    return lines.join('\n')
  } catch {
    return ''
  }
}

/**
 * Build a sustainability intelligence context block for agent injection.
 *
 * @param sector GICS sector name (defaults to 'General').
 * @returns      Formatted context string, or empty string when unavailable.
 */
export async function augmentSustainabilityContext(
  sector = 'General'
): Promise<string> {
  try {
    if (!(await isSeaBridgeAvailable())) return ''

    const raw = await getSustainabilityBrief(sector)
    if (!raw) return ''

    const lines: string[] = [
      `## SeaBridgeAI Sustainability Intelligence — ${safeStr(raw?.sector ?? sector)}`,
    ]

    if (raw?.timestamp)
      lines.push(`Data timestamp: ${safeStr(raw.timestamp)}`)

    if (Array.isArray(raw?.bullets) && raw.bullets.length > 0) {
      lines.push('Key intelligence bullets:')
      for (const bullet of raw.bullets) {
        lines.push(`  • ${safeStr(bullet)}`)
      }
    }

    if (raw?.sources) {
      const sourceNames = Object.keys(raw.sources)
      if (sourceNames.length > 0) {
        lines.push(`Sources consulted: ${sourceNames.join(', ')}`)
      }
    }

    return lines.join('\n')
  } catch {
    return ''
  }
}

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
  getTargets,
  getMateriality,
  getRegulationMonitoring,
  getWorldRiskScores,
  getCountryRisk,
  getAgentLatest,
  listMcpTools,
} from './seabridge_client.js'

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

/**
 * Build a sustainability targets context block for agent injection.
 * Lists up to the first 10 targets for brevity.
 *
 * @param assetId SeaBridgeAI asset ObjectId.
 * @param opts    Optional filters: category, status, limit.
 * @returns       Formatted context string, or empty string when unavailable.
 */
export async function augmentTargetsContext(
  assetId: string,
  opts: { category?: string; status?: string; limit?: number } = {}
): Promise<string> {
  try {
    if (!(await isSeaBridgeAvailable())) return ''
    if (!assetId) return ''

    const raw = await getTargets(assetId, opts)
    if (!raw) return ''

    const rows: any[] = Array.isArray(raw?.data) ? raw.data : []
    if (rows.length === 0) return ''

    const lines: string[] = [
      '## SeaBridgeAI Sustainability Targets',
      `Asset ID: ${safeStr(raw?.asset_id ?? assetId)}`,
      `Total targets: ${safeStr(raw?.total ?? rows.length)}`,
    ]

    const preview = rows.slice(0, 10)
    for (const r of preview) {
      const name = safeStr(r?.name)
      const category = safeStr(r?.category)
      const status = safeStr(r?.target_status)
      const baseline = safeNum(r?.baseline_value)
      const target = safeNum(r?.target_value)
      const unit = safeStr(r?.unit, '')
      const targetYear = safeStr(r?.target_year)
      lines.push(
        `- ${name} (${category}): ${baseline} → ${target} ${unit} by ${targetYear} [${status}]`
      )
    }
    if (rows.length > preview.length) {
      lines.push(`… and ${rows.length - preview.length} more.`)
    }

    return lines.join('\n')
  } catch {
    return ''
  }
}

/**
 * Build a materiality assessment context block for agent injection.
 *
 * @param companyId SeaBridgeAI company ObjectId.
 * @param year      Optional assessment year.
 * @returns         Formatted context string, or empty string when unavailable.
 */
export async function augmentMaterialityContext(
  companyId: string,
  year?: string
): Promise<string> {
  try {
    if (!(await isSeaBridgeAvailable())) return ''
    if (!companyId) return ''

    const raw = await getMateriality(companyId, year)
    if (!raw) return ''

    const data = raw?.data ?? null
    if (!data) return ''

    const topicRows: any[] = Array.isArray(data?.topics)
      ? data.topics
      : Array.isArray(data?.material_topics)
      ? data.material_topics
      : Array.isArray(data?.assessment)
      ? data.assessment
      : []

    const lines: string[] = [
      '## SeaBridgeAI Materiality Assessment',
      `Company ID: ${safeStr(raw?.company_id ?? companyId)}`,
      `Year: ${safeStr(raw?.year ?? year)}`,
    ]

    if (topicRows.length === 0) {
      return lines.join('\n')
    }

    lines.push('Material topics:')
    const preview = topicRows.slice(0, 15)
    for (const t of preview) {
      const topic = safeStr(t?.topic ?? t?.name ?? t?.label)
      const impact = safeNum(t?.impact_score ?? t?.impact)
      const financial = safeNum(t?.financial_score ?? t?.financial)
      const rating = safeStr(t?.rating, '')
      const ratingSuffix = rating && rating !== 'N/A' ? ` — ${rating}` : ''
      lines.push(
        `  • ${topic}: impact=${impact}, financial=${financial}${ratingSuffix}`
      )
    }
    if (topicRows.length > preview.length) {
      lines.push(`  … and ${topicRows.length - preview.length} more topics.`)
    }

    return lines.join('\n')
  } catch {
    return ''
  }
}

/**
 * Build a regulation monitoring context block for agent injection.
 * Handles completed (includes trimmed report excerpt), processing, and
 * not_generated states. Never triggers a live agent run.
 *
 * @param companyId SeaBridgeAI company ObjectId.
 * @param year      Optional report year.
 * @returns         Formatted context string, or empty string when unavailable
 *                  or when no report has been generated yet.
 */
export async function augmentRegulationContext(
  companyId: string,
  year?: string
): Promise<string> {
  try {
    if (!(await isSeaBridgeAvailable())) return ''
    if (!companyId) return ''

    const raw = await getRegulationMonitoring(companyId, year)
    if (!raw) return ''

    const data = raw?.data ?? null
    const effectiveYear = safeStr(raw?.year ?? year)

    const lines: string[] = [
      '## SeaBridgeAI Regulation Monitoring',
      `Company ID: ${safeStr(raw?.company_id ?? companyId)}`,
      `Year: ${effectiveYear}`,
    ]

    if (!data) {
      return ''
    }

    const status = data?.status === 'completed' ? 'completed' : 'processing'
    lines.push(`Status: ${status}`)

    if (status === 'completed' && data?.report) {
      const report = String(data.report)
      const excerpt = report.length > 500 ? `${report.slice(0, 500)}…` : report
      lines.push('Report excerpt:')
      lines.push(excerpt)
    } else if (status === 'processing' && data?.message) {
      lines.push(`Note: ${safeStr(data.message)}`)
    }

    return lines.join('\n')
  } catch {
    return ''
  }
}

/**
 * Build a world-risk (Composite Instability Index) context block.
 * When isoCode is provided, emits a single-country block; otherwise emits
 * the top-N highest-risk countries across the 35-country tracked set.
 *
 * @param isoCode Optional ISO-3166 alpha-2 country code.
 * @param topN    Number of countries to include when no isoCode given (default 10).
 * @returns       Formatted context string, or empty string when unavailable.
 */
export async function augmentWorldRiskContext(
  isoCode?: string,
  topN = 10
): Promise<string> {
  try {
    if (!(await isSeaBridgeAvailable())) return ''

    if (isoCode) {
      const raw = await getCountryRisk(isoCode)
      if (!raw) return ''
      const record = raw?.data ?? raw
      const lines: string[] = [
        `## SeaBridgeAI World Risk — ${safeStr(record?.country ?? isoCode)}`,
        `ISO code: ${safeStr(record?.iso_code ?? isoCode)}`,
      ]
      if (record?.cii_score != null)
        lines.push(`CII score: ${safeNum(record.cii_score)}/100`)
      if (record?.signals) {
        lines.push('Signal components:')
        for (const [k, v] of Object.entries(record.signals)) {
          lines.push(`  ${k}: ${safeNum(v)}`)
        }
      }
      if (record?.updated_at)
        lines.push(`Updated: ${safeStr(record.updated_at)}`)
      return lines.join('\n')
    }

    const raw = await getWorldRiskScores()
    if (!raw) return ''
    const rows: any[] = Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw?.scores)
      ? raw.scores
      : Array.isArray(raw)
      ? raw
      : []
    if (rows.length === 0) return ''

    const sorted = [...rows].sort(
      (a, b) => (parseFloat(b?.cii_score) || 0) - (parseFloat(a?.cii_score) || 0)
    )
    const lines: string[] = [
      `## SeaBridgeAI World Risk — Top ${Math.min(topN, sorted.length)} highest-risk countries`,
    ]
    for (const r of sorted.slice(0, topN)) {
      const name = safeStr(r?.country ?? r?.name)
      const iso = safeStr(r?.iso_code ?? r?.iso)
      const score = safeNum(r?.cii_score)
      lines.push(`  • ${name} (${iso}): CII ${score}/100`)
    }
    return lines.join('\n')
  } catch {
    return ''
  }
}

/**
 * Build a context block from the most recent cached agent run for the given
 * agent/scope pair.  Examples:
 *   augmentAgentLatestContext('esg_brief', 'Energy')
 *   augmentAgentLatestContext('insights', '<companyId>', { assistant_type: 'climate_risk' })
 *
 * @param name   Agent name (see /openseabri/agent/catalog).
 * @param scope  Agent-specific scope path segment.
 * @param params Optional agent-specific query params (e.g. assistant_type).
 * @returns      Formatted context string, or empty string when unavailable.
 */
export async function augmentAgentLatestContext(
  name: string,
  scope: string,
  params?: Record<string, string | number>
): Promise<string> {
  try {
    if (!(await isSeaBridgeAvailable())) return ''
    if (!name || !scope) return ''

    const raw = await getAgentLatest(name, scope, { params })
    if (!raw) return ''
    const result = raw?.result ?? raw?.data ?? raw
    if (!result) return ''

    const lines: string[] = [
      `## SeaBridgeAI Agent Result — ${safeStr(name)}`,
      `Scope: ${safeStr(scope)}`,
    ]
    if (raw?.run_id) lines.push(`Run ID: ${safeStr(raw.run_id)}`)
    if (raw?.finished_at) lines.push(`Finished: ${safeStr(raw.finished_at)}`)

    if (typeof result === 'string') {
      const excerpt = result.length > 800 ? `${result.slice(0, 800)}…` : result
      lines.push(excerpt)
    } else if (Array.isArray(result?.bullets)) {
      lines.push('Key points:')
      for (const b of result.bullets.slice(0, 10)) {
        lines.push(`  • ${safeStr(b)}`)
      }
    } else if (result?.summary) {
      const s = String(result.summary)
      lines.push(s.length > 800 ? `${s.slice(0, 800)}…` : s)
    } else {
      try {
        const serialised = JSON.stringify(result)
        const excerpt =
          serialised.length > 800 ? `${serialised.slice(0, 800)}…` : serialised
        lines.push(excerpt)
      } catch {
        // non-serialisable result — skip body
      }
    }

    return lines.join('\n')
  } catch {
    return ''
  }
}

/**
 * Build a context block listing available MCP tools.  Useful for injecting
 * tool-choice guidance into agent prompts.  Optional filter matches against
 * tool name and description (case-insensitive substring).
 *
 * @param filter Optional case-insensitive substring filter.
 * @param limit  Maximum number of tools to list (default 25).
 * @returns      Formatted context string, or empty string when unavailable.
 */
export async function augmentMcpToolsContext(
  filter?: string,
  limit = 25
): Promise<string> {
  try {
    if (!(await isSeaBridgeAvailable())) return ''

    const raw = await listMcpTools()
    if (!raw) return ''
    const tools: any[] = Array.isArray(raw?.tools) ? raw.tools : []
    if (tools.length === 0) return ''

    const needle = filter?.trim().toLowerCase() ?? ''
    const matched = needle
      ? tools.filter((t) => {
          const name = String(t?.name ?? '').toLowerCase()
          const desc = String(t?.description ?? '').toLowerCase()
          return name.includes(needle) || desc.includes(needle)
        })
      : tools

    if (matched.length === 0) return ''

    const lines: string[] = [
      `## SeaBridgeAI MCP Tools${needle ? ` (filter: "${filter}")` : ''}`,
      `Available: ${matched.length}${
        matched.length > limit ? ` (showing first ${limit})` : ''
      }`,
    ]
    for (const t of matched.slice(0, limit)) {
      const name = safeStr(t?.name)
      const server = safeStr(t?.server_id, '?')
      const desc = safeStr(t?.description, '')
      const descSuffix = desc && desc !== 'N/A' ? ` — ${desc}` : ''
      lines.push(`  • [${server}] ${name}${descSuffix}`)
    }
    return lines.join('\n')
  } catch {
    return ''
  }
}

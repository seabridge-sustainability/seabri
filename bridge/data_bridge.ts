/**
 * data_bridge.ts
 *
 * Read-only data bridge to SeaBridgeAI MongoDB via the OpenSeaBri API proxy.
 * Fetches and normalises risk data into typed summaries for use in
 * OpenSeaBri components.
 *
 * All functions are read-only and never write to SeaBridgeAI MongoDB.
 * All functions catch errors internally and return null / empty array on failure.
 */

import {
  getClimateRiskData,
  getWorldRiskScores,
  getNatureRiskData,
  getTargets,
  getMateriality,
  getRegulationMonitoring,
} from './seabridge_client'

// ── Public interfaces ──────────────────────────────────────────────────────

/** Normalised climate risk summary for a single company. */
export interface ClimateRiskSummary {
  companyId: string
  floodRisk?: number
  wildfireRisk?: number
  heatRisk?: number
  droughtRisk?: number
  overallScore?: number
  period?: string
}

/** Normalised country-level instability (CII) score. */
export interface WorldRiskSummary {
  country: string
  isoCode: string
  riskScore: number
  riskLevel: string
}

/** A single sustainability target record, normalised. */
export interface TargetRecord {
  id?: string
  name?: string
  category?: string
  status?: string
  baselineYear?: number
  targetYear?: number
  baselineValue?: number
  targetValue?: number
  currentValue?: number
  unit?: string
}

/** Normalised targets summary for a single asset. */
export interface TargetsSummary {
  assetId: string
  total: number
  count: number
  targets: TargetRecord[]
}

/** A single material topic rating, normalised. */
export interface MaterialTopic {
  topic: string
  impactScore?: number
  financialScore?: number
  rating?: string
}

/** Normalised materiality assessment for a single company. */
export interface MaterialitySummary {
  companyId: string
  year?: string
  topics: MaterialTopic[]
  raw?: Record<string, any>
}

/** Normalised regulation monitoring report for a single company. */
export interface RegulationSummary {
  companyId: string
  year?: string
  status: 'completed' | 'processing' | 'not_generated'
  report?: string
  message?: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

function toOptionalFloat(value: any): number | undefined {
  const n = parseFloat(value)
  return isNaN(n) ? undefined : n
}

// ── Exported functions ─────────────────────────────────────────────────────

/**
 * Fetch and normalise climate risk data for a company.
 *
 * @param companyId SeaBridgeAI company ObjectId string.
 * @returns         ClimateRiskSummary, or null if unavailable or not found.
 */
export async function getClimateRiskSummary(
  companyId: string
): Promise<ClimateRiskSummary | null> {
  try {
    const raw = await getClimateRiskData(companyId)
    if (!raw) return null

    // The proxy returns either a single record or an array; normalise to one.
    const record = Array.isArray(raw) ? raw[0] : raw
    if (!record) return null

    return {
      companyId: String(record.company_id ?? companyId),
      floodRisk: toOptionalFloat(record.flood_risk),
      wildfireRisk: toOptionalFloat(record.wildfire_risk),
      heatRisk: toOptionalFloat(record.heat_risk),
      droughtRisk: toOptionalFloat(record.drought_risk),
      overallScore: toOptionalFloat(record.overall_score),
      period: record.period != null ? String(record.period) : undefined,
    }
  } catch {
    return null
  }
}

/**
 * Fetch and normalise CII risk scores for all tracked countries.
 *
 * @returns Array of WorldRiskSummary objects sorted by riskScore descending,
 *         or an empty array if unavailable.
 */
export async function getWorldRiskSummaries(): Promise<WorldRiskSummary[]> {
  try {
    const raw = await getWorldRiskScores()
    if (!raw) return []

    // The proxy returns { success, count, scores: [...], timestamp }
    const scores: any[] = raw?.scores ?? (Array.isArray(raw) ? raw : [])

    const summaries: WorldRiskSummary[] = scores
      .map((s: any) => ({
        country: String(s?.name ?? s?.iso ?? ''),
        isoCode: String(s?.iso ?? ''),
        riskScore: parseFloat(s?.score ?? 0),
        riskLevel: String(s?.riskLevel ?? 'unknown'),
      }))
      .filter((s) => s.isoCode !== '')
      .sort((a, b) => b.riskScore - a.riskScore)

    return summaries
  } catch {
    return []
  }
}

/**
 * Fetch nature risk summary data for a company.
 * Returns the raw normalised record (structure varies by LEAP phase completed),
 * or null if unavailable.
 *
 * @param companyId SeaBridgeAI company ObjectId string.
 */
export async function getNatureRiskSummary(
  companyId: string
): Promise<any | null> {
  try {
    const raw = await getNatureRiskData(companyId)
    if (!raw) return null

    const record = Array.isArray(raw) ? raw[0] : raw
    return record ?? null
  } catch {
    return null
  }
}

/**
 * Fetch and normalise sustainability targets for an asset.
 *
 * @param assetId SeaBridgeAI asset ObjectId string.
 * @param opts    Optional filters: category, status, limit.
 * @returns       TargetsSummary, or null if unavailable.
 */
export async function getTargetsSummary(
  assetId: string,
  opts: { category?: string; status?: string; limit?: number } = {}
): Promise<TargetsSummary | null> {
  try {
    const raw = await getTargets(assetId, opts)
    if (!raw) return null

    const rows: any[] = Array.isArray(raw?.data) ? raw.data : []
    const targets: TargetRecord[] = rows.map((r: any) => ({
      id: r?._id != null ? String(r._id) : undefined,
      name: r?.name != null ? String(r.name) : undefined,
      category: r?.category != null ? String(r.category) : undefined,
      status: r?.target_status != null ? String(r.target_status) : undefined,
      baselineYear: toOptionalFloat(r?.baseline_year),
      targetYear: toOptionalFloat(r?.target_year),
      baselineValue: toOptionalFloat(r?.baseline_value),
      targetValue: toOptionalFloat(r?.target_value),
      currentValue: toOptionalFloat(r?.current_value),
      unit: r?.unit != null ? String(r.unit) : undefined,
    }))

    return {
      assetId: String(raw?.asset_id ?? assetId),
      total: Number(raw?.total ?? targets.length),
      count: Number(raw?.count ?? targets.length),
      targets,
    }
  } catch {
    return null
  }
}

/**
 * Fetch and normalise the materiality assessment for a company.
 *
 * @param companyId SeaBridgeAI company ObjectId string.
 * @param year      Optional assessment year.
 * @returns         MaterialitySummary, or null if unavailable or not found.
 */
export async function getMaterialitySummary(
  companyId: string,
  year?: string
): Promise<MaterialitySummary | null> {
  try {
    const raw = await getMateriality(companyId, year)
    if (!raw) return null

    const data = raw?.data ?? null
    if (!data) return null

    // The materiality record shape varies; extract any list of topics we can find.
    const topicRows: any[] = Array.isArray(data?.topics)
      ? data.topics
      : Array.isArray(data?.material_topics)
      ? data.material_topics
      : Array.isArray(data?.assessment)
      ? data.assessment
      : []

    const topics: MaterialTopic[] = topicRows.map((t: any) => ({
      topic: String(t?.topic ?? t?.name ?? t?.label ?? ''),
      impactScore: toOptionalFloat(t?.impact_score ?? t?.impact),
      financialScore: toOptionalFloat(t?.financial_score ?? t?.financial),
      rating: t?.rating != null ? String(t.rating) : undefined,
    }))

    return {
      companyId: String(raw?.company_id ?? companyId),
      year: raw?.year != null ? String(raw.year) : year,
      topics,
      raw: data,
    }
  } catch {
    return null
  }
}

/**
 * Fetch and normalise the persisted regulation monitoring report for a company.
 * Returns status='not_generated' when no report has been produced yet — this
 * accessor will never trigger a new agent run.
 *
 * @param companyId SeaBridgeAI company ObjectId string.
 * @param year      Optional report year.
 * @returns         RegulationSummary, or null if the backend is unavailable.
 */
export async function getRegulationSummary(
  companyId: string,
  year?: string
): Promise<RegulationSummary | null> {
  try {
    const raw = await getRegulationMonitoring(companyId, year)
    if (!raw) return null

    const data = raw?.data ?? null

    if (!data) {
      return {
        companyId: String(raw?.company_id ?? companyId),
        year: raw?.year != null ? String(raw.year) : year,
        status: 'not_generated',
      }
    }

    const status = data?.status === 'completed' ? 'completed' : 'processing'
    return {
      companyId: String(raw?.company_id ?? companyId),
      year: raw?.year != null ? String(raw.year) : year,
      status,
      report: data?.report != null ? String(data.report) : undefined,
      message: data?.message != null ? String(data.message) : undefined,
    }
  } catch {
    return null
  }
}

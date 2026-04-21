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

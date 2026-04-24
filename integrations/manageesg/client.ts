/**
 * integrations/manageesg/client.ts
 *
 * Typed HTTP client for the SeaBridgeAI backend (manageesg-backend).
 * Uses a user-facing JWT (MANAGEESG_API_TOKEN) rather than the bridge API key.
 *
 * This client is intentionally separate from bridge/seabridge_client.ts:
 *   - bridge/ calls the /openseabri proxy with an X-OpenSeaBri-Key
 *   - integrations/manageesg/ calls the full /api/v1 surface as an authenticated user
 *
 * All operations degrade gracefully when the backend is unreachable —
 * every method returns null on error rather than throwing.
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'

export interface ManageEsgConfig {
  baseUrl: string
  token?: string | null
  timeoutMs?: number
}

export interface EsgBrief {
  sector: string
  bullets: string[]
  generated_at: string
  sources: Array<{ name: string; url?: string }>
}

export interface WorldRiskScore {
  iso_code: string
  country: string
  cii: number
  components: Record<string, number>
  updated_at: string
}

export interface CompanyRisk {
  company_id: string
  type: 'climate' | 'nature' | 'transition'
  score: number
  details: Record<string, unknown>
}

export class ManageEsgClient {
  private readonly http: AxiosInstance
  private readonly baseUrl: string
  private available: boolean | null = null
  private lastCheck = 0
  private static readonly CHECK_INTERVAL_MS = 60_000

  constructor(config: ManageEsgConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '')
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (config.token) headers['Authorization'] = `Bearer ${config.token}`
    this.http = axios.create({
      baseURL: `${this.baseUrl}/api/v1`,
      timeout: config.timeoutMs ?? 8000,
      headers,
    })
  }

  static fromEnv(): ManageEsgClient | null {
    const url = process.env.MANAGEESG_API_URL
    if (!url) return null
    return new ManageEsgClient({
      baseUrl: url,
      token: process.env.MANAGEESG_API_TOKEN ?? null,
    })
  }

  async isAvailable(): Promise<boolean> {
    const now = Date.now()
    if (this.available !== null && now - this.lastCheck < ManageEsgClient.CHECK_INTERVAL_MS) {
      return this.available
    }
    try {
      await axios.get(`${this.baseUrl}/health`, { timeout: 3000 })
      this.available = true
    } catch {
      this.available = false
    }
    this.lastCheck = now
    return this.available
  }

  private async safeGet<T>(path: string, config?: AxiosRequestConfig): Promise<T | null> {
    try {
      const { data } = await this.http.get<T>(path, config)
      return data
    } catch (err) {
      if (process.env.OPENSEABRI_DEBUG) {
        console.warn(`[manageesg] GET ${path} failed:`, err instanceof Error ? err.message : err)
      }
      return null
    }
  }

  private async safePost<T>(path: string, body: unknown, config?: AxiosRequestConfig): Promise<T | null> {
    try {
      const { data } = await this.http.post<T>(path, body, config)
      return data
    } catch (err) {
      if (process.env.OPENSEABRI_DEBUG) {
        console.warn(`[manageesg] POST ${path} failed:`, err instanceof Error ? err.message : err)
      }
      return null
    }
  }

  async getSustainabilityBrief(sector = 'General'): Promise<EsgBrief | null> {
    return this.safeGet<EsgBrief>('/esg-intelligence/brief', { params: { sector } })
  }

  async getWorldRiskScores(): Promise<WorldRiskScore[] | null> {
    return this.safeGet<WorldRiskScore[]>('/world-risk/scores')
  }

  async getCountryRisk(iso: string): Promise<WorldRiskScore | null> {
    return this.safeGet<WorldRiskScore>(`/world-risk/country/${encodeURIComponent(iso)}`)
  }

  async getClimateRisk(companyId: string): Promise<CompanyRisk | null> {
    return this.safeGet<CompanyRisk>(`/openseabri/climate-risk/${encodeURIComponent(companyId)}`)
  }

  async getNatureRisk(companyId: string): Promise<CompanyRisk | null> {
    return this.safeGet<CompanyRisk>(`/openseabri/nature-risk/${encodeURIComponent(companyId)}`)
  }

  async getTransitionRisk(companyId: string): Promise<CompanyRisk | null> {
    return this.safeGet<CompanyRisk>(`/openseabri/transition-risk/${encodeURIComponent(companyId)}`)
  }

  async runFeynmanBrief(task: string, deepResearch = false): Promise<unknown | null> {
    return this.safePost('/sustainability-research/research', {
      task,
      mode: deepResearch ? 'deep' : 'standard',
    })
  }

  async quickEsg(query: string): Promise<unknown | null> {
    return this.safePost('/sustainability-research/quick-esg', { query })
  }
}

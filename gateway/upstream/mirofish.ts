import type {
  UpstreamAdapter,
  UpstreamContext,
  UpstreamResponse,
  UpstreamHealth,
  UpstreamStatus,
} from './types.js'

export interface MiroFishConfig {
  baseUrl?: string
  timeout?: number
}

interface MiroFishApiResponse {
  success: boolean
  error?: string
  data?: unknown
  content?: string
}

export class MiroFishAdapter implements UpstreamAdapter {
  readonly id = 'mirofish'
  readonly name = 'MiroFish'
  readonly type = 'service' as const

  private baseUrl: string
  private timeout: number

  constructor(config: MiroFishConfig = {}) {
    const raw = config.baseUrl ?? process.env.MIROFISH_URL ?? 'http://localhost:5001'
    if (!/^https?:\/\//i.test(raw)) {
      throw new Error('MiroFish baseUrl must use http or https scheme')
    }
    this.baseUrl = raw.replace(/\/$/, '')
    this.timeout = config.timeout ?? 15_000
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`, {
        signal: AbortSignal.timeout(5_000),
      })
      return response.ok
    } catch {
      return false
    }
  }

  async routeMessage(prompt: string, context?: UpstreamContext): Promise<UpstreamResponse> {
    const body: Record<string, unknown> = {
      prompt,
      session_id: context?.sessionId,
    }
    if (context?.metadata) {
      body.metadata = context.metadata
    }

    const response = await fetch(`${this.baseUrl}/api/graph/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeout),
    })

    if (!response.ok) {
      throw new Error(`MiroFish returned ${response.status}`)
    }

    const result: MiroFishApiResponse = await response.json()
    if (!result.success) {
      throw new Error(`MiroFish error: ${result.error ?? 'unknown'}`)
    }

    return {
      content: typeof result.content === 'string' ? result.content : JSON.stringify(result.data),
      source: 'mirofish',
    }
  }

  async healthCheck(): Promise<UpstreamHealth> {
    let status: UpstreamStatus = 'unavailable'
    let error: string | undefined
    try {
      const available = await this.isAvailable()
      status = available ? 'available' : 'unavailable'
    } catch (err) {
      status = 'error'
      error = err instanceof Error ? err.message : String(err)
    }
    return { id: this.id, name: this.name, status, error, checkedAt: Date.now() }
  }
}

export interface UpstreamAdapter {
  readonly id: string
  readonly name: string
  readonly type: 'agent' | 'plugin' | 'service'
  isAvailable(): Promise<boolean>
  routeMessage(prompt: string, context?: UpstreamContext): Promise<UpstreamResponse>
}

export interface UpstreamContext {
  sessionId?: string
  agentId?: string
  history?: Array<{ role: string; content: string }>
  metadata?: Record<string, unknown>
}

export interface UpstreamResponse {
  content: string
  source: string
  toolCalls?: UpstreamToolCall[]
  usage?: UpstreamUsage
}

export interface UpstreamToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface UpstreamUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export type UpstreamStatus = 'available' | 'unavailable' | 'error'

export interface UpstreamHealth {
  id: string
  name: string
  status: UpstreamStatus
  error?: string
  checkedAt: number
}

import type {
  UpstreamAdapter,
  UpstreamContext,
  UpstreamResponse,
  UpstreamHealth,
  UpstreamStatus,
} from './types.js'

export interface OpenClawConfig {
  pluginDir?: string
  runtime?: OpenClawRuntime | null
}

export interface OpenClawRuntime {
  loadPlugins(dir: string): Promise<OpenClawPlugin[]>
  dispatchMessage(
    plugin: string,
    message: string,
    context?: Record<string, unknown>
  ): Promise<OpenClawPluginResponse>
}

export interface OpenClawPlugin {
  name: string
  version: string
  subagents: Array<{ name: string; allowedTools: string[] }>
}

export interface OpenClawPluginResponse {
  content: string
  toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }>
}

export class OpenClawAdapter implements UpstreamAdapter {
  readonly id = 'openclaw'
  readonly name = 'OpenClaw'
  readonly type = 'plugin' as const

  private pluginDir: string
  private runtime: OpenClawRuntime | null

  constructor(config: OpenClawConfig = {}) {
    this.pluginDir = config.pluginDir ?? process.env.OPENCLAW_PLUGIN_DIR ?? ''
    this.runtime = config.runtime ?? null
  }

  async isAvailable(): Promise<boolean> {
    if (!this.runtime || !this.pluginDir) return false
    try {
      const plugins = await this.runtime.loadPlugins(this.pluginDir)
      return plugins.length > 0
    } catch {
      return false
    }
  }

  async routeMessage(prompt: string, context?: UpstreamContext): Promise<UpstreamResponse> {
    if (!this.runtime) {
      throw new Error('OpenClaw runtime not initialized')
    }

    const pluginName = context?.metadata?.plugin as string | undefined
    if (!pluginName) {
      throw new Error('OpenClaw requires metadata.plugin to route messages')
    }

    const plugins = await this.runtime.loadPlugins(this.pluginDir)
    const valid = plugins.some((p) => p.name === pluginName)
    if (!valid) {
      throw new Error(`Unknown plugin: ${pluginName}`)
    }

    const result = await this.runtime.dispatchMessage(pluginName, prompt, {
      sessionId: context?.sessionId,
      agentId: context?.agentId,
      history: context?.history,
    })

    return {
      content: result.content,
      source: `openclaw:${pluginName}`,
      toolCalls: result.toolCalls?.map((tc) => ({
        id: tc.id,
        name: tc.name,
        arguments: tc.arguments,
      })),
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

  async listPlugins(): Promise<OpenClawPlugin[]> {
    if (!this.runtime || !this.pluginDir) return []
    return this.runtime.loadPlugins(this.pluginDir)
  }
}

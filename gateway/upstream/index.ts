import type { UpstreamAdapter, UpstreamHealth } from './types.js'
import { HermesAdapter, type HermesConfig } from './hermes.js'
import { MiroFishAdapter, type MiroFishConfig } from './mirofish.js'
import { OpenClawAdapter, type OpenClawConfig } from './openclaw.js'

export { HermesAdapter, MiroFishAdapter, OpenClawAdapter }
export type { HermesConfig, MiroFishConfig, OpenClawConfig }
export type { OpenClawRuntime, OpenClawPlugin, OpenClawPluginResponse } from './openclaw.js'
export type {
  UpstreamAdapter,
  UpstreamContext,
  UpstreamResponse,
  UpstreamToolCall,
  UpstreamUsage,
  UpstreamStatus,
  UpstreamHealth,
} from './types.js'

export class UpstreamRegistry {
  private adapters = new Map<string, UpstreamAdapter>()

  register(adapter: UpstreamAdapter): void {
    this.adapters.set(adapter.id, adapter)
  }

  unregister(id: string): boolean {
    return this.adapters.delete(id)
  }

  get(id: string): UpstreamAdapter | undefined {
    return this.adapters.get(id)
  }

  has(id: string): boolean {
    return this.adapters.has(id)
  }

  list(): UpstreamAdapter[] {
    return [...this.adapters.values()]
  }

  async healthCheckAll(): Promise<UpstreamHealth[]> {
    const checks = this.list().map(async (adapter) => {
      let status: UpstreamHealth['status'] = 'unavailable'
      let error: string | undefined
      try {
        const available = await adapter.isAvailable()
        status = available ? 'available' : 'unavailable'
      } catch (err) {
        status = 'error'
        error = err instanceof Error ? err.message : String(err)
      }
      return {
        id: adapter.id,
        name: adapter.name,
        status,
        error,
        checkedAt: Date.now(),
      }
    })
    return Promise.all(checks)
  }

  async routeToFirst(
    prompt: string,
    context?: import('./types.js').UpstreamContext
  ): Promise<import('./types.js').UpstreamResponse | null> {
    const errors: Array<{ adapterId: string; error: string }> = []
    for (const adapter of this.adapters.values()) {
      try {
        const available = await adapter.isAvailable()
        if (!available) continue
        return await adapter.routeMessage(prompt, context)
      } catch (err) {
        errors.push({
          adapterId: adapter.id,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }
    if (errors.length > 0) {
      const summary = errors.map((e) => `${e.adapterId}: ${e.error}`).join('; ')
      console.error(`[upstream] routeToFirst failed — ${summary}`)
    }
    return null
  }
}

export function createDefaultRegistry(config?: {
  hermes?: HermesConfig
  mirofish?: MiroFishConfig
  openclaw?: OpenClawConfig
}): UpstreamRegistry {
  const registry = new UpstreamRegistry()
  registry.register(new HermesAdapter(config?.hermes))
  registry.register(new MiroFishAdapter(config?.mirofish))
  registry.register(new OpenClawAdapter(config?.openclaw))
  return registry
}

export const upstreamRegistry = new UpstreamRegistry()

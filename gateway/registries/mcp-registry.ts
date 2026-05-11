import type { McpServerConfig } from '../mcp/client.js'
import { McpClient, MCP_SERVERS } from '../mcp/client.js'

export type McpServerStatus = 'idle' | 'running' | 'error' | 'stopped'

export interface McpServerEntry {
  config: McpServerConfig
  status: McpServerStatus
  client: McpClient
  lastHealthCheck: number
  errorMessage?: string
}

export class McpRegistry {
  private readonly servers = new Map<string, McpServerEntry>()

  register(config: McpServerConfig): void {
    if (this.servers.has(config.id)) {
      throw new Error(`McpRegistryError: server "${config.id}" already registered`)
    }
    this.servers.set(config.id, {
      config,
      status: 'idle',
      client: new McpClient(config),
      lastHealthCheck: 0,
    })
  }

  get(id: string): McpServerEntry | undefined {
    return this.servers.get(id)
  }

  list(): McpServerEntry[] {
    return [...this.servers.values()]
  }

  has(id: string): boolean {
    return this.servers.has(id)
  }

  listByStatus(status: McpServerStatus): McpServerEntry[] {
    return [...this.servers.values()].filter((s) => s.status === status)
  }

  listTools(): Array<{ serverId: string; tool: string }> {
    const result: Array<{ serverId: string; tool: string }> = []
    for (const entry of this.servers.values()) {
      for (const tool of entry.config.tools) {
        result.push({ serverId: entry.config.id, tool })
      }
    }
    return result
  }

  findServerForTool(toolName: string): McpServerEntry | undefined {
    for (const entry of this.servers.values()) {
      if (entry.config.tools.includes(toolName)) return entry
    }
    return undefined
  }

  async healthCheck(id: string): Promise<boolean> {
    const entry = this.servers.get(id)
    if (!entry) return false
    try {
      await entry.client.callTool('ping', {})
      entry.status = 'running'
      entry.lastHealthCheck = Date.now()
      entry.errorMessage = undefined
      return true
    } catch (err: unknown) {
      entry.status = 'error'
      entry.lastHealthCheck = Date.now()
      entry.errorMessage = err instanceof Error ? err.message : String(err)
      return false
    }
  }

  async healthCheckAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {}
    for (const id of this.servers.keys()) {
      results[id] = await this.healthCheck(id)
    }
    return results
  }

  unregister(id: string): boolean {
    const entry = this.servers.get(id)
    if (!entry) return false
    entry.client.close()
    return this.servers.delete(id)
  }

  shutdown(): void {
    for (const entry of this.servers.values()) {
      entry.client.close()
      entry.status = 'stopped'
    }
  }

  snapshot(): Array<{ id: string; status: McpServerStatus; tools: string[]; lastHealthCheck: number; error?: string }> {
    return [...this.servers.values()].map((e) => ({
      id: e.config.id,
      status: e.status,
      tools: e.config.tools,
      lastHealthCheck: e.lastHealthCheck,
      error: e.errorMessage,
    }))
  }
}

function buildMcpRegistry(): McpRegistry {
  const registry = new McpRegistry()
  for (const config of MCP_SERVERS) {
    registry.register(config)
  }
  return registry
}

export const mcpRegistry = buildMcpRegistry()

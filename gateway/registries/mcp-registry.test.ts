import { describe, it, expect, vi, beforeEach } from 'vitest'
import { McpRegistry } from './mcp-registry.js'
import type { McpServerConfig } from '../mcp/client.js'

const makeConfig = (overrides: Partial<McpServerConfig> = {}): McpServerConfig => ({
  id: 'test-server',
  command: 'node',
  args: ['server.js'],
  tools: ['tool-a', 'tool-b'],
  ...overrides,
})

describe('McpRegistry', () => {
  let registry: McpRegistry

  beforeEach(() => {
    registry = new McpRegistry()
  })

  it('starts empty', () => {
    expect(registry.list()).toHaveLength(0)
  })

  it('registers and retrieves a server', () => {
    registry.register(makeConfig())
    expect(registry.get('test-server')).toBeDefined()
    expect(registry.get('test-server')?.config.id).toBe('test-server')
    expect(registry.get('test-server')?.status).toBe('idle')
  })

  it('throws on duplicate registration', () => {
    registry.register(makeConfig())
    expect(() => registry.register(makeConfig())).toThrow('already registered')
  })

  it('checks existence with has()', () => {
    expect(registry.has('test-server')).toBe(false)
    registry.register(makeConfig())
    expect(registry.has('test-server')).toBe(true)
  })

  it('lists all registered servers', () => {
    registry.register(makeConfig({ id: 'server-a', tools: ['a'] }))
    registry.register(makeConfig({ id: 'server-b', tools: ['b'] }))
    expect(registry.list()).toHaveLength(2)
  })

  it('filters by status', () => {
    registry.register(makeConfig({ id: 'server-a', tools: ['a'] }))
    registry.register(makeConfig({ id: 'server-b', tools: ['b'] }))
    expect(registry.listByStatus('idle')).toHaveLength(2)
    expect(registry.listByStatus('running')).toHaveLength(0)
  })

  it('lists all tools across servers', () => {
    registry.register(makeConfig({ id: 'server-a', tools: ['tool-1', 'tool-2'] }))
    registry.register(makeConfig({ id: 'server-b', tools: ['tool-3'] }))
    const tools = registry.listTools()
    expect(tools).toHaveLength(3)
    expect(tools).toContainEqual({ serverId: 'server-a', tool: 'tool-1' })
    expect(tools).toContainEqual({ serverId: 'server-b', tool: 'tool-3' })
  })

  it('finds server for a given tool name', () => {
    registry.register(makeConfig({ id: 'server-a', tools: ['alpha'] }))
    registry.register(makeConfig({ id: 'server-b', tools: ['beta'] }))
    const entry = registry.findServerForTool('beta')
    expect(entry).toBeDefined()
    expect(entry?.config.id).toBe('server-b')
  })

  it('returns undefined for unknown tool', () => {
    registry.register(makeConfig())
    expect(registry.findServerForTool('nonexistent')).toBeUndefined()
  })

  it('unregisters a server', () => {
    registry.register(makeConfig())
    expect(registry.unregister('test-server')).toBe(true)
    expect(registry.has('test-server')).toBe(false)
  })

  it('returns false when unregistering unknown server', () => {
    expect(registry.unregister('nonexistent')).toBe(false)
  })

  it('shuts down all servers', () => {
    registry.register(makeConfig({ id: 'a', tools: [] }))
    registry.register(makeConfig({ id: 'b', tools: [] }))
    registry.shutdown()
    for (const entry of registry.list()) {
      expect(entry.status).toBe('stopped')
    }
  })

  it('produces a snapshot of all servers', () => {
    registry.register(makeConfig({ id: 'snap', tools: ['t1'] }))
    const snap = registry.snapshot()
    expect(snap).toHaveLength(1)
    expect(snap[0]).toMatchObject({
      id: 'snap',
      status: 'idle',
      tools: ['t1'],
      lastHealthCheck: 0,
    })
  })

  it('healthCheck returns false for unknown server', async () => {
    expect(await registry.healthCheck('nonexistent')).toBe(false)
  })

  it('healthCheck marks server as error on failure', async () => {
    registry.register(makeConfig())
    const entry = registry.get('test-server')!
    vi.spyOn(entry.client, 'callTool').mockRejectedValue(new Error('connection refused'))
    const result = await registry.healthCheck('test-server')
    expect(result).toBe(false)
    expect(entry.status).toBe('error')
    expect(entry.errorMessage).toBe('connection refused')
    expect(entry.lastHealthCheck).toBeGreaterThan(0)
  })

  it('healthCheck marks server as running on success', async () => {
    registry.register(makeConfig())
    const entry = registry.get('test-server')!
    vi.spyOn(entry.client, 'callTool').mockResolvedValue('pong')
    const result = await registry.healthCheck('test-server')
    expect(result).toBe(true)
    expect(entry.status).toBe('running')
    expect(entry.errorMessage).toBeUndefined()
  })

  it('healthCheckAll checks all servers', async () => {
    registry.register(makeConfig({ id: 'ok', tools: [] }))
    registry.register(makeConfig({ id: 'fail', tools: [] }))
    const okEntry = registry.get('ok')!
    const failEntry = registry.get('fail')!
    vi.spyOn(okEntry.client, 'callTool').mockResolvedValue('pong')
    vi.spyOn(failEntry.client, 'callTool').mockRejectedValue(new Error('timeout'))
    const results = await registry.healthCheckAll()
    expect(results).toEqual({ ok: true, fail: false })
  })
})

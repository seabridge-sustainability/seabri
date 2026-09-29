import { describe, it, expect, vi } from 'vitest'
import { McpClient, MCP_SERVERS } from './client.js'

describe('McpClient', () => {
  it('lazy init: server not spawned until first callTool', () => {
    const client = new McpClient({ id: 'lazy', command: 'echo', args: [], tools: [] })
    expect(client.isRunning()).toBe(false)
  })

  it('resolves tool call to mock result', async () => {
    const client = new McpClient({ id: 'mock', command: 'echo', args: ['{}'], tools: ['test'] })
    vi.spyOn(client, 'callTool').mockResolvedValue({ result: 'en' })
    const result = await client.callTool('langdetect', { text: 'Hello' })
    expect((result as Record<string, unknown>).result).toBe('en')
  })

  it('isRunning returns false before any call', () => {
    const client = new McpClient({
      id: 'test-server',
      command: 'node',
      args: ['-e', 'process.stdin.resume()'],
      tools: ['ping'],
    })
    expect(client.isRunning()).toBe(false)
  })

  it('close() is safe to call on unstarted client', () => {
    const client = new McpClient({ id: 'noop', command: 'echo', args: [], tools: [] })
    expect(() => client.close()).not.toThrow()
  })
})

describe('MCP_SERVERS config', () => {
  it('has nanobot server entry', () => {
    const nanobot = MCP_SERVERS.find(s => s.id === 'nanobot')
    expect(nanobot).toBeDefined()
  })

  it('nanobot exposes langdetect tool', () => {
    const nanobot = MCP_SERVERS.find(s => s.id === 'nanobot')!
    expect(nanobot.tools).toContain('langdetect')
  })

  it('has no gbrain server, even with the retired feature flag set', async () => {
    vi.resetModules()
    vi.stubEnv('OPENSEABRI_GBRAIN_MCP_ENABLED', '1')
    const { MCP_SERVERS: servers } = await import('./client.js')

    expect(servers.find(s => s.id === 'gbrain')).toBeUndefined()

    vi.unstubAllEnvs()
  })

  it('all servers have non-empty command', () => {
    MCP_SERVERS.forEach(s => {
      expect(s.command, `server ${s.id} should have command`).toBeTruthy()
    })
  })

  it('all servers have at least one tool listed', () => {
    MCP_SERVERS.forEach(s => {
      expect(s.tools.length, `server ${s.id} should have tools`).toBeGreaterThan(0)
    })
  })
})

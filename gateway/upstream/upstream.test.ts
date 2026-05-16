import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HermesAdapter } from './hermes.js'
import { MiroFishAdapter } from './mirofish.js'
import { OpenClawAdapter } from './openclaw.js'
import { SpaceAgentInstructionAdapter } from './space-agent.js'
import { UpstreamRegistry, createDefaultRegistry } from './index.js'
import type { UpstreamAdapter } from './types.js'

describe('HermesAdapter', () => {
  it('has correct identity fields', () => {
    const adapter = new HermesAdapter()
    expect(adapter.id).toBe('hermes')
    expect(adapter.name).toBe('Hermes Agent')
    expect(adapter.type).toBe('agent')
  })

  it('isAvailable returns false when no agentDir configured', async () => {
    const adapter = new HermesAdapter({ agentDir: '' })
    expect(await adapter.isAvailable()).toBe(false)
  })

  it('healthCheck returns unavailable when not configured', async () => {
    const adapter = new HermesAdapter({ agentDir: '' })
    const health = await adapter.healthCheck()
    expect(health.id).toBe('hermes')
    expect(health.status).toBe('unavailable')
    expect(health.checkedAt).toBeGreaterThan(0)
  })
})

describe('MiroFishAdapter', () => {
  it('has correct identity fields', () => {
    const adapter = new MiroFishAdapter()
    expect(adapter.id).toBe('mirofish')
    expect(adapter.name).toBe('MiroFish')
    expect(adapter.type).toBe('service')
  })

  it('uses default baseUrl', () => {
    const adapter = new MiroFishAdapter()
    expect(adapter.id).toBe('mirofish')
  })

  it('isAvailable returns false when service is not running', async () => {
    const adapter = new MiroFishAdapter({ baseUrl: 'http://localhost:59999' })
    expect(await adapter.isAvailable()).toBe(false)
  })

  it('healthCheck returns unavailable when service is down', async () => {
    const adapter = new MiroFishAdapter({ baseUrl: 'http://localhost:59999' })
    const health = await adapter.healthCheck()
    expect(health.id).toBe('mirofish')
    expect(health.status).toBe('unavailable')
  })

  it('routeMessage throws when service is down', async () => {
    const adapter = new MiroFishAdapter({ baseUrl: 'http://localhost:59999', timeout: 1000 })
    await expect(adapter.routeMessage('test')).rejects.toThrow()
  })
})

describe('OpenClawAdapter', () => {
  it('has correct identity fields', () => {
    const adapter = new OpenClawAdapter()
    expect(adapter.id).toBe('openclaw')
    expect(adapter.name).toBe('OpenClaw')
    expect(adapter.type).toBe('plugin')
  })

  it('isAvailable returns false when no runtime', async () => {
    const adapter = new OpenClawAdapter({ runtime: null })
    expect(await adapter.isAvailable()).toBe(false)
  })

  it('isAvailable returns true with working runtime', async () => {
    const mockRuntime = {
      loadPlugins: vi.fn().mockResolvedValue([{ name: 'test', version: '1.0', subagents: [] }]),
      dispatchMessage: vi.fn(),
    }
    const adapter = new OpenClawAdapter({ pluginDir: '/plugins', runtime: mockRuntime })
    expect(await adapter.isAvailable()).toBe(true)
    expect(mockRuntime.loadPlugins).toHaveBeenCalledWith('/plugins')
  })

  it('routeMessage dispatches to named plugin', async () => {
    const mockRuntime = {
      loadPlugins: vi.fn().mockResolvedValue([{ name: 'my-plugin', version: '1.0', subagents: [] }]),
      dispatchMessage: vi.fn().mockResolvedValue({
        content: 'plugin response',
        toolCalls: [{ id: 't1', name: 'search', arguments: { q: 'test' } }],
      }),
    }
    const adapter = new OpenClawAdapter({ pluginDir: '/plugins', runtime: mockRuntime })
    const result = await adapter.routeMessage('hello', {
      metadata: { plugin: 'my-plugin' },
    })
    expect(result.content).toBe('plugin response')
    expect(result.source).toBe('openclaw:my-plugin')
    expect(result.toolCalls).toHaveLength(1)
    expect(result.toolCalls![0].name).toBe('search')
  })

  it('routeMessage throws when no runtime', async () => {
    const adapter = new OpenClawAdapter()
    await expect(adapter.routeMessage('test')).rejects.toThrow('runtime not initialized')
  })

  it('routeMessage throws when no plugin specified', async () => {
    const mockRuntime = {
      loadPlugins: vi.fn(),
      dispatchMessage: vi.fn(),
    }
    const adapter = new OpenClawAdapter({ pluginDir: '/p', runtime: mockRuntime })
    await expect(adapter.routeMessage('test', {})).rejects.toThrow('metadata.plugin')
  })

  it('listPlugins returns empty when no runtime', async () => {
    const adapter = new OpenClawAdapter()
    expect(await adapter.listPlugins()).toEqual([])
  })

  it('listPlugins delegates to runtime', async () => {
    const plugins = [{ name: 'a', version: '1.0', subagents: [] }]
    const mockRuntime = {
      loadPlugins: vi.fn().mockResolvedValue(plugins),
      dispatchMessage: vi.fn(),
    }
    const adapter = new OpenClawAdapter({ pluginDir: '/p', runtime: mockRuntime })
    expect(await adapter.listPlugins()).toEqual(plugins)
  })

  it('healthCheck returns unavailable on runtime failure', async () => {
    const mockRuntime = {
      loadPlugins: vi.fn().mockRejectedValue(new Error('load failed')),
      dispatchMessage: vi.fn(),
    }
    const adapter = new OpenClawAdapter({ pluginDir: '/p', runtime: mockRuntime })
    const health = await adapter.healthCheck()
    expect(health.status).toBe('unavailable')
  })
})

describe('SpaceAgentInstructionAdapter', () => {
  const documents = {
    'README.md': '# Space Agent\n\nA local app for running agent workflows and hosting yourself.',
    'commands/AGENTS.md': '# Commands\n\nUse commands to load skills, run workflow instructions, and keep desktop packaging separate.',
    'server/AGENTS.md': '# Server\n\nServer work must keep API boundaries explicit and avoid leaking secrets.',
  }

  it('has correct identity fields', () => {
    const adapter = new SpaceAgentInstructionAdapter({ documents })
    expect(adapter.id).toBe('space-agent-instructions')
    expect(adapter.name).toBe('Space Agent Instruction Loader')
    expect(adapter.type).toBe('service')
  })

  it('isAvailable returns true with injected documents', async () => {
    const adapter = new SpaceAgentInstructionAdapter({ documents })
    expect(await adapter.isAvailable()).toBe(true)
  })

  it('routes prompts to relevant instruction excerpts without launching upstream code', async () => {
    const adapter = new SpaceAgentInstructionAdapter({ documents })
    const result = await adapter.routeMessage('How should workflow commands load skills?')
    expect(result.source).toBe('space-agent-instructions')
    expect(result.content).toContain('commands/AGENTS.md')
    expect(result.content).toContain('load skills')
    expect(result.toolCalls?.[0].name).toBe('load_space_agent_instructions')
    expect(result.toolCalls?.[0].arguments.patternOnly).toBe(true)
  })
})

describe('UpstreamRegistry', () => {
  let registry: UpstreamRegistry

  beforeEach(() => {
    registry = new UpstreamRegistry()
  })

  function makeAdapter(id: string, available = true): UpstreamAdapter {
    return {
      id,
      name: id,
      type: 'agent',
      isAvailable: vi.fn().mockResolvedValue(available),
      routeMessage: vi.fn().mockResolvedValue({ content: `from ${id}`, source: id }),
    }
  }

  it('register and get', () => {
    const adapter = makeAdapter('test')
    registry.register(adapter)
    expect(registry.get('test')).toBe(adapter)
    expect(registry.has('test')).toBe(true)
  })

  it('unregister', () => {
    registry.register(makeAdapter('test'))
    expect(registry.unregister('test')).toBe(true)
    expect(registry.has('test')).toBe(false)
    expect(registry.unregister('nope')).toBe(false)
  })

  it('list returns all adapters', () => {
    registry.register(makeAdapter('a'))
    registry.register(makeAdapter('b'))
    expect(registry.list()).toHaveLength(2)
  })

  it('healthCheckAll checks all adapters', async () => {
    registry.register(makeAdapter('up', true))
    registry.register(makeAdapter('down', false))
    const results = await registry.healthCheckAll()
    expect(results).toHaveLength(2)
    expect(results.find((r) => r.id === 'up')!.status).toBe('available')
    expect(results.find((r) => r.id === 'down')!.status).toBe('unavailable')
  })

  it('routeToFirst returns from first available adapter', async () => {
    registry.register(makeAdapter('down', false))
    registry.register(makeAdapter('up', true))
    const result = await registry.routeToFirst('hello')
    expect(result).not.toBeNull()
    expect(result!.source).toBe('up')
  })

  it('routeToFirst returns null when none available', async () => {
    registry.register(makeAdapter('down', false))
    const result = await registry.routeToFirst('hello')
    expect(result).toBeNull()
  })

  it('routeToFirst skips adapters that throw', async () => {
    const broken: UpstreamAdapter = {
      id: 'broken',
      name: 'broken',
      type: 'agent',
      isAvailable: vi.fn().mockRejectedValue(new Error('boom')),
      routeMessage: vi.fn(),
    }
    registry.register(broken)
    registry.register(makeAdapter('ok', true))
    const result = await registry.routeToFirst('test')
    expect(result!.source).toBe('ok')
  })
})

describe('createDefaultRegistry', () => {
  it('creates registry with all three adapters', () => {
    const registry = createDefaultRegistry()
    expect(registry.has('hermes')).toBe(true)
    expect(registry.has('mirofish')).toBe(true)
    expect(registry.has('openclaw')).toBe(true)
    expect(registry.has('space-agent-instructions')).toBe(true)
    expect(registry.list()).toHaveLength(4)
  })
})

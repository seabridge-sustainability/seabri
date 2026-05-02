import { describe, it, expect } from 'vitest'
import { AgentRegistry, agentRegistry } from './agent-registry.js'
import type { AgentRegistration } from './agent-registry.js'

const makeAgent = (overrides: Partial<AgentRegistration> = {}): AgentRegistration => ({
  id: 'test-agent',
  name: 'Test Agent',
  description: 'A test agent',
  capabilities: ['general-sustainability'],
  getSystemPrompt: () => 'You are a test agent.',
  builtin: false,
  ...overrides,
})

describe('AgentRegistry', () => {
  it('starts empty', () => {
    const reg = new AgentRegistry()
    expect(reg.list()).toHaveLength(0)
  })

  it('registers and retrieves an agent', () => {
    const reg = new AgentRegistry()
    reg.register(makeAgent())
    expect(reg.get('test-agent')).toBeDefined()
    expect(reg.get('test-agent')?.name).toBe('Test Agent')
  })

  it('throws when registering duplicate id', () => {
    const reg = new AgentRegistry()
    reg.register(makeAgent())
    expect(() => reg.register(makeAgent())).toThrow('already registered')
  })

  it('throws when registering agent without id', () => {
    const reg = new AgentRegistry()
    expect(() => reg.register(makeAgent({ id: '' }))).toThrow('"id" is required')
  })

  it('unregisters an agent', () => {
    const reg = new AgentRegistry()
    reg.register(makeAgent())
    reg.unregister('test-agent')
    expect(reg.has('test-agent')).toBe(false)
  })

  it('throws when unregistering non-existent agent', () => {
    const reg = new AgentRegistry()
    expect(() => reg.unregister('ghost')).toThrow('not registered')
  })

  it('filters by capability', () => {
    const reg = new AgentRegistry()
    reg.register(makeAgent({ id: 'a1', capabilities: ['climate-risk-analysis'] }))
    reg.register(makeAgent({ id: 'a2', capabilities: ['home-energy-advice'] }))
    expect(reg.listByCapability('climate-risk-analysis')).toHaveLength(1)
    expect(reg.listByCapability('home-energy-advice')).toHaveLength(1)
    expect(reg.listByCapability('decarbonization-strategy')).toHaveLength(0)
  })

  it('returns system prompt from getSystemPrompt', () => {
    const reg = new AgentRegistry()
    reg.register(makeAgent({ getSystemPrompt: () => 'custom prompt' }))
    const agent = reg.get('test-agent')
    expect(agent?.getSystemPrompt()).toBe('custom prompt')
  })
})

describe('agentRegistry (singleton)', () => {
  it('has 8 built-in agents', () => {
    expect(agentRegistry.list()).toHaveLength(8)
  })

  it('includes all expected agent ids', () => {
    const ids = agentRegistry.list().map((a) => a.id)
    expect(ids).toContain('climate-risk')
    expect(ids).toContain('general')
    expect(ids).toContain('sustainability-reporting')
    expect(ids).toContain('investment-screening')
  })

  it('all built-in agents have non-empty system prompts', () => {
    for (const agent of agentRegistry.list()) {
      expect(agent.getSystemPrompt().length).toBeGreaterThan(50)
    }
  })

  it('general agent has general-sustainability capability', () => {
    const general = agentRegistry.get('general')
    expect(general?.capabilities).toContain('general-sustainability')
  })
})

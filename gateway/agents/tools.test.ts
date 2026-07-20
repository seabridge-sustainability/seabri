import { describe, it, expect } from 'vitest'
import { getToolsForAgent, OPENKB_TOOLS } from './tools.js'
import type { AnthropicTool } from './tools.js'

describe('getToolsForAgent', () => {
  it('returns web_search for unknown agent', () => {
    const tools = getToolsForAgent('nonexistent-agent')
    expect(tools).toHaveLength(1)
    expect(tools[0].name).toBe('web_search')
  })

  it('returns tools for seabri-orchestrator', () => {
    const tools = getToolsForAgent('seabri-orchestrator')
    const names = tools.map((t) => t.name)
    expect(names).toContain('web_search')
    expect(names).toContain('geocode_address')
    expect(names).toContain('lookup_flood_zone')
    expect(tools.length).toBeGreaterThan(3)
  })

  it('returns tools for climate-risk agent', () => {
    const tools = getToolsForAgent('climate-risk')
    const names = tools.map((t) => t.name)
    expect(names).toContain('web_search')
    expect(names).toContain('geocode_address')
    expect(names).toContain('lookup_flood_zone')
  })

  it('returns tools for home-community agent', () => {
    const tools = getToolsForAgent('home-community')
    const names = tools.map((t) => t.name)
    expect(names).toContain('web_search')
    expect(names).toContain('geocode_address')
    expect(names).toContain('lookup_flood_zone')
  })

  it('returns tools for investment-screening agent', () => {
    const tools = getToolsForAgent('investment-screening')
    const names = tools.map((t) => t.name)
    expect(names).toContain('web_search')
    expect(names).toContain('openkb_status')
  })

  it('returns tools for general agent', () => {
    const tools = getToolsForAgent('general')
    const names = tools.map((t) => t.name)
    expect(names).toContain('web_search')
    expect(names).toContain('openkb_status')
  })

  it('gives nature-biodiversity geocode but no flood zone', () => {
    const tools = getToolsForAgent('nature-biodiversity')
    const names = tools.map((t) => t.name)
    expect(names).toContain('geocode_address')
    expect(names).not.toContain('lookup_flood_zone')
  })

  it('gives insurance-navigator only web search', () => {
    const tools = getToolsForAgent('insurance-navigator')
    expect(tools).toHaveLength(1)
    expect(tools[0].name).toBe('web_search')
  })

  it('all tools have valid schema structure', () => {
    const agents = [
      'seabri-orchestrator', 'climate-risk', 'home-community',
      'investment-screening', 'general', 'nature-biodiversity',
    ]
    for (const agentId of agents) {
      for (const tool of getToolsForAgent(agentId)) {
        expect(tool.name).toBeTruthy()
        expect(tool.description).toBeTruthy()
        expect(tool.input_schema.type).toBe('object')
        expect(Array.isArray(tool.input_schema.required)).toBe(true)
      }
    }
  })
})

describe('OPENKB_TOOLS', () => {
  it('has 4 tools', () => {
    expect(OPENKB_TOOLS).toHaveLength(4)
  })

  it('all require a tenant-bound approval context', () => {
    for (const tool of OPENKB_TOOLS) {
      expect(tool.input_schema.required).toContain('approval_token')
      expect(tool.input_schema.required).toContain('tenant_id')
    }
  })

  it('includes status, add, query, lint', () => {
    const names = OPENKB_TOOLS.map((t) => t.name)
    expect(names).toContain('openkb_status')
    expect(names).toContain('openkb_add')
    expect(names).toContain('openkb_query')
    expect(names).toContain('openkb_lint')
  })
})

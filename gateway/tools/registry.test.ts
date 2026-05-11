import { describe, it, expect, beforeEach } from 'vitest'

// We need to re-import fresh module state per test. Since the registry uses
// module-level state (Map), we reset it by testing the public API behavior.
// For isolation we test functions directly.

describe('Tool Registry', () => {
  // Dynamic import to get fresh module per describe block
  let registerTool: typeof import('./registry.js')['registerTool']
  let getToolsForAgent: typeof import('./registry.js')['getToolsForAgent']
  let executeTool: typeof import('./registry.js')['executeTool']
  let listTools: typeof import('./registry.js')['listTools']
  let hasTool: typeof import('./registry.js')['hasTool']
  let getToolDefinition: typeof import('./registry.js')['getToolDefinition']

  beforeEach(async () => {
    // vitest module cache means we can't truly reset, but we can test additive behavior
    const mod = await import('./registry.js')
    registerTool = mod.registerTool
    getToolsForAgent = mod.getToolsForAgent
    executeTool = mod.executeTool
    listTools = mod.listTools
    hasTool = mod.hasTool
    getToolDefinition = mod.getToolDefinition
  })

  const testTool = {
    name: 'test_tool',
    description: 'A test tool',
    input_schema: {
      type: 'object' as const,
      properties: {
        input: { type: 'string', description: 'Test input' },
      },
      required: ['input'],
    },
  }

  it('registers and retrieves a tool', () => {
    const executor = async () => 'result'
    registerTool(testTool, executor, 'all')

    expect(hasTool('test_tool')).toBe(true)
    expect(getToolDefinition('test_tool')).toEqual(testTool)
  })

  it('lists all registered tools', () => {
    const tools = listTools()
    expect(tools.length).toBeGreaterThan(0)
    expect(tools.some((t) => t.name === 'test_tool')).toBe(true)
  })

  it('filters tools by agent ID', () => {
    const agentTool = {
      ...testTool,
      name: 'agent_specific_tool',
      description: 'Only for climate-risk',
    }
    registerTool(agentTool, async () => 'ok', ['climate-risk'])

    const climateTools = getToolsForAgent('climate-risk')
    expect(climateTools.some((t) => t.name === 'agent_specific_tool')).toBe(true)

    const generalTools = getToolsForAgent('general')
    expect(generalTools.some((t) => t.name === 'agent_specific_tool')).toBe(false)
  })

  it('executes a tool', async () => {
    const execTool = {
      ...testTool,
      name: 'exec_test_tool',
    }
    registerTool(execTool, async (input) => `echo: ${input.input}`)

    const result = await executeTool('exec_test_tool', { input: 'hello' })
    expect(result).toBe('echo: hello')
  })

  it('throws on unknown tool execution', () => {
    expect(() => executeTool('nonexistent', {})).toThrow('Unknown tool')
  })

  it('returns undefined for unknown tool definition', () => {
    expect(getToolDefinition('nonexistent')).toBeUndefined()
  })

  it('rejects invalid tool definition', () => {
    expect(() =>
      registerTool(
        { name: 'bad' } as any,
        async () => 'ok',
      ),
    ).toThrow()
  })

  it('registers OpenKB proxy tools for document-knowledge agents and fails closed without approval', async () => {
    const { registerBuiltinTools } = await import('./register-builtin.js')
    registerBuiltinTools()

    expect(hasTool('openkb_query')).toBe(true)
    expect(getToolsForAgent('sustainability-reporting').some((t) => t.name === 'openkb_query')).toBe(true)
    expect(getToolsForAgent('climate-risk').some((t) => t.name === 'openkb_query')).toBe(false)

    const result = await executeTool('openkb_query', { question: 'What is in the KB?' })
    expect(result).toContain('OpenKB unavailable')
  })
})

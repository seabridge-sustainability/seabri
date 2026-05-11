import { describe, it, expect, vi, beforeEach } from 'vitest'
import { spawn } from 'node:child_process'

vi.mock('../agents/router.js', () => ({
  routeMessage: vi.fn().mockResolvedValue('Mock agent response'),
}))

vi.mock('../sessions/store.js', () => ({
  loadSession: vi.fn().mockResolvedValue(null),
}))

vi.mock('../seabri/task-router.js', () => ({
  routeTask: vi.fn().mockReturnValue({
    taskId: 'task_mock',
    agentId: 'seabri-orchestrator',
    agentName: 'SeaBri Orchestrator',
    modelId: 'claude-sonnet-4-6',
    modelTier: 'sonnet',
    product: 'harness',
    routingReason: 'mock',
    classificationConfidence: 1.0,
    estimatedCostUsd: 0.01,
    estimatedCarbonGrams: 0.05,
    sustainability: { composite: 80, tier: 'excellent' },
  }),
}))

import { dispatch } from './server.js'
import { routeMessage } from '../agents/router.js'
import { loadSession } from '../sessions/store.js'

const mockRouteMessage = vi.mocked(routeMessage)
const mockLoadSession = vi.mocked(loadSession)

beforeEach(() => {
  vi.clearAllMocks()
  mockRouteMessage.mockResolvedValue('Mock agent response')
  mockLoadSession.mockResolvedValue(null)
})

describe('dispatch', () => {
  it('handles initialize request', async () => {
    const res = await dispatch({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
    })
    expect(res).not.toBeNull()
    expect(res!.id).toBe(1)
    expect((res!.result as any).protocolVersion).toBe('2024-11-05')
    expect((res!.result as any).serverInfo.name).toBe('openseabri')
    expect((res!.result as any).capabilities.tools).toBeDefined()
  })

  it('returns null for initialized notification', async () => {
    const res = await dispatch({
      jsonrpc: '2.0',
      method: 'initialized',
    })
    expect(res).toBeNull()
  })

  it('returns null for notifications/initialized', async () => {
    const res = await dispatch({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    })
    expect(res).toBeNull()
  })

  it('handles ping', async () => {
    const res = await dispatch({
      jsonrpc: '2.0',
      id: 2,
      method: 'ping',
    })
    expect(res).not.toBeNull()
    expect(res!.result).toEqual({})
  })

  it('handles tools/list', async () => {
    const res = await dispatch({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/list',
    })
    expect(res).not.toBeNull()
    const tools = (res!.result as any).tools
    expect(Array.isArray(tools)).toBe(true)
    expect(tools.length).toBeGreaterThan(0)
    for (const tool of tools) {
      expect(tool.name).toBeTruthy()
      expect(tool.description).toBeTruthy()
      expect(tool.inputSchema.properties.prompt).toBeDefined()
    }
  })

  it('handles tools/call with valid agent and prompt', async () => {
    const res = await dispatch({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'seabri-orchestrator',
        arguments: { prompt: 'What is flood risk?' },
      },
    })
    expect(res).not.toBeNull()
    expect(res!.error).toBeUndefined()
    const content = (res!.result as any).content
    expect(content[0].type).toBe('text')
    expect(content[0].text).toBe('Mock agent response')
    expect(mockRouteMessage).toHaveBeenCalledWith(
      'seabri-orchestrator',
      'What is flood risk?',
      [],
      undefined,
      undefined,
      'claude-sonnet-4-6',
    )
  })

  it('handles living_companion_incident without calling the LLM router', async () => {
    const res = await dispatch({
      jsonrpc: '2.0',
      id: 44,
      method: 'tools/call',
      params: {
        name: 'living_companion_incident',
        arguments: { message: 'My bathroom is flooding.' },
      },
    })
    expect(res).not.toBeNull()
    expect(res!.error).toBeUndefined()
    const content = (res!.result as any).content
    expect(content[0].text).toContain('IMMEDIATE STEPS')
    expect(mockRouteMessage).not.toHaveBeenCalled()
  })

  it('handles product comparison through MCP without inventing certifications', async () => {
    const res = await dispatch({
      jsonrpc: '2.0',
      id: 45,
      method: 'tools/call',
      params: {
        name: 'compare_products',
        arguments: {
          prompt: 'Compare these products for sustainability.',
          products: [
            { name: 'Bottle A', attributes: { reusable: true, minimalPackaging: true } },
            { name: 'Bottle B', attributes: { notes: 'Unknown supplier details' } },
          ],
        },
      },
    })
    expect(res).not.toBeNull()
    expect(res!.error).toBeUndefined()
    const result = JSON.parse((res!.result as any).content[0].text)
    expect(result.recommendation).toContain('Bottle A')
    expect(JSON.stringify(result)).not.toMatch(/certified|Energy Star|B Corp/i)
  })

  it('handles sustainable compute optimization through MCP with transport-only prompt ignored', async () => {
    const res = await dispatch({
      jsonrpc: '2.0',
      id: 46,
      method: 'tools/call',
      params: {
        name: 'optimize_sustainable_compute',
        arguments: {
          prompt: 'Optimize this recurring extraction workflow.',
          workflow_name: 'Claims intake extraction',
          task_type: 'extraction',
          current_model: 'claude-sonnet-4-6',
          estimated_tokens: 8000,
          latency_priority: 'medium',
          cost_priority: 'high',
          privacy_priority: 'medium',
          sustainability_priority: 'high',
          repeated_task: true,
          cacheable: true,
          batchable: true,
        },
      },
    })
    expect(res).not.toBeNull()
    expect(res!.error).toBeUndefined()
    const result = JSON.parse((res!.result as any).content[0].text)
    expect(result.recommended_model_strategy).toContain('Downshift')
    expect(result.caching_recommendation).toContain('Cache')
    expect(result.telemetry_id).toMatch(/^sco_/)
  })

  it('handles practical sustainability tools through MCP', async () => {
    const cases = [
      {
        name: 'estimate_household_carbon',
        args: { prompt: 'Estimate my footprint', householdSize: 2, monthlyElectricityKwh: 650, preferredLanguage: 'Spanish' },
        expected: 'Rango estimado',
      },
      {
        name: 'plan_home_energy_actions',
        args: { prompt: 'Help me reduce my bill', homeType: 'apartment', budgetLevel: 'low', preferredLanguage: 'es' },
        expected: 'noCostActions',
      },
      {
        name: 'plan_community_sustainability_project',
        args: { prompt: 'Plan a cleanup', organizationType: 'school', goal: 'community cleanup' },
        expected: 'volunteerTaskList',
      },
      {
        name: 'navigate_sustainability_certification',
        args: { prompt: 'Which certification fits?', userType: 'small_business', goal: 'energy readiness' },
        expected: 'does not certify eligibility',
      },
      {
        name: 'check_carbon_offset_quality',
        args: { prompt: 'Check this offset', projectType: 'forest', pricePerTonUsd: 2 },
        expected: 'Verification status is not invented',
      },
      {
        name: 'build_sustainable_purchasing_checklist',
        args: { prompt: 'Make a buying checklist', productCategory: 'backpack', durabilityNeed: 'high' },
        expected: 'buyingChecklist',
      },
      {
        name: 'build_community_resilience_checklist',
        args: { prompt: 'Make a resilience plan', communityType: 'neighborhood', hazards: ['flood'] },
        expected: 'communicationPlan',
      },
    ]

    for (const item of cases) {
      const res = await dispatch({
        jsonrpc: '2.0',
        id: `tool-${item.name}`,
        method: 'tools/call',
        params: { name: item.name, arguments: item.args },
      })
      expect(res).not.toBeNull()
      expect(res!.error).toBeUndefined()
      expect((res!.result as any).content[0].text).toContain(item.expected)
    }
  })

  it('returns error for unknown agent', async () => {
    const res = await dispatch({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'nonexistent-agent',
        arguments: { prompt: 'test' },
      },
    })
    expect(res).not.toBeNull()
    expect(res!.error).toBeDefined()
    expect(res!.error!.message).toContain('unknown agent')
  })

  it('returns error for missing prompt', async () => {
    const res = await dispatch({
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'seabri-orchestrator',
        arguments: {},
      },
    })
    expect(res).not.toBeNull()
    expect(res!.error).toBeDefined()
    expect(res!.error!.message).toContain('missing prompt')
  })

  it('returns error for missing tool name', async () => {
    const res = await dispatch({
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: {},
    })
    expect(res).not.toBeNull()
    expect(res!.error).toBeDefined()
    expect(res!.error!.message).toContain('missing tool name')
  })

  it('returns method not found for unknown method', async () => {
    const res = await dispatch({
      jsonrpc: '2.0',
      id: 8,
      method: 'completely/unknown',
    })
    expect(res).not.toBeNull()
    expect(res!.error).toBeDefined()
    expect(res!.error!.code).toBe(-32601)
    expect(res!.error!.message).toContain('method not found')
  })

  it('handles resources/list', async () => {
    const res = await dispatch({
      jsonrpc: '2.0',
      id: 20,
      method: 'resources/list',
    })
    expect(res).not.toBeNull()
    expect(res!.error).toBeUndefined()
    const resources = (res!.result as any).resources
    expect(Array.isArray(resources)).toBe(true)
    for (const r of resources) {
      expect(r.uri).toMatch(/^openseabri:\/\/skills\//)
      expect(r.name).toBeTruthy()
      expect(r.mimeType).toBe('text/markdown')
    }
  })

  it('handles resources/read for valid skill', async () => {
    const listRes = await dispatch({
      jsonrpc: '2.0',
      id: 21,
      method: 'resources/list',
    })
    const resources = (listRes!.result as any).resources
    if (resources.length === 0) return

    const res = await dispatch({
      jsonrpc: '2.0',
      id: 22,
      method: 'resources/read',
      params: { uri: resources[0].uri },
    })
    expect(res).not.toBeNull()
    expect(res!.error).toBeUndefined()
    const contents = (res!.result as any).contents
    expect(contents).toHaveLength(1)
    expect(contents[0].uri).toBe(resources[0].uri)
    expect(contents[0].mimeType).toBe('text/markdown')
    expect(typeof contents[0].text).toBe('string')
  })

  it('returns error for resources/read with unknown URI', async () => {
    const res = await dispatch({
      jsonrpc: '2.0',
      id: 23,
      method: 'resources/read',
      params: { uri: 'openseabri://skills/nonexistent-skill-xyz' },
    })
    expect(res).not.toBeNull()
    expect(res!.error).toBeDefined()
    expect(res!.error!.message).toContain('skill not found')
  })

  it('returns error for resources/read with invalid URI scheme', async () => {
    const res = await dispatch({
      jsonrpc: '2.0',
      id: 24,
      method: 'resources/read',
      params: { uri: 'invalid://path' },
    })
    expect(res).not.toBeNull()
    expect(res!.error).toBeDefined()
    expect(res!.error!.message).toContain('unknown resource URI')
  })

  it('initialize response advertises resources capability', async () => {
    const res = await dispatch({
      jsonrpc: '2.0',
      id: 25,
      method: 'initialize',
    })
    expect((res!.result as any).capabilities.resources).toBeDefined()
  })

  it('loads session history when sessionId provided', async () => {
    mockLoadSession.mockResolvedValueOnce({
      id: 'test-session',
      name: 'Test',
      agentId: 'seabri-orchestrator',
      history: [{ role: 'user', content: 'prior message' }],
      createdAt: 1000,
      lastActiveAt: 2000,
      compressed: false,
      turnCount: 1,
    })
    await dispatch({
      jsonrpc: '2.0',
      id: 9,
      method: 'tools/call',
      params: {
        name: 'seabri-orchestrator',
        arguments: { prompt: 'Follow up', sessionId: 'test-session' },
      },
    })
    expect(mockLoadSession).toHaveBeenCalledWith('test-session')
    expect(mockRouteMessage).toHaveBeenCalledWith(
      'seabri-orchestrator',
      'Follow up',
      [{ role: 'user', content: 'prior message' }],
      undefined,
      undefined,
      'claude-sonnet-4-6',
    )
  })

  it('uses empty history when session load fails', async () => {
    mockLoadSession.mockRejectedValueOnce(new Error('corrupt'))
    await dispatch({
      jsonrpc: '2.0',
      id: 10,
      method: 'tools/call',
      params: {
        name: 'seabri-orchestrator',
        arguments: { prompt: 'test', sessionId: 'bad-id' },
      },
    })
    expect(mockRouteMessage).toHaveBeenCalledWith(
      'seabri-orchestrator',
      'test',
      [],
      undefined,
      undefined,
      'claude-sonnet-4-6',
    )
  })

  it('preserves request id in response', async () => {
    const res = await dispatch({ jsonrpc: '2.0', id: 'string-id', method: 'ping' })
    expect(res!.id).toBe('string-id')
  })

  it('handles null id', async () => {
    const res = await dispatch({ jsonrpc: '2.0', id: null, method: 'ping' })
    expect(res!.id).toBeNull()
  })

  it('starts as a stdio server when invoked directly', async () => {
    const child = spawn(
      process.execPath,
      ['--import', 'tsx', 'gateway/mcp/server.ts'],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          ANTHROPIC_API_KEY: '',
          OPENSEABRI_DOTENV_OVERRIDE: 'false',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    )

    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    child.stdin.write('{"jsonrpc":"2.0","method":"ping","id":99}\n')
    child.stdin.end()

    const exitCode = await new Promise<number | null>((resolve) => child.on('exit', resolve))
    expect(exitCode).toBe(0)
    expect(stderr).toContain('OpenSeaBri MCP server starting')
    expect(JSON.parse(stdout.trim())).toEqual({ jsonrpc: '2.0', id: 99, result: {} })
  })
})

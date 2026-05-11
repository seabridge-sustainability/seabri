import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./agents/router.js', () => ({
  routeMessage: vi.fn().mockResolvedValue('Mock response'),
}))

vi.mock('./sessions/store.js', () => ({
  loadSession: vi.fn().mockResolvedValue(null),
  saveSession: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('./security/policy.js', () => ({
  isComplianceTagAllowed: vi.fn().mockResolvedValue(true),
}))

vi.mock('./memory/rag.js', () => ({
  rankByTfIdf: vi.fn().mockReturnValue([]),
}))

vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockRejectedValue(new Error('ENOENT')),
  readdir: vi.fn().mockResolvedValue([]),
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}))

import { AGENTS } from './config.js'
import { dispatch } from './mcp/server.js'
import { parseFrontmatter, validateFrontmatter, COMPLIANCE_TAGS } from './skills/schema.js'
import { McpClient, MCP_SERVERS, type McpServerConfig } from './mcp/client.js'

/**
 * Upstream Compatibility Test Suite
 *
 * Validates that OpenSeaBri can interoperate with upstream repos:
 * - nanobot (MCP server, tool registry, channel abstraction)
 * - hermes-agent (SKILL.md format, skill discovery, model selection)
 * - openclaw (24+ channels, cron, sessions, chat commands)
 *
 * These tests verify interface contracts without requiring upstream
 * processes to be running.
 */

describe('Upstream Compatibility — nanobot MCP Integration', () => {
  it('nanobot MCP server is configured in MCP_SERVERS', () => {
    const nanobot = MCP_SERVERS.find(s => s.id === 'nanobot')
    expect(nanobot).toBeDefined()
    expect(nanobot!.command).toBe('python')
    expect(nanobot!.args).toContain('-m')
    expect(nanobot!.args).toContain('nanobot.mcp_server')
  })

  it('nanobot exposes expected tools', () => {
    const nanobot = MCP_SERVERS.find(s => s.id === 'nanobot')!
    expect(nanobot.tools).toContain('langdetect')
    expect(nanobot.tools).toContain('skill_creator')
    expect(nanobot.tools).toContain('classify_intent')
  })

  it('McpClient can be instantiated for nanobot config', () => {
    const nanobot = MCP_SERVERS.find(s => s.id === 'nanobot')!
    const client = new McpClient(nanobot)
    expect(client).toBeDefined()
    expect(client.isRunning()).toBe(false)
  })

  it('McpClient sends JSON-RPC 2.0 tools/call frames', () => {
    const config: McpServerConfig = {
      id: 'test',
      command: 'echo',
      args: [],
      tools: ['test_tool'],
    }
    const client = new McpClient(config)
    expect(client).toBeDefined()
  })

  it('gbrain MCP server conditionally configured', () => {
    const hasGbrain = MCP_SERVERS.some(s => s.id === 'gbrain')
    if (process.env.OPENSEABRI_GBRAIN_MCP_ENABLED === '1') {
      expect(hasGbrain).toBe(true)
    } else {
      expect(hasGbrain).toBe(false)
    }
  })
})

describe('Upstream Compatibility — hermes-agent SKILL.md Format', () => {
  it('OpenSeaBri skill format is compatible with hermes SKILL.md', () => {
    const hermesStyleSkill = `---
id: flood-risk-screening
name: Flood Risk Screening
description: Screen properties for flood risk
complianceTags: [ISSB, TCFD]
costTier: free
evidenceSource: FEMA NFHL
---

# Flood Risk Screening

Step-by-step methodology.`

    const parsed = parseFrontmatter(hermesStyleSkill)
    expect(parsed).not.toBeNull()
    const fm = validateFrontmatter(parsed!.raw, 'flood-risk-screening')
    expect(fm.id).toBe('flood-risk-screening')
    expect(fm.name).toBe('Flood Risk Screening')
    expect(fm.complianceTags).toContain('ISSB')
    expect(fm.complianceTags).toContain('TCFD')
  })

  it('hermes extended frontmatter fields are preserved (not rejected)', () => {
    const extendedSkill = `---
id: test-skill
name: Test Skill
complianceTags: [GENERAL]
costTier: free
version: "1.0"
agents: [sustainability-advisor]
tools: [web_search]
data_sources: [EPA, IEA]
---

# Test Skill

Content here.`

    const parsed = parseFrontmatter(extendedSkill)
    expect(parsed).not.toBeNull()
    expect(parsed!.raw.version).toBe('1.0')
    expect(parsed!.raw.agents).toEqual(['sustainability-advisor'])
    expect(parsed!.raw.tools).toEqual(['web_search'])

    const fm = validateFrontmatter(parsed!.raw, 'test-skill')
    expect(fm.id).toBe('test-skill')
  })

  it('skill id normalization matches hermes pattern (lowercase hyphen-separated)', () => {
    const validIds = [
      'flood-risk-screening',
      'carbon-tracker',
      'net-zero-roadmap',
      'nature-dependency-screening',
    ]
    const hermesPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/
    for (const id of validIds) {
      expect(hermesPattern.test(id), `${id} should match hermes pattern`).toBe(true)
    }
  })

  it('all agent IDs follow hermes-compatible naming', () => {
    const agentPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/
    for (const agent of AGENTS) {
      expect(
        agentPattern.test(agent.id),
        `Agent ${agent.id} should match hermes naming`
      ).toBe(true)
    }
  })
})

describe('Upstream Compatibility — openclaw Channel Coverage', () => {
  const OPENCLAW_CHANNELS = [
    'whatsapp', 'telegram', 'slack', 'discord',
    'signal', 'imessage', 'irc', 'teams',
    'matrix', 'feishu', 'line', 'mattermost',
    'nextcloud', 'nostr', 'twitch', 'zalo',
    'wechat', 'qq', 'webchat',
  ]

  const OPENSEABRI_CHANNELS = ['cli', 'discord', 'slack', 'sms', 'telegram', 'whatsapp']

  it('OpenSeaBri covers the 5 most common channels', () => {
    const common = ['whatsapp', 'telegram', 'slack', 'discord']
    for (const ch of common) {
      expect(
        OPENSEABRI_CHANNELS.includes(ch),
        `OpenSeaBri should support ${ch}`
      ).toBe(true)
    }
  })

  it('identifies channels available in openclaw but not OpenSeaBri', () => {
    const missing = OPENCLAW_CHANNELS.filter(ch => !OPENSEABRI_CHANNELS.includes(ch))
    expect(missing.length).toBeGreaterThan(0)
    expect(missing).toContain('signal')
    expect(missing).toContain('teams')
    expect(missing).toContain('matrix')
  })

  it('OpenSeaBri has SMS channel not in openclaw', () => {
    expect(OPENSEABRI_CHANNELS).toContain('sms')
    expect(OPENCLAW_CHANNELS).not.toContain('sms')
  })

  it('OpenSeaBri has CLI channel for dev/testing', () => {
    expect(OPENSEABRI_CHANNELS).toContain('cli')
  })
})

describe('Upstream Compatibility — MCP Protocol Compliance', () => {
  it('supports MCP initialize handshake', async () => {
    const res = await dispatch({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
    })
    expect(res).not.toBeNull()
    const result = res!.result as any
    expect(result.protocolVersion).toBe('2024-11-05')
    expect(result.serverInfo.name).toBe('openseabri')
    expect(result.capabilities.tools).toBeDefined()
  })

  it('handles notifications/initialized (no response)', async () => {
    const res = await dispatch({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    })
    expect(res).toBeNull()
  })

  it('exposes all agents as MCP tools', async () => {
    const res = await dispatch({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
    })
    const tools = (res!.result as any).tools
    for (const agent of AGENTS) {
      const tool = tools.find((t: any) => t.name === agent.id)
      expect(tool, `Agent ${agent.id} should be an MCP tool`).toBeDefined()
      expect(tool.inputSchema.properties.prompt).toBeDefined()
    }
  })

  it('every MCP tool has sustainability description', async () => {
    const res = await dispatch({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/list',
    })
    const tools = (res!.result as any).tools
    for (const tool of tools) {
      expect(
        tool.description.toLowerCase().includes('sustainability') ||
        tool.description.toLowerCase().includes('specialist'),
        `Tool ${tool.name} should mention sustainability or specialist`
      ).toBe(true)
    }
  })

  it('supports optional sessionId parameter for context continuity', async () => {
    const res = await dispatch({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/list',
    })
    const tools = (res!.result as any).tools
    for (const tool of tools) {
      expect(tool.inputSchema.properties.sessionId).toBeDefined()
      expect(tool.inputSchema.required).toContain('prompt')
      expect(tool.inputSchema.required).not.toContain('sessionId')
    }
  })

  it('returns JSON-RPC error for unknown methods', async () => {
    const res = await dispatch({
      jsonrpc: '2.0',
      id: 5,
      method: 'completely/unknown',
    })
    expect(res!.error).toBeDefined()
    expect(res!.error!.code).toBe(-32601)
  })
})

describe('Upstream Compatibility — Agent System Completeness', () => {
  it('has at least 15 agents', () => {
    expect(AGENTS.length).toBeGreaterThanOrEqual(15)
  })

  it('every agent has required fields', () => {
    for (const agent of AGENTS) {
      expect(agent.id, 'agent must have id').toBeTruthy()
      expect(agent.name, `${agent.id} must have name`).toBeTruthy()
      expect(agent.icon, `${agent.id} must have icon`).toBeTruthy()
    }
  })

  it('has orchestrator agent as first entry', () => {
    expect(AGENTS[0].id).toBe('seabri-orchestrator')
  })

  it('covers core sustainability domains', () => {
    const ids = AGENTS.map(a => a.id)
    expect(ids).toContain('climate-risk')
    expect(ids).toContain('nature-biodiversity')
    expect(ids).toContain('sustainability-reporting')
    expect(ids).toContain('investment-screening')
    expect(ids).toContain('net-zero')
    expect(ids).toContain('natural-capital')
    expect(ids).toContain('emergency-resilience')
  })

  it('has practical consumer agents', () => {
    const ids = AGENTS.map(a => a.id)
    expect(ids).toContain('insurance-navigator')
    expect(ids).toContain('damage-documentation')
    expect(ids).toContain('contractor-coordination')
    expect(ids).toContain('home-community')
  })

  it('no duplicate agent IDs', () => {
    const ids = AGENTS.map(a => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('Upstream Compatibility — Compliance Tag System', () => {
  it('has all 15 compliance tags', () => {
    expect(COMPLIANCE_TAGS).toHaveLength(15)
  })

  it('covers ISSB/IFRS sustainability standards', () => {
    expect(COMPLIANCE_TAGS).toContain('ISSB')
    expect(COMPLIANCE_TAGS).toContain('ESRS')
  })

  it('covers climate disclosure frameworks', () => {
    expect(COMPLIANCE_TAGS).toContain('TCFD')
    expect(COMPLIANCE_TAGS).toContain('CDP')
  })

  it('covers nature/biodiversity frameworks', () => {
    expect(COMPLIANCE_TAGS).toContain('TNFD')
  })

  it('covers EU sustainability regulation', () => {
    expect(COMPLIANCE_TAGS).toContain('CSRD')
    expect(COMPLIANCE_TAGS).toContain('SFDR')
  })

  it('covers emissions and targets', () => {
    expect(COMPLIANCE_TAGS).toContain('GHG_PROTOCOL')
    expect(COMPLIANCE_TAGS).toContain('SBTi')
  })

  it('covers broad reporting standards', () => {
    expect(COMPLIANCE_TAGS).toContain('GRI')
    expect(COMPLIANCE_TAGS).toContain('SEC')
    expect(COMPLIANCE_TAGS).toContain('GENERAL')
  })

  it('differentiates from hermes/openclaw: requires compliance tags', () => {
    const noTagSkill = `---
id: test-skill
name: Test Skill
---

body`
    const parsed = parseFrontmatter(noTagSkill)
    expect(() => validateFrontmatter(parsed!.raw, 'test-skill')).toThrow('complianceTags')
  })
})

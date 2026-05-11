import { agentRegistry } from './agent-registry.js'
import { capabilityRegistry } from '../registries/capability-registry.js'
import { mcpRegistry } from '../registries/mcp-registry.js'
import { skillRegistry } from '../registries/skill-registry.js'
import { loadSkillMetadata } from '../skills/loader.js'
import { listRegisteredTools } from '../tools/registry.js'

export interface RegistryItemView {
  id: string
  name: string
  type: 'agent' | 'skill' | 'mcp' | 'tool' | 'capability'
  status: 'working' | 'partial' | 'disabled' | 'error' | 'documented-only'
  invocationSurfaces: string[]
  inputSchema?: unknown
  outputSchema?: unknown
  enabled: boolean
  sourcePath?: string
  sourceType?: string
  sustainabilityRelevance?: string
  testCoverage?: string
  description?: string
  metadata?: Record<string, unknown>
}

function capabilityRelevance(category: string): string {
  if (category === 'general') return 'General sustainability routing and companion behavior.'
  return `Supports ${category} sustainability and resilience workflows.`
}

function sanitizedError(error?: string): string | undefined {
  if (!error) return undefined
  return error.replace(/[A-Za-z0-9_+=/-]{24,}/g, '[redacted]')
}

export function listCapabilityViews(): RegistryItemView[] {
  return capabilityRegistry.list().map((cap) => ({
    id: cap.id,
    name: cap.name,
    type: 'capability',
    status: 'working',
    invocationSurfaces: [
      'HTTP GET /api/seabri/capabilities',
      'agent registry capability matching',
      'task router classification',
    ],
    inputSchema: { id: 'AgentCapability' },
    outputSchema: { category: cap.category, requiredTools: cap.requiredTools ?? [] },
    enabled: true,
    sourcePath: 'gateway/registries/capability-registry.ts',
    sourceType: 'builtin-registry',
    sustainabilityRelevance: capabilityRelevance(cap.category),
    testCoverage: 'gateway/registries/capability-registry.test.ts',
    description: cap.description,
    metadata: {
      category: cap.category,
      requiredTools: cap.requiredTools ?? [],
      minModelTier: cap.minModelTier,
    },
  }))
}

export function listAgentViews(): RegistryItemView[] {
  return agentRegistry.list().map((agent) => ({
    id: agent.id,
    name: agent.name,
    type: 'agent',
    status: 'working',
    invocationSurfaces: [
      'HTTP GET /api/seabri/agents',
      'HTTP GET /api/seabri/agents/:id',
      'HTTP POST /api/seabri/route',
      'WebSocket init/chat protocol',
      'CLI and channel adapters',
    ],
    inputSchema: {
      route: { task: 'string', agentId: 'optional AgentId', modelId: 'optional string' },
      websocket: { type: 'init', agentId: 'AgentId', sessionId: 'optional string' },
    },
    outputSchema: {
      http: 'routing decision or registry item',
      websocket: 'ready/token/action_card/approval_result/done/error',
    },
    enabled: true,
    sourcePath: 'gateway/seabri/agent-registry.ts',
    sourceType: agent.builtin ? 'builtin-agent' : 'external-agent',
    sustainabilityRelevance: agent.capabilities.join(', '),
    testCoverage: 'gateway/seabri/api-handler.test.ts; gateway/agents/router.test.ts',
    description: agent.description,
    metadata: {
      capabilities: agent.capabilities,
      builtin: agent.builtin,
    },
  }))
}

export function getAgentView(id: string): RegistryItemView | undefined {
  return listAgentViews().find((agent) => agent.id === id)
}

export async function listSkillViews(): Promise<RegistryItemView[]> {
  const loaderSkills = (await loadSkillMetadata()).map((skill) => ({
    id: skill.id,
    name: skill.name,
    type: 'skill' as const,
    status: 'working' as const,
    invocationSurfaces: [
      'skill RAG injection',
      'MCP resources/list and resources/read',
      'CLI /skills',
      'HTTP GET /api/seabri/skills',
    ],
    inputSchema: { query: 'natural language task routed through skill matcher' },
    outputSchema: { markdown: 'SKILL.md body and validated frontmatter' },
    enabled: true,
    sourcePath: skill.path,
    sourceType: 'filesystem-skill-loader',
    sustainabilityRelevance: skill.complianceTags.join(', '),
    testCoverage: 'gateway/skills/loader.test.ts; gateway/mcp/server.test.ts; gateway/seabri/api-handler.test.ts',
    description: skill.description,
    metadata: {
      complianceTags: skill.complianceTags,
      evidenceSource: skill.evidenceSource,
      costTier: skill.costTier,
      registryNote:
        'Filesystem skill loader is the built-in invocation source. skillRegistry is an extension registry for runtime/user/community registrations.',
    },
  }))

  const extensionOnly = skillRegistry
    .list()
    .filter((skill) => !loaderSkills.some((loaded) => loaded.id === skill.id))
    .map((skill) => ({
      id: skill.id,
      name: skill.name,
      type: 'skill' as const,
      status: skill.enabled ? 'partial' as const : 'disabled' as const,
      invocationSurfaces: ['HTTP GET /api/seabri/skills', 'runtime extension registry'],
      inputSchema: { query: 'registry metadata only unless wired by caller' },
      outputSchema: { metadata: 'SkillRegistration' },
      enabled: skill.enabled,
      sourceType: skill.source,
      sustainabilityRelevance: skill.complianceTags.join(', '),
      testCoverage: 'gateway/registries/skill-registry.test.ts',
      description: skill.description,
      metadata: {
        complianceTags: skill.complianceTags,
        evidenceSource: skill.evidenceSource,
        costTier: skill.costTier,
        version: skill.version,
        registryNote: 'Registered in singleton skillRegistry but not loaded from skills/*/SKILL.md.',
      },
    }))

  return [...loaderSkills, ...extensionOnly]
}

export function listMcpViews(): RegistryItemView[] {
  return mcpRegistry.snapshot().map((server) => ({
    id: server.id,
    name: server.id,
    type: 'mcp',
    status:
      server.status === 'error'
        ? 'error'
        : server.status === 'stopped'
          ? 'disabled'
          : 'partial',
    invocationSurfaces: [
      'MCP registry client',
      'HTTP GET /api/seabri/mcp',
      'tool routing when a configured MCP server is reachable',
    ],
    inputSchema: { method: 'tools/call', arguments: 'object' },
    outputSchema: { result: 'MCP tool result or sanitized error' },
    enabled: server.status !== 'stopped',
    sourcePath: 'gateway/mcp/client.ts',
    sourceType: 'mcp-server-config',
    sustainabilityRelevance: 'Supports reusable tooling for lower-duplication agent workflows.',
    testCoverage: 'gateway/registries/mcp-registry.test.ts; gateway/mcp/server.test.ts',
    description: `Configured MCP server exposing ${server.tools.length} tools.`,
    metadata: {
      tools: server.tools,
      lastHealthCheck: server.lastHealthCheck,
      error: sanitizedError(server.error),
      commandHidden: true,
    },
  }))
}

export function listToolViews(): RegistryItemView[] {
  return listRegisteredTools().map(({ definition, agentIds }) => ({
    id: definition.name,
    name: definition.name,
    type: 'tool',
    status: 'working',
    invocationSurfaces: [
      'agent tool loop',
      'HTTP GET /api/seabri/tools',
      'per-agent tool registry',
    ],
    inputSchema: definition.input_schema,
    outputSchema: { result: 'string tool result; JSON string when tool returns structured data' },
    enabled: true,
    sourcePath: 'gateway/tools/register-builtin.ts',
    sourceType: 'builtin-tool',
    sustainabilityRelevance:
      definition.name.includes('carbon') || definition.name.includes('flood') || definition.name.includes('product')
        ? 'Direct sustainability or resilience workflow support.'
        : 'Supports sustainability agent research and routing workflows.',
    testCoverage: 'gateway/tools/registry.test.ts; gateway/sustainability/product-comparison.test.ts when applicable',
    description: definition.description,
    metadata: {
      agentIds,
    },
  }))
}

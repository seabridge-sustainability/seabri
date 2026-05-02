import { type ToolDefinition, ToolDefinitionSchema, type AgentId } from '../schemas.js'

export type ToolExecutor = (input: Record<string, unknown>) => Promise<string>

interface RegisteredTool {
  definition: ToolDefinition
  execute: ToolExecutor
  agentIds: AgentId[] | 'all'
}

const toolMap = new Map<string, RegisteredTool>()

export function registerTool(
  definition: ToolDefinition,
  execute: ToolExecutor,
  agentIds: AgentId[] | 'all' = 'all',
): void {
  ToolDefinitionSchema.parse(definition)
  toolMap.set(definition.name, { definition, execute, agentIds })
}

export function getToolsForAgent(agentId: AgentId): ToolDefinition[] {
  const tools: ToolDefinition[] = []
  for (const tool of toolMap.values()) {
    if (tool.agentIds === 'all' || tool.agentIds.includes(agentId)) {
      tools.push(tool.definition)
    }
  }
  return tools
}

export function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  const tool = toolMap.get(name)
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`)
  }
  return tool.execute(input)
}

export function listTools(): ToolDefinition[] {
  return Array.from(toolMap.values()).map((t) => t.definition)
}

export function hasTool(name: string): boolean {
  return toolMap.has(name)
}

export function getToolDefinition(name: string): ToolDefinition | undefined {
  return toolMap.get(name)?.definition
}

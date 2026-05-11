import { createHash } from 'crypto'
import { readFile } from 'fs/promises'
import {
  listAgentViews,
  listCapabilityViews,
  listMcpViews,
  listSkillViews,
  listToolViews,
  type RegistryItemView,
} from './registry-views.js'
import { recordTelemetryEvent } from '../telemetry/store.js'

export interface RegistrySnapshot {
  generatedAt: string
  version: string
  hash: string
  counts: {
    capabilities: number
    skills: number
    mcp: number
    tools: number
    agents: number
  }
  capabilities: RegistryItemView[]
  skills: RegistryItemView[]
  mcp: RegistryItemView[]
  tools: RegistryItemView[]
  agents: RegistryItemView[]
}

async function packageVersion(): Promise<string> {
  try {
    const raw = await readFile(new URL('../../package.json', import.meta.url), 'utf8')
    const pkg = JSON.parse(raw) as { version?: string }
    return typeof pkg.version === 'string' ? pkg.version : 'unknown'
  } catch {
    return 'unknown'
  }
}

export async function buildRegistrySnapshot(): Promise<RegistrySnapshot> {
  const capabilities = listCapabilityViews()
  const skills = await listSkillViews()
  const mcp = listMcpViews()
  const tools = listToolViews()
  const agents = listAgentViews()
  const base = {
    generatedAt: new Date().toISOString(),
    version: await packageVersion(),
    counts: {
      capabilities: capabilities.length,
      skills: skills.length,
      mcp: mcp.length,
      tools: tools.length,
      agents: agents.length,
    },
    capabilities,
    skills,
    mcp,
    tools,
    agents,
  }
  const hash = createHash('sha256').update(JSON.stringify(base)).digest('hex')
  await recordTelemetryEvent({
    type: 'registry_snapshot_generated',
    data: { hash, version: base.version, counts: base.counts },
  })
  return { ...base, hash }
}

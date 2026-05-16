import { access, readFile } from 'fs/promises'
import { join, resolve } from 'path'
import type {
  UpstreamAdapter,
  UpstreamContext,
  UpstreamResponse,
  UpstreamHealth,
  UpstreamStatus,
} from './types.js'

export interface SpaceAgentInstructionConfig {
  rootDir?: string
  documents?: Record<string, string>
}

const DEFAULT_SPACE_AGENT_ROOT = resolve(process.cwd(), '..', '_upstream', 'space-agent')
const DEFAULT_DOCS = [
  'README.md',
  'AGENTS.md',
  'app/AGENTS.md',
  'commands/AGENTS.md',
  'server/AGENTS.md',
  'packaging/AGENTS.md',
  'tests/AGENTS.md',
]

function tokens(text: string): string[] {
  return [...new Set(text.toLowerCase().match(/[a-z0-9-]{3,}/g) ?? [])]
}

function relevantExcerpt(body: string, queryTokens: string[]): string {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
  const ranked = paragraphs
    .map((paragraph) => ({
      paragraph,
      score: queryTokens.filter((token) => paragraph.toLowerCase().includes(token)).length,
    }))
    .sort((a, b) => b.score - a.score)
  const selected = ranked.filter((item) => item.score > 0).slice(0, 3)
  return (selected.length ? selected : ranked.slice(0, 2))
    .map((item) => item.paragraph)
    .join('\n\n')
    .slice(0, 2400)
}

export class SpaceAgentInstructionAdapter implements UpstreamAdapter {
  readonly id = 'space-agent-instructions'
  readonly name = 'Space Agent Instruction Loader'
  readonly type = 'service' as const

  private readonly rootDir: string
  private readonly documents?: Record<string, string>

  constructor(config: SpaceAgentInstructionConfig = {}) {
    this.rootDir = resolve(config.rootDir ?? process.env.SPACE_AGENT_ROOT ?? DEFAULT_SPACE_AGENT_ROOT)
    this.documents = config.documents
  }

  async isAvailable(): Promise<boolean> {
    if (this.documents) return Object.keys(this.documents).length > 0
    try {
      await access(join(this.rootDir, 'README.md'))
      return true
    } catch {
      return false
    }
  }

  async routeMessage(prompt: string, context?: UpstreamContext): Promise<UpstreamResponse> {
    const docs = await this.loadDocuments()
    if (docs.length === 0) {
      throw new Error('Space Agent instruction documents unavailable')
    }
    const query = tokens(`${prompt} ${context?.agentId ?? ''} ${JSON.stringify(context?.metadata ?? {})}`)
    const ranked = docs
      .map((doc) => ({
        ...doc,
        score: query.filter((token) => doc.body.toLowerCase().includes(token) || doc.path.toLowerCase().includes(token)).length,
      }))
      .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
      .slice(0, 3)

    const content = ranked.map((doc) => {
      return `## ${doc.path}\n\n${relevantExcerpt(doc.body, query)}`
    }).join('\n\n')

    return {
      content,
      source: 'space-agent-instructions',
      toolCalls: [{
        id: `space_${Date.now()}`,
        name: 'load_space_agent_instructions',
        arguments: { files: ranked.map((doc) => doc.path), patternOnly: true },
      }],
    }
  }

  async healthCheck(): Promise<UpstreamHealth> {
    let status: UpstreamStatus = 'unavailable'
    let error: string | undefined
    try {
      status = await this.isAvailable() ? 'available' : 'unavailable'
    } catch (err) {
      status = 'error'
      error = err instanceof Error ? err.message : String(err)
    }
    return { id: this.id, name: this.name, status, error, checkedAt: Date.now() }
  }

  private async loadDocuments(): Promise<Array<{ path: string; body: string }>> {
    if (this.documents) {
      return Object.entries(this.documents).map(([path, body]) => ({ path, body }))
    }

    const docs: Array<{ path: string; body: string }> = []
    for (const path of DEFAULT_DOCS) {
      try {
        const body = await readFile(join(this.rootDir, path), 'utf8')
        docs.push({ path, body })
      } catch {
        // Optional instruction files vary by upstream version.
      }
    }
    return docs
  }
}

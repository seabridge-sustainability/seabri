import { readFile, readdir } from 'fs/promises'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  parseFrontmatter,
  validateFrontmatter,
  SkillValidationError,
  type ComplianceTag,
  type CostTier,
} from './schema.js'
import { isComplianceTagAllowed } from '../security/policy.js'
import { rankByTfIdf } from '../memory/rag.js'

const SKILLS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'skills')
// Skills are hot-reloaded: cache expires after 60 s so SKILL.md edits appear
// within one minute without restarting the gateway.
const CACHE_TTL_MS = 60_000

export interface SkillMeta {
  id: string
  name: string
  path: string
  firstLine: string
  complianceTags: ComplianceTag[]
  costTier?: CostTier
  description?: string
  evidenceSource?: string
}

let cachedSkills: SkillMeta[] | null = null
// Parallel store for full SKILL.md bodies (frontmatter stripped).
// Kept separate from SkillMeta so existing consumers aren't burdened with the extra bytes.
let cachedBodies: Map<string, string> = new Map()
let cacheTimestamp = 0

export async function loadSkillMetadata(): Promise<SkillMeta[]> {
  const now = Date.now()
  if (cachedSkills && now - cacheTimestamp < CACHE_TTL_MS) return cachedSkills

  let dirs: string[]
  try {
    dirs = await readdir(SKILLS_DIR)
  } catch {
    return []
  }

  const skills: SkillMeta[] = []
  const bodies = new Map<string, string>()

  for (const dir of dirs) {
    const skillPath = resolve(SKILLS_DIR, dir, 'SKILL.md')
    let content: string
    try {
      content = await readFile(skillPath, 'utf-8')
    } catch {
      continue
    }

    const parsed = parseFrontmatter(content)
    if (!parsed) {
      console.warn(
        `[skills] "${dir}" skipped: missing YAML frontmatter with complianceTags`
      )
      continue
    }

    let fm
    try {
      fm = validateFrontmatter(parsed.raw, dir)
    } catch (err) {
      const msg = err instanceof SkillValidationError ? err.message : String(err)
      console.warn(`[skills] "${dir}" skipped: ${msg}`)
      continue
    }

    const firstLine =
      parsed.body.split('\n').find((l) => l.startsWith('#'))?.replace(/^#+\s*/, '') ??
      fm.name
    skills.push({
      id: fm.id,
      name: fm.name,
      path: skillPath,
      firstLine,
      complianceTags: fm.complianceTags,
      costTier: fm.costTier,
      description: fm.description,
      evidenceSource: fm.evidenceSource,
    })
    bodies.set(fm.id, parsed.body)
  }

  cachedSkills = skills
  cachedBodies = bodies
  cacheTimestamp = now
  return skills
}

export async function loadSkillContent(skillId: string): Promise<string | null> {
  const skillPath = resolve(SKILLS_DIR, skillId, 'SKILL.md')
  try {
    return await readFile(skillPath, 'utf-8')
  } catch {
    return null
  }
}

export async function buildSkillsContext(channel?: string): Promise<string> {
  const all = await loadSkillMetadata()
  if (all.length === 0) return ''

  let skills = all
  if (channel) {
    const filtered: SkillMeta[] = []
    for (const s of all) {
      if (await isComplianceTagAllowed(channel, s.complianceTags)) filtered.push(s)
    }
    skills = filtered
  }
  if (skills.length === 0) return ''

  const lines = ['--- AVAILABLE SKILLS ---', '']
  lines.push('The following built-in skill guides are available. Reference them when answering relevant questions.')
  lines.push('')

  for (const skill of skills) {
    const tags = skill.complianceTags.join(', ')
    lines.push(`**${skill.name}** (\`${skill.id}\`) — [${tags}]`)
  }

  return lines.join('\n')
}

const DEFAULT_TOP_K = 3

/**
 * RAG retrieval: rank skills by TF-IDF similarity to the user's query and
 * return the full SKILL.md bodies (frontmatter stripped) for the top matches.
 * Injects rich methodology context into the agent's system prompt rather than
 * just a name list.
 */
export async function buildRagSkillsContext(query: string, topK = DEFAULT_TOP_K): Promise<string> {
  const all = await loadSkillMetadata()
  if (all.length === 0) return ''

  const corpus = all.map((skill) => ({
    id: skill.id,
    text: [
      skill.name,
      skill.description ?? '',
      skill.firstLine,
      skill.complianceTags.join(' '),
      cachedBodies.get(skill.id) ?? '',
    ].join(' '),
  }))

  const ranked = rankByTfIdf(query, corpus)
  const top = ranked.filter((r) => r.score > 0).slice(0, topK)
  if (top.length === 0) return ''

  const lines = ['--- RELEVANT SKILL GUIDES ---', '']
  lines.push('The following skill guides are relevant to this question. Use them to structure your response.')
  lines.push('')

  for (const { id } of top) {
    const skill = all.find((s) => s.id === id)
    const body = cachedBodies.get(id)
    if (!skill || !body) continue
    lines.push(`## ${skill.name}`)
    lines.push('')
    lines.push(body.trim())
    lines.push('')
  }

  return lines.join('\n')
}

export function invalidateSkillCache(): void {
  cachedSkills = null
  cachedBodies = new Map()
  cacheTimestamp = 0
}

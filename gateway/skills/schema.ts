/**
 * Skill frontmatter schema + minimal YAML parser.
 *
 * Every SKILL.md in openseabri/skills/ must begin with a YAML frontmatter
 * block declaring at least one compliance tag. Skills without a recognised
 * compliance tag are rejected at load time — this is the enforcement point
 * that differentiates OpenSeaBri from Hermes/OpenClaw (arbitrary-skill
 * frameworks) and underpins the "auditable sustainability agent" funding
 * narrative.
 *
 * We deliberately avoid pulling a YAML dependency. The parser here handles
 * the small subset we need: scalar strings, numbers, booleans, and inline
 * `[a, b, c]` arrays.
 */

export const COMPLIANCE_TAGS = [
  'ISSB',
  'ESRS',
  'TNFD',
  'SBTi',
  'CSRD',
  'GRI',
  'CDP',
  'TCFD',
  'SFDR',
  'SEC',
  'GHG_PROTOCOL',
  'GRESB',
  'CSDDD',
  'SCIENCE_BASED',
  'GENERAL',
] as const

export type ComplianceTag = (typeof COMPLIANCE_TAGS)[number]

export const COST_TIERS = ['free', 'low', 'medium', 'high'] as const
export type CostTier = (typeof COST_TIERS)[number]

export interface SkillFrontmatter {
  id: string
  name: string
  description?: string
  complianceTags: ComplianceTag[]
  evidenceSource?: string
  costTier?: CostTier
  domain?: string
  agents?: string[]
}

export interface ParsedSkill {
  frontmatter: SkillFrontmatter
  body: string
}

export class SkillValidationError extends Error {
  constructor(message: string, public readonly skillId?: string) {
    super(message)
    this.name = 'SkillValidationError'
  }
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/

/**
 * Extract and parse the leading `---` YAML block. Returns null if the file
 * has no frontmatter — the caller decides whether that's fatal.
 */
export function parseFrontmatter(
  source: string
): { raw: Record<string, unknown>; body: string } | null {
  const match = source.match(FRONTMATTER_RE)
  if (!match) return null
  const [, yaml, body] = match
  const raw = parseMiniYaml(yaml)
  return { raw, body: body ?? '' }
}

/**
 * Validate a parsed frontmatter blob against the schema. Throws
 * SkillValidationError on any violation so the caller can log-and-skip.
 */
export function validateFrontmatter(
  raw: Record<string, unknown>,
  fallbackId: string
): SkillFrontmatter {
  const id = typeof raw.id === 'string' && raw.id.length > 0 ? raw.id : fallbackId
  const name = typeof raw.name === 'string' ? raw.name : ''
  if (!name) {
    throw new SkillValidationError(`skill ${id}: missing "name"`, id)
  }

  const tagsRaw = raw.complianceTags ?? raw.compliance_tags
  if (!Array.isArray(tagsRaw) || tagsRaw.length === 0) {
    throw new SkillValidationError(
      `skill ${id}: "complianceTags" must be a non-empty array of ${COMPLIANCE_TAGS.join('|')}`,
      id
    )
  }

  const tags: ComplianceTag[] = []
  for (const t of tagsRaw) {
    if (typeof t !== 'string') {
      throw new SkillValidationError(`skill ${id}: complianceTags must be strings`, id)
    }
    const matched = COMPLIANCE_TAGS.find(
      (tag) => tag.toUpperCase() === t.toUpperCase()
    )
    if (!matched) {
      throw new SkillValidationError(
        `skill ${id}: unknown compliance tag "${t}" — allowed: ${COMPLIANCE_TAGS.join(', ')}`,
        id
      )
    }
    tags.push(matched)
  }

  const costTier =
    typeof raw.costTier === 'string'
      ? (raw.costTier as string).toLowerCase()
      : typeof raw.cost_tier === 'string'
        ? (raw.cost_tier as string).toLowerCase()
        : undefined
  if (costTier && !(COST_TIERS as readonly string[]).includes(costTier)) {
    throw new SkillValidationError(
      `skill ${id}: costTier must be one of ${COST_TIERS.join(', ')}`,
      id
    )
  }

  const domain = typeof raw.domain === 'string' ? raw.domain : undefined
  const agentsRaw = raw.agents
  const agents = Array.isArray(agentsRaw)
    ? agentsRaw.filter((a): a is string => typeof a === 'string')
    : undefined

  return {
    id,
    name,
    description: typeof raw.description === 'string' ? raw.description : undefined,
    complianceTags: tags,
    evidenceSource:
      typeof raw.evidenceSource === 'string'
        ? raw.evidenceSource
        : typeof raw.evidence_source === 'string'
          ? (raw.evidence_source as string)
          : undefined,
    costTier: costTier as CostTier | undefined,
    domain,
    agents: agents && agents.length > 0 ? agents : undefined,
  }
}

// ── minimal YAML ───────────────────────────────────────────────────────────
// Supports `key: value`, inline arrays `key: [a, b, c]`, block arrays with
// `- item` lines, and quoted strings. Enough for our frontmatter — not a
// general YAML parser.

function parseMiniYaml(src: string): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const lines = src.split(/\r?\n/)
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim() || line.trim().startsWith('#')) {
      i++
      continue
    }
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/)
    if (!m) {
      i++
      continue
    }
    const [, key, rest] = m
    if (rest === '') {
      // look ahead for block array
      const items: unknown[] = []
      i++
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
        items.push(stripScalar(lines[i].replace(/^\s*-\s+/, '')))
        i++
      }
      out[key] = items
      continue
    }
    out[key] = parseScalarOrInlineArray(rest)
    i++
  }
  return out
}

function parseScalarOrInlineArray(raw: string): unknown {
  const trimmed = raw.trim()
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const inner = trimmed.slice(1, -1).trim()
    if (!inner) return []
    return inner.split(',').map((s) => stripScalar(s.trim()))
  }
  return stripScalar(trimmed)
}

function stripScalar(v: string): string | number | boolean {
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1)
  }
  if (v === 'true') return true
  if (v === 'false') return false
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v)
  return v
}

/**
 * integrations/ecc/skills-sync.ts
 *
 * Read-only loader for everything-claude-code (ECC) skills at ~/.claude/skills/.
 * Each skill is a directory containing SKILL.md with YAML frontmatter.
 *
 * OpenSeaBri never writes into the ECC directory.
 */

import { readdir, readFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export interface EccSkill {
  name: string
  path: string
  title: string | null
  description: string | null
  triggers: string[]
  body: string
  mtime: Date
}

function eccSkillsRoot(): string | null {
  const override = process.env.ECC_SKILLS_DIR
  const candidates = [override, join(homedir(), '.claude', 'skills')].filter(
    (p): p is string => Boolean(p),
  )
  return candidates.find((p) => existsSync(p)) ?? null
}

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/m.exec(raw)
  if (!match) return { meta: {}, body: raw }
  const meta: Record<string, string> = {}
  for (const line of match[1].split('\n')) {
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line)
    if (kv) meta[kv[1].toLowerCase()] = kv[2].trim().replace(/^['"]|['"]$/g, '')
  }
  return { meta, body: match[2] }
}

function parseTriggers(meta: Record<string, string>): string[] {
  const raw = meta.triggers ?? meta.trigger ?? ''
  if (!raw) return []
  return raw
    .replace(/^\[|\]$/g, '')
    .split(/[,;]/)
    .map((t) => t.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean)
}

async function readSkill(dir: string, name: string): Promise<EccSkill | null> {
  const skillFile = join(dir, 'SKILL.md')
  if (!existsSync(skillFile)) return null
  try {
    const [raw, st] = await Promise.all([readFile(skillFile, 'utf8'), stat(skillFile)])
    const { meta, body } = parseFrontmatter(raw)
    return {
      name,
      path: skillFile,
      title: meta.name ?? meta.title ?? null,
      description: meta.description ?? null,
      triggers: parseTriggers(meta),
      body,
      mtime: st.mtime,
    }
  } catch {
    return null
  }
}

export async function listSkills(): Promise<EccSkill[]> {
  const root = eccSkillsRoot()
  if (!root) return []
  const entries = await readdir(root, { withFileTypes: true })
  const skills = await Promise.all(
    entries
      .filter((e) => e.isDirectory())
      .map((e) => readSkill(join(root, e.name), e.name)),
  )
  return skills.filter((s): s is EccSkill => s !== null)
}

export async function findSkill(name: string): Promise<EccSkill | null> {
  const root = eccSkillsRoot()
  if (!root) return null
  return readSkill(join(root, name), name)
}

export async function skillsHubSummary(): Promise<{ count: number; skills: Array<Pick<EccSkill, 'name' | 'title' | 'description'>> }> {
  const all = await listSkills()
  return {
    count: all.length,
    skills: all.map(({ name, title, description }) => ({ name, title, description })),
  }
}

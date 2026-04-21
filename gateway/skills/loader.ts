import { readFile, readdir } from 'fs/promises'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const OPENSEABRI_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const SKILLS_DIR = resolve(OPENSEABRI_ROOT, 'openseabri', 'skills')

export interface SkillMeta {
  id: string
  name: string
  path: string
  firstLine: string
}

let cachedSkills: SkillMeta[] | null = null

export async function loadSkillMetadata(): Promise<SkillMeta[]> {
  if (cachedSkills) return cachedSkills

  let dirs: string[]
  try {
    dirs = await readdir(SKILLS_DIR)
  } catch {
    return []
  }

  const skills: SkillMeta[] = []
  for (const dir of dirs) {
    const skillPath = resolve(SKILLS_DIR, dir, 'SKILL.md')
    try {
      const content = await readFile(skillPath, 'utf-8')
      const firstLine = content.split('\n').find((l) => l.startsWith('#'))?.replace(/^#+\s*/, '') ?? dir
      skills.push({
        id: dir,
        name: firstLine,
        path: skillPath,
        firstLine,
      })
    } catch {
      // Skip skill directories without SKILL.md
    }
  }

  cachedSkills = skills
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

export async function buildSkillsContext(): Promise<string> {
  const skills = await loadSkillMetadata()
  if (skills.length === 0) return ''

  const lines = ['--- AVAILABLE SKILLS ---', '']
  lines.push('The following built-in skill guides are available. Reference them when answering relevant questions.')
  lines.push('')

  for (const skill of skills) {
    lines.push(`**${skill.name}** (\`${skill.id}\`)`)
  }

  return lines.join('\n')
}

export function invalidateSkillCache(): void {
  cachedSkills = null
}

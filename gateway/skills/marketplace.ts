import { readFile, writeFile, readdir, mkdir, copyFile } from 'fs/promises'
import { resolve, basename, dirname, sep } from 'path'
import { fileURLToPath } from 'url'
import { validateSkillFile, validateSkillSource, type ValidationResult } from './validator.js'
import { parseFrontmatter, validateFrontmatter, type SkillFrontmatter } from './schema.js'
import { invalidateSkillCache } from './loader.js'

const SKILLS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'skills')
const SKILL_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/
const MAX_BUNDLE_SKILLS = 200
const MAX_SKILL_CONTENT_BYTES = 1_048_576

function assertSafeSkillId(id: string): void {
  if (!SKILL_ID_RE.test(id)) {
    throw new Error(`Invalid skill ID "${id}": must match ${SKILL_ID_RE}`)
  }
  const resolved = resolve(SKILLS_DIR, id)
  if (!resolved.startsWith(SKILLS_DIR + sep)) {
    throw new Error(`Invalid skill ID "${id}": path traversal detected`)
  }
}

export interface SkillManifestEntry {
  id: string
  name: string
  version: string
  complianceTags: string[]
  costTier?: string
  description?: string
  exportedAt: string
}

export interface SkillExportBundle {
  format: 'openseabri-skill-bundle'
  formatVersion: 1
  exportedAt: string
  skills: Array<{
    manifest: SkillManifestEntry
    content: string
  }>
}

export interface ImportResult {
  skillId: string
  status: 'imported' | 'skipped' | 'error'
  message: string
  validation?: ValidationResult
}

function extractVersion(raw: Record<string, unknown>): string {
  if (typeof raw.version === 'string') return raw.version
  if (typeof raw.version === 'number') return String(raw.version)
  return '1.0'
}

export async function exportSkill(skillId: string): Promise<string> {
  const skillPath = resolve(SKILLS_DIR, skillId, 'SKILL.md')
  const content = await readFile(skillPath, 'utf-8')
  const parsed = parseFrontmatter(content)
  if (!parsed) throw new Error(`Skill "${skillId}" has no valid frontmatter`)
  const fm = validateFrontmatter(parsed.raw, skillId)

  const bundle: SkillExportBundle = {
    format: 'openseabri-skill-bundle',
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    skills: [
      {
        manifest: {
          id: fm.id,
          name: fm.name,
          version: extractVersion(parsed.raw),
          complianceTags: fm.complianceTags,
          costTier: fm.costTier,
          description: fm.description,
          exportedAt: new Date().toISOString(),
        },
        content,
      },
    ],
  }
  return JSON.stringify(bundle, null, 2)
}

export async function exportAllSkills(): Promise<string> {
  let dirs: string[]
  try {
    dirs = await readdir(SKILLS_DIR)
  } catch {
    throw new Error(`Skills directory not found: ${SKILLS_DIR}`)
  }

  const skills: SkillExportBundle['skills'] = []
  for (const dir of dirs.sort()) {
    const skillPath = resolve(SKILLS_DIR, dir, 'SKILL.md')
    let content: string
    try {
      content = await readFile(skillPath, 'utf-8')
    } catch {
      continue
    }

    const parsed = parseFrontmatter(content)
    if (!parsed) continue

    let fm: SkillFrontmatter
    try {
      fm = validateFrontmatter(parsed.raw, dir)
    } catch {
      continue
    }

    skills.push({
      manifest: {
        id: fm.id,
        name: fm.name,
        version: extractVersion(parsed.raw),
        complianceTags: fm.complianceTags,
        costTier: fm.costTier,
        description: fm.description,
        exportedAt: new Date().toISOString(),
      },
      content,
    })
  }

  const bundle: SkillExportBundle = {
    format: 'openseabri-skill-bundle',
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    skills,
  }
  return JSON.stringify(bundle, null, 2)
}

export async function importSkillFromBundle(
  bundleJson: string,
  options: { overwrite?: boolean; validateOnly?: boolean } = {}
): Promise<ImportResult[]> {
  let bundle: SkillExportBundle
  try {
    bundle = JSON.parse(bundleJson)
  } catch {
    return [{ skillId: 'unknown', status: 'error', message: 'Invalid JSON' }]
  }

  if (bundle.format !== 'openseabri-skill-bundle' || bundle.formatVersion !== 1) {
    return [{ skillId: 'unknown', status: 'error', message: 'Unrecognized bundle format' }]
  }

  if (!Array.isArray(bundle.skills) || bundle.skills.length > MAX_BUNDLE_SKILLS) {
    return [{ skillId: 'unknown', status: 'error', message: `Bundle exceeds max skill count (${MAX_BUNDLE_SKILLS})` }]
  }

  const results: ImportResult[] = []
  for (const entry of bundle.skills) {
    try {
      assertSafeSkillId(entry.manifest.id)
    } catch (err) {
      results.push({
        skillId: entry.manifest.id,
        status: 'error',
        message: err instanceof Error ? err.message : 'Invalid skill ID',
      })
      continue
    }

    if (typeof entry.content === 'string' && entry.content.length > MAX_SKILL_CONTENT_BYTES) {
      results.push({
        skillId: entry.manifest.id,
        status: 'error',
        message: `Content exceeds max size (${MAX_SKILL_CONTENT_BYTES} bytes)`,
      })
      continue
    }

    const validation = validateSkillSource(entry.content, entry.manifest.id)
    if (!validation.valid) {
      results.push({
        skillId: entry.manifest.id,
        status: 'error',
        message: `Validation failed: ${validation.issues.filter((i) => i.severity === 'error').map((i) => i.message).join('; ')}`,
        validation,
      })
      continue
    }

    if (options.validateOnly) {
      results.push({
        skillId: entry.manifest.id,
        status: 'skipped',
        message: 'Validation passed (dry run)',
        validation,
      })
      continue
    }

    const skillDir = resolve(SKILLS_DIR, entry.manifest.id)
    const skillFile = resolve(skillDir, 'SKILL.md')

    let exists = false
    try {
      await readFile(skillFile, 'utf-8')
      exists = true
    } catch { /* does not exist */ }

    if (exists && !options.overwrite) {
      results.push({
        skillId: entry.manifest.id,
        status: 'skipped',
        message: 'Already exists (use --overwrite to replace)',
        validation,
      })
      continue
    }

    try {
      await mkdir(skillDir, { recursive: true })
      await writeFile(skillFile, entry.content, 'utf-8')
      invalidateSkillCache()
      results.push({
        skillId: entry.manifest.id,
        status: 'imported',
        message: exists ? 'Overwritten' : 'Created',
        validation,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      results.push({
        skillId: entry.manifest.id,
        status: 'error',
        message: `Write failed: ${msg}`,
        validation,
      })
    }
  }

  return results
}

export async function importSkillFromFile(filePath: string, targetId?: string): Promise<ImportResult> {
  let content: string
  try {
    content = await readFile(filePath, 'utf-8')
  } catch {
    return { skillId: targetId ?? 'unknown', status: 'error', message: `Cannot read: ${filePath}` }
  }

  const validation = validateSkillSource(content, filePath)
  const skillId = targetId ?? validation.skillId

  try {
    assertSafeSkillId(skillId)
  } catch (err) {
    return { skillId, status: 'error', message: err instanceof Error ? err.message : 'Invalid skill ID' }
  }

  if (content.length > MAX_SKILL_CONTENT_BYTES) {
    return { skillId, status: 'error', message: `Content exceeds max size (${MAX_SKILL_CONTENT_BYTES} bytes)` }
  }

  if (!validation.valid) {
    return {
      skillId,
      status: 'error',
      message: `Validation failed: ${validation.issues.filter((i) => i.severity === 'error').map((i) => i.message).join('; ')}`,
      validation,
    }
  }

  const skillDir = resolve(SKILLS_DIR, skillId)
  const skillFile = resolve(skillDir, 'SKILL.md')

  try {
    await mkdir(skillDir, { recursive: true })
    await writeFile(skillFile, content, 'utf-8')
    invalidateSkillCache()
    return { skillId, status: 'imported', message: 'Imported successfully', validation }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { skillId, status: 'error', message: `Write failed: ${msg}`, validation }
  }
}

export async function listSkillVersions(): Promise<SkillManifestEntry[]> {
  let dirs: string[]
  try {
    dirs = await readdir(SKILLS_DIR)
  } catch {
    return []
  }

  const entries: SkillManifestEntry[] = []
  for (const dir of dirs.sort()) {
    const skillPath = resolve(SKILLS_DIR, dir, 'SKILL.md')
    let content: string
    try {
      content = await readFile(skillPath, 'utf-8')
    } catch {
      continue
    }

    const parsed = parseFrontmatter(content)
    if (!parsed) continue
    let fm: SkillFrontmatter
    try {
      fm = validateFrontmatter(parsed.raw, dir)
    } catch {
      continue
    }

    entries.push({
      id: fm.id,
      name: fm.name,
      version: extractVersion(parsed.raw),
      complianceTags: fm.complianceTags,
      costTier: fm.costTier,
      description: fm.description,
      exportedAt: '',
    })
  }

  return entries
}

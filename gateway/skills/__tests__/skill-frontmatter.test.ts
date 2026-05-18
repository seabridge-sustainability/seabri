/**
 * skill-frontmatter.test.ts
 *
 * CI guard that validates every SKILL.md file under skills/ has correct
 * YAML frontmatter and no BOM character at the start of the file.
 *
 * Failures here indicate either a new skill was added without the required
 * fields, or an editor (VSCode/Notepad++) silently inserted a UTF-8 BOM that
 * breaks the frontmatter regex (see BUG-001 in the security risk register).
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'
import { describe, it, expect } from 'vitest'
import { parseFrontmatter } from '../schema.js'

// ── Locate all SKILL.md files ──────────────────────────────────────────────

function findSkillFiles(dir: string): string[] {
  const results: string[] = []
  try {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      const fullPath = join(dir, entry)
      const stat = statSync(fullPath)
      if (stat.isDirectory()) {
        const skillMd = join(fullPath, 'SKILL.md')
        try {
          statSync(skillMd)
          results.push(skillMd)
        } catch {
          // No SKILL.md in this subdir — skip
        }
      } else if (entry === 'SKILL.md') {
        results.push(fullPath)
      }
    }
  } catch {
    // Directory not found — return empty
  }
  return results
}

// Resolve the project root relative to this test file's URL
// e.g. file:///C:/Users/.../openseabri/gateway/skills/__tests__/skill-frontmatter.test.ts
// → C:/Users/.../openseabri/
const thisFile = import.meta.url.replace(/^file:[/\\]+/, '').replace(/\\/g, '/')
const PROJECT_ROOT = thisFile.replace(/gateway\/skills\/__tests__\/.*$/, '')
const SKILLS_DIR = join(PROJECT_ROOT, 'skills')

const skillFiles = findSkillFiles(SKILLS_DIR)

// ── Snapshot of all SKILL.md content up-front (avoids per-test I/O) ────────

interface SkillFileData {
  path: string
  raw: string | null
  readError: string | null
  frontmatterResult: ReturnType<typeof parseFrontmatter>
  fm: Record<string, unknown>
}

const skillData: SkillFileData[] = skillFiles.map((filePath) => {
  try {
    const raw = readFileSync(filePath, 'utf-8')
    const frontmatterResult = parseFrontmatter(raw)
    return {
      path: filePath,
      raw,
      readError: null,
      frontmatterResult,
      fm: frontmatterResult?.raw ?? {},
    }
  } catch (e) {
    return {
      path: filePath,
      raw: null,
      readError: e instanceof Error ? e.message : String(e),
      frontmatterResult: null,
      fm: {},
    }
  }
})

// ── Suite ──────────────────────────────────────────────────────────────────

describe('SKILL.md frontmatter validation', () => {
  it('finds at least one SKILL.md file', () => {
    expect(skillFiles.length).toBeGreaterThan(0)
  })

  it('all SKILL.md files are readable', () => {
    const unreadable = skillData.filter((d) => d.readError !== null)
    if (unreadable.length > 0) {
      const msgs = unreadable.map((d) => `${d.path}: ${d.readError}`).join('\n')
      throw new Error(`Unreadable SKILL.md files:\n${msgs}`)
    }
    expect(unreadable.length).toBe(0)
  })

  it('no SKILL.md file has a UTF-8 BOM at start (BUG-001)', () => {
    const hasBom = skillData.filter((d) => {
      if (!d.raw) return false
      return d.raw.charCodeAt(0) === 0xfeff || d.raw.startsWith('﻿')
    })
    if (hasBom.length > 0) {
      const paths = hasBom.map((d) => d.path).join('\n')
      throw new Error(
        `The following SKILL.md files have a UTF-8 BOM that breaks frontmatter parsing:\n${paths}\n` +
          'Fix: re-save each file without BOM in your editor (VSCode: "Save with Encoding → UTF-8").'
      )
    }
    expect(hasBom.length).toBe(0)
  })

  it('all SKILL.md files have parseable YAML frontmatter', () => {
    const missing = skillData.filter((d) => d.raw !== null && d.frontmatterResult === null)
    if (missing.length > 0) {
      const paths = missing.map((d) => d.path).join('\n')
      throw new Error(`The following SKILL.md files have no parseable frontmatter block:\n${paths}`)
    }
    expect(missing.length).toBe(0)
  })

  it('all SKILL.md files have a non-empty "name" field', () => {
    const invalid = skillData.filter((d) => {
      const name = d.fm['name']
      return !name || typeof name !== 'string' || name.trim().length === 0
    })
    if (invalid.length > 0) {
      const paths = invalid.map((d) => d.path).join('\n')
      throw new Error(`Missing or empty "name" in frontmatter:\n${paths}`)
    }
    expect(invalid.length).toBe(0)
  })

  it('all SKILL.md files have a non-empty "description" field', () => {
    const invalid = skillData.filter((d) => {
      const description = d.fm['description']
      return !description || typeof description !== 'string' || description.trim().length === 0
    })
    if (invalid.length > 0) {
      const paths = invalid.map((d) => d.path).join('\n')
      throw new Error(`Missing or empty "description" in frontmatter:\n${paths}`)
    }
    expect(invalid.length).toBe(0)
  })

  it('all SKILL.md files have a non-empty "id" or "version" field', () => {
    // OpenSeaBri SKILL.md frontmatter uses "id" as the canonical version identifier.
    // Accept either "id" or "version" so the test remains forward-compatible.
    const invalid = skillData.filter((d) => {
      const hasVersion =
        typeof d.fm['version'] === 'string' && (d.fm['version'] as string).trim().length > 0
      const hasId =
        typeof d.fm['id'] === 'string' && (d.fm['id'] as string).trim().length > 0
      return !hasVersion && !hasId
    })
    if (invalid.length > 0) {
      const paths = invalid.map((d) => d.path).join('\n')
      throw new Error(`Missing "id" (or "version") in frontmatter:\n${paths}`)
    }
    expect(invalid.length).toBe(0)
  })
})

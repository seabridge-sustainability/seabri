import { describe, it, expect } from 'vitest'
import { readFile, readdir } from 'fs/promises'
import { resolve } from 'path'
import {
  parseFrontmatter,
  validateFrontmatter,
  COMPLIANCE_TAGS,
  COST_TIERS,
  type ComplianceTag,
} from './schema.js'

const SKILLS_DIR = resolve(process.cwd(), 'skills')

const SUSTAINABILITY_FRAMEWORKS: Record<string, ComplianceTag[]> = {
  'climate-physical': ['TCFD', 'ISSB', 'SEC'],
  'climate-transition': ['TCFD', 'ISSB', 'SBTi'],
  'nature-biodiversity': ['TNFD', 'ISSB'],
  'emissions-reporting': ['GHG_PROTOCOL', 'CDP', 'GRI'],
  'eu-regulation': ['CSRD', 'ESRS', 'SFDR'],
}

async function loadAllSkills() {
  const dirs = await readdir(SKILLS_DIR).catch(() => [] as string[])
  const skills: Array<{
    dirName: string
    raw: Record<string, unknown>
    body: string
  }> = []

  for (const dir of dirs) {
    const skillPath = resolve(SKILLS_DIR, dir, 'SKILL.md')
    try {
      const content = await readFile(skillPath, 'utf-8')
      const parsed = parseFrontmatter(content)
      if (parsed) {
        skills.push({ dirName: dir, raw: parsed.raw, body: parsed.body })
      }
    } catch {
      // skip dirs without SKILL.md
    }
  }
  return skills
}

describe('Sustainability Compliance Gate — Real SKILL.md Validation', () => {
  it('finds at least 10 skills in the skills/ directory', async () => {
    const skills = await loadAllSkills()
    expect(skills.length).toBeGreaterThanOrEqual(10)
  })

  it('every SKILL.md has valid frontmatter that passes validation', async () => {
    const skills = await loadAllSkills()
    const errors: string[] = []

    for (const skill of skills) {
      try {
        validateFrontmatter(skill.raw, skill.dirName)
      } catch (err: unknown) {
        errors.push(`${skill.dirName}: ${(err as Error).message}`)
      }
    }

    expect(errors).toEqual([])
  })

  it('every skill has at least one recognised compliance tag', async () => {
    const skills = await loadAllSkills()
    for (const skill of skills) {
      const fm = validateFrontmatter(skill.raw, skill.dirName)
      expect(
        fm.complianceTags.length,
        `${skill.dirName} must have at least one compliance tag`
      ).toBeGreaterThan(0)
    }
  })

  it('every skill has a name', async () => {
    const skills = await loadAllSkills()
    for (const skill of skills) {
      const fm = validateFrontmatter(skill.raw, skill.dirName)
      expect(fm.name, `${skill.dirName} must have a name`).toBeTruthy()
    }
  })

  it('every skill has a costTier (defaults or explicit)', async () => {
    const skills = await loadAllSkills()
    for (const skill of skills) {
      const fm = validateFrontmatter(skill.raw, skill.dirName)
      if (fm.costTier) {
        expect(
          (COST_TIERS as readonly string[]).includes(fm.costTier),
          `${skill.dirName} costTier "${fm.costTier}" must be valid`
        ).toBe(true)
      }
    }
  })

  it('no duplicate skill IDs across all skills', async () => {
    const skills = await loadAllSkills()
    const ids = skills.map(s => {
      const fm = validateFrontmatter(s.raw, s.dirName)
      return fm.id
    })
    const unique = new Set(ids)
    expect(unique.size, `duplicate skill IDs found: ${ids.join(', ')}`).toBe(ids.length)
  })

  it('skill directory name matches frontmatter id', async () => {
    const skills = await loadAllSkills()
    const mismatches: string[] = []
    for (const skill of skills) {
      const fm = validateFrontmatter(skill.raw, skill.dirName)
      if (fm.id !== skill.dirName) {
        mismatches.push(`dir=${skill.dirName} vs id=${fm.id}`)
      }
    }
    expect(mismatches).toEqual([])
  })

  it('every skill body has a markdown heading', async () => {
    const skills = await loadAllSkills()
    for (const skill of skills) {
      expect(
        skill.body.includes('#'),
        `${skill.dirName} body must contain a markdown heading`
      ).toBe(true)
    }
  })

  it('all 15 compliance tags are represented across the skill catalogue', async () => {
    const skills = await loadAllSkills()
    const allTags = new Set<string>()
    for (const skill of skills) {
      const fm = validateFrontmatter(skill.raw, skill.dirName)
      for (const tag of fm.complianceTags) {
        allTags.add(tag)
      }
    }

    const missing = COMPLIANCE_TAGS.filter(t => !allTags.has(t))
    expect(
      missing,
      `These compliance tags have no skills: ${missing.join(', ')}`
    ).toEqual([])
  })

  it('climate-related skills reference TCFD or ISSB', async () => {
    const skills = await loadAllSkills()
    const climateSkills = skills.filter(s =>
      s.dirName.includes('climate') ||
      s.dirName.includes('flood') ||
      s.dirName.includes('wildfire') ||
      s.dirName.includes('physical-risk')
    )

    expect(climateSkills.length).toBeGreaterThan(0)

    for (const skill of climateSkills) {
      const fm = validateFrontmatter(skill.raw, skill.dirName)
      const hasClimateTag = fm.complianceTags.some(t =>
        ['TCFD', 'ISSB', 'SEC'].includes(t)
      )
      expect(
        hasClimateTag,
        `Climate skill ${skill.dirName} should reference TCFD, ISSB, or SEC`
      ).toBe(true)
    }
  })

  it('emissions/carbon skills reference GHG_PROTOCOL', async () => {
    const skills = await loadAllSkills()
    const carbonSkills = skills.filter(s =>
      s.dirName.includes('carbon') || s.dirName.includes('emission')
    )

    expect(carbonSkills.length).toBeGreaterThan(0)

    for (const skill of carbonSkills) {
      const fm = validateFrontmatter(skill.raw, skill.dirName)
      const hasGhg = fm.complianceTags.includes('GHG_PROTOCOL')
      expect(
        hasGhg,
        `Carbon/emissions skill ${skill.dirName} should reference GHG_PROTOCOL`
      ).toBe(true)
    }
  })

  it('nature/biodiversity skills reference TNFD', async () => {
    const skills = await loadAllSkills()
    const natureSkills = skills.filter(s =>
      s.dirName.includes('nature') || s.dirName.includes('biodiversity')
    )

    if (natureSkills.length > 0) {
      for (const skill of natureSkills) {
        const fm = validateFrontmatter(skill.raw, skill.dirName)
        const hasTnfd = fm.complianceTags.includes('TNFD')
        expect(
          hasTnfd,
          `Nature skill ${skill.dirName} should reference TNFD`
        ).toBe(true)
      }
    }
  })

  it('every skill body has substantive content (>100 chars)', async () => {
    const skills = await loadAllSkills()
    for (const skill of skills) {
      expect(
        skill.body.length,
        `${skill.dirName} body too short (${skill.body.length} chars)`
      ).toBeGreaterThan(100)
    }
  })
})

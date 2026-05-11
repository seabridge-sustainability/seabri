import { describe, it, expect } from 'vitest'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  validateSkillSource,
  validateSkillFile,
  validateSkillBody,
  formatValidationResult,
  complianceTagCoverage,
  type ValidationResult,
} from './validator.js'

const SKILLS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'skills')

const validSkill = `---
id: test-skill
name: Test Skill
complianceTags: [TCFD, GENERAL]
costTier: low
evidenceSource: https://example.com/evidence
---

# Test Skill

A comprehensive test skill for validation.

## When to Use

Use this skill when testing the validator.

## Methodology

Step-by-step approach to testing validation logic with sufficient detail
to pass the minimum body length requirement.
`

describe('validateSkillSource', () => {
  it('passes for a well-formed skill', () => {
    const result = validateSkillSource(validSkill)
    expect(result.valid).toBe(true)
    expect(result.skillId).toBe('test-skill')
    expect(result.frontmatter).toBeDefined()
    expect(result.frontmatter!.name).toBe('Test Skill')
  })

  it('fails for missing frontmatter', () => {
    const result = validateSkillSource('# Just a markdown file\n\nNo frontmatter here.')
    expect(result.valid).toBe(false)
    expect(result.issues[0].field).toBe('frontmatter')
  })

  it('fails for missing complianceTags', () => {
    const source = `---
id: bad
name: Bad Skill
---

# Bad Skill
`
    const result = validateSkillSource(source)
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.message.includes('complianceTags'))).toBe(true)
  })

  it('fails for unknown compliance tag', () => {
    const source = `---
id: bad
name: Bad Skill
complianceTags: [FAKE_TAG]
---

# Bad Skill
`
    const result = validateSkillSource(source)
    expect(result.valid).toBe(false)
  })

  it('warns for short body', () => {
    const source = `---
id: short
name: Short Skill
complianceTags: [GENERAL]
---

# Short
`
    const result = validateSkillSource(source)
    expect(result.issues.some((i) => i.field === 'body' && i.severity === 'error')).toBe(true)
  })

  it('warns for missing When to Use section', () => {
    const source = `---
id: no-usage
name: No Usage Section
complianceTags: [TCFD]
costTier: free
---

# No Usage Section

This is a skill that has enough body content to pass the length check but it
does not include a When to Use section which means the validator should issue
a warning about it. We need at least two sections for this test.

## Methodology

Do things step by step with enough content here.
`
    const result = validateSkillSource(source)
    expect(result.issues.some((i) => i.message.includes('When to Use'))).toBe(true)
  })

  it('info for missing costTier', () => {
    const result = validateSkillSource(validSkill.replace('costTier: low\n', ''))
    expect(result.issues.some((i) => i.field === 'costTier' && i.severity === 'info')).toBe(true)
  })

  it('info for GENERAL-only tags', () => {
    const source = validSkill.replace('complianceTags: [TCFD, GENERAL]', 'complianceTags: [GENERAL]')
    const result = validateSkillSource(source)
    expect(result.issues.some((i) => i.field === 'complianceTags' && i.severity === 'info')).toBe(true)
  })
})

describe('validateSkillFile', () => {
  it('validates an existing skill file', async () => {
    const path = resolve(SKILLS_DIR, 'physical-risk-screening', 'SKILL.md')
    const result = await validateSkillFile(path)
    expect(result.valid).toBe(true)
    expect(result.skillId).toBe('physical-risk-screening')
  })

  it('returns error for non-existent file', async () => {
    const result = await validateSkillFile('/nonexistent/path/SKILL.md')
    expect(result.valid).toBe(false)
    expect(result.issues[0].field).toBe('file')
  })
})

describe('formatValidationResult', () => {
  it('formats passing result', () => {
    const result: ValidationResult = {
      valid: true,
      skillId: 'test',
      frontmatter: null,
      issues: [],
    }
    const output = formatValidationResult(result)
    expect(output).toContain('[PASS]')
    expect(output).toContain('test')
  })

  it('formats failing result with issues', () => {
    const result: ValidationResult = {
      valid: false,
      skillId: 'bad',
      frontmatter: null,
      issues: [{ severity: 'error', field: 'frontmatter', message: 'Missing' }],
    }
    const output = formatValidationResult(result)
    expect(output).toContain('[FAIL]')
    expect(output).toContain('ERROR')
  })
})

describe('complianceTagCoverage', () => {
  it('computes coverage across results', () => {
    const results: ValidationResult[] = [
      {
        valid: true,
        skillId: 'a',
        frontmatter: { id: 'a', name: 'A', complianceTags: ['TCFD', 'ISSB'], costTier: 'low' },
        issues: [],
      },
      {
        valid: true,
        skillId: 'b',
        frontmatter: { id: 'b', name: 'B', complianceTags: ['GRI', 'GENERAL'], costTier: 'free' },
        issues: [],
      },
    ]
    const cov = complianceTagCoverage(results)
    expect(cov.covered).toContain('TCFD')
    expect(cov.covered).toContain('GRI')
    expect(cov.missing.length).toBeGreaterThan(0)
    expect(cov.coveragePercent).toBeGreaterThan(0)
    expect(cov.coveragePercent).toBeLessThan(100)
  })

  it('handles empty results', () => {
    const cov = complianceTagCoverage([])
    expect(cov.covered).toHaveLength(0)
    expect(cov.missing.length).toBe(15)
    expect(cov.coveragePercent).toBe(0)
  })
})

describe('all skills pass deep validation', () => {
  it('validates every skill in the skills/ directory', async () => {
    const { readdir } = await import('fs/promises')
    let dirs: string[]
    try {
      dirs = await readdir(SKILLS_DIR)
    } catch {
      return
    }

    for (const dir of dirs) {
      const path = resolve(SKILLS_DIR, dir, 'SKILL.md')
      const result = await validateSkillFile(path)
      expect(result.valid, `Skill "${dir}" failed validation: ${result.issues.map((i) => i.message).join('; ')}`).toBe(true)
    }
  })
})

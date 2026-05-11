import { describe, it, expect } from 'vitest'
import {
  parseFrontmatter,
  validateFrontmatter,
  SkillValidationError,
  COMPLIANCE_TAGS,
  COST_TIERS,
} from './schema.js'

describe('COMPLIANCE_TAGS', () => {
  it('includes core frameworks', () => {
    expect(COMPLIANCE_TAGS).toContain('ISSB')
    expect(COMPLIANCE_TAGS).toContain('ESRS')
    expect(COMPLIANCE_TAGS).toContain('TCFD')
    expect(COMPLIANCE_TAGS).toContain('GHG_PROTOCOL')
    expect(COMPLIANCE_TAGS).toContain('GENERAL')
  })

  it('has 15 tags', () => {
    expect(COMPLIANCE_TAGS).toHaveLength(15)
  })
})

describe('COST_TIERS', () => {
  it('has 4 tiers', () => {
    expect(COST_TIERS).toEqual(['free', 'low', 'medium', 'high'])
  })
})

describe('parseFrontmatter', () => {
  it('parses valid frontmatter', () => {
    const content = `---
id: test-skill
name: Test Skill
complianceTags: [ISSB, GENERAL]
---

# Body content`
    const result = parseFrontmatter(content)
    expect(result).not.toBeNull()
    expect(result!.raw.id).toBe('test-skill')
    expect(result!.raw.name).toBe('Test Skill')
    expect(result!.body).toContain('# Body content')
  })

  it('returns null for content without frontmatter', () => {
    expect(parseFrontmatter('# Just a heading')).toBeNull()
    expect(parseFrontmatter('no frontmatter here')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseFrontmatter('')).toBeNull()
  })

  it('parses inline array syntax', () => {
    const content = `---
id: skill
name: Skill
complianceTags: [TCFD, CDP, SBTi]
---
body`
    const result = parseFrontmatter(content)
    expect(result).not.toBeNull()
    expect(result!.raw.complianceTags).toEqual(['TCFD', 'CDP', 'SBTi'])
  })

  it('parses scalar values', () => {
    const content = `---
id: skill
name: My Skill
costTier: free
---
body`
    const result = parseFrontmatter(content)
    expect(result!.raw.costTier).toBe('free')
  })
})

describe('validateFrontmatter', () => {
  it('validates a well-formed frontmatter', () => {
    const raw = {
      id: 'test-skill',
      name: 'Test Skill',
      complianceTags: ['ISSB', 'GENERAL'],
    }
    const result = validateFrontmatter(raw, 'test-skill')
    expect(result.id).toBe('test-skill')
    expect(result.name).toBe('Test Skill')
    expect(result.complianceTags).toEqual(['ISSB', 'GENERAL'])
  })

  it('throws SkillValidationError for missing complianceTags', () => {
    expect(() =>
      validateFrontmatter({ id: 'x', name: 'X' }, 'x')
    ).toThrow(SkillValidationError)
  })

  it('throws for empty complianceTags', () => {
    expect(() =>
      validateFrontmatter({ id: 'x', name: 'X', complianceTags: [] }, 'x')
    ).toThrow(SkillValidationError)
  })

  it('throws for unrecognized compliance tag', () => {
    expect(() =>
      validateFrontmatter(
        { id: 'x', name: 'X', complianceTags: ['FAKE_TAG'] },
        'x'
      )
    ).toThrow(SkillValidationError)
  })

  it('accepts all valid compliance tags', () => {
    for (const tag of COMPLIANCE_TAGS) {
      const result = validateFrontmatter(
        { id: `skill-${tag}`, name: `Skill ${tag}`, complianceTags: [tag] },
        `skill-${tag}`
      )
      expect(result.complianceTags).toContain(tag)
    }
  })

  it('uses directory name as fallback id', () => {
    const result = validateFrontmatter(
      { name: 'No Id', complianceTags: ['GENERAL'] },
      'dir-name'
    )
    expect(result.id).toBe('dir-name')
  })

  it('normalises lowercase compliance tags to canonical form', () => {
    const result = validateFrontmatter(
      { id: 'x', name: 'X', complianceTags: ['issb', 'tcfd'] },
      'x'
    )
    expect(result.complianceTags).toEqual(['ISSB', 'TCFD'])
  })

  it('includes optional fields when present', () => {
    const result = validateFrontmatter(
      {
        id: 'x',
        name: 'X',
        complianceTags: ['GENERAL'],
        costTier: 'low',
        description: 'A description',
        evidenceSource: 'EPA data',
      },
      'x'
    )
    expect(result.costTier).toBe('low')
    expect(result.description).toBe('A description')
    expect(result.evidenceSource).toBe('EPA data')
  })
})

describe('SkillValidationError', () => {
  it('is an instance of Error', () => {
    const err = new SkillValidationError('test error', 'skill-id')
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('SkillValidationError')
    expect(err.skillId).toBe('skill-id')
    expect(err.message).toBe('test error')
  })
})

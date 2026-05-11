import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  readdir: vi.fn().mockResolvedValue([]),
}))

vi.mock('../security/policy.js', () => ({
  isComplianceTagAllowed: vi.fn().mockResolvedValue(true),
}))

vi.mock('../memory/rag.js', () => ({
  rankByTfIdf: vi.fn().mockReturnValue([]),
}))

import { readFile, readdir } from 'fs/promises'
import { isComplianceTagAllowed } from '../security/policy.js'
import { rankByTfIdf } from '../memory/rag.js'
import {
  loadSkillMetadata,
  loadSkillContent,
  buildSkillsContext,
  buildRagSkillsContext,
  invalidateSkillCache,
} from './loader.js'

const mockReadFile = vi.mocked(readFile)
const mockReaddir = vi.mocked(readdir)
const mockIsComplianceTagAllowed = vi.mocked(isComplianceTagAllowed)
const mockRankByTfIdf = vi.mocked(rankByTfIdf)

const VALID_SKILL_MD = `---
id: flood-risk-screening
name: Flood Risk Screening
complianceTags: [ISSB, TCFD]
costTier: free
description: Screen properties for flood risk
evidenceSource: FEMA NFHL
---

# Flood Risk Screening

Step-by-step flood risk methodology.`

const VALID_SKILL_2 = `---
id: carbon-tracker
name: Carbon Tracker
complianceTags: [GHG_PROTOCOL, GENERAL]
costTier: low
---

# Carbon Tracker

Track your carbon footprint.`

beforeEach(() => {
  vi.clearAllMocks()
  invalidateSkillCache()
  mockReaddir.mockResolvedValue([])
  mockReadFile.mockRejectedValue(new Error('ENOENT'))
  mockIsComplianceTagAllowed.mockResolvedValue(true)
})

describe('loadSkillMetadata', () => {
  it('returns empty array when skills dir is missing', async () => {
    mockReaddir.mockRejectedValueOnce(new Error('ENOENT'))
    const result = await loadSkillMetadata()
    expect(result).toEqual([])
  })

  it('returns empty array when no skill dirs exist', async () => {
    mockReaddir.mockResolvedValueOnce([])
    const result = await loadSkillMetadata()
    expect(result).toEqual([])
  })

  it('loads valid skill metadata', async () => {
    mockReaddir.mockResolvedValueOnce(['flood-risk-screening'] as any)
    mockReadFile.mockResolvedValueOnce(VALID_SKILL_MD)
    const result = await loadSkillMetadata()
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('flood-risk-screening')
    expect(result[0].name).toBe('Flood Risk Screening')
    expect(result[0].complianceTags).toEqual(['ISSB', 'TCFD'])
    expect(result[0].costTier).toBe('free')
    expect(result[0].description).toBe('Screen properties for flood risk')
    expect(result[0].evidenceSource).toBe('FEMA NFHL')
  })

  it('extracts firstLine from body heading', async () => {
    mockReaddir.mockResolvedValueOnce(['flood-risk-screening'] as any)
    mockReadFile.mockResolvedValueOnce(VALID_SKILL_MD)
    const result = await loadSkillMetadata()
    expect(result[0].firstLine).toBe('Flood Risk Screening')
  })

  it('skips dirs without SKILL.md', async () => {
    mockReaddir.mockResolvedValueOnce(['no-skill-dir'] as any)
    mockReadFile.mockRejectedValueOnce(new Error('ENOENT'))
    const result = await loadSkillMetadata()
    expect(result).toEqual([])
  })

  it('skips skill without frontmatter', async () => {
    mockReaddir.mockResolvedValueOnce(['bad-skill'] as any)
    mockReadFile.mockResolvedValueOnce('# No frontmatter here')
    const result = await loadSkillMetadata()
    expect(result).toEqual([])
  })

  it('skips skill with invalid frontmatter', async () => {
    const invalid = `---
id: bad
complianceTags: [FAKE_TAG]
---
body`
    mockReaddir.mockResolvedValueOnce(['bad'] as any)
    mockReadFile.mockResolvedValueOnce(invalid)
    const result = await loadSkillMetadata()
    expect(result).toEqual([])
  })

  it('loads multiple skills', async () => {
    mockReaddir.mockResolvedValueOnce(['flood-risk-screening', 'carbon-tracker'] as any)
    mockReadFile
      .mockResolvedValueOnce(VALID_SKILL_MD)
      .mockResolvedValueOnce(VALID_SKILL_2)
    const result = await loadSkillMetadata()
    expect(result).toHaveLength(2)
  })

  it('caches results within TTL', async () => {
    mockReaddir.mockResolvedValueOnce(['flood-risk-screening'] as any)
    mockReadFile.mockResolvedValueOnce(VALID_SKILL_MD)
    await loadSkillMetadata()
    const second = await loadSkillMetadata()
    expect(second).toHaveLength(1)
    expect(mockReaddir).toHaveBeenCalledTimes(1)
  })
})

describe('loadSkillContent', () => {
  it('returns null for invalid skill id', async () => {
    expect(await loadSkillContent('../escape')).toBeNull()
    expect(await loadSkillContent('has spaces')).toBeNull()
    expect(await loadSkillContent('')).toBeNull()
  })

  it('returns null when skill file missing', async () => {
    mockReadFile.mockRejectedValueOnce(new Error('ENOENT'))
    expect(await loadSkillContent('nonexistent')).toBeNull()
  })

  it('returns content for valid skill id', async () => {
    mockReadFile.mockResolvedValueOnce(VALID_SKILL_MD)
    const content = await loadSkillContent('flood-risk-screening')
    expect(content).toContain('Flood Risk Screening')
  })
})

describe('buildSkillsContext', () => {
  it('returns empty string when no skills exist', async () => {
    const result = await buildSkillsContext()
    expect(result).toBe('')
  })

  it('returns formatted skills list', async () => {
    mockReaddir.mockResolvedValueOnce(['flood-risk-screening'] as any)
    mockReadFile.mockResolvedValueOnce(VALID_SKILL_MD)
    invalidateSkillCache()
    const result = await buildSkillsContext()
    expect(result).toContain('AVAILABLE SKILLS')
    expect(result).toContain('Flood Risk Screening')
    expect(result).toContain('ISSB, TCFD')
  })

  it('filters by channel compliance when channel provided', async () => {
    mockReaddir.mockResolvedValueOnce(['flood-risk-screening'] as any)
    mockReadFile.mockResolvedValueOnce(VALID_SKILL_MD)
    invalidateSkillCache()
    mockIsComplianceTagAllowed.mockResolvedValueOnce(false)
    const result = await buildSkillsContext('slack')
    expect(result).toBe('')
  })
})

describe('buildRagSkillsContext', () => {
  it('returns empty string when no skills exist', async () => {
    const result = await buildRagSkillsContext('flood risk')
    expect(result).toBe('')
  })

  it('returns relevant skills based on TF-IDF ranking', async () => {
    mockReaddir.mockResolvedValueOnce(['flood-risk-screening'] as any)
    mockReadFile.mockResolvedValueOnce(VALID_SKILL_MD)
    invalidateSkillCache()
    await loadSkillMetadata()

    mockRankByTfIdf.mockReturnValueOnce([
      { id: 'flood-risk-screening', score: 0.8 },
    ])
    const result = await buildRagSkillsContext('flood risk')
    expect(result).toContain('RELEVANT SKILL GUIDES')
    expect(result).toContain('Flood Risk Screening')
  })

  it('excludes zero-score results', async () => {
    mockReaddir.mockResolvedValueOnce(['flood-risk-screening'] as any)
    mockReadFile.mockResolvedValueOnce(VALID_SKILL_MD)
    invalidateSkillCache()
    await loadSkillMetadata()

    mockRankByTfIdf.mockReturnValueOnce([
      { id: 'flood-risk-screening', score: 0 },
    ])
    const result = await buildRagSkillsContext('unrelated query')
    expect(result).toBe('')
  })
})

describe('invalidateSkillCache', () => {
  it('forces reload on next call', async () => {
    mockReaddir.mockResolvedValue(['flood-risk-screening'] as any)
    mockReadFile.mockResolvedValue(VALID_SKILL_MD)
    await loadSkillMetadata()
    invalidateSkillCache()
    await loadSkillMetadata()
    expect(mockReaddir).toHaveBeenCalledTimes(2)
  })
})

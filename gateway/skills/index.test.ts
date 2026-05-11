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
import { listSkillsFormatted, showSkill } from './index.js'
import { invalidateSkillCache } from './loader.js'

const mockReadFile = vi.mocked(readFile)
const mockReaddir = vi.mocked(readdir)

const VALID_SKILL_MD = `---
id: flood-risk-screening
name: Flood Risk Screening
complianceTags: [ISSB, TCFD]
costTier: free
---

# Flood Risk Screening

Step-by-step flood risk methodology.`

beforeEach(() => {
  vi.clearAllMocks()
  invalidateSkillCache()
  mockReaddir.mockResolvedValue([])
  mockReadFile.mockRejectedValue(new Error('ENOENT'))
})

describe('listSkillsFormatted', () => {
  it('returns "no skills" message when none exist', async () => {
    const result = await listSkillsFormatted()
    expect(result).toContain('No skills found')
  })

  it('lists skills with id and name', async () => {
    mockReaddir.mockResolvedValueOnce(['flood-risk-screening'] as any)
    mockReadFile.mockResolvedValueOnce(VALID_SKILL_MD)
    const result = await listSkillsFormatted()
    expect(result).toContain('flood-risk-screening')
    expect(result).toContain('Flood Risk Screening')
    expect(result).toContain('Available Skills')
  })

  it('includes usage instructions', async () => {
    mockReaddir.mockResolvedValueOnce(['flood-risk-screening'] as any)
    mockReadFile.mockResolvedValueOnce(VALID_SKILL_MD)
    const result = await listSkillsFormatted()
    expect(result).toContain('seabri skills show')
    expect(result).toContain('seabri skills create')
  })

  it('lists multiple skills', async () => {
    const SKILL_2 = `---
id: carbon-tracker
name: Carbon Tracker
complianceTags: [GHG_PROTOCOL, GENERAL]
costTier: low
---

# Carbon Tracker

Track carbon.`

    mockReaddir.mockResolvedValueOnce(['flood-risk-screening', 'carbon-tracker'] as any)
    mockReadFile
      .mockResolvedValueOnce(VALID_SKILL_MD)
      .mockResolvedValueOnce(SKILL_2)
    const result = await listSkillsFormatted()
    expect(result).toContain('flood-risk-screening')
    expect(result).toContain('carbon-tracker')
  })
})

describe('showSkill', () => {
  it('returns null for invalid skill id', async () => {
    expect(await showSkill('../escape')).toBeNull()
  })

  it('returns null for missing skill', async () => {
    mockReadFile.mockRejectedValueOnce(new Error('ENOENT'))
    expect(await showSkill('nonexistent')).toBeNull()
  })

  it('returns full content for valid skill', async () => {
    mockReadFile.mockResolvedValueOnce(VALID_SKILL_MD)
    const content = await showSkill('flood-risk-screening')
    expect(content).toContain('Flood Risk Screening')
    expect(content).toContain('Step-by-step')
  })
})

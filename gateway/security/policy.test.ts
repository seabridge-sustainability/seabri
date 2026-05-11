import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockRejectedValue(new Error('ENOENT')),
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}))

import { readFile, writeFile } from 'fs/promises'
import {
  loadPolicy,
  savePolicy,
  isAllowed,
  getPreferredAgent,
  setPreferredAgent,
  setSenderAllow,
  clearSenderPolicy,
  requiresPairing,
  isComplianceTagAllowed,
} from './policy.js'
import type { Policy } from './policy.js'

const mockReadFile = vi.mocked(readFile)
const mockWriteFile = vi.mocked(writeFile)

function makePolicy(overrides: Partial<Policy> = {}): Policy {
  return {
    defaultAgent: 'seabri-orchestrator',
    perSender: {},
    channels: {},
    ...overrides,
  }
}

beforeEach(() => {
  mockReadFile.mockRejectedValue(new Error('ENOENT'))
  mockWriteFile.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('loadPolicy', () => {
  it('returns default policy when no files exist', async () => {
    const policy = await loadPolicy(true)
    expect(policy.defaultAgent).toBe('seabri-orchestrator')
    expect(policy.perSender).toEqual({})
  })

  it('parses valid policy file', async () => {
    const custom = makePolicy({ defaultAgent: 'climate-risk' })
    mockReadFile.mockResolvedValueOnce(JSON.stringify(custom))
    const policy = await loadPolicy(true)
    expect(policy.defaultAgent).toBe('climate-risk')
  })

  it('rejects policy with dangerous keys', async () => {
    const dangerous = '{"defaultAgent":"test","constructor":{"malicious":true}}'
    mockReadFile.mockResolvedValueOnce(dangerous)
    const policy = await loadPolicy(true)
    expect(policy.defaultAgent).toBe('seabri-orchestrator')
  })

  it('fills missing fields with defaults', async () => {
    mockReadFile.mockResolvedValueOnce(JSON.stringify({}))
    const policy = await loadPolicy(true)
    expect(policy.defaultAgent).toBe('seabri-orchestrator')
    expect(policy.perSender).toEqual({})
    expect(policy.channels).toEqual({})
  })
})

describe('isAllowed', () => {
  it('allows unknown sender by default', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'))
    await loadPolicy(true)
    expect(await isAllowed('unknown-user', 'telegram')).toBe(true)
  })

  it('blocks sender with allow: false', async () => {
    const policy = makePolicy({
      perSender: { blocked: { allow: false } },
    })
    mockReadFile.mockResolvedValue(JSON.stringify(policy))
    await loadPolicy(true)
    expect(await isAllowed('blocked', 'telegram')).toBe(false)
  })

  it('blocks sender agent not in channel allowedAgents', async () => {
    const policy = makePolicy({
      perSender: { user1: { agent: 'climate-risk' } },
      channels: { slack: { allowedAgents: ['general'] } },
    })
    mockReadFile.mockResolvedValue(JSON.stringify(policy))
    await loadPolicy(true)
    expect(await isAllowed('user1', 'slack')).toBe(false)
  })

  it('allows sender agent in channel allowedAgents', async () => {
    const policy = makePolicy({
      perSender: { user1: { agent: 'general' } },
      channels: { slack: { allowedAgents: ['general'] } },
    })
    mockReadFile.mockResolvedValue(JSON.stringify(policy))
    await loadPolicy(true)
    expect(await isAllowed('user1', 'slack')).toBe(true)
  })
})

describe('getPreferredAgent', () => {
  it('returns default agent for unknown sender', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'))
    await loadPolicy(true)
    expect(await getPreferredAgent('nobody')).toBe('seabri-orchestrator')
  })

  it('returns sender-specific agent', async () => {
    const policy = makePolicy({
      perSender: { user1: { agent: 'climate-risk' } },
    })
    mockReadFile.mockResolvedValue(JSON.stringify(policy))
    await loadPolicy(true)
    expect(await getPreferredAgent('user1')).toBe('climate-risk')
  })
})

describe('requiresPairing', () => {
  it('defaults to true when channel not in policy', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'))
    await loadPolicy(true)
    expect(await requiresPairing('unknown')).toBe(true)
  })

  it('returns false when channel has requirePairing: false', async () => {
    const policy = makePolicy({
      channels: { slack: { requirePairing: false } },
    })
    mockReadFile.mockResolvedValue(JSON.stringify(policy))
    await loadPolicy(true)
    expect(await requiresPairing('slack')).toBe(false)
  })
})

describe('isComplianceTagAllowed', () => {
  it('allows any tag when channel has no allowedComplianceTags', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'))
    await loadPolicy(true)
    expect(await isComplianceTagAllowed('telegram', ['ISSB'])).toBe(true)
  })

  it('blocks skill with no tags when channel restricts tags', async () => {
    const policy = makePolicy({
      channels: { slack: { allowedComplianceTags: ['ISSB'] } },
    })
    mockReadFile.mockResolvedValue(JSON.stringify(policy))
    await loadPolicy(true)
    expect(await isComplianceTagAllowed('slack', [])).toBe(false)
  })

  it('allows skill with matching tag', async () => {
    const policy = makePolicy({
      channels: { slack: { allowedComplianceTags: ['ISSB', 'CSRD'] } },
    })
    mockReadFile.mockResolvedValue(JSON.stringify(policy))
    await loadPolicy(true)
    expect(await isComplianceTagAllowed('slack', ['ISSB'])).toBe(true)
  })

  it('blocks skill with no matching tags', async () => {
    const policy = makePolicy({
      channels: { slack: { allowedComplianceTags: ['ISSB'] } },
    })
    mockReadFile.mockResolvedValue(JSON.stringify(policy))
    await loadPolicy(true)
    expect(await isComplianceTagAllowed('slack', ['TCFD', 'GRI'])).toBe(false)
  })
})

describe('savePolicy', () => {
  it('writes policy to workspace file', async () => {
    const policy = makePolicy({ defaultAgent: 'climate-risk' })
    await savePolicy(policy)
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining('policy.json'),
      expect.stringContaining('climate-risk'),
      'utf-8'
    )
  })
})

describe('setPreferredAgent', () => {
  it('updates sender agent and saves', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'))
    await loadPolicy(true)
    await setPreferredAgent('user1', 'climate-risk')
    expect(mockWriteFile).toHaveBeenCalled()
  })
})

describe('setSenderAllow', () => {
  it('updates sender allow flag', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'))
    await loadPolicy(true)
    await setSenderAllow('user1', false)
    expect(mockWriteFile).toHaveBeenCalled()
  })
})

describe('clearSenderPolicy', () => {
  it('removes sender from policy', async () => {
    const policy = makePolicy({
      perSender: { user1: { agent: 'test' } },
    })
    mockReadFile.mockResolvedValue(JSON.stringify(policy))
    await loadPolicy(true)
    await clearSenderPolicy('user1')
    expect(mockWriteFile).toHaveBeenCalled()
  })
})

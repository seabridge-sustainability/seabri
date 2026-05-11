import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}))

import { readFile, writeFile } from 'fs/promises'
import {
  isApproved,
  createPairingCode,
  verifyPairingCode,
  approveSender,
  revokeSender,
  listApproved,
} from './pairing.js'

const mockReadFile = vi.mocked(readFile)
const mockWriteFile = vi.mocked(writeFile)

function storeWith(approved: string[] = [], pending: Record<string, { code: string; createdAt: number }> = {}) {
  return JSON.stringify({ approved, pending })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockReadFile.mockRejectedValue(new Error('ENOENT'))
})

describe('isApproved', () => {
  it('returns false when no data file exists', async () => {
    expect(await isApproved('user1')).toBe(false)
  })

  it('returns true for approved sender', async () => {
    mockReadFile.mockResolvedValueOnce(storeWith(['user1']))
    expect(await isApproved('user1')).toBe(true)
  })

  it('returns false for unapproved sender', async () => {
    mockReadFile.mockResolvedValueOnce(storeWith(['user1']))
    expect(await isApproved('user2')).toBe(false)
  })
})

describe('createPairingCode', () => {
  it('returns a 6-digit code', async () => {
    const code = await createPairingCode('user1')
    expect(code).toMatch(/^\d{6}$/)
  })

  it('reuses unexpired code', async () => {
    const pending = { user1: { code: '123456', createdAt: Date.now() } }
    mockReadFile.mockResolvedValueOnce(storeWith([], pending))
    const code = await createPairingCode('user1')
    expect(code).toBe('123456')
  })

  it('generates new code when existing is expired', async () => {
    const expired = { user1: { code: '123456', createdAt: Date.now() - 11 * 60 * 1000 } }
    mockReadFile.mockResolvedValueOnce(storeWith([], expired))
    const code = await createPairingCode('user1')
    expect(code).toMatch(/^\d{6}$/)
    expect(code).not.toBe('123456')
  })

  it('writes updated data', async () => {
    await createPairingCode('user1')
    expect(mockWriteFile).toHaveBeenCalled()
  })
})

describe('verifyPairingCode', () => {
  it('returns false when no pending code exists', async () => {
    expect(await verifyPairingCode('user1', '123456')).toBe(false)
  })

  it('returns false for wrong code', async () => {
    const pending = { user1: { code: '123456', createdAt: Date.now() } }
    mockReadFile.mockResolvedValueOnce(storeWith([], pending))
    expect(await verifyPairingCode('user1', '654321')).toBe(false)
  })

  it('returns false for expired code', async () => {
    const pending = { user1: { code: '123456', createdAt: Date.now() - 11 * 60 * 1000 } }
    mockReadFile.mockResolvedValueOnce(storeWith([], pending))
    expect(await verifyPairingCode('user1', '123456')).toBe(false)
  })

  it('returns true and approves sender for correct code', async () => {
    const pending = { user1: { code: '123456', createdAt: Date.now() } }
    mockReadFile.mockResolvedValueOnce(storeWith([], pending))
    expect(await verifyPairingCode('user1', '123456')).toBe(true)
    const written = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
    expect(written.approved).toContain('user1')
    expect(written.pending.user1).toBeUndefined()
  })
})

describe('approveSender', () => {
  it('adds sender to approved list', async () => {
    await approveSender('newuser')
    const written = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
    expect(written.approved).toContain('newuser')
  })

  it('does not duplicate already approved sender', async () => {
    mockReadFile.mockResolvedValueOnce(storeWith(['user1']))
    await approveSender('user1')
    const written = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
    expect(written.approved.filter((id: string) => id === 'user1')).toHaveLength(1)
  })
})

describe('revokeSender', () => {
  it('removes sender from approved list', async () => {
    mockReadFile.mockResolvedValueOnce(storeWith(['user1', 'user2']))
    await revokeSender('user1')
    const written = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
    expect(written.approved).not.toContain('user1')
    expect(written.approved).toContain('user2')
  })

  it('removes pending code on revoke', async () => {
    const pending = { user1: { code: '123456', createdAt: Date.now() } }
    mockReadFile.mockResolvedValueOnce(storeWith(['user1'], pending))
    await revokeSender('user1')
    const written = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
    expect(written.pending.user1).toBeUndefined()
  })
})

describe('listApproved', () => {
  it('returns empty array when no data', async () => {
    expect(await listApproved()).toEqual([])
  })

  it('returns approved senders', async () => {
    mockReadFile.mockResolvedValueOnce(storeWith(['a', 'b', 'c']))
    expect(await listApproved()).toEqual(['a', 'b', 'c'])
  })
})

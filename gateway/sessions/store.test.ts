import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
  readdir: vi.fn().mockResolvedValue([]),
  unlink: vi.fn().mockResolvedValue(undefined),
}))

import { readFile, writeFile, readdir, unlink } from 'fs/promises'
import {
  saveSession,
  loadSession,
  deleteSession,
  listSessions,
  getRecentSession,
} from './store.js'
import type { Session } from './store.js'

const mockReadFile = vi.mocked(readFile)
const mockWriteFile = vi.mocked(writeFile)
const mockReaddir = vi.mocked(readdir)
const mockUnlink = vi.mocked(unlink)

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Test Session',
    agentId: 'seabri-orchestrator',
    history: [],
    createdAt: 1000,
    lastActiveAt: 2000,
    compressed: false,
    turnCount: 0,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockReadFile.mockRejectedValue(new Error('ENOENT'))
  mockReaddir.mockResolvedValue([])
})

describe('saveSession', () => {
  it('writes session JSON to file', async () => {
    const session = makeSession()
    await saveSession(session)
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining(session.id),
      expect.stringContaining('"Test Session"'),
      'utf-8'
    )
  })
})

describe('loadSession', () => {
  it('returns session when file exists', async () => {
    const session = makeSession()
    mockReadFile.mockResolvedValueOnce(JSON.stringify(session))
    const result = await loadSession(session.id)
    expect(result).not.toBeNull()
    expect(result!.name).toBe('Test Session')
  })

  it('returns null when file does not exist', async () => {
    const result = await loadSession('00000000-0000-0000-0000-000000000099')
    expect(result).toBeNull()
  })

  it('returns null for invalid session id', async () => {
    const result = await loadSession('not-a-uuid')
    expect(result).toBeNull()
  })
})

describe('deleteSession', () => {
  it('calls unlink with session path', async () => {
    await deleteSession('00000000-0000-0000-0000-000000000001')
    expect(mockUnlink).toHaveBeenCalledWith(
      expect.stringContaining('00000000-0000-0000-0000-000000000001')
    )
  })

  it('does not throw when file is missing', async () => {
    mockUnlink.mockRejectedValueOnce(new Error('ENOENT'))
    await expect(deleteSession('00000000-0000-0000-0000-000000000001')).resolves.toBeUndefined()
  })
})

describe('listSessions', () => {
  it('returns empty array when no sessions exist', async () => {
    const result = await listSessions()
    expect(result).toEqual([])
  })

  it('returns sessions sorted by lastActiveAt descending', async () => {
    const s1 = makeSession({ id: '00000000-0000-0000-0000-000000000001', lastActiveAt: 1000 })
    const s2 = makeSession({ id: '00000000-0000-0000-0000-000000000002', lastActiveAt: 3000 })
    mockReaddir.mockResolvedValueOnce([
      '00000000-0000-0000-0000-000000000001.json',
      '00000000-0000-0000-0000-000000000002.json',
    ] as any)
    mockReadFile
      .mockResolvedValueOnce(JSON.stringify(s1))
      .mockResolvedValueOnce(JSON.stringify(s2))
    const result = await listSessions()
    expect(result).toHaveLength(2)
    expect(result[0].lastActiveAt).toBe(3000)
    expect(result[1].lastActiveAt).toBe(1000)
  })

  it('skips non-json files', async () => {
    mockReaddir.mockResolvedValueOnce(['readme.txt', '.gitkeep'] as any)
    const result = await listSessions()
    expect(result).toEqual([])
  })

  it('skips corrupted session files', async () => {
    mockReaddir.mockResolvedValueOnce(['bad.json'] as any)
    mockReadFile.mockRejectedValueOnce(new Error('parse error'))
    const result = await listSessions()
    expect(result).toEqual([])
  })
})

describe('getRecentSession', () => {
  it('returns null when no sessions exist', async () => {
    const result = await getRecentSession()
    expect(result).toBeNull()
  })

  it('returns most recent session', async () => {
    const s1 = makeSession({ id: '00000000-0000-0000-0000-000000000001', lastActiveAt: 1000 })
    const s2 = makeSession({ id: '00000000-0000-0000-0000-000000000002', lastActiveAt: 3000 })
    mockReaddir.mockResolvedValueOnce([
      '00000000-0000-0000-0000-000000000001.json',
      '00000000-0000-0000-0000-000000000002.json',
    ] as any)
    mockReadFile
      .mockResolvedValueOnce(JSON.stringify(s1))
      .mockResolvedValueOnce(JSON.stringify(s2))
    const result = await getRecentSession()
    expect(result).not.toBeNull()
    expect(result!.lastActiveAt).toBe(3000)
  })

  it('filters by agentId when provided', async () => {
    const s1 = makeSession({ id: '00000000-0000-0000-0000-000000000001', agentId: 'climate-risk', lastActiveAt: 3000 })
    const s2 = makeSession({ id: '00000000-0000-0000-0000-000000000002', agentId: 'general', lastActiveAt: 2000 })
    mockReaddir.mockResolvedValueOnce([
      '00000000-0000-0000-0000-000000000001.json',
      '00000000-0000-0000-0000-000000000002.json',
    ] as any)
    mockReadFile
      .mockResolvedValueOnce(JSON.stringify(s1))
      .mockResolvedValueOnce(JSON.stringify(s2))
    const result = await getRecentSession('general')
    expect(result).not.toBeNull()
    expect(result!.agentId).toBe('general')
  })

  it('returns null when no session matches agentId', async () => {
    const s1 = makeSession({ id: '00000000-0000-0000-0000-000000000001', agentId: 'climate-risk' })
    mockReaddir.mockResolvedValueOnce(['00000000-0000-0000-0000-000000000001.json'] as any)
    mockReadFile.mockResolvedValueOnce(JSON.stringify(s1))
    const result = await getRecentSession('nonexistent')
    expect(result).toBeNull()
  })
})

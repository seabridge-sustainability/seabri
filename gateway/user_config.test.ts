import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}))

import { readFile, writeFile } from 'fs/promises'
import {
  loadUserConfig,
  saveUserConfig,
  setUserConfigField,
} from './user_config.js'
import type { UserConfig } from './user_config.js'

const mockReadFile = vi.mocked(readFile)
const mockWriteFile = vi.mocked(writeFile)

beforeEach(() => {
  vi.clearAllMocks()
  mockReadFile.mockRejectedValue(new Error('ENOENT'))
})

describe('loadUserConfig', () => {
  it('returns empty object when no config file exists', async () => {
    const config = await loadUserConfig(true)
    expect(config).toEqual({})
  })

  it('parses valid config file', async () => {
    const data: UserConfig = { companyId: 'acme', sector: 'Energy' }
    mockReadFile.mockResolvedValueOnce(JSON.stringify(data))
    const config = await loadUserConfig(true)
    expect(config.companyId).toBe('acme')
    expect(config.sector).toBe('Energy')
  })

  it('returns cached config within TTL', async () => {
    const data: UserConfig = { companyId: 'cached-co' }
    mockReadFile.mockResolvedValueOnce(JSON.stringify(data))
    await loadUserConfig(true)
    const second = await loadUserConfig()
    expect(second.companyId).toBe('cached-co')
    expect(mockReadFile).toHaveBeenCalledTimes(1)
  })

  it('bypasses cache when force=true', async () => {
    const first: UserConfig = { companyId: 'first' }
    const second: UserConfig = { companyId: 'second' }
    mockReadFile
      .mockResolvedValueOnce(JSON.stringify(first))
      .mockResolvedValueOnce(JSON.stringify(second))
    await loadUserConfig(true)
    const result = await loadUserConfig(true)
    expect(result.companyId).toBe('second')
    expect(mockReadFile).toHaveBeenCalledTimes(2)
  })

  it('returns empty object for invalid JSON', async () => {
    mockReadFile.mockResolvedValueOnce('not-json{{{')
    const config = await loadUserConfig(true)
    expect(config).toEqual({})
  })
})

describe('saveUserConfig', () => {
  it('writes config to file', async () => {
    const config: UserConfig = { companyId: 'save-test', assetId: 'A1' }
    await saveUserConfig(config)
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining('openseabri.json'),
      expect.stringContaining('"save-test"'),
      'utf-8'
    )
  })

  it('updates cache after save', async () => {
    const config: UserConfig = { sector: 'Tech' }
    await saveUserConfig(config)
    const loaded = await loadUserConfig()
    expect(loaded.sector).toBe('Tech')
    expect(mockReadFile).not.toHaveBeenCalled()
  })
})

describe('setUserConfigField', () => {
  it('sets a new field on empty config', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'))
    await setUserConfigField('companyId', 'new-co')
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining('openseabri.json'),
      expect.stringContaining('"new-co"'),
      'utf-8'
    )
  })

  it('updates an existing field', async () => {
    const existing: UserConfig = { companyId: 'old', sector: 'Energy' }
    mockReadFile.mockResolvedValueOnce(JSON.stringify(existing))
    await setUserConfigField('companyId', 'updated')
    const written = mockWriteFile.mock.calls[0][1] as string
    const parsed = JSON.parse(written)
    expect(parsed.companyId).toBe('updated')
    expect(parsed.sector).toBe('Energy')
  })

  it('deletes a field when value is undefined', async () => {
    const existing: UserConfig = { companyId: 'to-delete', sector: 'Energy' }
    mockReadFile.mockResolvedValueOnce(JSON.stringify(existing))
    await setUserConfigField('companyId', undefined)
    const written = mockWriteFile.mock.calls[0][1] as string
    const parsed = JSON.parse(written)
    expect(parsed.companyId).toBeUndefined()
    expect(parsed.sector).toBe('Energy')
  })
})

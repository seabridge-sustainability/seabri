import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../bridge/seabridge_client.js', () => ({
  runAgent: vi.fn().mockResolvedValue({ status: 'ok' }),
}))

import { readFile, writeFile } from 'fs/promises'
import { runAgent } from '../../bridge/seabridge_client.js'
import {
  PRESETS,
  listRegisteredPresets,
  enablePreset,
  disablePreset,
  runPresetNow,
} from './presets.js'

const mockReadFile = vi.mocked(readFile)
const mockWriteFile = vi.mocked(writeFile)
const mockRunAgent = vi.mocked(runAgent)

function storeWith(presets: Array<{ presetId: string; expression: string; enabled: boolean }>) {
  return JSON.stringify({ presets })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockReadFile.mockRejectedValue(new Error('ENOENT'))
})

describe('PRESETS', () => {
  it('has regulation-monitoring-nightly preset', () => {
    expect(PRESETS['regulation-monitoring-nightly']).toBeDefined()
  })

  it('preset has required fields', () => {
    const preset = PRESETS['regulation-monitoring-nightly']
    expect(preset.id).toBe('regulation-monitoring-nightly')
    expect(preset.agent).toBeTruthy()
    expect(preset.description).toBeTruthy()
    expect(preset.defaultExpression).toMatch(/^\d/)
    expect(preset.complianceTags.length).toBeGreaterThan(0)
  })

  it('preset has compliance tags', () => {
    const tags = PRESETS['regulation-monitoring-nightly'].complianceTags
    expect(tags).toContain('CSRD')
    expect(tags).toContain('SEC')
    expect(tags).toContain('ISSB')
    expect(tags).toContain('SFDR')
  })
})

describe('listRegisteredPresets', () => {
  it('returns empty array when no store file', async () => {
    const result = await listRegisteredPresets()
    expect(result).toEqual([])
  })

  it('returns stored presets', async () => {
    const presets = [{ presetId: 'regulation-monitoring-nightly', expression: '0 2 * * *', enabled: true }]
    mockReadFile.mockResolvedValueOnce(storeWith(presets))
    const result = await listRegisteredPresets()
    expect(result).toHaveLength(1)
    expect(result[0].presetId).toBe('regulation-monitoring-nightly')
  })
})

describe('enablePreset', () => {
  it('creates new entry for unknown preset', async () => {
    const result = await enablePreset('regulation-monitoring-nightly')
    expect(result.presetId).toBe('regulation-monitoring-nightly')
    expect(result.enabled).toBe(true)
    expect(result.expression).toBe('0 2 * * *')
    expect(mockWriteFile).toHaveBeenCalled()
  })

  it('uses custom expression when provided', async () => {
    const result = await enablePreset('regulation-monitoring-nightly', '0 3 * * *')
    expect(result.expression).toBe('0 3 * * *')
  })

  it('re-enables existing disabled entry', async () => {
    const presets = [{ presetId: 'regulation-monitoring-nightly', expression: '0 2 * * *', enabled: false }]
    mockReadFile.mockResolvedValueOnce(storeWith(presets))
    const result = await enablePreset('regulation-monitoring-nightly')
    expect(result.enabled).toBe(true)
  })

  it('throws for invalid preset id', async () => {
    await expect(enablePreset('nonexistent' as any)).rejects.toThrow('Unknown preset')
  })
})

describe('disablePreset', () => {
  it('returns false when preset not registered', async () => {
    const result = await disablePreset('regulation-monitoring-nightly')
    expect(result).toBe(false)
  })

  it('disables an enabled preset', async () => {
    const presets = [{ presetId: 'regulation-monitoring-nightly', expression: '0 2 * * *', enabled: true }]
    mockReadFile.mockResolvedValueOnce(storeWith(presets))
    const result = await disablePreset('regulation-monitoring-nightly')
    expect(result).toBe(true)
    const written = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
    expect(written.presets[0].enabled).toBe(false)
  })
})

describe('runPresetNow', () => {
  const tokenFactory = vi.fn().mockReturnValue('mock-token')

  it('returns error for unknown preset', async () => {
    const result = await runPresetNow('nonexistent' as any, tokenFactory)
    expect(result.ok).toBe(false)
    expect(result.data).toEqual({ error: 'unknown_preset' })
  })

  it('calls runAgent with correct args', async () => {
    mockRunAgent.mockResolvedValueOnce({ status: 'ok' })
    await runPresetNow('regulation-monitoring-nightly', tokenFactory)
    expect(tokenFactory).toHaveBeenCalledWith(
      'regulation_monitoring',
      expect.objectContaining({ scope: 'global' })
    )
    expect(mockRunAgent).toHaveBeenCalledWith(
      'regulation_monitoring',
      expect.objectContaining({ scope: 'global' }),
      'mock-token'
    )
  })

  it('returns ok: true when runAgent returns data', async () => {
    mockRunAgent.mockResolvedValueOnce({ result: 'done' })
    const result = await runPresetNow('regulation-monitoring-nightly', tokenFactory)
    expect(result.ok).toBe(true)
  })

  it('returns ok: false when runAgent returns null', async () => {
    mockRunAgent.mockResolvedValueOnce(null)
    const result = await runPresetNow('regulation-monitoring-nightly', tokenFactory)
    expect(result.ok).toBe(false)
  })
})

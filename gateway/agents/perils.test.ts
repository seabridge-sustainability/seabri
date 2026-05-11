import { describe, it, expect, vi } from 'vitest'
import {
  ALL_PERIL_TOOLS,
  COASTAL_FLOOD_TOOL,
  INLAND_FLOOD_TOOL,
  WILDFIRE_TOOL,
  HEAT_STRESS_TOOL,
  HURRICANE_WIND_TOOL,
  DROUGHT_STRESS_TOOL,
  executePerilTool,
} from './perils.js'

describe('ALL_PERIL_TOOLS', () => {
  it('has 6 peril tools', () => {
    expect(ALL_PERIL_TOOLS).toHaveLength(6)
  })

  it('contains all named tools', () => {
    const names = ALL_PERIL_TOOLS.map((t) => t.name)
    expect(names).toContain('coastal_flood_assessment')
    expect(names).toContain('inland_flood_assessment')
    expect(names).toContain('wildfire_assessment')
    expect(names).toContain('heat_stress_assessment')
    expect(names).toContain('hurricane_wind_assessment')
    expect(names).toContain('drought_stress_assessment')
  })

  it('all tools have valid schema structure', () => {
    for (const tool of ALL_PERIL_TOOLS) {
      expect(tool.name).toBeTruthy()
      expect(tool.description).toBeTruthy()
      expect(tool.input_schema.type).toBe('object')
      expect(tool.input_schema.required).toContain('address')
    }
  })

  it('all tools require exactly one field: address', () => {
    for (const tool of ALL_PERIL_TOOLS) {
      expect(tool.input_schema.required).toEqual(['address'])
      expect(tool.input_schema.properties).toHaveProperty('address')
    }
  })
})

describe('individual tool constants', () => {
  it('COASTAL_FLOOD_TOOL has correct name', () => {
    expect(COASTAL_FLOOD_TOOL.name).toBe('coastal_flood_assessment')
  })

  it('INLAND_FLOOD_TOOL has correct name', () => {
    expect(INLAND_FLOOD_TOOL.name).toBe('inland_flood_assessment')
  })

  it('WILDFIRE_TOOL has correct name', () => {
    expect(WILDFIRE_TOOL.name).toBe('wildfire_assessment')
  })

  it('HEAT_STRESS_TOOL has correct name', () => {
    expect(HEAT_STRESS_TOOL.name).toBe('heat_stress_assessment')
  })

  it('HURRICANE_WIND_TOOL has correct name', () => {
    expect(HURRICANE_WIND_TOOL.name).toBe('hurricane_wind_assessment')
  })

  it('DROUGHT_STRESS_TOOL has correct name', () => {
    expect(DROUGHT_STRESS_TOOL.name).toBe('drought_stress_assessment')
  })
})

describe('executePerilTool', () => {
  it('returns error for missing address', async () => {
    const result = await executePerilTool('coastal_flood_assessment', {})
    expect(result).toBe('Invalid input: address must be a non-empty string.')
  })

  it('returns error for empty string address', async () => {
    const result = await executePerilTool('coastal_flood_assessment', { address: '   ' })
    expect(result).toBe('Invalid input: address must be a non-empty string.')
  })

  it('returns error for non-string address', async () => {
    const result = await executePerilTool('coastal_flood_assessment', { address: 123 })
    expect(result).toBe('Invalid input: address must be a non-empty string.')
  })

  it('returns null for unknown tool name', async () => {
    const result = await executePerilTool('unknown_tool', { address: '123 Main St' })
    expect(result).toBeNull()
  })

  it('returns error string on network failure for coastal_flood', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
    const result = await executePerilTool('coastal_flood_assessment', { address: '123 Main St, Miami FL' })
    expect(result).toContain('error')
    vi.unstubAllGlobals()
  })

  it('returns error string on network failure for inland_flood', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
    const result = await executePerilTool('inland_flood_assessment', { address: '456 Oak Ave, Houston TX' })
    expect(result).toContain('error')
    vi.unstubAllGlobals()
  })

  it('returns error string on network failure for wildfire', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
    const result = await executePerilTool('wildfire_assessment', { address: '789 Pine Rd, LA CA' })
    expect(result).toContain('error')
    vi.unstubAllGlobals()
  })

  it('returns error string on network failure for heat_stress', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
    const result = await executePerilTool('heat_stress_assessment', { address: '100 Sun Blvd, Phoenix AZ' })
    expect(result).toContain('error')
    vi.unstubAllGlobals()
  })

  it('returns error string on network failure for hurricane_wind', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
    const result = await executePerilTool('hurricane_wind_assessment', { address: '200 Beach Dr, Tampa FL' })
    expect(result).toContain('error')
    vi.unstubAllGlobals()
  })

  it('returns error string on network failure for drought_stress', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
    const result = await executePerilTool('drought_stress_assessment', { address: '300 Dry Ln, Tucson AZ' })
    expect(result).toContain('error')
    vi.unstubAllGlobals()
  })
})

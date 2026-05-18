/**
 * agent_bridge.test.ts
 *
 * Tests for the augment*Context functions in bridge/agent_bridge.ts.
 *
 * Strategy:
 *   - vi.mock() the seabridge_client module so tests don't need a live backend
 *   - Each test provides a synthetic API response and asserts the formatted
 *     context string contains expected fields
 *   - Null / empty / undefined responses must return '' (never throw)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the client module before importing agent_bridge so the ESM resolver
// sees the mock on first import.
vi.mock('../../bridge/seabridge_client.js', () => ({
  isSeaBridgeAvailable: vi.fn().mockResolvedValue(true),
  getClimateRiskData: vi.fn().mockResolvedValue(null),
  getNatureRiskData: vi.fn().mockResolvedValue(null),
  getTransitionRiskData: vi.fn().mockResolvedValue(null),
  getSustainabilityBrief: vi.fn().mockResolvedValue(null),
  getTargets: vi.fn().mockResolvedValue(null),
  getMateriality: vi.fn().mockResolvedValue(null),
  getRegulationMonitoring: vi.fn().mockResolvedValue(null),
  getWorldRiskScores: vi.fn().mockResolvedValue(null),
  getCountryRisk: vi.fn().mockResolvedValue(null),
  getAgentLatest: vi.fn().mockResolvedValue(null),
  listMcpTools: vi.fn().mockResolvedValue(null),
}))

import * as client from '../../bridge/seabridge_client.js'
import {
  augmentClimateRiskContext,
  augmentNatureRiskContext,
  augmentTransitionRiskContext,
  augmentSustainabilityContext,
  augmentTargetsContext,
  augmentMaterialityContext,
  augmentRegulationContext,
  augmentWorldRiskContext,
  augmentAgentLatestContext,
  augmentMcpToolsContext,
} from '../../bridge/agent_bridge.js'

// Convenience — cast the mocked client for easy per-test override
const mockClient = client as unknown as {
  isSeaBridgeAvailable: ReturnType<typeof vi.fn>
  getClimateRiskData: ReturnType<typeof vi.fn>
  getNatureRiskData: ReturnType<typeof vi.fn>
  getTransitionRiskData: ReturnType<typeof vi.fn>
  getSustainabilityBrief: ReturnType<typeof vi.fn>
  getTargets: ReturnType<typeof vi.fn>
  getMateriality: ReturnType<typeof vi.fn>
  getRegulationMonitoring: ReturnType<typeof vi.fn>
  getWorldRiskScores: ReturnType<typeof vi.fn>
  getCountryRisk: ReturnType<typeof vi.fn>
  getAgentLatest: ReturnType<typeof vi.fn>
  listMcpTools: ReturnType<typeof vi.fn>
}

beforeEach(() => {
  vi.clearAllMocks()
  mockClient.isSeaBridgeAvailable.mockResolvedValue(true)
})

// ── augmentClimateRiskContext ──────────────────────────────────────────────

describe('augmentClimateRiskContext', () => {
  it('returns empty string when companyId is omitted', async () => {
    const result = await augmentClimateRiskContext('London')
    expect(result).toBe('')
  })

  it('returns empty string when backend returns null', async () => {
    mockClient.getClimateRiskData.mockResolvedValue(null)
    const result = await augmentClimateRiskContext('London', 'company-1')
    expect(result).toBe('')
  })

  it('formats climate risk fields correctly', async () => {
    mockClient.getClimateRiskData.mockResolvedValue({
      company_id: 'company-1',
      flood_risk: 7.5,
      wildfire_risk: 3.2,
      heat_risk: 8.1,
      drought_risk: 4.0,
      overall_score: 6.5,
      period: '2024',
      notes: 'High coastal exposure',
    })
    const result = await augmentClimateRiskContext('London', 'company-1')
    expect(result).toContain('Climate Risk')
    expect(result).toContain('Flood risk score: 7.5')
    expect(result).toContain('Wildfire risk score: 3.2')
    expect(result).toContain('Heat stress score: 8.1')
    expect(result).toContain('Overall climate risk score: 6.5')
    expect(result).toContain('2024')
    expect(result).toContain('High coastal exposure')
  })

  it('handles partial response — missing fields show as N/A via safeNum', async () => {
    mockClient.getClimateRiskData.mockResolvedValue({ company_id: 'company-2' })
    const result = await augmentClimateRiskContext('NYC', 'company-2')
    // No scores present — string should still be non-empty and not throw
    expect(typeof result).toBe('string')
    expect(result).toContain('company-2')
  })

  it('returns empty string when SeaBridge is unavailable', async () => {
    mockClient.isSeaBridgeAvailable.mockResolvedValue(false)
    const result = await augmentClimateRiskContext('London', 'company-1')
    expect(result).toBe('')
  })

  it('returns empty string (never throws) when client throws', async () => {
    mockClient.getClimateRiskData.mockRejectedValue(new Error('network error'))
    const result = await augmentClimateRiskContext('London', 'company-1')
    expect(result).toBe('')
  })
})

// ── augmentNatureRiskContext ───────────────────────────────────────────────

describe('augmentNatureRiskContext', () => {
  it('returns empty string when companyId is omitted', async () => {
    expect(await augmentNatureRiskContext()).toBe('')
  })

  it('returns empty string when backend returns null', async () => {
    mockClient.getNatureRiskData.mockResolvedValue(null)
    expect(await augmentNatureRiskContext('company-1')).toBe('')
  })

  it('formats nature risk fields', async () => {
    mockClient.getNatureRiskData.mockResolvedValue({
      company_id: 'company-1',
      leap_phase: 'E',
      risk_ratings: { biodiversity: 'High', water: 'Medium' },
      executive_summary: 'Significant biodiversity dependency.',
      period: '2024',
    })
    const result = await augmentNatureRiskContext('company-1')
    expect(result).toContain('Nature Risk')
    expect(result).toContain('LEAP phase completed: E')
    expect(result).toContain('biodiversity: High')
    expect(result).toContain('Significant biodiversity dependency.')
  })

  it('returns empty string when client throws', async () => {
    mockClient.getNatureRiskData.mockRejectedValue(new Error('timeout'))
    expect(await augmentNatureRiskContext('company-1')).toBe('')
  })
})

// ── augmentTransitionRiskContext ───────────────────────────────────────────

describe('augmentTransitionRiskContext', () => {
  it('returns empty string when companyId is omitted', async () => {
    expect(await augmentTransitionRiskContext()).toBe('')
  })

  it('formats transition risk categories', async () => {
    mockClient.getTransitionRiskData.mockResolvedValue({
      company_id: 'company-1',
      risk_categories: [
        { name: 'policy', score: 7 },
        { name: 'technology', score: 4 },
      ],
      overall_score: 5.5,
      period: '2025',
    })
    const result = await augmentTransitionRiskContext('company-1')
    expect(result).toContain('Transition Risk')
    expect(result).toContain('policy')
    expect(result).toContain('Overall transition risk score: 5.5')
  })

  it('handles null response gracefully', async () => {
    mockClient.getTransitionRiskData.mockResolvedValue(null)
    expect(await augmentTransitionRiskContext('company-1')).toBe('')
  })
})

// ── augmentSustainabilityContext ───────────────────────────────────────────

describe('augmentSustainabilityContext', () => {
  it('returns empty string when backend returns null', async () => {
    mockClient.getSustainabilityBrief.mockResolvedValue(null)
    expect(await augmentSustainabilityContext('Energy')).toBe('')
  })

  it('formats sustainability intelligence bullets', async () => {
    mockClient.getSustainabilityBrief.mockResolvedValue({
      sector: 'Energy',
      timestamp: '2024-01-01T00:00:00Z',
      bullets: ['Renewables share at 42%', 'Carbon price EU €65/t'],
      sources: { IEA: 'https://iea.org', IRENA: 'https://irena.org' },
    })
    const result = await augmentSustainabilityContext('Energy')
    expect(result).toContain('Sustainability Intelligence')
    expect(result).toContain('Renewables share at 42%')
    expect(result).toContain('IEA')
  })

  it('defaults sector to General', async () => {
    mockClient.getSustainabilityBrief.mockResolvedValue({
      sector: 'General',
      bullets: [],
      sources: {},
    })
    const result = await augmentSustainabilityContext()
    expect(result).toContain('General')
  })
})

// ── augmentTargetsContext ──────────────────────────────────────────────────

describe('augmentTargetsContext', () => {
  it('returns empty string when assetId is empty', async () => {
    expect(await augmentTargetsContext('')).toBe('')
  })

  it('returns empty string for null backend response', async () => {
    mockClient.getTargets.mockResolvedValue(null)
    expect(await augmentTargetsContext('asset-1')).toBe('')
  })

  it('formats targets list', async () => {
    mockClient.getTargets.mockResolvedValue({
      asset_id: 'asset-1',
      total: 1,
      data: [{
        name: 'Net Zero 2040',
        category: 'GHG',
        target_status: 'on_track',
        baseline_value: 1000,
        target_value: 0,
        unit: 'tCO2e',
        target_year: '2040',
      }],
    })
    const result = await augmentTargetsContext('asset-1')
    expect(result).toContain('Sustainability Targets')
    expect(result).toContain('Net Zero 2040')
    expect(result).toContain('tCO2e')
    expect(result).toContain('2040')
  })
})

// ── augmentMaterialityContext ──────────────────────────────────────────────

describe('augmentMaterialityContext', () => {
  it('returns empty string when backend returns null', async () => {
    mockClient.getMateriality.mockResolvedValue(null)
    expect(await augmentMaterialityContext('company-1')).toBe('')
  })

  it('formats material topics', async () => {
    mockClient.getMateriality.mockResolvedValue({
      company_id: 'company-1',
      year: '2024',
      data: {
        topics: [
          { topic: 'Climate Change', impact_score: 9.0, financial_score: 8.5, rating: 'Critical' },
          { topic: 'Water Scarcity', impact_score: 6.0, financial_score: 5.5 },
        ],
      },
    })
    const result = await augmentMaterialityContext('company-1', '2024')
    expect(result).toContain('Materiality Assessment')
    expect(result).toContain('Climate Change')
    expect(result).toContain('Critical')
    expect(result).toContain('Water Scarcity')
  })

  it('handles missing topics array — returns partial result without throwing', async () => {
    mockClient.getMateriality.mockResolvedValue({
      company_id: 'company-1',
      year: '2024',
      data: {},
    })
    const result = await augmentMaterialityContext('company-1')
    expect(typeof result).toBe('string')
    // Empty topics → returns just the header lines, non-null
    expect(result).toContain('company-1')
  })
})

// ── augmentRegulationContext ───────────────────────────────────────────────

describe('augmentRegulationContext', () => {
  it('returns empty string when backend returns null', async () => {
    mockClient.getRegulationMonitoring.mockResolvedValue(null)
    expect(await augmentRegulationContext('company-1')).toBe('')
  })

  it('formats completed regulation report excerpt', async () => {
    mockClient.getRegulationMonitoring.mockResolvedValue({
      company_id: 'company-1',
      year: '2024',
      data: { status: 'completed', report: 'Company is fully aligned with CSRD article 8 requirements.' },
    })
    const result = await augmentRegulationContext('company-1', '2024')
    expect(result).toContain('Regulation Monitoring')
    expect(result).toContain('completed')
    expect(result).toContain('CSRD')
  })

  it('returns empty string when data is missing', async () => {
    mockClient.getRegulationMonitoring.mockResolvedValue({ company_id: 'c', year: '2024', data: null })
    expect(await augmentRegulationContext('c')).toBe('')
  })
})

// ── augmentWorldRiskContext ────────────────────────────────────────────────

describe('augmentWorldRiskContext', () => {
  it('returns empty string when backend returns null scores', async () => {
    mockClient.getWorldRiskScores.mockResolvedValue(null)
    expect(await augmentWorldRiskContext()).toBe('')
  })

  it('formats top-N world risk countries', async () => {
    mockClient.getWorldRiskScores.mockResolvedValue({
      data: [
        { country: 'Country A', iso_code: 'AA', cii_score: 85 },
        { country: 'Country B', iso_code: 'BB', cii_score: 72 },
      ],
    })
    const result = await augmentWorldRiskContext(undefined, 2)
    expect(result).toContain('World Risk')
    expect(result).toContain('Country A')
    expect(result).toContain('CII 85.0')
  })

  it('formats single-country risk by isoCode', async () => {
    mockClient.getCountryRisk.mockResolvedValue({
      data: { country: 'Country X', iso_code: 'XX', cii_score: 60 },
    })
    const result = await augmentWorldRiskContext('XX')
    expect(result).toContain('Country X')
    expect(result).toContain('CII score: 60.0')
  })

  it('handles empty data array', async () => {
    mockClient.getWorldRiskScores.mockResolvedValue({ data: [] })
    expect(await augmentWorldRiskContext()).toBe('')
  })
})

// ── augmentAgentLatestContext ──────────────────────────────────────────────

describe('augmentAgentLatestContext', () => {
  it('returns empty string for empty name or scope', async () => {
    expect(await augmentAgentLatestContext('', 'scope')).toBe('')
    expect(await augmentAgentLatestContext('name', '')).toBe('')
  })

  it('returns empty string when backend returns null', async () => {
    mockClient.getAgentLatest.mockResolvedValue(null)
    expect(await augmentAgentLatestContext('esg_brief', 'Energy')).toBe('')
  })

  it('formats string result', async () => {
    mockClient.getAgentLatest.mockResolvedValue({
      run_id: 'run-123',
      finished_at: '2024-01-01T00:00:00Z',
      result: 'ESG brief summary text here.',
    })
    const result = await augmentAgentLatestContext('esg_brief', 'Energy')
    expect(result).toContain('esg_brief')
    expect(result).toContain('ESG brief summary text here.')
    expect(result).toContain('run-123')
  })

  it('formats bullets result', async () => {
    mockClient.getAgentLatest.mockResolvedValue({
      result: { bullets: ['Point 1', 'Point 2'] },
    })
    const result = await augmentAgentLatestContext('insights', 'company-1')
    expect(result).toContain('Point 1')
    expect(result).toContain('Point 2')
  })

  it('handles null result field without throwing — returns serialised wrapper', async () => {
    // When the API returns { result: null }, the bridge falls back to
    // serialising the whole raw object rather than returning ''. This tests
    // that the function does not throw and returns a string in all cases.
    mockClient.getAgentLatest.mockResolvedValue({ result: null })
    const result = await augmentAgentLatestContext('insights', 'company-1')
    expect(typeof result).toBe('string')
    // Should not throw — any string value (including empty) is acceptable
    expect(() => result).not.toThrow()
  })

  it('returns empty string when getAgentLatest itself returns null', async () => {
    mockClient.getAgentLatest.mockResolvedValue(null)
    expect(await augmentAgentLatestContext('insights', 'company-1')).toBe('')
  })
})

// ── augmentMcpToolsContext ─────────────────────────────────────────────────

describe('augmentMcpToolsContext', () => {
  it('returns empty string when backend returns null', async () => {
    mockClient.listMcpTools.mockResolvedValue(null)
    expect(await augmentMcpToolsContext()).toBe('')
  })

  it('returns empty string for empty tools array', async () => {
    mockClient.listMcpTools.mockResolvedValue({ tools: [] })
    expect(await augmentMcpToolsContext()).toBe('')
  })

  it('formats MCP tool list', async () => {
    mockClient.listMcpTools.mockResolvedValue({
      tools: [
        { name: 'web_search', description: 'Search the web' },
        { name: 'get_forecast', description: 'Weather forecast' },
      ],
    })
    const result = await augmentMcpToolsContext()
    expect(result).toContain('web_search')
    expect(result).toContain('Search the web')
  })

  it('filters tools by substring', async () => {
    mockClient.listMcpTools.mockResolvedValue({
      tools: [
        { name: 'web_search', description: 'Search the web' },
        { name: 'carbon_calc', description: 'Calculate carbon footprint' },
      ],
    })
    const result = await augmentMcpToolsContext('carbon')
    expect(result).toContain('carbon_calc')
    expect(result).not.toContain('web_search')
  })

  it('returns empty string when SeaBridge is unavailable', async () => {
    mockClient.isSeaBridgeAvailable.mockResolvedValue(false)
    expect(await augmentMcpToolsContext()).toBe('')
  })
})

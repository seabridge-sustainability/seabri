import { describe, it, expect } from 'vitest'
import {
  buildPropertyRiskContext,
  formatPropertyRiskCard,
  normalizeRiskTier,
  type PropertyRiskContext,
} from './property-risk-card.js'

describe('normalizeRiskTier', () => {
  it('returns UNKNOWN for undefined', () => {
    expect(normalizeRiskTier(undefined)).toBe('UNKNOWN')
  })

  it('returns UNKNOWN for empty string', () => {
    expect(normalizeRiskTier('')).toBe('UNKNOWN')
  })

  it('accepts lowercase input', () => {
    expect(normalizeRiskTier('high')).toBe('HIGH')
  })

  it('accepts mixed case', () => {
    expect(normalizeRiskTier('Medium')).toBe('MEDIUM')
  })

  it('accepts all valid tiers', () => {
    expect(normalizeRiskTier('EXTREME')).toBe('EXTREME')
    expect(normalizeRiskTier('HIGH')).toBe('HIGH')
    expect(normalizeRiskTier('MEDIUM')).toBe('MEDIUM')
    expect(normalizeRiskTier('LOW')).toBe('LOW')
    expect(normalizeRiskTier('MINIMAL')).toBe('MINIMAL')
  })

  it('returns UNKNOWN for unrecognized string', () => {
    expect(normalizeRiskTier('SEVERE')).toBe('UNKNOWN')
  })

  it('trims whitespace before normalizing', () => {
    expect(normalizeRiskTier('  high  ')).toBe('HIGH')
  })
})

describe('buildPropertyRiskContext', () => {
  it('includes the property address', () => {
    const ctx: PropertyRiskContext = { address: '123 Main St' }
    expect(buildPropertyRiskContext(ctx)).toContain('PROPERTY: 123 Main St')
  })

  it('wraps output in brackets', () => {
    const ctx: PropertyRiskContext = { address: '123 Main St' }
    const result = buildPropertyRiskContext(ctx)
    expect(result.startsWith('[')).toBe(true)
    expect(result.endsWith(']')).toBe(true)
  })

  it('includes flood risk when set', () => {
    const ctx: PropertyRiskContext = { address: '1 Test Ave', floodRisk: 'HIGH' }
    expect(buildPropertyRiskContext(ctx)).toContain('FLOOD: HIGH 🟠')
  })

  it('includes wildfire risk when set', () => {
    const ctx: PropertyRiskContext = { address: '1 Test Ave', wildfireRisk: 'EXTREME' }
    expect(buildPropertyRiskContext(ctx)).toContain('WILDFIRE: EXTREME 🔴')
  })

  it('includes hurricane risk when set', () => {
    const ctx: PropertyRiskContext = { address: '1 Test Ave', hurricaneRisk: 'MEDIUM' }
    expect(buildPropertyRiskContext(ctx)).toContain('HURRICANE: MEDIUM 🟡')
  })

  it('includes earthquake risk when set', () => {
    const ctx: PropertyRiskContext = { address: '1 Test Ave', earthquakeRisk: 'LOW' }
    expect(buildPropertyRiskContext(ctx)).toContain('EARTHQUAKE: LOW 🟢')
  })

  it('includes heat risk when set', () => {
    const ctx: PropertyRiskContext = { address: '1 Test Ave', heatRisk: 'MINIMAL' }
    expect(buildPropertyRiskContext(ctx)).toContain('HEAT: MINIMAL ⚪')
  })

  it('includes overall tier when set', () => {
    const ctx: PropertyRiskContext = { address: '1 Test Ave', overallTier: 'HIGH' }
    expect(buildPropertyRiskContext(ctx)).toContain('OVERALL: HIGH 🟠')
  })

  it('omits fields that are undefined', () => {
    const ctx: PropertyRiskContext = { address: '1 Test Ave', floodRisk: 'HIGH' }
    const result = buildPropertyRiskContext(ctx)
    expect(result).not.toContain('WILDFIRE')
    expect(result).not.toContain('HURRICANE')
    expect(result).not.toContain('OVERALL')
  })

  it('omits fields that are UNKNOWN', () => {
    const ctx: PropertyRiskContext = { address: '1 Test Ave', floodRisk: 'UNKNOWN', overallTier: 'UNKNOWN' }
    const result = buildPropertyRiskContext(ctx)
    expect(result).not.toContain('FLOOD')
    expect(result).not.toContain('OVERALL')
  })

  it('joins multiple risk fields with pipe separator', () => {
    const ctx: PropertyRiskContext = {
      address: '123 Main St',
      floodRisk: 'HIGH',
      hurricaneRisk: 'EXTREME',
    }
    const result = buildPropertyRiskContext(ctx)
    expect(result).toBe('[PROPERTY: 123 Main St | FLOOD: HIGH 🟠 | HURRICANE: EXTREME 🔴]')
  })

  it('produces address-only string when no risks are set', () => {
    const ctx: PropertyRiskContext = { address: '123 Main St' }
    expect(buildPropertyRiskContext(ctx)).toBe('[PROPERTY: 123 Main St]')
  })
})

describe('formatPropertyRiskCard', () => {
  it('includes the property address', () => {
    const ctx: PropertyRiskContext = { address: '123 Main St' }
    expect(formatPropertyRiskCard(ctx)).toContain('123 Main St')
  })

  it('includes the risk assessment heading', () => {
    const ctx: PropertyRiskContext = { address: '123 Main St' }
    expect(formatPropertyRiskCard(ctx)).toContain('Property Risk Assessment')
  })

  it('includes powered-by footer', () => {
    const ctx: PropertyRiskContext = { address: '123 Main St' }
    expect(formatPropertyRiskCard(ctx)).toContain('SeaBridgeAI climate risk models')
  })

  it('includes flood emoji and tier', () => {
    const ctx: PropertyRiskContext = { address: '1 Test Ave', floodRisk: 'HIGH' }
    const result = formatPropertyRiskCard(ctx)
    expect(result).toContain('🌊 Flood')
    expect(result).toContain('HIGH')
    expect(result).toContain('🟠')
  })

  it('includes wildfire emoji and tier', () => {
    const ctx: PropertyRiskContext = { address: '1 Test Ave', wildfireRisk: 'EXTREME' }
    const result = formatPropertyRiskCard(ctx)
    expect(result).toContain('🔥 Wildfire')
    expect(result).toContain('EXTREME')
  })

  it('includes hurricane emoji and tier', () => {
    const ctx: PropertyRiskContext = { address: '1 Test Ave', hurricaneRisk: 'LOW' }
    const result = formatPropertyRiskCard(ctx)
    expect(result).toContain('🌀 Hurricane')
    expect(result).toContain('LOW')
  })

  it('includes earthquake emoji and tier', () => {
    const ctx: PropertyRiskContext = { address: '1 Test Ave', earthquakeRisk: 'MEDIUM' }
    const result = formatPropertyRiskCard(ctx)
    expect(result).toContain('⚡ Earthquake')
    expect(result).toContain('MEDIUM')
  })

  it('includes heat emoji and tier', () => {
    const ctx: PropertyRiskContext = { address: '1 Test Ave', heatRisk: 'MINIMAL' }
    const result = formatPropertyRiskCard(ctx)
    expect(result).toContain('🌡️ Heat')
    expect(result).toContain('MINIMAL')
  })

  it('includes overall risk when set', () => {
    const ctx: PropertyRiskContext = { address: '1 Test Ave', overallTier: 'HIGH' }
    const result = formatPropertyRiskCard(ctx)
    expect(result).toContain('Overall Risk')
    expect(result).toContain('HIGH')
  })

  it('omits UNKNOWN risk tiers', () => {
    const ctx: PropertyRiskContext = { address: '1 Test Ave', floodRisk: 'UNKNOWN' }
    expect(formatPropertyRiskCard(ctx)).not.toContain('🌊 Flood')
  })

  it('omits undefined risk fields', () => {
    const ctx: PropertyRiskContext = { address: '1 Test Ave' }
    const result = formatPropertyRiskCard(ctx)
    expect(result).not.toContain('🌊 Flood')
    expect(result).not.toContain('Overall Risk')
  })

  it('returns a multi-line string', () => {
    const ctx: PropertyRiskContext = { address: '123 Main St', floodRisk: 'HIGH' }
    expect(formatPropertyRiskCard(ctx)).toContain('\n')
  })
})

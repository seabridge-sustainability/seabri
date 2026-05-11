import { describe, it, expect } from 'vitest'
import { CapabilityRegistry, capabilityRegistry } from './capability-registry.js'
import type { CapabilityDefinition } from './capability-registry.js'

const makeCap = (overrides: Partial<CapabilityDefinition> = {}): CapabilityDefinition => ({
  id: 'climate-risk-analysis',
  name: 'Climate Risk Analysis',
  description: 'Test capability',
  category: 'climate',
  ...overrides,
})

describe('CapabilityRegistry', () => {
  it('starts empty', () => {
    const reg = new CapabilityRegistry()
    expect(reg.list()).toHaveLength(0)
  })

  it('registers and retrieves a capability', () => {
    const reg = new CapabilityRegistry()
    reg.register(makeCap())
    expect(reg.get('climate-risk-analysis')).toBeDefined()
    expect(reg.get('climate-risk-analysis')?.name).toBe('Climate Risk Analysis')
  })

  it('throws on duplicate registration', () => {
    const reg = new CapabilityRegistry()
    reg.register(makeCap())
    expect(() => reg.register(makeCap())).toThrow('already registered')
  })

  it('checks existence with has()', () => {
    const reg = new CapabilityRegistry()
    expect(reg.has('climate-risk-analysis')).toBe(false)
    reg.register(makeCap())
    expect(reg.has('climate-risk-analysis')).toBe(true)
  })

  it('unregisters a capability', () => {
    const reg = new CapabilityRegistry()
    reg.register(makeCap())
    expect(reg.unregister('climate-risk-analysis')).toBe(true)
    expect(reg.has('climate-risk-analysis')).toBe(false)
  })

  it('filters by category', () => {
    const reg = new CapabilityRegistry()
    reg.register(makeCap({ id: 'climate-risk-analysis', category: 'climate' }))
    reg.register(makeCap({ id: 'home-energy-advice', category: 'community' }))
    expect(reg.listByCategory('climate')).toHaveLength(1)
    expect(reg.listByCategory('community')).toHaveLength(1)
    expect(reg.listByCategory('finance')).toHaveLength(0)
  })

  it('returns unique categories', () => {
    const reg = new CapabilityRegistry()
    reg.register(makeCap({ id: 'climate-risk-analysis', category: 'climate' }))
    reg.register(makeCap({ id: 'nature-biodiversity-risk', category: 'climate' }))
    reg.register(makeCap({ id: 'home-energy-advice', category: 'community' }))
    expect(reg.categories()).toHaveLength(2)
    expect(reg.categories()).toContain('climate')
    expect(reg.categories()).toContain('community')
  })
})

describe('capabilityRegistry (singleton)', () => {
  it('has 14 built-in capabilities', () => {
    expect(capabilityRegistry.list()).toHaveLength(14)
  })

  it('includes climate-risk-analysis', () => {
    expect(capabilityRegistry.has('climate-risk-analysis')).toBe(true)
  })

  it('includes general-sustainability', () => {
    expect(capabilityRegistry.has('general-sustainability')).toBe(true)
  })

  it('all capabilities have non-empty descriptions', () => {
    for (const cap of capabilityRegistry.list()) {
      expect(cap.description.length).toBeGreaterThan(10)
    }
  })

  it('has capabilities across multiple categories', () => {
    expect(capabilityRegistry.categories().length).toBeGreaterThanOrEqual(4)
  })
})

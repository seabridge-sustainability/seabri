import { describe, it, expect } from 'vitest'
import { SkillRegistry } from './skill-registry.js'
import type { SkillRegistration } from './skill-registry.js'

const makeSkill = (overrides: Partial<SkillRegistration> = {}): SkillRegistration => ({
  id: 'test-skill',
  name: 'Test Skill',
  path: '/skills/test-skill/SKILL.md',
  firstLine: 'Test Skill',
  complianceTags: ['GENERAL'],
  source: 'builtin',
  enabled: true,
  ...overrides,
})

describe('SkillRegistry', () => {
  it('starts empty', () => {
    const reg = new SkillRegistry()
    expect(reg.list()).toHaveLength(0)
  })

  it('registers and retrieves a skill', () => {
    const reg = new SkillRegistry()
    reg.register(makeSkill())
    expect(reg.get('test-skill')?.name).toBe('Test Skill')
  })

  it('throws on empty id', () => {
    const reg = new SkillRegistry()
    expect(() => reg.register(makeSkill({ id: '' }))).toThrow('"id" is required')
  })

  it('throws on duplicate id', () => {
    const reg = new SkillRegistry()
    reg.register(makeSkill())
    expect(() => reg.register(makeSkill())).toThrow('already registered')
  })

  it('updates a skill', () => {
    const reg = new SkillRegistry()
    reg.register(makeSkill())
    const updated = reg.update('test-skill', { name: 'Updated' })
    expect(updated.name).toBe('Updated')
    expect(reg.get('test-skill')?.name).toBe('Updated')
  })

  it('throws when updating non-existent skill', () => {
    const reg = new SkillRegistry()
    expect(() => reg.update('ghost', { name: 'X' })).toThrow('not found')
  })

  it('enables and disables skills', () => {
    const reg = new SkillRegistry()
    reg.register(makeSkill({ enabled: true }))
    reg.disable('test-skill')
    expect(reg.get('test-skill')?.enabled).toBe(false)
    reg.enable('test-skill')
    expect(reg.get('test-skill')?.enabled).toBe(true)
  })

  it('unregisters a skill', () => {
    const reg = new SkillRegistry()
    reg.register(makeSkill())
    expect(reg.unregister('test-skill')).toBe(true)
    expect(reg.has('test-skill')).toBe(false)
  })

  it('search filters by source', () => {
    const reg = new SkillRegistry()
    reg.register(makeSkill({ id: 's1', source: 'builtin' }))
    reg.register(makeSkill({ id: 's2', source: 'community' }))
    expect(reg.search({ source: 'builtin' })).toHaveLength(1)
    expect(reg.search({ source: 'community' })).toHaveLength(1)
  })

  it('search filters by enabled', () => {
    const reg = new SkillRegistry()
    reg.register(makeSkill({ id: 's1', enabled: true }))
    reg.register(makeSkill({ id: 's2', enabled: false }))
    expect(reg.search({ enabledOnly: true })).toHaveLength(1)
  })

  it('search filters by query string', () => {
    const reg = new SkillRegistry()
    reg.register(makeSkill({ id: 'carbon', name: 'Carbon Tracker' }))
    reg.register(makeSkill({ id: 'energy', name: 'Energy Audit' }))
    expect(reg.search({ query: 'carbon' })).toHaveLength(1)
    expect(reg.search({ query: 'ENERGY' })).toHaveLength(1)
  })

  it('stats reports totals and breakdown', () => {
    const reg = new SkillRegistry()
    reg.register(makeSkill({ id: 's1', source: 'builtin', enabled: true }))
    reg.register(makeSkill({ id: 's2', source: 'community', enabled: false }))
    const s = reg.stats()
    expect(s.total).toBe(2)
    expect(s.enabled).toBe(1)
    expect(s.bySource['builtin']).toBe(1)
    expect(s.bySource['community']).toBe(1)
  })
})

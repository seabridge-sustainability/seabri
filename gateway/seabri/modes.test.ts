import { describe, it, expect } from 'vitest'
import { classifyMode, stripModeTag, FORBIDDEN_PATTERNS } from './modes.js'
import type { ClassifyInput } from './modes.js'

function input(overrides: Partial<ClassifyInput> = {}): ClassifyInput {
  return { userMessage: '', ...overrides }
}

describe('classifyMode', () => {
  it('returns audio_note when hasAudio is true', () => {
    expect(classifyMode(input({ hasAudio: true, userMessage: 'flood warning' }))).toBe('audio_note')
  })

  it('returns photo_damage when hasImage is true', () => {
    expect(classifyMode(input({ hasImage: true, userMessage: 'flood damage' }))).toBe('photo_damage')
  })

  it('audio takes priority over image', () => {
    expect(classifyMode(input({ hasAudio: true, hasImage: true }))).toBe('audio_note')
  })

  it('returns property_risk for climate-risk agent', () => {
    expect(classifyMode(input({ agentId: 'climate-risk' }))).toBe('property_risk')
  })

  it('returns property_risk for property-climate-risk agent', () => {
    expect(classifyMode(input({ agentId: 'property-climate-risk' }))).toBe('property_risk')
  })

  it('returns insurance for insurance-navigator agent', () => {
    expect(classifyMode(input({ agentId: 'insurance-navigator' }))).toBe('insurance')
  })

  it('returns photo_damage for damage-documentation agent', () => {
    expect(classifyMode(input({ agentId: 'damage-documentation' }))).toBe('photo_damage')
  })

  it('returns action_coordination for contractor-coordination agent', () => {
    expect(classifyMode(input({ agentId: 'contractor-coordination' }))).toBe('action_coordination')
  })

  it('returns incident for emergency-resilience agent', () => {
    expect(classifyMode(input({ agentId: 'emergency-resilience' }))).toBe('incident')
  })

  it('detects incident terms in message', () => {
    expect(classifyMode(input({ userMessage: 'We need to evacuate now!' }))).toBe('incident')
    expect(classifyMode(input({ userMessage: 'water is rising fast' }))).toBe('incident')
    expect(classifyMode(input({ userMessage: 'mandatory evacuation issued' }))).toBe('incident')
  })

  it('detects property risk terms', () => {
    expect(classifyMode(input({ userMessage: 'What is my flood zone?' }))).toBe('property_risk')
    expect(classifyMode(input({ userMessage: 'hurricane impact assessment' }))).toBe('property_risk')
    expect(classifyMode(input({ userMessage: 'wildfire risk for my area' }))).toBe('property_risk')
  })

  it('detects action coordination terms', () => {
    expect(classifyMode(input({ userMessage: 'call my contractor please' }))).toBe('action_coordination')
    expect(classifyMode(input({ userMessage: 'can you schedule a repair?' }))).toBe('action_coordination')
  })

  it('detects insurance terms', () => {
    expect(classifyMode(input({ userMessage: 'file a claim' }))).toBe('insurance')
    expect(classifyMode(input({ userMessage: 'what is my deductible?' }))).toBe('insurance')
    expect(classifyMode(input({ userMessage: 'need to talk to the adjuster' }))).toBe('insurance')
  })

  it('returns general_sustainability for unmatched message', () => {
    expect(classifyMode(input({ userMessage: 'tell me about composting' }))).toBe('general_sustainability')
  })

  it('is case insensitive for message terms', () => {
    expect(classifyMode(input({ userMessage: 'EARTHQUAKE damage assessment' }))).toBe('property_risk')
  })

  it('incident terms take priority over property risk', () => {
    expect(classifyMode(input({ userMessage: 'emergency flood right now' }))).toBe('incident')
  })
})

describe('stripModeTag', () => {
  it('strips mode tag from beginning of text', () => {
    expect(stripModeTag('[MODE: property_risk] Your area has flood risk.')).toBe(
      'Your area has flood risk.'
    )
  })

  it('returns text unchanged when no mode tag', () => {
    expect(stripModeTag('No mode tag here')).toBe('No mode tag here')
  })

  it('only strips from beginning', () => {
    const text = 'Hello [MODE: test] world'
    expect(stripModeTag(text)).toBe(text)
  })

  it('handles empty string', () => {
    expect(stripModeTag('')).toBe('')
  })
})

describe('FORBIDDEN_PATTERNS', () => {
  it('is a non-empty array of strings', () => {
    expect(FORBIDDEN_PATTERNS.length).toBeGreaterThan(0)
    for (const p of FORBIDDEN_PATTERNS) {
      expect(typeof p).toBe('string')
    }
  })
})

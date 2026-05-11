import { describe, it, expect } from 'vitest'
import { classifyMode, stripModeTag, FORBIDDEN_PATTERNS } from '../seabri/modes.js'

describe('classifyMode', () => {
  it('returns photo_damage when image is attached', () => {
    expect(classifyMode({ userMessage: 'here is my house', hasImage: true })).toBe('photo_damage')
  })

  it('returns audio_note when audio is attached (takes priority over image)', () => {
    expect(classifyMode({ userMessage: 'voice message', hasAudio: true, hasImage: true })).toBe('audio_note')
  })

  it('returns incident for active emergency language', () => {
    expect(classifyMode({ userMessage: 'my house is flooding right now, water is rising' })).toBe('incident')
  })

  it('returns property_risk for address-based flood queries', () => {
    expect(classifyMode({ userMessage: 'what is the flood risk at 123 Main St?' })).toBe('property_risk')
  })

  it('returns insurance for claim-related queries', () => {
    expect(classifyMode({ userMessage: 'my insurer denied my claim for roof damage' })).toBe('insurance')
  })

  it('returns action_coordination for outbound action requests', () => {
    expect(classifyMode({ userMessage: 'can you call my insurer for me?' })).toBe('action_coordination')
  })

  it('returns general_sustainability for unclassified queries', () => {
    expect(classifyMode({ userMessage: 'what is scope 3 emissions?' })).toBe('general_sustainability')
  })

  it('agent id property-climate-risk overrides keyword matching', () => {
    expect(classifyMode({ userMessage: 'tell me more', agentId: 'property-climate-risk' })).toBe('property_risk')
  })
})

describe('stripModeTag', () => {
  it('strips [MODE: incident] prefix', () => {
    expect(stripModeTag('[MODE: incident] Here are your next steps.')).toBe('Here are your next steps.')
  })

  it('strips [MODE: property_risk] with mixed case spaces', () => {
    expect(stripModeTag('[MODE: property_risk]  Call 911 first.')).toBe('Call 911 first.')
  })

  it('is a no-op when no mode tag is present', () => {
    expect(stripModeTag('No tag here.')).toBe('No tag here.')
  })

  it('does not strip tags embedded mid-sentence', () => {
    const text = 'Some intro [MODE: incident] mid sentence'
    expect(stripModeTag(text)).toBe(text)
  })
})

describe('FORBIDDEN_PATTERNS', () => {
  it('contains exact banned phrases', () => {
    expect(FORBIDDEN_PATTERNS).toContain("I don't have real-time data")
    expect(FORBIDDEN_PATTERNS).toContain("As an AI I cannot")
    expect(FORBIDDEN_PATTERNS).toContain("I recommend consulting a professional")
    expect(FORBIDDEN_PATTERNS).toContain("I understand your concern")
  })

  it('has at least 6 banned phrases', () => {
    expect(FORBIDDEN_PATTERNS.length).toBeGreaterThanOrEqual(6)
  })
})

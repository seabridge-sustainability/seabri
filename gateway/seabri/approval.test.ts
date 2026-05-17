import { describe, it, expect } from 'vitest'
import {
  extractActionCard,
  isApproval,
  isDenial,
  detectActionKind,
  requiresDoubleConfirmation,
  generateConfirmCode,
  isConfirmCode,
} from './approval.js'

describe('extractActionCard', () => {
  it('returns null when sentinel phrase is absent', () => {
    expect(extractActionCard('Here is a summary of your property.')).toBeNull()
  })

  it('detects action card with exact sentinel phrase', () => {
    const text = 'I will contact Insurer X with your claim.\n\nConfirm? Reply YES to proceed or NO to cancel.'
    expect(extractActionCard(text)).toBe(text)
  })

  it('is case-insensitive for the sentinel phrase', () => {
    const text = 'Action ready. CONFIRM? REPLY YES or NO.'
    expect(extractActionCard(text)).toBe(text)
  })

  it('returns the full original text as the card', () => {
    const text = 'Long message here.\nConfirm? Reply YES'
    const card = extractActionCard(text)
    expect(card).toBe(text)
  })
})

describe('isApproval', () => {
  it('matches "yes"', () => expect(isApproval('yes')).toBe(true))
  it('matches "YES"', () => expect(isApproval('YES')).toBe(true))
  it('matches "Yes please"', () => expect(isApproval('Yes please')).toBe(true))
  it('matches with leading whitespace', () => expect(isApproval('  yes  ')).toBe(true))
  it('rejects empty string', () => expect(isApproval('')).toBe(false))
  it('rejects "no"', () => expect(isApproval('no')).toBe(false))
  it('rejects "maybe"', () => expect(isApproval('maybe')).toBe(false))
  it('rejects mid-word yes ("yesterday")', () => expect(isApproval('yesterday')).toBe(false))
})

describe('isDenial', () => {
  it('matches "no"', () => expect(isDenial('no')).toBe(true))
  it('matches "NO"', () => expect(isDenial('NO')).toBe(true))
  it('matches "No thanks"', () => expect(isDenial('No thanks')).toBe(true))
  it('matches with leading whitespace', () => expect(isDenial('  no  ')).toBe(true))
  it('rejects empty string', () => expect(isDenial('')).toBe(false))
  it('rejects "yes"', () => expect(isDenial('yes')).toBe(false))
  it('rejects mid-word no ("nothing")', () => expect(isDenial('nothing')).toBe(false))
})

describe('detectActionKind', () => {
  it('detects outbound_call', () => {
    expect(detectActionKind('I will call your insurer at +1 555 000 1234. Confirm? Reply YES')).toBe('outbound_call')
  })

  it('detects send_email', () => {
    expect(detectActionKind('I will send an email to your contractor. Confirm? Reply YES')).toBe('send_email')
  })

  it('detects document_damage', () => {
    expect(detectActionKind('I will create a damage report for this incident. Confirm? Reply YES')).toBe('document_damage')
  })

  it('detects schedule_appointment', () => {
    expect(detectActionKind('I will schedule an appointment with the adjuster. Confirm? Reply YES')).toBe('schedule_appointment')
  })

  it('detects notify_emergency (highest priority)', () => {
    expect(detectActionKind('I will notify emergency services at 911. Confirm? Reply YES')).toBe('notify_emergency')
  })

  it('emergency takes priority over call markers', () => {
    expect(detectActionKind('I will call 911 emergency services. Confirm? Reply YES')).toBe('notify_emergency')
  })

  it('falls back to general for unrecognized cards', () => {
    expect(detectActionKind('I will proceed with your request. Confirm? Reply YES')).toBe('general')
  })
})

describe('requiresDoubleConfirmation', () => {
  it('returns true for notify_emergency', () => {
    expect(requiresDoubleConfirmation('notify_emergency')).toBe(true)
  })

  it('returns false for outbound_call', () => {
    expect(requiresDoubleConfirmation('outbound_call')).toBe(false)
  })

  it('returns false for send_email', () => {
    expect(requiresDoubleConfirmation('send_email')).toBe(false)
  })

  it('returns false for general', () => {
    expect(requiresDoubleConfirmation('general')).toBe(false)
  })
})

describe('generateConfirmCode', () => {
  it('returns an 8-digit string', () => {
    const code = generateConfirmCode()
    expect(code).toMatch(/^\d{8}$/)
  })

  it('generates different codes on repeated calls', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateConfirmCode()))
    expect(codes.size).toBeGreaterThan(1)
  })
})

describe('isConfirmCode', () => {
  it('accepts exactly 8 digits', () => {
    expect(isConfirmCode('12345678')).toBe(true)
  })

  it('accepts with surrounding whitespace', () => {
    expect(isConfirmCode('  45678901  ')).toBe(true)
  })

  it('rejects fewer than 8 digits', () => {
    expect(isConfirmCode('1234567')).toBe(false)
  })

  it('rejects more than 8 digits', () => {
    expect(isConfirmCode('123456789')).toBe(false)
  })

  it('rejects letters', () => {
    expect(isConfirmCode('1234567a')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isConfirmCode('')).toBe(false)
  })
})

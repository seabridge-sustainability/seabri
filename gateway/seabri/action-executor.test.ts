import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getExecutor, extractEmail } from './action-executor.js'

vi.mock('./outbound.js', () => ({
  initiateOutboundCall: vi.fn().mockResolvedValue({ ok: true, callSid: 'CA_test_123' }),
}))

vi.mock('../config.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    SENDGRID_API_KEY: '',
    SMTP_HOST: '',
    SMTP_USER: '',
    SMTP_PASS: '',
    EMERGENCY_SMS_ENABLED: false,
    EMERGENCY_ALERT_NUMBER: '',
    WORKSPACE_DIR: '/tmp/openseabri-test',
  }
})

describe('extractEmail', () => {
  it('extracts a simple email address', () => {
    expect(extractEmail('send to john@example.com for estimates')).toBe('john@example.com')
  })

  it('returns null when no email present', () => {
    expect(extractEmail('no email here')).toBeNull()
  })

  it('handles email with subdomains', () => {
    expect(extractEmail('contact claims@insurer.co.uk for help')).toBe('claims@insurer.co.uk')
  })
})

describe('getExecutor', () => {
  it('returns outbound_call executor for outbound_call kind', () => {
    const executor = getExecutor('outbound_call')
    expect(executor.kind).toBe('outbound_call')
  })

  it('returns send_email executor', () => {
    const executor = getExecutor('send_email')
    expect(executor.kind).toBe('send_email')
  })

  it('returns document_damage executor', () => {
    const executor = getExecutor('document_damage')
    expect(executor.kind).toBe('document_damage')
  })

  it('returns schedule_appointment executor', () => {
    const executor = getExecutor('schedule_appointment')
    expect(executor.kind).toBe('schedule_appointment')
  })

  it('returns notify_emergency executor', () => {
    const executor = getExecutor('notify_emergency')
    expect(executor.kind).toBe('notify_emergency')
  })

  it('falls back to general for unknown kind', () => {
    const executor = getExecutor('general')
    expect(executor.kind).toBe('general')
  })
})

describe('outbound_call executor', () => {
  it('returns error when no phone number in card', async () => {
    const executor = getExecutor('outbound_call')
    const result = await executor.execute('I will contact your insurer. Confirm? Reply YES', 'user:1')
    expect(result.ok).toBe(false)
    expect(result.error).toContain('phone number')
  })

  it('calls initiateOutboundCall with extracted number', async () => {
    const { initiateOutboundCall } = await import('./outbound.js')
    const executor = getExecutor('outbound_call')
    const result = await executor.execute(
      'I will call your insurer at +1 (555) 867-5309 to report damage. Confirm? Reply YES',
      'user:1'
    )
    expect(result.ok).toBe(true)
    expect(vi.mocked(initiateOutboundCall)).toHaveBeenCalled()
  })
})

describe('send_email executor', () => {
  it('returns error when no email address in card', async () => {
    const result = await getExecutor('send_email').execute('Contact insurer about damage', 'user:1')
    expect(result.ok).toBe(false)
    expect(result.error).toContain('No email address')
  })

  it('returns not-configured error when no email provider set', async () => {
    const result = await getExecutor('send_email').execute(
      'I will send an email to adjuster@insurer.com. Confirm? Reply YES',
      'user:1'
    )
    expect(result.ok).toBe(false)
    expect(result.error).toContain('not configured')
  })
})

describe('document_damage executor', () => {
  it('records damage and returns ok', async () => {
    const result = await getExecutor('document_damage').execute('Document damage at 123 Main St', 'user:1')
    expect(result.ok).toBe(true)
    expect(result.message).toContain('recorded')
  })
})

describe('schedule_appointment executor', () => {
  it('records appointment and returns ok', async () => {
    const result = await getExecutor('schedule_appointment').execute('Schedule inspection on Tuesday', 'user:1')
    expect(result.ok).toBe(true)
    expect(result.message).toContain('recorded')
  })
})

describe('notify_emergency executor', () => {
  it('returns disabled error when EMERGENCY_SMS_ENABLED is false', async () => {
    const result = await getExecutor('notify_emergency').execute('Notify emergency services', 'user:1')
    expect(result.ok).toBe(false)
    expect(result.error).toContain('disabled')
  })
})

describe('general executor', () => {
  it('always returns ok', async () => {
    const result = await getExecutor('general').execute('Any action card', 'user:1')
    expect(result.ok).toBe(true)
  })
})

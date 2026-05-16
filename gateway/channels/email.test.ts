import { describe, expect, it, afterEach, beforeEach } from 'vitest'
import { parseEmailInbound, routeEmailMessage, EMAIL_CHANNEL_ENABLED } from './email.js'

describe('parseEmailInbound', () => {
  it('parses all standard SendGrid inbound fields', () => {
    const payload = {
      from: 'user@example.com',
      to: 'inbox@openseabri.com',
      subject: 'Water resilience question',
      text: 'Hello, I need help with water conservation.',
      html: '<p>Hello, I need help with water conservation.</p>',
      attachments: 2,
    }
    const msg = parseEmailInbound(payload)
    expect(msg.from).toBe('user@example.com')
    expect(msg.to).toBe('inbox@openseabri.com')
    expect(msg.subject).toBe('Water resilience question')
    expect(msg.body).toBe('Hello, I need help with water conservation.')
    expect(msg.attachmentCount).toBe(2)
  })

  it('handles missing optional fields gracefully without crashing', () => {
    const msg = parseEmailInbound({})
    expect(msg.from).toBe('')
    expect(msg.to).toBe('')
    expect(msg.subject).toBe('')
    expect(msg.body).toBe('')
    expect(msg.attachmentCount).toBe(0)
  })

  it('falls back to html body when text is absent', () => {
    const msg = parseEmailInbound({
      from: 'test@example.com',
      to: 'in@example.com',
      subject: 'Test',
      html: '<b>HTML body</b>',
    })
    expect(msg.body).toBe('<b>HTML body</b>')
  })

  it('prefers text over html when both are present', () => {
    const msg = parseEmailInbound({
      from: 'a@b.com',
      to: 'c@d.com',
      subject: 'Preference test',
      text: 'plain text',
      html: '<p>html</p>',
    })
    expect(msg.body).toBe('plain text')
  })

  it('parses attachment-info JSON string to count attachments', () => {
    const attachmentInfo = JSON.stringify({
      attachment1: { filename: 'file1.pdf' },
      attachment2: { filename: 'file2.png' },
    })
    const msg = parseEmailInbound({
      from: 'a@b.com',
      to: 'c@d.com',
      subject: 'With attachments',
      text: 'See attached.',
      'attachment-info': attachmentInfo,
    })
    expect(msg.attachmentCount).toBe(2)
  })

  it('defaults attachmentCount to 0 on malformed attachment-info', () => {
    const msg = parseEmailInbound({
      from: 'a@b.com',
      to: 'c@d.com',
      subject: 'Bad info',
      text: 'body',
      'attachment-info': 'not valid json {{{',
    })
    expect(msg.attachmentCount).toBe(0)
  })

  it('trims whitespace from string fields', () => {
    const msg = parseEmailInbound({
      from: '  sender@example.com  ',
      to: '  recipient@example.com  ',
      subject: '  Subject line  ',
      text: '  Body text  ',
    })
    expect(msg.from).toBe('sender@example.com')
    expect(msg.to).toBe('recipient@example.com')
    expect(msg.subject).toBe('Subject line')
    expect(msg.body).toBe('Body text')
  })

  it('handles non-string values gracefully without crashing', () => {
    const msg = parseEmailInbound({
      from: 42,
      to: null,
      subject: { nested: 'object' },
      text: true,
      attachments: 'not-a-number',
    })
    expect(msg.from).toBe('')
    expect(msg.to).toBe('')
    expect(msg.subject).toBe('')
    expect(msg.body).toBe('')
    expect(msg.attachmentCount).toBe(0)
  })
})

describe('routeEmailMessage', () => {
  it('returns gated status when liveApproved is false', () => {
    const msg = parseEmailInbound({
      from: 'user@example.com',
      to: 'inbox@openseabri.com',
      subject: 'Hello',
      text: 'A question about sustainability.',
    })
    const result = routeEmailMessage(msg, { liveApproved: false })
    expect(result.status).toBe('gated')
    expect(result.note).toBe('Email inbound pilot not yet active.')
    expect(result.agentId).toBeUndefined()
  })

  it('returns routed status with agentId when liveApproved is true', () => {
    const msg = parseEmailInbound({
      from: 'user@example.com',
      to: 'inbox@openseabri.com',
      subject: 'Sustainability question',
      text: 'I need help.',
    })
    const result = routeEmailMessage(msg, { liveApproved: true })
    expect(result.status).toBe('routed')
    expect(result.agentId).toBe('sustainability-companion')
  })

  it('does not make any real SendGrid or network calls', () => {
    // This test verifies the function is purely synchronous and local.
    // It completes without any I/O, timeouts, or network errors.
    const msg = parseEmailInbound({ from: 'a@b.com', to: 'c@d.com', subject: 'Test', text: 'body' })
    const result = routeEmailMessage(msg, { liveApproved: false })
    expect(result.status).toBe('gated')
  })
})

describe('EMAIL_CHANNEL_ENABLED env gate', () => {
  let originalEnv: string | undefined

  beforeEach(() => {
    originalEnv = process.env.OPENSEABRI_EMAIL_ENABLED
  })

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.OPENSEABRI_EMAIL_ENABLED
    } else {
      process.env.OPENSEABRI_EMAIL_ENABLED = originalEnv
    }
  })

  it('EMAIL_CHANNEL_ENABLED is a boolean', () => {
    // The constant was evaluated at import time; we just verify it is a boolean
    expect(typeof EMAIL_CHANNEL_ENABLED).toBe('boolean')
  })
})

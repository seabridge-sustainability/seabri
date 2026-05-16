import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHmac } from 'crypto'

// No real Twilio calls — all routing/external calls are mocked

vi.mock('../agents/router.js', () => ({
  routeMessage: vi.fn().mockResolvedValue('Sustainability tip: reduce your carbon footprint.'),
}))

vi.mock('../security/pairing.js', () => ({
  isApproved: vi.fn().mockResolvedValue(true),
  createPairingCode: vi.fn().mockResolvedValue('ABC123'),
  verifyPairingCode: vi.fn().mockResolvedValue(true),
  approveSender: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../security/policy.js', () => ({
  isAllowed: vi.fn().mockResolvedValue(true),
  requiresPairing: vi.fn().mockResolvedValue(false),
  getPreferredAgent: vi.fn().mockResolvedValue('general'),
}))

vi.mock('../seabri/attachments.js', () => ({
  processAttachment: vi.fn().mockResolvedValue({ type: 'text', content: 'attachment text' }),
}))

vi.mock('../attachments/store.js', () => ({
  putBlob: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../seabri/approval.js', () => ({
  extractActionCard: vi.fn().mockReturnValue(null),
  isApproval: vi.fn().mockReturnValue(false),
  isDenial: vi.fn().mockReturnValue(false),
  logConsent: vi.fn().mockResolvedValue(undefined),
  detectActionKind: vi.fn().mockReturnValue('none'),
}))

vi.mock('../seabri/action-executor.js', () => ({
  getExecutor: vi.fn().mockReturnValue({
    execute: vi.fn().mockResolvedValue({ ok: true, message: 'done' }),
  }),
}))

vi.mock('./shared_commands.js', () => ({
  buildAdditionalContext: vi.fn().mockResolvedValue(''),
  handleSlashCommand: vi.fn().mockResolvedValue({ handled: false }),
  isInboundPhoneAllowed: vi.fn().mockReturnValue(true),
  sanitizeForPlainText: vi.fn().mockImplementation((t: string) => t),
}))

import {
  parseSmsInbound,
  verifySmsWebhookSignature,
  routeSmsMessage,
  formatSmsTwimlResponse,
  SMS_CHANNEL_ENABLED,
  smsChannel,
} from './sms.js'

// Helper: compute the correct Twilio HMAC-SHA1 signature for a URL + params
function computeSignature(authToken: string, url: string, params: Record<string, string>): string {
  const sortedKeys = Object.keys(params).sort()
  let s = url
  for (const key of sortedKeys) {
    s += key + (params[key] ?? '')
  }
  return createHmac('sha1', authToken).update(s, 'utf8').digest('base64')
}

describe('sms channel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.TWILIO_ACCOUNT_SID = 'ACtest'
    process.env.TWILIO_AUTH_TOKEN = 'test-token'
    process.env.TWILIO_FROM_NUMBER = '+15550000000'
  })

  // ── parseSmsInbound ──────────────────────────────────────────────────────

  describe('parseSmsInbound', () => {
    it('parses all required fields correctly', () => {
      const msg = parseSmsInbound({
        From: '+15551234567',
        To: '+15550000000',
        Body: 'Hello OpenSeaBri',
        MessageSid: 'SM123456',
        NumMedia: '0',
      })
      expect(msg.from).toBe('+15551234567')
      expect(msg.to).toBe('+15550000000')
      expect(msg.body).toBe('Hello OpenSeaBri')
      expect(msg.messageSid).toBe('SM123456')
      expect(msg.mediaUrl).toBeUndefined()
      expect(msg.mediaContentType).toBeUndefined()
    })

    it('parses optional media fields when NumMedia=1', () => {
      const msg = parseSmsInbound({
        From: '+15551234567',
        To: '+15550000000',
        Body: 'Photo attached',
        MessageSid: 'SM789',
        NumMedia: '1',
        MediaUrl0: 'https://api.twilio.com/media/MMabc',
        MediaContentType0: 'image/jpeg',
      })
      expect(msg.mediaUrl).toBe('https://api.twilio.com/media/MMabc')
      expect(msg.mediaContentType).toBe('image/jpeg')
    })

    it('handles missing media gracefully when NumMedia=0', () => {
      const msg = parseSmsInbound({
        From: '+15551234567',
        To: '+15550000000',
        Body: 'text only',
        MessageSid: 'SM001',
        NumMedia: '0',
      })
      expect(msg.mediaUrl).toBeUndefined()
      expect(msg.mediaContentType).toBeUndefined()
    })

    it('handles missing media gracefully when NumMedia absent', () => {
      const msg = parseSmsInbound({
        From: '+1',
        To: '+2',
        Body: '',
        MessageSid: '',
      })
      expect(msg.mediaUrl).toBeUndefined()
    })

    it('handles missing MediaUrl0 even when NumMedia=1', () => {
      const msg = parseSmsInbound({
        From: '+15551234567',
        To: '+15550000000',
        Body: 'no url',
        MessageSid: 'SM002',
        NumMedia: '1',
      })
      expect(msg.mediaUrl).toBeUndefined()
    })
  })

  // ── verifySmsWebhookSignature ─────────────────────────────────────────────

  describe('verifySmsWebhookSignature', () => {
    const token = 'my-auth-token'
    const url = 'https://example.com/webhooks/sms'
    const params = { Body: 'hello', From: '+15551234567', To: '+15550000000' }

    it('returns true for a valid HMAC signature', () => {
      const sig = computeSignature(token, url, params)
      expect(verifySmsWebhookSignature(token, url, params, sig)).toBe(true)
    })

    it('returns false for a tampered param value', () => {
      const sig = computeSignature(token, url, params)
      const tampered = { ...params, Body: 'evil message' }
      expect(verifySmsWebhookSignature(token, url, tampered, sig)).toBe(false)
    })

    it('returns false for an extra param not in original', () => {
      const sig = computeSignature(token, url, params)
      const tampered = { ...params, Extra: 'injected' }
      expect(verifySmsWebhookSignature(token, url, tampered, sig)).toBe(false)
    })

    it('returns false for an empty signature', () => {
      expect(verifySmsWebhookSignature(token, url, params, '')).toBe(false)
    })

    it('returns false for an empty auth token', () => {
      const sig = computeSignature(token, url, params)
      expect(verifySmsWebhookSignature('', url, params, sig)).toBe(false)
    })

    it('returns false for a wrong token', () => {
      const sig = computeSignature(token, url, params)
      expect(verifySmsWebhookSignature('wrong-token', url, params, sig)).toBe(false)
    })
  })

  // ── routeSmsMessage ───────────────────────────────────────────────────────

  describe('routeSmsMessage', () => {
    const baseMessage = parseSmsInbound({
      From: '+15551234567',
      To: '+15550000000',
      Body: 'What is my carbon footprint?',
      MessageSid: 'SM999',
      NumMedia: '0',
    })

    it('returns gated status when liveApproved=false', () => {
      const result = routeSmsMessage(baseMessage, { liveApproved: false })
      expect(result.status).toBe('gated')
      expect(result.twiml).toContain('not yet active')
      expect(result.twiml).toContain('<Response>')
      expect(result.twiml).toContain('<Message>')
    })

    it('returns routed status when liveApproved=true', () => {
      const result = routeSmsMessage(baseMessage, { liveApproved: true })
      expect(result.status).toBe('routed')
      expect(result.twiml).toContain('<Response>')
      expect(result.twiml).toContain('<Message>')
    })

    it('gated twiml contains visit web app message', () => {
      const result = routeSmsMessage(baseMessage, { liveApproved: false })
      expect(result.twiml).toContain('Visit the web app')
    })
  })

  // ── formatSmsTwimlResponse ────────────────────────────────────────────────

  describe('formatSmsTwimlResponse', () => {
    it('wraps text in Response and Message tags', () => {
      const twiml = formatSmsTwimlResponse('Hello world')
      expect(twiml).toBe('<Response><Message>Hello world</Message></Response>')
    })

    it('truncates at 1600 chars', () => {
      const longText = 'A'.repeat(2000)
      const twiml = formatSmsTwimlResponse(longText)
      const inner = twiml.replace('<Response><Message>', '').replace('</Message></Response>', '')
      expect(inner.length).toBe(1600)
    })

    it('does not truncate text shorter than 1600 chars', () => {
      const text = 'Short message'
      const twiml = formatSmsTwimlResponse(text)
      expect(twiml).toContain(text)
    })

    it('escapes XML special characters', () => {
      const twiml = formatSmsTwimlResponse('<script>&"test"</script>')
      expect(twiml).not.toContain('<script>')
      expect(twiml).toContain('&lt;script&gt;')
      expect(twiml).toContain('&amp;')
      expect(twiml).toContain('&quot;')
    })
  })

  // ── SMS_CHANNEL_ENABLED ───────────────────────────────────────────────────

  describe('SMS_CHANNEL_ENABLED', () => {
    it('is a boolean', () => {
      expect(typeof SMS_CHANNEL_ENABLED).toBe('boolean')
    })
  })

  // ── smsChannel metadata ───────────────────────────────────────────────────

  describe('smsChannel', () => {
    it('has correct channel id', () => {
      expect(smsChannel.id).toBe('sms')
    })

    it('has correct displayName', () => {
      expect(smsChannel.displayName).toBe('SMS (Twilio)')
    })

    it('has correct product', () => {
      expect(smsChannel.product).toBe('companion')
    })

    it('isEnabled when all env vars set', () => {
      expect(smsChannel.isEnabled()).toBe(true)
    })

    it('isEnabled false when TWILIO_ACCOUNT_SID missing', () => {
      delete process.env.TWILIO_ACCOUNT_SID
      expect(smsChannel.isEnabled()).toBe(false)
    })
  })
})

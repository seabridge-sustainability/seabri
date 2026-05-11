import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IncomingMessage, ServerResponse } from 'http'

vi.mock('../agents/router.js', () => ({
  routeMessage: vi.fn().mockResolvedValue('Sustainability tip: reduce your carbon footprint by cycling.'),
}))

vi.mock('../seabri/task-router.js', () => ({
  routeTask: vi.fn().mockReturnValue({
    taskId: 'task_mock',
    agentId: 'general',
    agentName: 'General',
    modelId: 'claude-haiku-4-5',
    modelTier: 'haiku',
    product: 'companion',
    routingReason: 'mock',
    classificationConfidence: 1.0,
    estimatedCostUsd: 0.001,
    estimatedCarbonGrams: 0.002,
    sustainability: { composite: 90, tier: 'excellent' },
  }),
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

import { handleVoiceWebhook, voiceChannel } from './voice.js'

function makeReq(url: string, method: string, body: string): IncomingMessage {
  const chunks = [Buffer.from(body)]
  const req = {
    url,
    method,
    headers: {},
    on(event: string, cb: (...args: unknown[]) => void) {
      if (event === 'data') chunks.forEach((c) => cb(c))
      if (event === 'end') cb()
      return req
    },
    destroy() {},
  } as unknown as IncomingMessage
  return req
}

function makeRes(): ServerResponse & { _status: number; _body: string; _headers: Record<string, string> } {
  const res = {
    _status: 0,
    _body: '',
    _headers: {} as Record<string, string>,
    writeHead(status: number, headers?: Record<string, string>) {
      res._status = status
      if (headers) Object.assign(res._headers, headers)
    },
    end(body?: string) {
      res._body = body ?? ''
    },
  } as unknown as ServerResponse & { _status: number; _body: string; _headers: Record<string, string> }
  return res
}

function formEncode(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
}

describe('voice channel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.TWILIO_ACCOUNT_SID = 'ACtest'
    process.env.TWILIO_AUTH_TOKEN = 'test-token'
    process.env.TWILIO_VOICE_WEBHOOK_URL = 'https://example.com/webhooks/voice'
  })

  describe('voiceChannel', () => {
    it('has correct metadata', () => {
      expect(voiceChannel.id).toBe('voice')
      expect(voiceChannel.displayName).toBe('Voice (Twilio)')
      expect(voiceChannel.product).toBe('companion')
    })

    it('isEnabled when all env vars set', () => {
      expect(voiceChannel.isEnabled()).toBe(true)
    })

    it('isEnabled false when missing env vars', () => {
      delete process.env.TWILIO_VOICE_WEBHOOK_URL
      expect(voiceChannel.isEnabled()).toBe(false)
    })
  })

  describe('handleVoiceWebhook', () => {
    it('ignores non-voice URLs', async () => {
      const req = makeReq('/webhooks/sms', 'POST', '')
      const res = makeRes()
      const handled = await handleVoiceWebhook(req, res)
      expect(handled).toBe(false)
    })

    it('ignores non-POST methods', async () => {
      const req = makeReq('/webhooks/voice', 'GET', '')
      const res = makeRes()
      const handled = await handleVoiceWebhook(req, res)
      expect(handled).toBe(false)
    })

    it('returns welcome TwiML on initial call', async () => {
      const body = formEncode({ From: '+15551234567', CallSid: 'CA123' })
      const req = makeReq('/webhooks/voice', 'POST', body)
      const res = makeRes()

      const handled = await handleVoiceWebhook(req, res)

      expect(handled).toBe(true)
      expect(res._status).toBe(200)
      expect(res._body).toContain('<Response>')
      expect(res._body).toContain('<Gather')
      expect(res._body).toContain('Welcome to OpenSeaBri')
      expect(res._body).toContain('speech')
    })

    it('processes speech input and returns response', async () => {
      const body = formEncode({
        From: '+15551234567',
        CallSid: 'CA123',
        SpeechResult: 'What is my carbon footprint?',
      })
      const req = makeReq('/webhooks/voice/respond', 'POST', body)
      const res = makeRes()

      const handled = await handleVoiceWebhook(req, res)

      expect(handled).toBe(true)
      expect(res._status).toBe(200)
      expect(res._body).toContain('<Say')
      expect(res._body).toContain('cycling')
      expect(res._body).toContain('anything else')
    })

    it('asks to repeat when speech is empty', async () => {
      const body = formEncode({ From: '+15551234567', SpeechResult: '' })
      const req = makeReq('/webhooks/voice/respond', 'POST', body)
      const res = makeRes()

      const handled = await handleVoiceWebhook(req, res)

      expect(handled).toBe(true)
      expect(res._body).toContain('repeat')
    })

    it('denies access when policy rejects', async () => {
      const { isAllowed } = await import('../security/policy.js')
      vi.mocked(isAllowed).mockResolvedValueOnce(false)

      const body = formEncode({ From: '+15559999999', CallSid: 'CA456' })
      const req = makeReq('/webhooks/voice', 'POST', body)
      const res = makeRes()

      await handleVoiceWebhook(req, res)

      expect(res._body).toContain('Access denied')
      expect(res._body).toContain('<Hangup')
    })

    it('requests pairing when needed and not approved', async () => {
      const { requiresPairing } = await import('../security/policy.js')
      const { isApproved } = await import('../security/pairing.js')
      vi.mocked(requiresPairing).mockResolvedValueOnce(true)
      vi.mocked(isApproved).mockResolvedValueOnce(false)

      const body = formEncode({ From: '+15559999999', CallSid: 'CA789' })
      const req = makeReq('/webhooks/voice', 'POST', body)
      const res = makeRes()

      await handleVoiceWebhook(req, res)

      expect(res._body).toContain('pairing')
      expect(res._body).toContain('<Hangup')
    })

    it('XML-escapes special characters in responses', async () => {
      const { routeMessage } = await import('../agents/router.js')
      vi.mocked(routeMessage).mockResolvedValueOnce('Use <less> & "more" energy')

      const body = formEncode({ From: '+15551234567', SpeechResult: 'test' })
      const req = makeReq('/webhooks/voice/respond', 'POST', body)
      const res = makeRes()

      await handleVoiceWebhook(req, res)

      expect(res._body).toContain('&lt;less&gt;')
      expect(res._body).toContain('&amp;')
      expect(res._body).not.toContain('<less>')
    })
  })
})

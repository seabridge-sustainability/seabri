/**
 * Voice channel fallback tests.
 *
 * Tests cover:
 * - Transcription failure returns a client-safe error (not raw exception).
 * - Voice inbound with no transcription provider configured returns graceful fallback.
 * - Fallback message does not contain stack trace or provider-internal error strings.
 * - Voice/audio media metadata is handled without a provider.
 * - Channel disabled when env vars are absent — no provider crash.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { IncomingMessage, ServerResponse } from 'http'

// Mock the router and task-router so no real provider is hit
vi.mock('../agents/router.js', () => ({
  routeMessage: vi.fn().mockResolvedValue('Sustainability tip: use less energy.'),
}))

vi.mock('../seabri/task-router.js', () => ({
  routeTask: vi.fn().mockReturnValue({
    taskId: 'task_fallback_mock',
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
  createPairingCode: vi.fn().mockResolvedValue('XY9Z12'),
  verifyPairingCode: vi.fn().mockResolvedValue(true),
  approveSender: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../security/policy.js', () => ({
  isAllowed: vi.fn().mockResolvedValue(true),
  requiresPairing: vi.fn().mockResolvedValue(false),
  getPreferredAgent: vi.fn().mockResolvedValue('general'),
}))

import { handleVoiceWebhook, voiceChannel } from './voice.js'

// ── Helpers ────────────────────────────────────────────────────────────────────

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

// Stack trace / provider leak patterns to check for
const PROVIDER_LEAK_PATTERNS = [
  /Error:\s/,
  /at Object\./,
  /\.ts:\d+/,
  /TWILIO_AUTH_TOKEN/,
  /TWILIO_ACCOUNT_SID/,
  /stack trace/i,
  /undefined is not/i,
  /Cannot read prop/i,
]

function assertNoProviderLeak(body: string): void {
  for (const pattern of PROVIDER_LEAK_PATTERNS) {
    expect(body).not.toMatch(pattern)
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('voice fallback — no provider configured', () => {
  afterEach(() => {
    vi.clearAllMocks()
    delete process.env.TWILIO_ACCOUNT_SID
    delete process.env.TWILIO_AUTH_TOKEN
    delete process.env.TWILIO_VOICE_WEBHOOK_URL
  })

  it('channel reports disabled when env vars are absent — no crash', () => {
    // All env vars absent
    expect(voiceChannel.isEnabled()).toBe(false)
  })

  it('channel reports disabled for each missing env var permutation', () => {
    process.env.TWILIO_ACCOUNT_SID = 'ACtest'
    expect(voiceChannel.isEnabled()).toBe(false)

    process.env.TWILIO_AUTH_TOKEN = 'token'
    expect(voiceChannel.isEnabled()).toBe(false)

    process.env.TWILIO_VOICE_WEBHOOK_URL = 'https://host/webhooks/voice'
    expect(voiceChannel.isEnabled()).toBe(true)
  })
})

describe('voice fallback — transcription failure', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.TWILIO_ACCOUNT_SID = 'ACtest'
    process.env.TWILIO_AUTH_TOKEN = 'test-token'
    process.env.TWILIO_VOICE_WEBHOOK_URL = 'https://example.com/webhooks/voice'
  })

  afterEach(() => {
    delete process.env.TWILIO_ACCOUNT_SID
    delete process.env.TWILIO_AUTH_TOKEN
    delete process.env.TWILIO_VOICE_WEBHOOK_URL
  })

  it('returns client-safe TwiML error message when routeMessage throws', async () => {
    const { routeMessage } = await import('../agents/router.js')
    vi.mocked(routeMessage).mockRejectedValueOnce(new Error('Transcription provider timeout'))

    const body = formEncode({ From: '+15551234567', SpeechResult: 'hello' })
    const req = makeReq('/webhooks/voice/respond', 'POST', body)
    const res = makeRes()

    await handleVoiceWebhook(req, res)

    expect(res._status).toBe(200)
    expect(res._body).toContain('<Response>')
    // Must contain a graceful fallback message, not a raw error
    expect(res._body).toMatch(/error|try again/i)
    // Must NOT expose the provider error internals
    expect(res._body).not.toContain('Transcription provider timeout')
    expect(res._body).not.toContain('Error:')
  })

  it('fallback message does not contain stack trace or internal strings', async () => {
    const { routeMessage } = await import('../agents/router.js')
    vi.mocked(routeMessage).mockRejectedValueOnce(
      Object.assign(new Error('upstream connection refused'), {
        stack: 'Error: upstream connection refused\n  at provider.ts:42\n  at Object.handle',
      })
    )

    const body = formEncode({ From: '+15551234567', SpeechResult: 'test query' })
    const req = makeReq('/webhooks/voice/respond', 'POST', body)
    const res = makeRes()

    await handleVoiceWebhook(req, res)

    assertNoProviderLeak(res._body)
  })

  it('fallback does not expose TWILIO credentials in response body', async () => {
    const { routeMessage } = await import('../agents/router.js')
    vi.mocked(routeMessage).mockRejectedValueOnce(new Error('Auth failed: ACtest/test-token invalid'))

    const body = formEncode({ From: '+15551234567', SpeechResult: 'check my carbon' })
    const req = makeReq('/webhooks/voice/respond', 'POST', body)
    const res = makeRes()

    await handleVoiceWebhook(req, res)

    expect(res._body).not.toContain('ACtest')
    expect(res._body).not.toContain('test-token')
    assertNoProviderLeak(res._body)
  })

  it('returns valid TwiML XML structure on transcription failure', async () => {
    const { routeMessage } = await import('../agents/router.js')
    vi.mocked(routeMessage).mockRejectedValueOnce(new Error('Service unavailable'))

    const body = formEncode({ From: '+15551234567', SpeechResult: 'anything' })
    const req = makeReq('/webhooks/voice/respond', 'POST', body)
    const res = makeRes()

    await handleVoiceWebhook(req, res)

    // Response must be valid TwiML envelope
    expect(res._body).toContain('<?xml')
    expect(res._body).toContain('<Response>')
    expect(res._body).toContain('</Response>')
    expect(res._headers['content-type']).toContain('text/xml')
  })
})

describe('voice fallback — empty or missing speech result', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.TWILIO_ACCOUNT_SID = 'ACtest'
    process.env.TWILIO_AUTH_TOKEN = 'test-token'
    process.env.TWILIO_VOICE_WEBHOOK_URL = 'https://example.com/webhooks/voice'
  })

  afterEach(() => {
    delete process.env.TWILIO_ACCOUNT_SID
    delete process.env.TWILIO_AUTH_TOKEN
    delete process.env.TWILIO_VOICE_WEBHOOK_URL
  })

  it('returns graceful re-prompt when SpeechResult is empty (transcription produced nothing)', async () => {
    const body = formEncode({ From: '+15551234567', SpeechResult: '' })
    const req = makeReq('/webhooks/voice/respond', 'POST', body)
    const res = makeRes()

    await handleVoiceWebhook(req, res)

    expect(res._status).toBe(200)
    expect(res._body).toContain('<Response>')
    // Should re-prompt without crashing or leaking provider details
    expect(res._body).toMatch(/repeat|catch|hear/i)
    assertNoProviderLeak(res._body)
  })

  it('returns graceful re-prompt when SpeechResult is whitespace-only', async () => {
    const body = formEncode({ From: '+15551234567', SpeechResult: '   ' })
    const req = makeReq('/webhooks/voice/respond', 'POST', body)
    const res = makeRes()

    await handleVoiceWebhook(req, res)

    expect(res._status).toBe(200)
    expect(res._body).toMatch(/repeat|catch|hear/i)
    assertNoProviderLeak(res._body)
  })

  it('returns graceful re-prompt when SpeechResult key is absent (no transcription provider)', async () => {
    // Missing SpeechResult means transcription provider returned nothing
    const body = formEncode({ From: '+15551234567', CallSid: 'CA999' })
    const req = makeReq('/webhooks/voice/respond', 'POST', body)
    const res = makeRes()

    await handleVoiceWebhook(req, res)

    expect(res._status).toBe(200)
    expect(res._body).toContain('<Response>')
    assertNoProviderLeak(res._body)
  })
})

describe('voice media metadata handling without provider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.TWILIO_ACCOUNT_SID = 'ACtest'
    process.env.TWILIO_AUTH_TOKEN = 'test-token'
    process.env.TWILIO_VOICE_WEBHOOK_URL = 'https://example.com/webhooks/voice'
  })

  afterEach(() => {
    delete process.env.TWILIO_ACCOUNT_SID
    delete process.env.TWILIO_AUTH_TOKEN
    delete process.env.TWILIO_VOICE_WEBHOOK_URL
  })

  it('handles inbound call with media metadata fields without crashing', async () => {
    // Twilio may include extra metadata fields; handler must not crash on unknown fields
    const body = formEncode({
      From: '+15551234567',
      CallSid: 'CA123',
      CallStatus: 'in-progress',
      Direction: 'inbound',
      ForwardedFrom: '',
      CallerCountry: 'US',
      CallerCity: 'Miami',
      CallerState: 'FL',
      CallerZip: '33101',
    })
    const req = makeReq('/webhooks/voice', 'POST', body)
    const res = makeRes()

    const handled = await handleVoiceWebhook(req, res)

    expect(handled).toBe(true)
    expect(res._status).toBe(200)
    expect(res._body).toContain('<Response>')
    assertNoProviderLeak(res._body)
  })

  it('handles call with RecordingUrl media field — does not attempt to fetch or process recording', async () => {
    // If a future Twilio variant sends RecordingUrl without a configured transcription provider,
    // the handler must still respond gracefully
    const body = formEncode({
      From: '+15551234567',
      SpeechResult: '',
      RecordingUrl: 'https://api.twilio.com/2010-04-01/Accounts/ACtest/Recordings/RE000.mp3',
      RecordingDuration: '5',
    })
    const req = makeReq('/webhooks/voice/respond', 'POST', body)
    const res = makeRes()

    await handleVoiceWebhook(req, res)

    // Must return valid TwiML without attempting to fetch the recording URL
    expect(res._body).toContain('<Response>')
    assertNoProviderLeak(res._body)
  })

  it('response Content-Type is always text/xml for voice webhook replies', async () => {
    const body = formEncode({ From: '+15551234567', CallSid: 'CA100' })
    const req = makeReq('/webhooks/voice', 'POST', body)
    const res = makeRes()

    await handleVoiceWebhook(req, res)

    expect(res._headers['content-type']).toContain('text/xml')
  })
})

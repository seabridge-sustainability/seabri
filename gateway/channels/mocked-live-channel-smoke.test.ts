import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { IncomingMessage, ServerResponse } from 'http'

vi.mock('../agents/router.js', () => ({
  routeMessage: vi.fn().mockResolvedValue('Mocked OpenSeaBri channel reply.'),
}))

vi.mock('../seabri/attachments.js', () => ({
  processAttachment: vi.fn(),
}))

vi.mock('../attachments/store.js', () => ({
  putBlob: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../security/pairing.js', () => ({
  isApproved: vi.fn().mockResolvedValue(true),
  createPairingCode: vi.fn().mockResolvedValue('123456'),
  verifyPairingCode: vi.fn().mockResolvedValue(true),
  approveSender: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../security/policy.js', () => ({
  getPreferredAgent: vi.fn().mockResolvedValue('general'),
  isAllowed: vi.fn().mockResolvedValue(true),
  requiresPairing: vi.fn().mockResolvedValue(false),
}))

vi.mock('../seabri/approval.js', () => ({
  extractActionCard: vi.fn().mockReturnValue(null),
  isApproval: vi.fn().mockReturnValue(false),
  isDenial: vi.fn().mockReturnValue(false),
  logConsent: vi.fn().mockResolvedValue(undefined),
  detectActionKind: vi.fn().mockReturnValue('send_sms'),
  requiresDoubleConfirmation: vi.fn().mockReturnValue(false),
  generateConfirmCode: vi.fn().mockReturnValue('ABC123'),
  isConfirmCode: vi.fn().mockReturnValue(false),
}))

vi.mock('./shared_commands.js', () => ({
  buildAdditionalContext: vi.fn().mockResolvedValue(''),
  handleSlashCommand: vi.fn().mockResolvedValue({ handled: false }),
  isInboundPhoneAllowed: vi.fn().mockReturnValue(true),
  sanitizeForPlainText: (text: string) => text,
}))

import { routeMessage } from '../agents/router.js'
import { processAttachment } from '../seabri/attachments.js'
import { handleSmsWebhook } from './sms.js'
import { handleWhatsAppWebhook } from './whatsapp.js'
import { handleVoiceWebhook } from './voice.js'

const mockRouteMessage = vi.mocked(routeMessage)
const mockProcessAttachment = vi.mocked(processAttachment)

function makeReq(url: string, method: string, body: string, headers: Record<string, string> = {}): IncomingMessage {
  const chunks = [Buffer.from(body)]
  const req = {
    url,
    method,
    headers,
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

async function flushAsync(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 25))
}

describe('mocked live-channel smoke', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRouteMessage.mockResolvedValue('Mocked OpenSeaBri channel reply.')
    mockProcessAttachment.mockResolvedValue({
      type: 'pdf_text',
      content: '[PDF: policy.pdf]\nMock extracted policy text.',
      fileName: 'policy.pdf',
      sizeBytes: 128,
    })
    delete process.env.TWILIO_WEBHOOK_SECRET
    delete process.env.WHATSAPP_APP_SECRET
    process.env.TWILIO_ACCOUNT_SID = 'ACmock'
    process.env.TWILIO_AUTH_TOKEN = 'mock-token'
    delete process.env.TWILIO_FROM_NUMBER
    process.env.TWILIO_VOICE_WEBHOOK_URL = 'https://example.test/webhooks/voice'
    process.env.WHATSAPP_CLOUD_TOKEN = 'mock-wa-token'
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'mock-phone-id'
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/pdf' },
      json: async () => ({ url: 'https://graph.facebook.com/mock-media', mime_type: 'application/pdf' }),
      arrayBuffer: async () => new ArrayBuffer(8),
    } as unknown as Response)
  })

  it('routes SMS text to the orchestrator without a live provider call requirement', async () => {
    const body = formEncode({ From: '+15551234567', Body: 'Compare my two appliance options', NumMedia: '0' })
    const req = makeReq('/webhooks/sms', 'POST', body)
    const res = makeRes()

    const handled = await handleSmsWebhook(req, res)
    await flushAsync()

    expect(handled).toBe(true)
    expect(res._status).toBe(200)
    expect(mockRouteMessage).toHaveBeenCalledWith(
      'general',
      'Compare my two appliance options',
      expect.any(Array),
      expect.anything(),
      undefined,
      undefined,
      undefined,
    )
  })

  it('routes SMS/MMS attachments through attachment processing before orchestration', async () => {
    const body = formEncode({
      From: '+15551234567',
      Body: 'Review this policy',
      NumMedia: '1',
      MediaUrl0: 'https://api.twilio.com/mock-media',
      MediaContentType0: 'application/pdf',
    })
    const req = makeReq('/webhooks/sms', 'POST', body)
    const res = makeRes()

    await handleSmsWebhook(req, res)
    await flushAsync()

    expect(mockProcessAttachment).toHaveBeenCalled()
    expect(mockRouteMessage).toHaveBeenCalledWith(
      'general',
      expect.stringContaining('[PDF: policy.pdf]'),
      expect.any(Array),
      expect.anything(),
      undefined,
      undefined,
      undefined,
    )
  })

  it('routes WhatsApp text and hides provider failures from webhook clients', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('provider down'))
    const payload = {
      entry: [{ changes: [{ value: { messages: [{ from: '15551234567', type: 'text', text: { body: 'hello' } }] } }] }],
    }
    const req = makeReq('/webhooks/whatsapp', 'POST', JSON.stringify(payload))
    const res = makeRes()

    await handleWhatsAppWebhook(req, res)
    await flushAsync()

    expect(res._status).toBe(200)
    expect(res._body).toBe('{"status":"ok"}')
    expect(mockRouteMessage).toHaveBeenCalledWith(
      'general',
      'hello',
      expect.any(Array),
      expect.anything(),
      undefined,
      undefined,
      undefined,
    )
  })

  it('routes WhatsApp media through attachment processing without live credentials', async () => {
    const payload = {
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: '15551234567',
              type: 'document',
              document: { id: 'media-id', filename: 'policy.pdf', caption: 'Please review', mime_type: 'application/pdf' },
            }],
          },
        }],
      }],
    }
    const req = makeReq('/webhooks/whatsapp', 'POST', JSON.stringify(payload))
    const res = makeRes()

    await handleWhatsAppWebhook(req, res)
    await flushAsync()

    expect(mockProcessAttachment).toHaveBeenCalled()
    expect(mockRouteMessage).toHaveBeenCalledWith(
      'general',
      expect.stringContaining('[PDF: policy.pdf]'),
      expect.any(Array),
      expect.anything(),
      undefined,
      undefined,
      undefined,
    )
  })

  it('prepares voice/call routing through TwiML without placing an outbound call', async () => {
    const body = formEncode({ From: '+15551234567', SpeechResult: 'Help me prepare a claim call' })
    const req = makeReq('/webhooks/voice/respond', 'POST', body)
    const res = makeRes()

    await handleVoiceWebhook(req, res)

    expect(res._status).toBe(200)
    expect(res._body).toContain('<Response>')
    expect(mockRouteMessage).toHaveBeenCalledWith(
      'general',
      'Help me prepare a claim call',
      expect.any(Array),
      undefined,
      undefined,
      expect.any(String),
    )
  })
})

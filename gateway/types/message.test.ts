import { describe, it, expect } from 'vitest'
import type { NormalizedMessage } from './message.js'

describe('NormalizedMessage', () => {
  it('can be constructed with required fields only', () => {
    const msg: NormalizedMessage = {
      id: 'msg-1',
      channelId: 'telegram',
      senderId: 'telegram:12345',
      text: 'Hello',
      timestamp: Date.now(),
      metadata: {},
    }
    expect(msg.id).toBe('msg-1')
    expect(msg.channelId).toBe('telegram')
    expect(msg.attachment).toBeUndefined()
    expect(msg.locale).toBeUndefined()
    expect(msg.location).toBeUndefined()
  })

  it('accepts attachment with all fields', () => {
    const msg: NormalizedMessage = {
      id: 'msg-2',
      channelId: 'telegram',
      senderId: 'telegram:99',
      text: '',
      timestamp: Date.now(),
      metadata: {},
      attachment: {
        type: 'image',
        buffer: Buffer.from('test'),
        mimeType: 'image/jpeg',
        fileName: 'photo.jpg',
        sizeBytes: 12345,
      },
    }
    expect(msg.attachment?.type).toBe('image')
    expect(msg.attachment?.mimeType).toBe('image/jpeg')
  })

  it('accepts location', () => {
    const msg: NormalizedMessage = {
      id: 'msg-3',
      channelId: 'telegram',
      senderId: 'telegram:77',
      text: '',
      timestamp: Date.now(),
      metadata: {},
      location: { lat: 25.7617, lng: -80.1918 },
    }
    expect(msg.location?.lat).toBeCloseTo(25.7617)
    expect(msg.location?.lng).toBeCloseTo(-80.1918)
  })

  it('accepts SeaBri routing extensions', () => {
    const msg: NormalizedMessage = {
      id: 'msg-4',
      channelId: 'telegram',
      senderId: 'telegram:55',
      text: 'What is my flood risk?',
      timestamp: Date.now(),
      metadata: {},
      mode: 'property_risk',
      agentId: 'property-climate-risk',
      threadId: 'thread-abc',
      locale: 'es',
    }
    expect(msg.mode).toBe('property_risk')
    expect(msg.agentId).toBe('property-climate-risk')
    expect(msg.locale).toBe('es')
  })

  it('metadata accepts arbitrary values', () => {
    const msg: NormalizedMessage = {
      id: 'msg-5',
      channelId: 'sms',
      senderId: 'sms:+15551234567',
      text: 'test',
      timestamp: Date.now(),
      metadata: { twilioSid: 'SM123', fromCountry: 'US' },
    }
    expect(msg.metadata['twilioSid']).toBe('SM123')
  })
})

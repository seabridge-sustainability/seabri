import { describe, it, expect } from 'vitest'
import { detectGaps } from './gap-detector.js'
import type { NormalizedMessage } from '../types/message.js'

function makeMsg(overrides: Partial<NormalizedMessage>): NormalizedMessage {
  return {
    id: 'test',
    channelId: 'telegram',
    senderId: 'telegram:1',
    text: '',
    timestamp: Date.now(),
    metadata: {},
    ...overrides,
  }
}

describe('detectGaps — channel gaps', () => {
  it('no gap for text-only message on any channel', () => {
    const report = detectGaps(makeMsg({ channelId: 'sms', text: 'hello' }))
    expect(report.channelGap.canHandle).toBe(true)
  })

  it('gap when image sent to SMS channel', () => {
    const report = detectGaps(
      makeMsg({ channelId: 'sms', attachment: { type: 'image', buffer: Buffer.alloc(0), mimeType: 'image/jpeg', fileName: '', sizeBytes: 0 } })
    )
    expect(report.channelGap.canHandle).toBe(false)
    expect(report.channelGap.fallbackText).toBeTruthy()
  })

  it('no gap when image sent to Telegram (supports images)', () => {
    const report = detectGaps(
      makeMsg({ channelId: 'telegram', attachment: { type: 'image', buffer: Buffer.alloc(0), mimeType: 'image/jpeg', fileName: '', sizeBytes: 0 } })
    )
    expect(report.channelGap.canHandle).toBe(true)
  })

  it('gap when audio sent to Discord channel', () => {
    const report = detectGaps(
      makeMsg({ channelId: 'discord', attachment: { type: 'audio', buffer: Buffer.alloc(0), mimeType: 'audio/ogg', fileName: '', sizeBytes: 0 } })
    )
    expect(report.channelGap.canHandle).toBe(false)
  })

  it('canHandle=true when channel is unknown (no registry entry)', () => {
    const report = detectGaps(makeMsg({ channelId: 'unknown-channel', text: 'hello' }))
    expect(report.channelGap.canHandle).toBe(true)
  })
})

describe('detectGaps — agent gaps', () => {
  it('no agent gap when agentId not specified', () => {
    const report = detectGaps(makeMsg({ text: 'hello' }))
    expect(report.agentGap).toBeNull()
  })

  it('agent gap when vision agent used on non-image channel', () => {
    const report = detectGaps(
      makeMsg({ channelId: 'cli', agentId: 'damage-documentation', text: 'check damage' })
    )
    expect(report.agentGap).not.toBeNull()
    expect(report.agentGap).toContain('damage-documentation')
  })

  it('no agent gap when vision agent used on Telegram with image', () => {
    const report = detectGaps(
      makeMsg({
        channelId: 'telegram',
        agentId: 'damage-documentation',
        attachment: { type: 'image', buffer: Buffer.alloc(0), mimeType: 'image/jpeg', fileName: '', sizeBytes: 0 },
      })
    )
    expect(report.agentGap).toBeNull()
  })

  it('agent gap when mode not supported by agent', () => {
    const report = detectGaps(
      makeMsg({ agentId: 'property-climate-risk', mode: 'photo_damage', text: 'damage photo' })
    )
    expect(report.agentGap).not.toBeNull()
  })
})

describe('detectGaps — locationRequested', () => {
  it('true when text asks about flood risk with no location', () => {
    const report = detectGaps(makeMsg({ text: 'What is the flood risk at my address?' }))
    expect(report.locationRequested).toBe(true)
  })

  it('false when location coordinates provided', () => {
    const report = detectGaps(
      makeMsg({
        text: 'What is the flood risk here?',
        location: { lat: 25.7617, lng: -80.1918 },
      })
    )
    expect(report.locationRequested).toBe(false)
  })

  it('false for generic text without location keywords', () => {
    const report = detectGaps(makeMsg({ text: 'What is your name?' }))
    expect(report.locationRequested).toBe(false)
  })

  it('true for "at my property" without location', () => {
    const report = detectGaps(makeMsg({ text: 'Check climate risk at my property' }))
    expect(report.locationRequested).toBe(true)
  })

  it('false when attachment present (user sent a photo)', () => {
    const report = detectGaps(
      makeMsg({
        text: 'flood risk here',
        attachment: { type: 'image', buffer: Buffer.alloc(0), mimeType: 'image/jpeg', fileName: '', sizeBytes: 0 },
      })
    )
    expect(report.locationRequested).toBe(false)
  })
})

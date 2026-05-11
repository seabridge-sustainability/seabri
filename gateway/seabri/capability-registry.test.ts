import { describe, it, expect } from 'vitest'
import { buildCapabilityRegistry, resolveCapabilityGap } from './capability-registry.js'
import type { NormalizedMessage } from '../types/message.js'

describe('CapabilityRegistry', () => {
  it('telegram channel has supportsImage=true', () => {
    const reg = buildCapabilityRegistry()
    const tg = reg.channels.find(c => c.channelId === 'telegram')
    expect(tg?.supportsImage).toBe(true)
  })

  it('sms channel has supportsImage=false', () => {
    const sms = buildCapabilityRegistry().channels.find(c => c.channelId === 'sms')
    expect(sms?.supportsImage).toBe(false)
  })

  it('sms has no audio support', () => {
    const sms = buildCapabilityRegistry().channels.find(c => c.channelId === 'sms')
    expect(sms?.supportsAudio).toBe(false)
  })

  it('all channels are present', () => {
    const reg = buildCapabilityRegistry()
    const ids = reg.channels.map(c => c.channelId)
    expect(ids).toContain('telegram')
    expect(ids).toContain('whatsapp')
    expect(ids).toContain('sms')
    expect(ids).toContain('discord')
    expect(ids).toContain('slack')
    expect(ids).toContain('cli')
    expect(ids).toContain('web')
  })

  it('cli has large maxMessageLengthChars', () => {
    const cli = buildCapabilityRegistry().channels.find(c => c.channelId === 'cli')
    expect(cli?.maxMessageLengthChars).toBeGreaterThan(10_000)
  })

  it('telegram supportsLocation=true', () => {
    const tg = buildCapabilityRegistry().channels.find(c => c.channelId === 'telegram')
    expect(tg?.supportsLocation).toBe(true)
  })
})

describe('resolveCapabilityGap', () => {
  it('returns canHandle=true when no attachment present', () => {
    const reg = buildCapabilityRegistry()
    const sms = reg.channels.find(c => c.channelId === 'sms')!
    const msg = { attachment: undefined } as Pick<NormalizedMessage, 'attachment'>
    expect(resolveCapabilityGap(sms, msg).canHandle).toBe(true)
  })

  it('returns fallback for sms+image', () => {
    const reg = buildCapabilityRegistry()
    const smsChannel = reg.channels.find(c => c.channelId === 'sms')!
    const msg = { attachment: { type: 'image' } } as NormalizedMessage
    const gap = resolveCapabilityGap(smsChannel, msg)
    expect(gap.canHandle).toBe(false)
    expect(gap.fallbackText).toContain('describe')
  })

  it('returns canHandle=true for telegram+image', () => {
    const tgChannel = buildCapabilityRegistry().channels.find(c => c.channelId === 'telegram')!
    const msg = { attachment: { type: 'image' } } as NormalizedMessage
    expect(resolveCapabilityGap(tgChannel, msg).canHandle).toBe(true)
  })

  it('returns canHandle=true for telegram+audio', () => {
    const tg = buildCapabilityRegistry().channels.find(c => c.channelId === 'telegram')!
    const msg = { attachment: { type: 'audio' } } as NormalizedMessage
    expect(resolveCapabilityGap(tg, msg).canHandle).toBe(true)
  })

  it('returns canHandle=false for sms+audio', () => {
    const sms = buildCapabilityRegistry().channels.find(c => c.channelId === 'sms')!
    const msg = { attachment: { type: 'audio' } } as NormalizedMessage
    const gap = resolveCapabilityGap(sms, msg)
    expect(gap.canHandle).toBe(false)
    expect(gap.fallbackText).toBeTruthy()
  })

  it('fallbackText for sms+image mentions Sms channel', () => {
    const sms = buildCapabilityRegistry().channels.find(c => c.channelId === 'sms')!
    const msg = { attachment: { type: 'image' } } as NormalizedMessage
    const gap = resolveCapabilityGap(sms, msg)
    expect(gap.fallbackText).toContain('Sms')
  })

  it('returns canHandle=true for sms with no attachment', () => {
    const sms = buildCapabilityRegistry().channels.find(c => c.channelId === 'sms')!
    const msg = {} as Pick<NormalizedMessage, 'attachment'>
    expect(resolveCapabilityGap(sms, msg).canHandle).toBe(true)
  })
})

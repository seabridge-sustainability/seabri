import { afterEach, describe, expect, it } from 'vitest'
import { channelGateSummary, enabledChannelSet, isChannelExplicitlyEnabled } from './enablement.js'

afterEach(() => {
  delete process.env.OPENSEABRI_CHANNELS_ENABLED
})

describe('channel enablement gate', () => {
  it('defaults to no live channels enabled', () => {
    expect(enabledChannelSet().size).toBe(0)
    expect(isChannelExplicitlyEnabled('telegram')).toBe(false)
    expect(channelGateSummary()).toBe('(none)')
  })

  it('enables only allowlisted channel ids', () => {
    process.env.OPENSEABRI_CHANNELS_ENABLED = 'telegram, SMS'
    expect(isChannelExplicitlyEnabled('telegram')).toBe(true)
    expect(isChannelExplicitlyEnabled('sms')).toBe(true)
    expect(isChannelExplicitlyEnabled('whatsapp')).toBe(false)
    expect(channelGateSummary()).toBe('sms,telegram')
  })
})

export const SUPPORTED_CHANNEL_IDS = ['telegram', 'whatsapp', 'sms', 'voice', 'discord', 'slack', 'cli'] as const

export type SupportedChannelId = typeof SUPPORTED_CHANNEL_IDS[number]

const SUPPORTED_CHANNEL_SET = new Set<string>(SUPPORTED_CHANNEL_IDS)

function configuredChannelIds(): string[] {
  return (process.env.OPENSEABRI_CHANNELS_ENABLED || '')
    .split(',')
    .map((id) => id.trim().toLowerCase())
    .filter(Boolean)
}

export function enabledChannelSet(): Set<string> {
  const ids = configuredChannelIds()
  if (ids.includes('all')) return new Set(SUPPORTED_CHANNEL_IDS)
  return new Set(ids)
}

export function isChannelExplicitlyEnabled(channelId: string): boolean {
  return enabledChannelSet().has(channelId.toLowerCase())
}

export function channelGateSummary(): string {
  const enabled = [...enabledChannelSet()].sort()
  return enabled.length > 0 ? enabled.join(',') : '(none)'
}

export function validateChannelAllowlist(value = process.env.OPENSEABRI_CHANNELS_ENABLED || ''): string[] {
  const ids = value
    .split(',')
    .map((id) => id.trim().toLowerCase())
    .filter(Boolean)

  const errors: string[] = []
  if (ids.includes('all') && ids.length > 1) {
    errors.push('OPENSEABRI_CHANNELS_ENABLED=all must be used by itself.')
  }
  for (const id of ids) {
    if (id === 'all') continue
    if (!SUPPORTED_CHANNEL_SET.has(id)) {
      errors.push(`Unknown OPENSEABRI_CHANNELS_ENABLED value: ${id}`)
    }
  }
  return errors
}

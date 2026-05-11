export function enabledChannelSet(): Set<string> {
  return new Set(
    (process.env.OPENSEABRI_CHANNELS_ENABLED || '')
      .split(',')
      .map((id) => id.trim().toLowerCase())
      .filter(Boolean),
  )
}

export function isChannelExplicitlyEnabled(channelId: string): boolean {
  return enabledChannelSet().has(channelId.toLowerCase())
}

export function channelGateSummary(): string {
  const enabled = [...enabledChannelSet()].sort()
  return enabled.length > 0 ? enabled.join(',') : '(none)'
}

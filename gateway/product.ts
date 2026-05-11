export enum Product {
  COMPANION = 'companion',
  HARNESS = 'harness',
}

const COMPANION_CHANNEL_IDS = new Set([
  'telegram',
  'whatsapp',
  'sms',
  'discord',
  'slack',
  'web',
])

const HARNESS_CHANNEL_IDS = new Set([
  'cli',
  'mcp',
  'api',
  'websocket',
])

export function productForChannel(channelId: string): Product {
  if (COMPANION_CHANNEL_IDS.has(channelId)) return Product.COMPANION
  if (HARNESS_CHANNEL_IDS.has(channelId)) return Product.HARNESS
  return Product.COMPANION
}

export function isCompanionSurface(channelId: string): boolean {
  return productForChannel(channelId) === Product.COMPANION
}

export function isHarnessSurface(channelId: string): boolean {
  return productForChannel(channelId) === Product.HARNESS
}

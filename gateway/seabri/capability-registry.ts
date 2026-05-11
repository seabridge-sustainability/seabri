import type { NormalizedMessage } from '../types/message.js'

export interface ChannelCapabilities {
  channelId: string
  supportsImage: boolean
  supportsAudio: boolean
  supportsVideo: boolean
  supportsPdf: boolean
  supportsLocation: boolean
  supportsButtons: boolean
  maxMessageLengthChars: number
}

export interface AgentCapability {
  agentId: string
  supportedModes: string[]
  requiresVision: boolean
  requiresAudio: boolean
}

export interface CapabilityRegistry {
  channels: ChannelCapabilities[]
  agents: AgentCapability[]
}

export interface CapabilityGapResult {
  canHandle: boolean
  /** Human-readable fallback message when canHandle is false */
  fallbackText?: string
}

const CHANNEL_CAPABILITIES: ChannelCapabilities[] = [
  {
    channelId: 'telegram',
    supportsImage: true,
    supportsAudio: true,
    supportsVideo: true,
    supportsPdf: true,
    supportsLocation: true,
    supportsButtons: false,
    maxMessageLengthChars: 4096,
  },
  {
    channelId: 'whatsapp',
    supportsImage: true,
    supportsAudio: true,
    supportsVideo: true,
    supportsPdf: true,
    supportsLocation: true,
    supportsButtons: true,
    maxMessageLengthChars: 1600,
  },
  {
    channelId: 'sms',
    supportsImage: false,
    supportsAudio: false,
    supportsVideo: false,
    supportsPdf: false,
    supportsLocation: false,
    supportsButtons: false,
    maxMessageLengthChars: 1600,
  },
  {
    channelId: 'discord',
    supportsImage: true,
    supportsAudio: false,
    supportsVideo: false,
    supportsPdf: false,
    supportsLocation: false,
    supportsButtons: true,
    maxMessageLengthChars: 2000,
  },
  {
    channelId: 'slack',
    supportsImage: true,
    supportsAudio: false,
    supportsVideo: false,
    supportsPdf: true,
    supportsLocation: false,
    supportsButtons: true,
    maxMessageLengthChars: 4000,
  },
  {
    channelId: 'cli',
    supportsImage: false,
    supportsAudio: false,
    supportsVideo: false,
    supportsPdf: false,
    supportsLocation: false,
    supportsButtons: false,
    maxMessageLengthChars: 100_000,
  },
  {
    channelId: 'web',
    supportsImage: true,
    supportsAudio: true,
    supportsVideo: true,
    supportsPdf: true,
    supportsLocation: true,
    supportsButtons: true,
    maxMessageLengthChars: 100_000,
  },
]

const AGENT_CAPABILITIES: AgentCapability[] = [
  {
    agentId: 'property-climate-risk',
    supportedModes: ['property_risk', 'general_sustainability'],
    requiresVision: false,
    requiresAudio: false,
  },
  {
    agentId: 'damage-documentation',
    supportedModes: ['photo_damage', 'incident'],
    requiresVision: true,
    requiresAudio: false,
  },
  {
    agentId: 'emergency-resilience',
    supportedModes: ['incident', 'general_sustainability'],
    requiresVision: false,
    requiresAudio: false,
  },
  {
    agentId: 'insurance-navigator',
    supportedModes: ['insurance', 'general_sustainability'],
    requiresVision: false,
    requiresAudio: false,
  },
  {
    agentId: 'contractor-coordination',
    supportedModes: ['action_coordination', 'general_sustainability'],
    requiresVision: false,
    requiresAudio: false,
  },
]

export function buildCapabilityRegistry(): CapabilityRegistry {
  return {
    channels: CHANNEL_CAPABILITIES,
    agents: AGENT_CAPABILITIES,
  }
}

/**
 * Checks whether the given channel can handle the message's attachment type.
 * Returns canHandle=true when no attachment is present or the channel supports it.
 */
export function resolveCapabilityGap(
  channel: ChannelCapabilities,
  msg: Pick<NormalizedMessage, 'attachment'>,
): CapabilityGapResult {
  if (!msg.attachment) return { canHandle: true }

  const type = msg.attachment.type

  const supports =
    (type === 'image' && channel.supportsImage) ||
    (type === 'audio' && channel.supportsAudio) ||
    (type === 'video' && channel.supportsVideo) ||
    (type === 'pdf' && channel.supportsPdf) ||
    (type === 'document' && channel.supportsPdf)

  if (supports) return { canHandle: true }

  const fallbackText = buildFallbackText(type, channel.channelId)
  return { canHandle: false, fallbackText }
}

function buildFallbackText(type: string, channelId: string): string {
  const channelLabel = channelId.charAt(0).toUpperCase() + channelId.slice(1)
  switch (type) {
    case 'image':
      return `${channelLabel} does not support images. Please describe the image in text and I will do my best to help.`
    case 'audio':
      return `${channelLabel} does not support audio messages. Please type your question instead.`
    case 'video':
      return `${channelLabel} does not support video. Please describe what you see or send a photo instead.`
    case 'pdf':
      return `${channelLabel} does not support PDF files. Please paste the relevant text directly into the chat.`
    default:
      return `${channelLabel} does not support this file type. Please describe what you need help with.`
  }
}

import type { NormalizedMessage } from '../types/message.js'
import {
  buildCapabilityRegistry,
  resolveCapabilityGap,
  type CapabilityGapResult,
  type CapabilityRegistry,
} from './capability-registry.js'

export interface GapReport {
  /** Whether the channel can handle the attachment type (if any). */
  channelGap: CapabilityGapResult
  /** Human-readable description of the agent capability gap, or null. */
  agentGap: string | null
  /** True when the text asks about a location but no address/coordinates supplied. */
  locationRequested: boolean
}

const LOCATION_KEYWORDS = [
  'flood risk', 'climate risk', 'hurricane risk', 'wildfire risk',
  'earthquake risk', 'at my address', 'at my property', 'at my location',
  'property risk', 'at this address',
]

export function detectGaps(
  msg: NormalizedMessage,
  registry?: CapabilityRegistry,
): GapReport {
  const reg = registry ?? buildCapabilityRegistry()

  // Channel gap — can this channel handle the attachment?
  const channelCaps = reg.channels.find((c) => c.channelId === msg.channelId)
  const channelGap: CapabilityGapResult = channelCaps
    ? resolveCapabilityGap(channelCaps, msg)
    : { canHandle: true }

  // Agent gap — does the requested agent support the message mode?
  let agentGap: string | null = null
  if (msg.agentId) {
    const agentCaps = reg.agents.find((a) => a.agentId === msg.agentId)
    if (agentCaps) {
      if (agentCaps.requiresVision && !channelCaps?.supportsImage) {
        agentGap = `Agent '${msg.agentId}' requires image capability but channel '${msg.channelId}' does not support images.`
      }
      if (msg.mode && !agentCaps.supportedModes.includes(msg.mode)) {
        agentGap = `Agent '${msg.agentId}' does not support mode '${msg.mode}'.`
      }
    }
  }

  // Location requested but not provided
  const text = (msg.text ?? '').toLowerCase()
  const locationRequested =
    !msg.location &&
    !msg.attachment &&
    LOCATION_KEYWORDS.some((kw) => text.includes(kw))

  return { channelGap, agentGap, locationRequested }
}

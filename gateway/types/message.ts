import type { ResponseMode } from '../seabri/modes.js'
import type { Locale } from '../seabri/lang.js'

/**
 * Normalized message envelope based on the openclaw pattern.
 * This is the canonical message type passed between channel handlers and the routing pipeline.
 */
export interface NormalizedMessage {
  /** Unique message ID (channel-scoped) */
  id: string
  /** Channel identifier: 'telegram' | 'whatsapp' | 'sms' | 'discord' | 'slack' | 'cli' | 'web' */
  channelId: string
  /** Sender identifier (channel-prefixed, e.g. 'telegram:12345678') */
  senderId: string
  /** Plain text content of the message */
  text: string
  /** Unix ms timestamp */
  timestamp: number
  /** Detected or declared locale */
  locale?: Locale
  /** Attachment if present */
  attachment?: {
    type: 'image' | 'audio' | 'video' | 'pdf' | 'document'
    buffer: Buffer
    mimeType: string
    fileName: string
    sizeBytes: number
  }
  /** Location pin if sent */
  location?: {
    lat: number
    lng: number
  }
  /** Arbitrary channel-specific metadata */
  metadata: Record<string, unknown>
  // SeaBri routing extensions
  mode?: ResponseMode
  agentId?: string
  threadId?: string
}

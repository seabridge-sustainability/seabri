/**
 * Attachment types — shared across the content-addressable store.
 *
 * Blobs live at workspace/attachments/<prefix>/<sha256>, where <prefix> is the
 * first two hex chars of the digest. Metadata is kept in a single index.json
 * next to the shards so channels and the UI can list/resolve attachments
 * without re-hashing bytes.
 */

export type AttachmentKind = 'image' | 'audio' | 'video' | 'document' | 'other'

export interface Attachment {
  /** Lowercase hex SHA-256 of the blob's raw bytes. */
  sha256: string
  mimeType: string
  size: number
  kind: AttachmentKind
  /** Unix ms when the blob was first added. Identical bytes keep the original. */
  createdAt: number
  /** Optional free-form tags (e.g. ['telegram', 'user:123']). */
  tags?: string[]
  /** Optional display name from the uploading channel. */
  filename?: string
}

export function kindFor(mimeType: string): AttachmentKind {
  const m = (mimeType || '').toLowerCase()
  if (m.startsWith('image/')) return 'image'
  if (m.startsWith('audio/')) return 'audio'
  if (m.startsWith('video/')) return 'video'
  if (
    m.startsWith('text/') ||
    m === 'application/pdf' ||
    m === 'application/json' ||
    m.includes('officedocument') ||
    m.includes('msword') ||
    m.includes('ms-excel') ||
    m.includes('ms-powerpoint')
  ) {
    return 'document'
  }
  return 'other'
}

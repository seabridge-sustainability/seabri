/**
 * Minimal HTTP surface for the attachment store.
 *
 * Endpoints:
 *   POST   /attachments                — upload; body is raw bytes, Content-Type
 *                                        header is the blob's mime. Returns JSON
 *                                        { sha256, size, kind, deduped }.
 *   GET    /attachments                — list metadata (JSON array).
 *   GET    /attachments/<sha256>       — stream blob with its original mime.
 *   GET    /attachments/<sha256>/meta  — JSON metadata only.
 *
 * Auth:
 *   - When OPENSEABRI_ATTACHMENT_TOKEN is set, every request must send
 *     `Authorization: Bearer <token>`. Missing/wrong → 401.
 *   - Unset → localhost-only (caller's responsibility; the gateway already binds
 *     to loopback via GATEWAY_PORT).
 *
 * Payload cap: OPENSEABRI_ATTACHMENT_MAX_MB (default 20). Larger → 413.
 */

import type { IncomingMessage, ServerResponse } from 'http'
import { timingSafeEqual } from 'crypto'
import { basename } from 'path'
import { putBlob, getBlob, listAttachments, statBlob } from './store.js'

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf', 'text/plain', 'text/csv',
  'application/json',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'audio/mpeg', 'audio/wav', 'audio/ogg',
  'video/mp4', 'video/webm',
  'application/octet-stream',
])

const DEFAULT_MAX_MB = 20

function maxBytes(): number {
  const raw = parseInt(process.env.OPENSEABRI_ATTACHMENT_MAX_MB || '', 10)
  const mb = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MAX_MB
  return mb * 1024 * 1024
}

function authorized(req: IncomingMessage): boolean {
  const token = process.env.OPENSEABRI_ATTACHMENT_TOKEN
  if (!token) return true
  const header = req.headers['authorization']
  if (typeof header !== 'string') return false
  const expected = `Bearer ${token}`
  try {
    return timingSafeEqual(Buffer.from(header), Buffer.from(expected))
  } catch {
    return false
  }
}

function json(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload).toString(),
  })
  res.end(payload)
}

async function readBody(req: IncomingMessage, limit: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let total = 0
    req.on('data', (chunk: Buffer) => {
      total += chunk.length
      if (total > limit) {
        reject(Object.assign(new Error('Payload too large'), { status: 413 }))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

/**
 * Returns true when the request was handled (response sent). Returns false when
 * the path is not an attachments route so the outer router can 404 / pass on.
 */
export async function handleAttachmentRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const url = req.url || ''
  if (!url.startsWith('/attachments')) return false

  if (!authorized(req)) {
    json(res, 401, { error: 'unauthorized' })
    return true
  }

  const method = (req.method || 'GET').toUpperCase()
  const segments = url.split('?')[0].split('/').filter(Boolean) // ['attachments', '<sha>'?, 'meta'?]

  // POST /attachments
  if (method === 'POST' && segments.length === 1) {
    const rawMime = (req.headers['content-type'] as string | undefined) || 'application/octet-stream'
    const mimeType = ALLOWED_MIME_TYPES.has(rawMime) ? rawMime : 'application/octet-stream'
    const rawFilename = (req.headers['x-filename'] as string | undefined)
    const filename = rawFilename
      ? basename(rawFilename).replace(/[^\x20-\x7E]/g, '').slice(0, 255) || undefined
      : undefined
    const rawTags = (req.headers['x-tags'] as string | undefined) || ''
    const tags = rawTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    try {
      const buf = await readBody(req, maxBytes())
      if (buf.length === 0) {
        json(res, 400, { error: 'empty body' })
        return true
      }
      const result = await putBlob(buf, { mimeType, filename, tags })
      json(res, 201, result)
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status ?? 500
      const message = err instanceof Error ? err.message : String(err)
      json(res, status, { error: message })
    }
    return true
  }

  // GET /attachments
  if (method === 'GET' && segments.length === 1) {
    const all = await listAttachments()
    json(res, 200, all)
    return true
  }

  // GET /attachments/<sha>/meta
  if (method === 'GET' && segments.length === 3 && segments[2] === 'meta') {
    if (!/^[0-9a-f]{64}$/i.test(segments[1] ?? '')) {
      json(res, 400, { error: 'invalid sha256' })
      return true
    }
    const meta = await statBlob(segments[1])
    if (!meta) {
      json(res, 404, { error: 'not found' })
      return true
    }
    json(res, 200, meta)
    return true
  }

  // GET /attachments/<sha>
  if (method === 'GET' && segments.length === 2) {
    if (!/^[0-9a-f]{64}$/i.test(segments[1] ?? '')) {
      json(res, 400, { error: 'invalid sha256' })
      return true
    }
    const blob = await getBlob(segments[1])
    if (!blob) {
      json(res, 404, { error: 'not found' })
      return true
    }
    const safeMime = ALLOWED_MIME_TYPES.has(blob.meta.mimeType)
      ? blob.meta.mimeType
      : 'application/octet-stream'
    const safeFilename = blob.meta.filename
      ? `; filename="${blob.meta.filename.replace(/["\\\r\n]/g, '')}"`
      : ''
    res.writeHead(200, {
      'content-type': safeMime,
      'content-length': blob.meta.size.toString(),
      'content-disposition': `attachment${safeFilename}`,
      'x-content-type-options': 'nosniff',
      'cache-control': 'public, max-age=31536000, immutable',
      'x-attachment-sha256': blob.meta.sha256,
    })
    res.end(blob.buffer)
    return true
  }

  json(res, 405, { error: 'method not allowed' })
  return true
}

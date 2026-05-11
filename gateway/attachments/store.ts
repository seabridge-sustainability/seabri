/**
 * Content-addressable attachment store.
 *
 * Design:
 *   - Blobs are keyed by SHA-256 of their raw bytes → identical uploads dedupe
 *     automatically. The same image attached in WhatsApp, Discord and Telegram
 *     collapses into one on-disk file.
 *   - Layout:  <WORKSPACE>/attachments/<aa>/<sha256>         — blob
 *              <WORKSPACE>/attachments/index.json            — metadata catalog
 *     where <aa> is the first two hex chars of the digest (256-way fan-out).
 *   - The catalog is a flat JSON map sha256 → Attachment. It stays small (few
 *     hundred bytes per entry) and we only rewrite it on put/delete, never on
 *     read — so reads are filesystem-only and don't contend on the catalog.
 *
 * Concurrency: put/delete serialize through an in-process mutex. That's enough
 * because the gateway is a single Node process. A second writer (e.g. a CLI
 * tool) would race; if that becomes a concern, switch to a lockfile.
 */

import { createHash } from 'crypto'
import { mkdir, readFile, writeFile, stat, unlink } from 'fs/promises'
import { resolve, dirname } from 'path'
import { WORKSPACE_DIR } from '../config.js'
import { kindFor, type Attachment, type AttachmentKind } from './types.js'

const ATTACHMENTS_DIR = resolve(WORKSPACE_DIR, 'attachments')
const INDEX_FILE = resolve(ATTACHMENTS_DIR, 'index.json')

type IndexMap = Record<string, Attachment>

let catalogCache: IndexMap | null = null
let catalogLoadPromise: Promise<IndexMap> | null = null
let writeQueue: Promise<void> = Promise.resolve()

function blobPath(sha256: string): string {
  return resolve(ATTACHMENTS_DIR, sha256.slice(0, 2), sha256)
}

function hashBytes(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex')
}

async function loadCatalog(): Promise<IndexMap> {
  if (catalogCache) return catalogCache
  if (!catalogLoadPromise) {
    catalogLoadPromise = (async () => {
      try {
        const raw = await readFile(INDEX_FILE, 'utf-8')
        catalogCache = JSON.parse(raw) as IndexMap
      } catch {
        catalogCache = {}
      }
      catalogLoadPromise = null
      return catalogCache!
    })()
  }
  return catalogLoadPromise
}

async function persistCatalog(map: IndexMap): Promise<void> {
  await mkdir(dirname(INDEX_FILE), { recursive: true })
  await writeFile(INDEX_FILE, JSON.stringify(map, null, 2), 'utf-8')
  catalogCache = map
}

/** Serialize writers so two puts can't race on the catalog. */
function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(fn, fn)
  writeQueue = run.then(
    () => undefined,
    () => undefined
  )
  return run
}

export interface PutOptions {
  mimeType: string
  filename?: string
  tags?: string[]
}

export interface PutResult {
  sha256: string
  path: string
  size: number
  kind: AttachmentKind
  deduped: boolean
}

/**
 * Store bytes keyed by their SHA-256. Returns the digest plus the resolved path.
 * Duplicate puts are a no-op on the filesystem but still refresh tags/filename
 * so the newest context wins.
 */
export async function putBlob(buf: Buffer, opts: PutOptions): Promise<PutResult> {
  if (!Buffer.isBuffer(buf) || buf.length === 0) {
    throw new Error('putBlob: buffer is empty')
  }
  const sha256 = hashBytes(buf)
  const path = blobPath(sha256)
  const kind = kindFor(opts.mimeType)

  return withWriteLock(async () => {
    const catalog = await loadCatalog()
    let deduped = false

    try {
      await stat(path)
      deduped = true
    } catch {
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, buf)
    }

    const existing = catalog[sha256]
    const mergedTags = Array.from(
      new Set([...(existing?.tags ?? []), ...(opts.tags ?? [])])
    )
    catalog[sha256] = {
      sha256,
      mimeType: existing?.mimeType || opts.mimeType,
      size: buf.length,
      kind,
      createdAt: existing?.createdAt ?? Date.now(),
      tags: mergedTags.length ? mergedTags : undefined,
      filename: opts.filename || existing?.filename,
    }
    await persistCatalog(catalog)

    return { sha256, path, size: buf.length, kind, deduped }
  })
}

/** Return the blob bytes + metadata, or null when the digest is unknown. */
export async function getBlob(
  sha256: string
): Promise<{ buffer: Buffer; meta: Attachment } | null> {
  const meta = await statBlob(sha256)
  if (!meta) return null
  try {
    const buffer = await readFile(blobPath(sha256))
    return { buffer, meta }
  } catch {
    return null
  }
}

/** Metadata-only lookup — cheap, no disk read for the blob itself. */
export async function statBlob(sha256: string): Promise<Attachment | null> {
  const catalog = await loadCatalog()
  return catalog[sha256] ?? null
}

export async function listAttachments(): Promise<Attachment[]> {
  const catalog = await loadCatalog()
  return Object.values(catalog).sort((a, b) => b.createdAt - a.createdAt)
}

/** Remove a blob and its catalog entry. Returns true if anything was removed. */
export async function deleteBlob(sha256: string): Promise<boolean> {
  return withWriteLock(async () => {
    const catalog = await loadCatalog()
    const existed = Boolean(catalog[sha256])
    delete catalog[sha256]
    try {
      await unlink(blobPath(sha256))
    } catch {
      // Already gone — keep catalog clean either way.
    }
    await persistCatalog(catalog)
    return existed
  })
}

/** Inline reference for message history: `[attachment:<sha256> <mime> <size>B]`. */
export function attachmentRef(meta: Attachment): string {
  return `[attachment:${meta.sha256} ${meta.mimeType} ${meta.size}B]`
}

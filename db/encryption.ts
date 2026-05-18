import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGO = 'aes-256-gcm'
const IV_LEN = 12

// ── Key version constants ──────────────────────────────────────────────────
// V1 = original single-key scheme (env OPENSEABRI_DB_ENCRYPTION_KEY)
// V2 = new key scheme (env OPENSEABRI_DB_ENCRYPTION_KEY_V2); new writes use V2
//
// Blobs are prefixed with 'enc:v<N>:' so decryption can select the right key.
//
const ENC_PREFIX_V1 = 'enc:v1:'
const ENC_PREFIX_V2 = 'enc:v2:'

// Supported key versions in decryption order (newest first)
const KEY_VERSIONS = [2, 1] as const
export type KeyVersion = (typeof KEY_VERSIONS)[number]

// ── Key resolution ─────────────────────────────────────────────────────────

function getKeyForVersion(version: KeyVersion): Buffer | null {
  let hex: string | undefined
  if (version === 2) {
    // V2 key takes precedence; fall back to V1 key env name when V2 not set
    hex = process.env.OPENSEABRI_DB_ENCRYPTION_KEY_V2
  } else {
    // V1 — also accepted as the legacy OPENSEABRI_DB_ENCRYPTION_KEY
    hex = process.env.OPENSEABRI_DB_ENCRYPTION_KEY_V1 || process.env.OPENSEABRI_DB_ENCRYPTION_KEY
  }
  if (!hex) return null
  const buf = Buffer.from(hex, 'hex')
  if (buf.length !== 32) {
    throw new Error(
      `Encryption key for version ${version} must be 64 hex chars (32 bytes). ` +
        `Check OPENSEABRI_DB_ENCRYPTION_KEY${version > 1 ? `_V${version}` : ''}.`
    )
  }
  return buf
}

/** Returns the active write key and its version. New writes always use the highest available version. */
function getWriteKey(): { key: Buffer; version: KeyVersion } | null {
  for (const v of KEY_VERSIONS) {
    const key = getKeyForVersion(v)
    if (key) return { key, version: v }
  }
  return null
}

// ── Versioned prefix helpers ───────────────────────────────────────────────

function prefixForVersion(version: KeyVersion): string {
  return version === 1 ? ENC_PREFIX_V1 : ENC_PREFIX_V2
}

function detectVersion(enc: string): KeyVersion | null {
  if (enc.startsWith(ENC_PREFIX_V2)) return 2
  if (enc.startsWith(ENC_PREFIX_V1)) return 1
  return null
}

// ── Core cipher helpers ────────────────────────────────────────────────────

function encryptWithKey(plaintext: string, key: Buffer, version: KeyVersion): string {
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGO, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  const prefix = prefixForVersion(version)
  return `${prefix}${iv.toString('hex')}:${tag.toString('hex')}:${ciphertext.toString('hex')}`
}

function decryptWithKey(enc: string, key: Buffer, version: KeyVersion): unknown | null {
  const prefix = prefixForVersion(version)
  const parts = enc.slice(prefix.length).split(':')
  if (parts.length !== 3) return null
  const [ivHex, tagHex, ctHex] = parts
  try {
    const decipher = createDecipheriv(ALGO, key, Buffer.from(ivHex, 'hex'))
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ctHex, 'hex')),
      decipher.final(),
    ]).toString('utf8')
    return JSON.parse(plaintext)
  } catch {
    return null
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

/** Encrypt a JSON-serialisable value using the active write key. Returns null when no key is configured. */
export function encryptJsonb(data: unknown): string | null {
  const writeKey = getWriteKey()
  if (!writeKey) return null
  return encryptWithKey(JSON.stringify(data), writeKey.key, writeKey.version)
}

/**
 * Encrypt with an explicit key version.
 * Use this when you need to produce a specific-version blob (e.g. for testing rotation scripts).
 */
export function encryptWithVersion(data: unknown, version: KeyVersion): string {
  const key = getKeyForVersion(version)
  if (!key) throw new Error(`No key configured for version ${version}`)
  return encryptWithKey(JSON.stringify(data), key, version)
}

/** Decrypt a value produced by encryptJsonb or encryptWithVersion. Supports V1 and V2 blobs. */
export function decryptJsonb(enc: string): unknown | null {
  const version = detectVersion(enc)
  if (version === null) return null
  const key = getKeyForVersion(version)
  if (!key) return null // key not configured for this version
  return decryptWithKey(enc, key, version)
}

/**
 * Decrypt a blob and re-encrypt it with the current write key version.
 * Returns the new blob, or null when the input cannot be decrypted or no write key is set.
 * This is the low-level primitive used by the rotation migration script.
 */
export function reEncrypt(enc: string): string | null {
  const plainData = decryptJsonb(enc)
  if (plainData === null) return null
  return encryptJsonb(plainData)
}

/** Returns the key version stored in the blob prefix, or null if not recognisable. */
export function blobKeyVersion(enc: string): KeyVersion | null {
  return detectVersion(enc)
}

/** Returns true when the string looks like an encryptJsonb output (any version). */
export function isEncrypted(val: string | null | undefined): val is string {
  return typeof val === 'string' && (val.startsWith(ENC_PREFIX_V1) || val.startsWith(ENC_PREFIX_V2))
}

// ── Legacy single-key helper (backwards compat) ────────────────────────────

/**
 * @deprecated Use encryptJsonb() which auto-selects the active key version.
 * Kept for callers that import the original getKey() indirectly.
 */
export function getActiveKeyVersion(): KeyVersion | null {
  return getWriteKey()?.version ?? null
}

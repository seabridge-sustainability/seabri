import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGO = 'aes-256-gcm'
const IV_LEN = 12
const ENC_PREFIX = 'enc:v1:'

function getKey(): Buffer | null {
  const hex = process.env.OPENSEABRI_DB_ENCRYPTION_KEY
  if (!hex) return null
  const buf = Buffer.from(hex, 'hex')
  if (buf.length !== 32) throw new Error('OPENSEABRI_DB_ENCRYPTION_KEY must be 64 hex chars (32 bytes)')
  return buf
}

/** Encrypt a JSON-serialisable value. Returns null if OPENSEABRI_DB_ENCRYPTION_KEY is unset. */
export function encryptJsonb(data: unknown): string | null {
  const key = getKey()
  if (!key) return null
  const plaintext = JSON.stringify(data)
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGO, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${ENC_PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${ciphertext.toString('hex')}`
}

/** Decrypt a value produced by encryptJsonb. Returns null on missing key, missing prefix, or auth failure. */
export function decryptJsonb(enc: string): unknown | null {
  const key = getKey()
  if (!key || !enc.startsWith(ENC_PREFIX)) return null
  const parts = enc.slice(ENC_PREFIX.length).split(':')
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

/** Returns true when the string looks like an encryptJsonb output. */
export function isEncrypted(val: string | null | undefined): val is string {
  return typeof val === 'string' && val.startsWith(ENC_PREFIX)
}

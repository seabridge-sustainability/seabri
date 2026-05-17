import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { encryptJsonb, decryptJsonb, isEncrypted } from './encryption.js'

const VALID_KEY = 'a'.repeat(64) // 32 bytes of 0xaa as hex
const OTHER_KEY = 'b'.repeat(64)

function withKey(key: string | undefined, fn: () => void) {
  const saved = process.env.OPENSEABRI_DB_ENCRYPTION_KEY
  if (key === undefined) {
    delete process.env.OPENSEABRI_DB_ENCRYPTION_KEY
  } else {
    process.env.OPENSEABRI_DB_ENCRYPTION_KEY = key
  }
  try {
    fn()
  } finally {
    if (saved !== undefined) {
      process.env.OPENSEABRI_DB_ENCRYPTION_KEY = saved
    } else {
      delete process.env.OPENSEABRI_DB_ENCRYPTION_KEY
    }
  }
}

describe('encryptJsonb', () => {
  beforeEach(() => { delete process.env.OPENSEABRI_DB_ENCRYPTION_KEY })
  afterEach(() => { delete process.env.OPENSEABRI_DB_ENCRYPTION_KEY })

  it('returns null when OPENSEABRI_DB_ENCRYPTION_KEY is not set', () => {
    expect(encryptJsonb({ foo: 'bar' })).toBeNull()
  })

  it('returns a string starting with enc:v1: when key is set', () => {
    process.env.OPENSEABRI_DB_ENCRYPTION_KEY = VALID_KEY
    const result = encryptJsonb({ foo: 'bar' })
    expect(result).not.toBeNull()
    expect(result!.startsWith('enc:v1:')).toBe(true)
  })

  it('produces different ciphertexts on repeated calls (random IV)', () => {
    process.env.OPENSEABRI_DB_ENCRYPTION_KEY = VALID_KEY
    const a = encryptJsonb({ x: 1 })
    const b = encryptJsonb({ x: 1 })
    expect(a).not.toBe(b)
  })

  it('throws when key is not 64 hex chars', () => {
    process.env.OPENSEABRI_DB_ENCRYPTION_KEY = 'tooshort'
    expect(() => encryptJsonb({ x: 1 })).toThrow('64 hex chars')
  })

  it('encrypts various JSON types: object, array, string, number, null', () => {
    process.env.OPENSEABRI_DB_ENCRYPTION_KEY = VALID_KEY
    for (const val of [{ a: 1 }, [1, 2], 'hello', 42, null]) {
      const enc = encryptJsonb(val)
      expect(enc).not.toBeNull()
      expect(enc!.startsWith('enc:v1:')).toBe(true)
    }
  })
})

describe('decryptJsonb', () => {
  beforeEach(() => { delete process.env.OPENSEABRI_DB_ENCRYPTION_KEY })
  afterEach(() => { delete process.env.OPENSEABRI_DB_ENCRYPTION_KEY })

  it('returns null when key is not set', () => {
    expect(decryptJsonb('enc:v1:deadbeef:deadbeef:deadbeef')).toBeNull()
  })

  it('returns null when value does not start with enc:v1:', () => {
    process.env.OPENSEABRI_DB_ENCRYPTION_KEY = VALID_KEY
    expect(decryptJsonb('{"plain": "json"}')).toBeNull()
  })

  it('round-trips an object', () => {
    process.env.OPENSEABRI_DB_ENCRYPTION_KEY = VALID_KEY
    const original = { trigger: 'webhook', secret: 'tok_abc123', schedule: '0 9 * * *' }
    const enc = encryptJsonb(original)!
    const dec = decryptJsonb(enc)
    expect(dec).toEqual(original)
  })

  it('round-trips an array', () => {
    process.env.OPENSEABRI_DB_ENCRYPTION_KEY = VALID_KEY
    const original = [{ toolName: 'web_search', args: { query: 'PII test' } }]
    const enc = encryptJsonb(original)!
    expect(decryptJsonb(enc)).toEqual(original)
  })

  it('round-trips null value', () => {
    process.env.OPENSEABRI_DB_ENCRYPTION_KEY = VALID_KEY
    const enc = encryptJsonb(null)!
    expect(decryptJsonb(enc)).toBeNull()
  })

  it('returns null when decrypting with wrong key (auth tag mismatch)', () => {
    process.env.OPENSEABRI_DB_ENCRYPTION_KEY = VALID_KEY
    const enc = encryptJsonb({ secret: 'sensitive' })!
    process.env.OPENSEABRI_DB_ENCRYPTION_KEY = OTHER_KEY
    expect(decryptJsonb(enc)).toBeNull()
  })

  it('returns null for malformed enc string (wrong part count)', () => {
    process.env.OPENSEABRI_DB_ENCRYPTION_KEY = VALID_KEY
    expect(decryptJsonb('enc:v1:onlytwoparts')).toBeNull()
  })

  it('returns null for corrupted ciphertext', () => {
    process.env.OPENSEABRI_DB_ENCRYPTION_KEY = VALID_KEY
    const enc = encryptJsonb({ x: 1 })!
    const parts = enc.split(':')
    parts[parts.length - 1] = 'deadbeefdeadbeef'
    expect(decryptJsonb(parts.join(':'))).toBeNull()
  })
})

describe('isEncrypted', () => {
  it('returns true for enc:v1: prefixed strings', () => {
    expect(isEncrypted('enc:v1:abc:def:ghi')).toBe(true)
  })

  it('returns false for plain JSON strings', () => {
    expect(isEncrypted('{"foo":"bar"}')).toBe(false)
  })

  it('returns false for null', () => {
    expect(isEncrypted(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isEncrypted(undefined)).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isEncrypted('')).toBe(false)
  })

  it('round-trip produces isEncrypted=true', () => {
    withKey(VALID_KEY, () => {
      const enc = encryptJsonb({ tool: 'geocode', input: '123 Main St' })!
      expect(isEncrypted(enc)).toBe(true)
    })
  })
})

import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import { getDb, isDbConfigured } from '../db/client.js'
import { users } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto'

const JWT_SECRET_ENV = process.env.SEABRI_JWT_SECRET || ''
const TOKEN_EXPIRY = '7d'

function getSecret(): Uint8Array {
  if (!JWT_SECRET_ENV) throw new Error('SEABRI_JWT_SECRET must be set')
  return new TextEncoder().encode(JWT_SECRET_ENV)
}

const secret = getSecret()

const SCRYPT_KEYLEN = 64
const SCRYPT_COST = 16384
const SCRYPT_BLOCK_SIZE = 8
const SCRYPT_PARALLELIZATION = 1

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt ?? randomBytes(16).toString('hex')
  const derived = scryptSync(password, s, SCRYPT_KEYLEN, {
    cost: SCRYPT_COST,
    blockSize: SCRYPT_BLOCK_SIZE,
    parallelization: SCRYPT_PARALLELIZATION,
  })
  return { hash: `${s}:${derived.toString('hex')}`, salt: s }
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, expected] = stored.split(':')
  if (!salt || !expected) return false
  const { hash } = hashPassword(password, salt)
  const actual = hash.split(':')[1]!
  try {
    return timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'))
  } catch {
    return false
  }
}

export interface AuthUser {
  id: string
  email: string
  name: string | null
}

export interface AuthPayload extends JWTPayload {
  sub: string
  email: string
}

export async function signUp(email: string, password: string, name?: string): Promise<{ user: AuthUser; token: string }> {
  const db = getDb()
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (existing.length > 0) {
    throw new Error('Email already registered')
  }

  const { hash } = hashPassword(password)
  const [inserted] = await db.insert(users).values({
    email,
    name: name ?? null,
    passwordHash: hash,
  }).returning()

  const token = await createToken(inserted!.id, email)
  return {
    user: { id: inserted!.id, email: inserted!.email!, name: inserted!.name },
    token,
  }
}

export async function signIn(email: string, password: string): Promise<{ user: AuthUser; token: string }> {
  const db = getDb()
  const [found] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (!found || !found.passwordHash) {
    throw new Error('Invalid email or password')
  }

  if (!verifyPassword(password, found.passwordHash)) {
    throw new Error('Invalid email or password')
  }

  const token = await createToken(found.id, found.email!)
  return {
    user: { id: found.id, email: found.email!, name: found.name },
    token,
  }
}

async function createToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ email } as AuthPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(secret)
}

export async function verifyToken(token: string): Promise<AuthPayload> {
  const { payload } = await jwtVerify(token, secret)
  return payload as AuthPayload
}

export function isAuthConfigured(): boolean {
  return isDbConfigured()
}

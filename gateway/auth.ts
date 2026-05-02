import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import { getDb, isDbConfigured } from '../db/client.js'
import { users } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { createHash, randomBytes, timingSafeEqual } from 'crypto'

const JWT_SECRET_ENV = process.env.SEABRI_JWT_SECRET || ''
const TOKEN_EXPIRY = '7d'

function getSecret(): Uint8Array {
  const raw = JWT_SECRET_ENV || randomBytes(32).toString('hex')
  return new TextEncoder().encode(raw)
}

const secret = getSecret()

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt ?? randomBytes(16).toString('hex')
  const hash = createHash('sha256').update(password + s).digest('hex')
  return { hash: `${s}:${hash}`, salt: s }
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

import { readFile, writeFile, mkdir, readdir, unlink } from 'fs/promises'
import { resolve } from 'path'
import { asc, desc, eq } from 'drizzle-orm'
import { WORKSPACE_DIR } from '../config.js'
import { resolvePersistenceAdapter } from '../persistence/adapter.js'
import { getDb, schema } from '../../db/client.js'

const SESSIONS_DIR = resolve(WORKSPACE_DIR, 'sessions')

export interface Session {
  id: string
  name: string
  agentId: string
  personalityId?: string
  history: Array<{ role: string; content: string }>
  createdAt: number
  lastActiveAt: number
  compressed: boolean
  compressionSummary?: string
  turnCount: number
}

async function ensureSessionsDir(): Promise<void> {
  await mkdir(SESSIONS_DIR, { recursive: true })
}

const SESSION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function sessionPath(id: string): string {
  if (!SESSION_ID_RE.test(id)) throw new Error(`Invalid session id: ${id}`)
  return resolve(SESSIONS_DIR, `${id}.json`)
}

function useDatabaseSessionStore(): boolean {
  return resolvePersistenceAdapter().kind === 'database'
}

async function saveDatabaseSession(session: Session): Promise<void> {
  await getDb().insert(schema.sessions).values({
    id: session.id,
    agentId: session.agentId,
    name: session.name,
    personalityId: session.personalityId,
    compressed: session.compressed,
    compressionSummary: session.compressionSummary,
    turnCount: session.turnCount,
    createdAt: new Date(session.createdAt),
    lastActiveAt: new Date(session.lastActiveAt),
  }).onConflictDoUpdate({
    target: schema.sessions.id,
    set: {
      agentId: session.agentId,
      name: session.name,
      personalityId: session.personalityId,
      compressed: session.compressed,
      compressionSummary: session.compressionSummary,
      turnCount: session.turnCount,
      lastActiveAt: new Date(session.lastActiveAt),
    },
  })
  await getDb().delete(schema.messages).where(eq(schema.messages.sessionId, session.id))
  if (session.history.length > 0) {
    await getDb().insert(schema.messages).values(session.history.map((item, index) => ({
      sessionId: session.id,
      role: item.role,
      content: item.content,
      createdAt: new Date(session.createdAt + index),
    })))
  }
}

async function loadDatabaseSession(id: string): Promise<Session | null> {
  const rows = await getDb().select().from(schema.sessions).where(eq(schema.sessions.id, id)).limit(1)
  const row = rows[0]
  if (!row) return null
  const messages = await getDb().select().from(schema.messages).where(eq(schema.messages.sessionId, id)).orderBy(asc(schema.messages.createdAt))
  return {
    id: row.id,
    name: row.name,
    agentId: row.agentId,
    personalityId: row.personalityId ?? undefined,
    history: messages.map((msg) => ({ role: msg.role, content: msg.content })),
    createdAt: row.createdAt.getTime(),
    lastActiveAt: row.lastActiveAt.getTime(),
    compressed: row.compressed,
    compressionSummary: row.compressionSummary ?? undefined,
    turnCount: row.turnCount,
  }
}

export async function saveSession(session: Session): Promise<void> {
  if (useDatabaseSessionStore()) return saveDatabaseSession(session)
  await ensureSessionsDir()
  await writeFile(sessionPath(session.id), JSON.stringify(session, null, 2), 'utf-8')
}

export async function loadSession(id: string): Promise<Session | null> {
  if (useDatabaseSessionStore()) return loadDatabaseSession(id)
  try {
    const raw = await readFile(sessionPath(id), 'utf-8')
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

export async function deleteSession(id: string): Promise<void> {
  if (useDatabaseSessionStore()) {
    await getDb().delete(schema.sessions).where(eq(schema.sessions.id, id))
    return
  }
  try {
    await unlink(sessionPath(id))
  } catch {
    // Already gone
  }
}

export async function listSessions(): Promise<Session[]> {
  if (useDatabaseSessionStore()) {
    const rows = await getDb().select().from(schema.sessions).orderBy(desc(schema.sessions.lastActiveAt))
    const sessions = await Promise.all(rows.map((row) => loadDatabaseSession(row.id)))
    return sessions.filter((session): session is Session => Boolean(session))
  }
  await ensureSessionsDir()
  let files: string[]
  try {
    files = await readdir(SESSIONS_DIR)
  } catch {
    return []
  }

  const sessions: Session[] = []
  for (const file of files) {
    if (!file.endsWith('.json')) continue
    try {
      const raw = await readFile(resolve(SESSIONS_DIR, file), 'utf-8')
      sessions.push(JSON.parse(raw) as Session)
    } catch {
      // Corrupted session — skip
    }
  }

  return sessions.sort((a, b) => b.lastActiveAt - a.lastActiveAt)
}

export async function getRecentSession(agentId?: string): Promise<Session | null> {
  const sessions = await listSessions()
  if (agentId) {
    const match = sessions.find((s) => s.agentId === agentId)
    return match ?? null
  }
  return sessions[0] ?? null
}

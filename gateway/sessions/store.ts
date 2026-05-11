import { readFile, writeFile, mkdir, readdir, unlink } from 'fs/promises'
import { resolve } from 'path'
import { WORKSPACE_DIR } from '../config.js'

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

export async function saveSession(session: Session): Promise<void> {
  await ensureSessionsDir()
  await writeFile(sessionPath(session.id), JSON.stringify(session, null, 2), 'utf-8')
}

export async function loadSession(id: string): Promise<Session | null> {
  try {
    const raw = await readFile(sessionPath(id), 'utf-8')
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

export async function deleteSession(id: string): Promise<void> {
  try {
    await unlink(sessionPath(id))
  } catch {
    // Already gone
  }
}

export async function listSessions(): Promise<Session[]> {
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

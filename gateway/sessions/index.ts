import { v4 as uuidv4 } from 'uuid'
import {
  saveSession,
  loadSession,
  deleteSession,
  listSessions,
  getRecentSession,
  type Session,
} from './store.js'

export type { Session }

export async function createSession(agentId: string, name?: string): Promise<Session> {
  const id = uuidv4()
  const session: Session = {
    id,
    name: name ?? `Session ${new Date().toLocaleDateString()}`,
    agentId,
    history: [],
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
    compressed: false,
    turnCount: 0,
  }
  await saveSession(session)
  return session
}

export async function getOrCreateSession(
  agentId: string,
  sessionId?: string
): Promise<Session> {
  if (sessionId) {
    const existing = await loadSession(sessionId)
    if (existing) return existing
  }

  const recent = await getRecentSession(agentId)
  if (recent) return recent

  return createSession(agentId)
}

export async function updateSession(session: Session): Promise<void> {
  session.lastActiveAt = Date.now()
  await saveSession(session)
}

export async function resetSession(sessionId: string): Promise<Session | null> {
  const session = await loadSession(sessionId)
  if (!session) return null

  session.history = []
  session.compressed = false
  session.compressionSummary = undefined
  session.turnCount = 0
  session.lastActiveAt = Date.now()
  await saveSession(session)
  return session
}

export async function renameSession(sessionId: string, newName: string): Promise<boolean> {
  const session = await loadSession(sessionId)
  if (!session) return false

  session.name = newName
  await saveSession(session)
  return true
}

export { loadSession, deleteSession, listSessions, getRecentSession }

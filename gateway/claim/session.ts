import { randomUUID } from 'crypto'
import {
  makeEmptyPacket,
  type ClaimSession,
  type ClaimPacket,
  type TranscriptEntry,
} from './schemas.js'
import { evaluatePolicies } from './policies.js'

// In-memory session store — sessions expire after 24 hours.
// For production, swap for Redis with TTL.
const sessions = new Map<string, ClaimSession>()

const SESSION_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export function createSession(policyNumber: string): ClaimSession {
  const sessionId = randomUUID()
  const packet = makeEmptyPacket(sessionId)
  packet.policyNumber = policyNumber

  const session: ClaimSession = {
    packet,
    transcript: [],
    nextBestQuestion: null,
    routingRecommendation: 'standard',
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  }
  sessions.set(sessionId, session)
  return session
}

export function getSession(sessionId: string): ClaimSession | null {
  const session = sessions.get(sessionId)
  if (!session) return null
  if (new Date(session.expiresAt) < new Date()) {
    sessions.delete(sessionId)
    return null
  }
  return session
}

export function updateSession(
  sessionId: string,
  updatedPacket: ClaimPacket,
  agentReply: string,
  userMessage: string,
  nextBestQuestion: string
): ClaimSession | null {
  const session = getSession(sessionId)
  if (!session) return null

  const now = new Date().toISOString()

  const newTranscript: TranscriptEntry[] = [
    ...session.transcript,
    { role: 'claimant', content: userMessage, timestamp: now },
    { role: 'agent', content: agentReply, timestamp: now },
  ]

  const { routing } = evaluatePolicies(updatedPacket)

  const updated: ClaimSession = {
    packet: updatedPacket,
    transcript: newTranscript,
    nextBestQuestion,
    routingRecommendation: routing,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  }
  sessions.set(sessionId, updated)
  return updated
}

export function addOperatorNote(sessionId: string, note: string): ClaimSession | null {
  const session = getSession(sessionId)
  if (!session) return null

  const updatedPacket: ClaimPacket = { ...session.packet, adjusterNote: note }
  const updated: ClaimSession = { ...session, packet: updatedPacket }
  sessions.set(sessionId, updated)
  return updated
}

export function finalizeSession(
  sessionId: string,
  adjusterNote?: string
): ClaimSession | null {
  const session = getSession(sessionId)
  if (!session) return null

  const updatedPacket: ClaimPacket = {
    ...session.packet,
    status: 'pending_documents',
    completedAt: new Date().toISOString(),
    ...(adjusterNote ? { adjusterNote } : {}),
  }
  const updated: ClaimSession = { ...session, packet: updatedPacket }
  sessions.set(sessionId, updated)
  return updated
}

export function addOpeningTranscript(sessionId: string, openingMessage: string): ClaimSession | null {
  const session = sessions.get(sessionId)
  if (!session) return null
  const now = new Date().toISOString()
  const updated: ClaimSession = {
    ...session,
    transcript: [{ role: 'agent', content: openingMessage, timestamp: now }],
  }
  sessions.set(sessionId, updated)
  return updated
}

// Periodic cleanup (call from server startup)
export function startSessionCleanup(intervalMs = 60 * 60 * 1000): NodeJS.Timeout {
  return setInterval(() => {
    const now = new Date()
    for (const [id, session] of sessions.entries()) {
      if (new Date(session.expiresAt) < now) {
        sessions.delete(id)
      }
    }
  }, intervalMs)
}

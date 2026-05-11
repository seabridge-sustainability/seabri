import type { IncomingMessage, ServerResponse } from 'http'
import { timingSafeEqual } from 'crypto'
import { createSession, getSession, updateSession, addOperatorNote, finalizeSession, addOpeningTranscript } from './session.js'
import { runClaimTurn, generateOpeningMessage } from './workflow.js'
import { StartClaimRequestSchema, ClaimTurnRequestSchema, HandoffRequestSchema } from './schemas.js'

const MAX_BODY_BYTES = 1 * 1024 * 1024 // 1 MB

function corsOrigin(): string {
  return process.env.OPENSEABRI_CORS_ORIGIN || 'http://localhost:5173'
}

function json(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': corsOrigin(),
    'Content-Length': Buffer.byteLength(payload),
  })
  res.end(payload)
}

function isAuthorized(req: IncomingMessage): boolean {
  const apiKey = process.env.OPENSEABRI_API_KEY
  if (!apiKey) return false
  const header = req.headers['x-openseabri-key'] as string | undefined
  if (!header) return false
  try {
    return timingSafeEqual(Buffer.from(header), Buffer.from(apiKey))
  } catch {
    return false
  }
}

async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let total = 0
    req.on('data', (c: Buffer) => {
      total += c.length
      if (total > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Payload too large'), { status: 413 }))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

/**
 * Handle Insurance Claim API requests.
 * Returns true if the request matched a claim route, false otherwise.
 *
 * Routes:
 *   OPTIONS /api/claim/*                  — CORS preflight
 *   POST    /api/claim/start              — start a new FNOL session
 *   POST    /api/claim/turn               — send a conversational turn
 *   GET     /api/claim/:id               — retrieve session state
 *   POST    /api/claim/:id/handoff        — finalize and hand off to adjuster
 */
export async function handleClaimApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const url = req.url ?? ''
  const method = req.method ?? 'GET'

  if (!url.startsWith('/api/claim')) return false

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': corsOrigin(),
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-OpenSeaBri-Key',
    })
    res.end()
    return true
  }

  if (!isAuthorized(req)) {
    json(res, 401, { error: 'Unauthorized' })
    return true
  }

  // POST /api/claim/start
  if (method === 'POST' && url === '/api/claim/start') {
    let body: unknown
    try {
      body = JSON.parse(await readBody(req))
    } catch {
      json(res, 400, { error: 'Invalid JSON body' })
      return true
    }

    const parsed = StartClaimRequestSchema.safeParse(body)
    if (!parsed.success) {
      json(res, 400, { error: parsed.error.message })
      return true
    }

    const { policyNumber } = parsed.data
    const session = createSession(policyNumber)

    // Generate the agent's opening message
    let openingMessage: string
    try {
      openingMessage = await generateOpeningMessage(policyNumber)
    } catch (err) {
      openingMessage =
        "I'm sorry to hear something happened. Let's get your claim started right away. Can you briefly describe what occurred?"
    }

    // Persist opening message to the session store
    const withOpening = addOpeningTranscript(session.packet.sessionId, openingMessage)
    if (!withOpening) {
      json(res, 500, { error: 'Failed to initialize session transcript' })
      return true
    }

    json(res, 201, {
      sessionId: session.packet.sessionId,
      openingMessage,
      packet: session.packet,
      routingRecommendation: 'standard',
    })
    return true
  }

  // POST /api/claim/turn
  if (method === 'POST' && url === '/api/claim/turn') {
    let body: unknown
    try {
      body = JSON.parse(await readBody(req))
    } catch {
      json(res, 400, { error: 'Invalid JSON body' })
      return true
    }

    const parsed = ClaimTurnRequestSchema.safeParse(body)
    if (!parsed.success) {
      json(res, 400, { error: parsed.error.message })
      return true
    }

    const { sessionId, message } = parsed.data
    const session = getSession(sessionId)
    if (!session) {
      json(res, 404, { error: 'Session not found or expired' })
      return true
    }

    let turnResult: Awaited<ReturnType<typeof runClaimTurn>>
    try {
      turnResult = await runClaimTurn(session, message)
    } catch (err) {
      console.error('[claim/turn] workflow error', err)
      json(res, 500, { error: 'Claim workflow error' })
      return true
    }

    const updated = updateSession(
      sessionId,
      turnResult.updatedPacket,
      turnResult.agentReply,
      message,
      turnResult.nextBestQuestion
    )

    json(res, 200, {
      agentReply: turnResult.agentReply,
      packet: turnResult.updatedPacket,
      nextBestQuestion: turnResult.nextBestQuestion,
      routingRecommendation: updated?.routingRecommendation ?? 'standard',
      crisisDetected: turnResult.crisisDetected,
      catDetected: turnResult.catDetected,
    })
    return true
  }

  // GET /api/claim/:id
  const getMatch = url.match(/^\/api\/claim\/([^/]+)$/)
  if (method === 'GET' && getMatch) {
    const sessionId = getMatch[1]
    const session = getSession(sessionId)
    if (!session) {
      json(res, 404, { error: 'Session not found or expired' })
      return true
    }
    json(res, 200, session)
    return true
  }

  // POST /api/claim/:id/handoff
  const handoffMatch = url.match(/^\/api\/claim\/([^/]+)\/handoff$/)
  if (method === 'POST' && handoffMatch) {
    const sessionId = handoffMatch[1]

    let body: unknown = {}
    try {
      const raw = await readBody(req)
      if (raw.trim()) body = JSON.parse(raw)
    } catch {
      json(res, 400, { error: 'Invalid JSON body' })
      return true
    }

    const parsed = HandoffRequestSchema.safeParse({ sessionId, ...(body as object) })
    if (!parsed.success) {
      json(res, 400, { error: parsed.error.message })
      return true
    }

    const session = getSession(sessionId)
    if (!session) {
      json(res, 404, { error: 'Session not found or expired' })
      return true
    }

    const finalized = finalizeSession(sessionId, parsed.data.adjusterNote)
    json(res, 200, {
      message: 'Claim handed off successfully',
      packet: finalized?.packet,
      claimReference: `CLM-${sessionId.slice(0, 8).toUpperCase()}`,
    })
    return true
  }

  return false
}

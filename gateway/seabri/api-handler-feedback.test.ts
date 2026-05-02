import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createServer, type Server } from 'http'
import { handleSeabriApiRequest } from './api-handler.js'
import { clearFeedback } from './feedback.js'

function makeServer(): { server: Server; baseUrl: () => string } {
  const server = createServer(async (req, res) => {
    await handleSeabriApiRequest(req, res)
  })
  return {
    server,
    baseUrl: () => `http://localhost:${(server.address() as { port: number }).port}`,
  }
}

async function listen(server: Server): Promise<void> {
  return new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
}

async function close(server: Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()))
}

describe('feedback API endpoints', () => {
  let server: Server
  let baseUrl: () => string

  beforeEach(async () => {
    clearFeedback()
    ;({ server, baseUrl } = makeServer())
    await listen(server)
  })

  afterEach(async () => {
    await close(server)
  })

  it('POST /api/seabri/feedback returns 201 with entry', async () => {
    const res = await fetch(`${baseUrl()}/api/seabri/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'sess1', rating: 'up', agentId: 'climate-risk' }),
    })
    expect(res.status).toBe(201)
    const body = await res.json() as { id: string; rating: string; sessionId: string }
    expect(body.id).toMatch(/^fb_/)
    expect(body.rating).toBe('up')
    expect(body.sessionId).toBe('sess1')
  })

  it('POST /api/seabri/feedback 400 when sessionId missing', async () => {
    const res = await fetch(`${baseUrl()}/api/seabri/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 'up' }),
    })
    expect(res.status).toBe(400)
  })

  it('POST /api/seabri/feedback 400 when rating invalid', async () => {
    const res = await fetch(`${baseUrl()}/api/seabri/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 's1', rating: 'maybe' }),
    })
    expect(res.status).toBe(400)
  })

  it('GET /api/seabri/feedback/summary reflects submitted entries', async () => {
    await fetch(`${baseUrl()}/api/seabri/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 's1', rating: 'up' }),
    })
    await fetch(`${baseUrl()}/api/seabri/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 's2', rating: 'down' }),
    })
    const res = await fetch(`${baseUrl()}/api/seabri/feedback/summary`)
    expect(res.status).toBe(200)
    const body = await res.json() as { total: number; upvotes: number; downvotes: number }
    expect(body.total).toBe(2)
    expect(body.upvotes).toBe(1)
    expect(body.downvotes).toBe(1)
  })
})

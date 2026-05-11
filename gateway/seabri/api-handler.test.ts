import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createServer, type Server } from 'http'
import { handleSeabriApiRequest } from './api-handler.js'
import { registerBuiltinTools } from '../tools/register-builtin.js'

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

async function rawFetch(url: string, init?: RequestInit): Promise<Response> {
  const { request } = await import('http')
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const opts = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: (init?.method ?? 'GET').toUpperCase(),
      headers: init?.headers as Record<string, string> | undefined,
    }
    const req = request(opts, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => chunks.push(c))
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8')
        resolve(new Response(body, { status: res.statusCode ?? 500 }))
      })
    })
    req.on('error', reject)
    if (init?.body) req.write(init.body)
    req.end()
  })
}

describe('SeaBri core API', () => {
  let server: Server
  let baseUrl: () => string

  beforeEach(async () => {
    registerBuiltinTools()
    ;({ server, baseUrl } = makeServer())
    await listen(server)
  })

  afterEach(async () => {
    await close(server)
  })

  // ── Auth ──────────────────────────────────────────────────────────────

  it('returns 401 when no API key header is sent', async () => {
    const res = await rawFetch(`${baseUrl()}/api/seabri/agents`)
    expect(res.status).toBe(401)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 401 when wrong API key is sent', async () => {
    const res = await rawFetch(`${baseUrl()}/api/seabri/agents`, {
      headers: { 'x-openseabri-key': 'wrong-key' },
    })
    expect(res.status).toBe(401)
  })

  // ── Agents ────────────────────────────────────────────────────────────

  it('GET /api/seabri/agents returns agents array', async () => {
    const res = await fetch(`${baseUrl()}/api/seabri/agents`)
    expect(res.status).toBe(200)
    const body = await res.json() as { agents: unknown[] }
    expect(Array.isArray(body.agents)).toBe(true)
    expect(body.agents.length).toBeGreaterThan(0)
    const first = body.agents[0] as { id: string; name: string }
    expect(first).toHaveProperty('id')
    expect(first).toHaveProperty('name')
    expect(first).toHaveProperty('invocationSurfaces')
  })

  it('GET /api/seabri/agents/:id returns one agent', async () => {
    const res = await fetch(`${baseUrl()}/api/seabri/agents/general`)
    expect(res.status).toBe(200)
    const body = await res.json() as { agent: { id: string; type: string } }
    expect(body.agent.id).toBe('general')
    expect(body.agent.type).toBe('agent')
  })

  it('GET /api/seabri/agents/:id returns 404 for unknown agent', async () => {
    const res = await fetch(`${baseUrl()}/api/seabri/agents/nope`)
    expect(res.status).toBe(404)
  })

  it('registry visibility endpoints return sanitized read-only views', async () => {
    process.env.OPENSEABRI_API_KEY = 'super-secret-api-key-that-must-not-leak'
    process.env.SEABRI_WS_TOKEN = 'super-secret-ws-token-that-must-not-leak'
    process.env.OPENSEABRI_CANVAS_WS_TOKEN = 'super-secret-canvas-token-that-must-not-leak'
    const endpoints = [
      ['capabilities', 'capabilities'],
      ['skills', 'skills'],
      ['mcp', 'mcp'],
      ['tools', 'tools'],
    ] as const

    for (const [path, key] of endpoints) {
      const res = await fetch(`${baseUrl()}/api/seabri/${path}`)
      expect(res.status).toBe(200)
      const body = await res.json() as Record<string, unknown[]>
      expect(Array.isArray(body[key])).toBe(true)
      expect(body[key].length).toBeGreaterThan(0)
      const first = body[key][0] as Record<string, unknown>
      expect(first).toHaveProperty('id')
      expect(first).toHaveProperty('type')
      expect(first).toHaveProperty('status')
      expect(first).toHaveProperty('invocationSurfaces')
      expect(first).not.toHaveProperty('command')
      expect(first).not.toHaveProperty('env')
      const text = JSON.stringify(body)
      expect(text).not.toContain('super-secret-api-key-that-must-not-leak')
      expect(text).not.toContain('super-secret-ws-token-that-must-not-leak')
      expect(text).not.toContain('super-secret-canvas-token-that-must-not-leak')
    }
  })

  it('GET /api/seabri/registry-snapshot returns a versioned sanitized snapshot', async () => {
    process.env.OPENSEABRI_API_KEY = 'snapshot-secret-api-key'
    const res = await fetch(`${baseUrl()}/api/seabri/registry-snapshot`)
    expect(res.status).toBe(200)
    const body = await res.json() as {
      snapshot: {
        generatedAt: string
        version: string
        hash: string
        counts: Record<string, number>
        skills: unknown[]
        agents: unknown[]
      }
    }
    expect(body.snapshot.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(body.snapshot.version).toBeTruthy()
    expect(body.snapshot.hash).toMatch(/^[a-f0-9]{64}$/)
    expect(body.snapshot.counts.skills).toBe(body.snapshot.skills.length)
    expect(body.snapshot.counts.agents).toBe(body.snapshot.agents.length)
    expect(JSON.stringify(body)).not.toContain('snapshot-secret-api-key')
  })

  it('GET /api/seabri/admin/provider-readiness returns sanitized provider status', async () => {
    process.env.TWILIO_ACCOUNT_SID = 'AC-secret-account'
    process.env.TWILIO_AUTH_TOKEN = 'twilio-secret-token'
    process.env.TWILIO_FROM_NUMBER = '+15550001111'
    process.env.SEABRI_MESSAGES_ENABLED = 'true'
    process.env.SEABRI_MESSAGE_TEST_MODE = 'true'

    const res = await fetch(`${baseUrl()}/api/seabri/admin/provider-readiness`)
    expect(res.status).toBe(200)
    const body = await res.json() as { providers: Array<{ provider: string; canRunLiveTest: boolean }> }
    expect(body.providers.some((p) => p.provider === 'twilio_sms')).toBe(true)
    expect(body.providers.find((p) => p.provider === 'twilio_sms')?.canRunLiveTest).toBe(false)
    const text = JSON.stringify(body)
    expect(text).not.toContain('AC-secret-account')
    expect(text).not.toContain('twilio-secret-token')
  })

  it('POST /api/seabri/admin/provider-validate blocks unsafe live tests with client-safe errors', async () => {
    process.env.TWILIO_ACCOUNT_SID = 'AC-secret-account'
    process.env.TWILIO_AUTH_TOKEN = 'twilio-secret-token'
    process.env.TWILIO_FROM_NUMBER = '+15550001111'
    process.env.SEABRI_MESSAGES_ENABLED = 'true'
    process.env.SEABRI_MESSAGE_TEST_MODE = 'true'

    const res = await fetch(`${baseUrl()}/api/seabri/admin/provider-validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'twilio_sms',
        liveTestRequested: true,
        testTarget: '+15551234567',
      }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { results: Array<{ status: string; safeMessage: string }> }
    expect(body.results[0].status).toBe('blocked')
    expect(body.results[0].safeMessage).toMatch(/blocked|whitelisted|Live validation/i)
    expect(JSON.stringify(body)).not.toContain('twilio-secret-token')
  })

  it('POST /api/seabri/living-companion/incident returns a deterministic flood workflow', async () => {
    const res = await fetch(`${baseUrl()}/api/seabri/living-companion/incident`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'My bathroom is flooding.' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { handled: boolean; mode: string; response: string }
    expect(body.handled).toBe(true)
    expect(body.mode).toBe('incident')
    expect(body.response).toContain('IMMEDIATE STEPS')
    expect(body.response.split('\n').length).toBeLessThanOrEqual(8)
  })

  it('POST /api/seabri/living-companion/incident validates bad input safely', async () => {
    const res = await fetch(`${baseUrl()}/api/seabri/living-companion/incident`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '' }),
    })
    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).not.toContain('Internal')
  })

  // ── Models ────────────────────────────────────────────────────────────

  it('GET /api/seabri/models returns models array', async () => {
    const res = await fetch(`${baseUrl()}/api/seabri/models`)
    expect(res.status).toBe(200)
    const body = await res.json() as { models: unknown[] }
    expect(Array.isArray(body.models)).toBe(true)
    expect(body.models.length).toBeGreaterThan(0)
    const first = body.models[0] as { id: string; tier: string }
    expect(first).toHaveProperty('id')
    expect(first).toHaveProperty('tier')
  })

  // ── Route ─────────────────────────────────────────────────────────────

  it('POST /api/seabri/route returns routing decision', async () => {
    const res = await fetch(`${baseUrl()}/api/seabri/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'What is my flood risk?' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { agentId: string; modelId: string }
    expect(body).toHaveProperty('agentId')
    expect(body).toHaveProperty('modelId')
  })

  it('POST /api/seabri/route 400 when task missing', async () => {
    const res = await fetch(`${baseUrl()}/api/seabri/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toContain('task')
  })

  it('POST /api/seabri/route 400 on invalid JSON', async () => {
    const res = await fetch(`${baseUrl()}/api/seabri/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    })
    expect(res.status).toBe(400)
  })

  it('POST /api/seabri/route 400 for invalid body types without a 500', async () => {
    const res = await fetch(`${baseUrl()}/api/seabri/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 123, unexpected: 'ignored safely' }),
    })
    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).not.toContain('Internal')
  })

  // ── Telemetry ─────────────────────────────────────────────────────────

  it('GET /api/seabri/telemetry returns snapshot', async () => {
    const res = await fetch(`${baseUrl()}/api/seabri/telemetry`)
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('aggregated')
  })

  // ── Carbon budget ─────────────────────────────────────────────────────

  it('GET /api/seabri/carbon/budget returns budget and alert', async () => {
    const res = await fetch(`${baseUrl()}/api/seabri/carbon/budget`)
    expect(res.status).toBe(200)
    const body = await res.json() as { budget: unknown; alert: unknown }
    expect(body).toHaveProperty('budget')
    expect(body).toHaveProperty('alert')
  })

  // ── Unknown route ─────────────────────────────────────────────────────

  it('returns 404 for unknown /api/seabri/* route', async () => {
    const res = await fetch(`${baseUrl()}/api/seabri/nonexistent`)
    expect(res.status).toBe(404)
    const body = await res.json() as { error: string }
    expect(body.error).toContain('No SeaBri route')
  })
})

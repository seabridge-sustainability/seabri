import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createServer, type Server } from 'http'
import { handleSeabriApiRequest } from './api-handler.js'
import { clearWorkflows } from './workflow-store.js'
import { pluginRegistry } from './plugin-registry-singleton.js'

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

describe('Sprint 3 API — tools, plugins, workflows, telemetry history', () => {
  let server: Server
  let baseUrl: () => string

  beforeEach(async () => {
    clearWorkflows()
    // Clear plugin registry between tests (unregister any previously registered plugins)
    for (const p of pluginRegistry.list()) pluginRegistry.unregister(p.id)
    ;({ server, baseUrl } = makeServer())
    await listen(server)
  })

  afterEach(async () => {
    await close(server)
  })

  // ── Tools ─────────────────────────────────────────────────────────────────

  it('GET /api/seabri/tools returns array', async () => {
    const res = await fetch(`${baseUrl()}/api/seabri/tools`)
    expect(res.status).toBe(200)
    const body = await res.json() as { tools: unknown[] }
    expect(Array.isArray(body.tools)).toBe(true)
  })

  // ── Plugins ───────────────────────────────────────────────────────────────

  it('GET /api/seabri/plugins returns empty array initially', async () => {
    const res = await fetch(`${baseUrl()}/api/seabri/plugins`)
    expect(res.status).toBe(200)
    const body = await res.json() as { plugins: unknown[] }
    expect(body.plugins).toEqual([])
  })

  it('POST /api/seabri/plugins registers a plugin and GET lists it', async () => {
    const manifest = {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      type: 'tool',
      capabilities: ['search'],
      entrypoint: './test-plugin.js',
    }
    const postRes = await fetch(`${baseUrl()}/api/seabri/plugins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(manifest),
    })
    expect(postRes.status).toBe(201)

    const getRes = await fetch(`${baseUrl()}/api/seabri/plugins`)
    const body = await getRes.json() as { plugins: Array<{ id: string }> }
    expect(body.plugins.some((p) => p.id === 'test-plugin')).toBe(true)
  })

  it('POST /api/seabri/plugins 400 on invalid manifest', async () => {
    const res = await fetch(`${baseUrl()}/api/seabri/plugins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'bad' }), // missing required fields
    })
    expect(res.status).toBe(400)
  })

  // ── Workflows ─────────────────────────────────────────────────────────────

  it('GET /api/seabri/workflows returns empty array initially', async () => {
    const res = await fetch(`${baseUrl()}/api/seabri/workflows`)
    expect(res.status).toBe(200)
    const body = await res.json() as { workflows: unknown[] }
    expect(body.workflows).toEqual([])
  })

  it('POST /api/seabri/workflows registers a workflow', async () => {
    const def = {
      version: 1,
      name: 'my-workflow',
      description: 'A test workflow',
      steps: [
        { id: 's1', type: 'agent', name: 'Ask agent', agentId: 'climate-risk', prompt: 'Hello' },
      ],
    }
    const res = await fetch(`${baseUrl()}/api/seabri/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(def),
    })
    expect(res.status).toBe(201)
    const body = await res.json() as { name: string; stepCount: number }
    expect(body.name).toBe('my-workflow')
    expect(body.stepCount).toBe(1)
  })

  it('POST /api/seabri/workflows 400 on invalid definition', async () => {
    const res = await fetch(`${baseUrl()}/api/seabri/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: 1, steps: [] }), // missing name + empty steps
    })
    expect(res.status).toBe(400)
  })

  it('POST /api/seabri/workflows/:name/run 404 for unknown workflow', async () => {
    const res = await fetch(`${baseUrl()}/api/seabri/workflows/nonexistent/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(404)
  })

  it('listed workflows include registered entries', async () => {
    const def = {
      version: 1,
      name: 'listed-wf',
      steps: [{ id: 's1', type: 'agent', name: 'x', agentId: 'climate-risk', prompt: 'p' }],
    }
    await fetch(`${baseUrl()}/api/seabri/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(def),
    })
    const res = await fetch(`${baseUrl()}/api/seabri/workflows`)
    const body = await res.json() as { workflows: Array<{ name: string }> }
    expect(body.workflows.some((w) => w.name === 'listed-wf')).toBe(true)
  })

  // ── Telemetry history ─────────────────────────────────────────────────────

  it('GET /api/seabri/telemetry/history returns history array', async () => {
    const res = await fetch(`${baseUrl()}/api/seabri/telemetry/history`)
    expect(res.status).toBe(200)
    const body = await res.json() as { history: unknown[] }
    expect(Array.isArray(body.history)).toBe(true)
  })

  it('GET /api/seabri/telemetry/history accepts days query param', async () => {
    const res = await fetch(`${baseUrl()}/api/seabri/telemetry/history?days=3`)
    expect(res.status).toBe(200)
    const body = await res.json() as { history: unknown[] }
    expect(body.history.length).toBeLessThanOrEqual(3)
  })
})

import { describe, it, expect } from 'vitest'
import {
  buildApiRouter,
  type ApiHandler,
  type ApiRequest,
  type ApiResponse,
  type RouteDefinition,
} from './routes.js'

// Lightweight in-process request/response harness — no HTTP server needed
function makeReq(overrides: Partial<ApiRequest> = {}): ApiRequest {
  return {
    method: 'GET',
    path: '/',
    headers: {},
    body: undefined,
    params: {},
    query: {},
    ...overrides,
  }
}

describe('buildApiRouter', () => {
  it('returns 404 for unknown routes', async () => {
    const router = buildApiRouter([])
    const res = await router.handle(makeReq({ method: 'GET', path: '/unknown' }))
    expect(res.status).toBe(404)
  })

  it('dispatches a GET route', async () => {
    const handler: ApiHandler = async () => ({ status: 200, body: { ok: true } })
    const routes: RouteDefinition[] = [{ method: 'GET', path: '/health', handler }]
    const router = buildApiRouter(routes)
    const res = await router.handle(makeReq({ method: 'GET', path: '/health' }))
    expect(res.status).toBe(200)
    expect((res.body as any).ok).toBe(true)
  })

  it('dispatches a POST route', async () => {
    const handler: ApiHandler = async (req) => ({
      status: 201,
      body: { received: req.body },
    })
    const routes: RouteDefinition[] = [{ method: 'POST', path: '/chat', handler }]
    const router = buildApiRouter(routes)
    const res = await router.handle(makeReq({ method: 'POST', path: '/chat', body: { message: 'hi' } }))
    expect(res.status).toBe(201)
    expect((res.body as any).received).toEqual({ message: 'hi' })
  })

  it('extracts path parameters', async () => {
    const handler: ApiHandler = async (req) => ({
      status: 200,
      body: { id: req.params.id },
    })
    const routes: RouteDefinition[] = [{ method: 'GET', path: '/workflows/:id', handler }]
    const router = buildApiRouter(routes)
    const res = await router.handle(makeReq({ method: 'GET', path: '/workflows/abc123' }))
    expect(res.status).toBe(200)
    expect((res.body as any).id).toBe('abc123')
  })

  it('returns 405 when path matches but method does not', async () => {
    const handler: ApiHandler = async () => ({ status: 200, body: {} })
    const routes: RouteDefinition[] = [{ method: 'GET', path: '/items', handler }]
    const router = buildApiRouter(routes)
    const res = await router.handle(makeReq({ method: 'DELETE', path: '/items' }))
    expect(res.status).toBe(405)
  })

  it('handles async errors by returning 500', async () => {
    const handler: ApiHandler = async () => { throw new Error('boom') }
    const routes: RouteDefinition[] = [{ method: 'GET', path: '/error', handler }]
    const router = buildApiRouter(routes)
    const res = await router.handle(makeReq({ method: 'GET', path: '/error' }))
    expect(res.status).toBe(500)
    expect((res.body as any).error).toContain('boom')
  })

  it('lists all registered routes', () => {
    const handler: ApiHandler = async () => ({ status: 200, body: {} })
    const routes: RouteDefinition[] = [
      { method: 'GET', path: '/agents', handler },
      { method: 'POST', path: '/chat', handler },
    ]
    const router = buildApiRouter(routes)
    const listed = router.routes()
    expect(listed).toHaveLength(2)
    expect(listed.map((r) => r.path)).toContain('/agents')
    expect(listed.map((r) => r.path)).toContain('/chat')
  })

  it('matches exact paths before parameterised paths', async () => {
    const exactHandler: ApiHandler = async () => ({ status: 200, body: { match: 'exact' } })
    const paramHandler: ApiHandler = async () => ({ status: 200, body: { match: 'param' } })
    const routes: RouteDefinition[] = [
      { method: 'GET', path: '/workflows/:id', handler: paramHandler },
      { method: 'GET', path: '/workflows/stats', handler: exactHandler },
    ]
    const router = buildApiRouter(routes)
    const res = await router.handle(makeReq({ method: 'GET', path: '/workflows/stats' }))
    expect((res.body as any).match).toBe('exact')
  })
})

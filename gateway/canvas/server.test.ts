import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Handler = (...args: unknown[]) => void

class FakeClient {
  readyState = 1
  sent: string[] = []
  listeners = new Map<string, Handler[]>()
  send(data: string) {
    this.sent.push(data)
  }
  on(event: string, handler: Handler) {
    const list = this.listeners.get(event) ?? []
    list.push(handler)
    this.listeners.set(event, list)
  }
  close() {
    this.readyState = 3
  }
}

class FakeServer {
  clients = new Set<FakeClient>()
  handlers = new Map<string, Handler[]>()
  constructor(public opts: { port: number }) {}
  on(event: string, handler: Handler) {
    const list = this.handlers.get(event) ?? []
    list.push(handler)
    this.handlers.set(event, list)
  }
  close(cb?: () => void) {
    this.clients.clear()
    cb?.()
  }
  emit(event: string, ...args: unknown[]) {
    for (const handler of this.handlers.get(event) ?? []) handler(...args)
  }
  emitConnection(client: FakeClient, url = '/') {
    this.clients.add(client)
    this.emit('connection', client, { url })
  }
}

let lastServer: FakeServer | null = null
const ORIGINAL_NODE_ENV = process.env.NODE_ENV

vi.mock('../channels/base.js', () => ({
  tryImport: async () => ({
    WebSocketServer: class {
      constructor(opts: { port: number }) {
        const s = new FakeServer(opts)
        lastServer = s
        return s as unknown as FakeServer
      }
    },
  }),
}))

beforeEach(() => {
  lastServer = null
  process.env.OPENSEABRI_CANVAS_WS_PORT = '18799'
  vi.resetModules()
})

afterEach(async () => {
  const mod = await import('./server.js')
  await mod.stopCanvasServer()
  delete process.env.OPENSEABRI_CANVAS_WS_PORT
  delete process.env.OPENSEABRI_CANVAS_WS_TOKEN
  if (ORIGINAL_NODE_ENV === undefined) delete process.env.NODE_ENV
  else process.env.NODE_ENV = ORIGINAL_NODE_ENV
})

describe('canvas server', () => {
  it('no-ops when port env var unset', async () => {
    delete process.env.OPENSEABRI_CANVAS_WS_PORT
    const { startCanvasServer, broadcast } = await import('./server.js')
    await startCanvasServer()
    expect(lastServer).toBeNull()
    broadcast({ type: 'status', status: 'x' })
  })

  it('starts server, sends hello on connection, broadcasts to open clients', async () => {
    const { startCanvasServer, broadcast } = await import('./server.js')
    await startCanvasServer()
    expect(lastServer).not.toBeNull()

    const client = new FakeClient()
    lastServer!.emitConnection(client)
    expect(client.sent[0]).toContain('"status":"connected"')

    broadcast({ type: 'status', status: 'live' })
    expect(client.sent.at(-1)).toContain('"status":"live"')
  })

  it('rejects clients without the canvas token when configured', async () => {
    process.env.OPENSEABRI_CANVAS_WS_TOKEN = 'canvas-test-token'
    const { startCanvasServer } = await import('./server.js')
    await startCanvasServer()

    const client = new FakeClient()
    lastServer!.emitConnection(client, '/?token=wrong')

    expect(client.readyState).toBe(3)
    expect(client.sent).toHaveLength(0)
  })

  it('fails closed without a canvas token in production', async () => {
    process.env.NODE_ENV = 'production'
    const { startCanvasServer } = await import('./server.js')
    await startCanvasServer()

    const client = new FakeClient()
    lastServer!.emitConnection(client)

    expect(client.readyState).toBe(3)
    expect(client.sent).toHaveLength(0)
  })

  it('skips clients that are not in OPEN state', async () => {
    const { startCanvasServer, broadcast } = await import('./server.js')
    await startCanvasServer()
    const open = new FakeClient()
    const closed = new FakeClient()
    closed.readyState = 3
    lastServer!.emitConnection(open)
    lastServer!.emitConnection(closed)
    open.sent = []
    closed.sent = []
    broadcast({ type: 'status', status: 'live' })
    expect(open.sent).toHaveLength(1)
    expect(closed.sent).toHaveLength(0)
  })

  it('stopCanvasServer resolves and clears state', async () => {
    const { startCanvasServer, stopCanvasServer, broadcast } = await import('./server.js')
    await startCanvasServer()
    await stopCanvasServer()
    broadcast({ type: 'status', status: 'post' })
  })

  it('handles async server errors without crashing later broadcasts', async () => {
    const { startCanvasServer, broadcast } = await import('./server.js')
    await startCanvasServer()
    expect(lastServer).not.toBeNull()

    lastServer!.emit('error', Object.assign(new Error('listen EADDRINUSE'), { code: 'EADDRINUSE' }))

    expect(() => broadcast({ type: 'status', status: 'post-error' })).not.toThrow()
  })
})

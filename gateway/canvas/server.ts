/**
 * Canvas WebSocket server — minimal A2UI / Live Canvas broadcast hub.
 *
 * Agents push CanvasEvent frames via `broadcast(event)` during routeMessage
 * execution; connected SPA clients (see openseabri/src/components/canvas/
 * CanvasPane.tsx) receive them and render streamed sustainability blocks.
 *
 * Gated by OPENSEABRI_CANVAS_WS_PORT — when unset, startCanvasServer() is a
 * graceful no-op, matching the whatsapp.ts / discord.ts fallback pattern.
 * The `ws` package is loaded via tryImport so a missing dep degrades cleanly.
 */

import { tryImport } from '../channels/base.js'

export type ComplianceTag =
  | 'ISSB'
  | 'ESRS'
  | 'TNFD'
  | 'SBTi'
  | 'CSRD'
  | 'GRI'
  | 'CDP'
  | 'TCFD'
  | 'SFDR'
  | 'SEC'
  | 'GHG_PROTOCOL'
  | 'GENERAL'

export interface CanvasTextBlock {
  kind: 'text'
  id: string
  title?: string
  body: string
  tags?: ComplianceTag[]
}

export interface CanvasChartBlock {
  kind: 'chart'
  id: string
  title: string
  unit?: string
  series: { label: string; value: number }[]
  tags?: ComplianceTag[]
}

export interface CanvasTableBlock {
  kind: 'table'
  id: string
  title: string
  columns: string[]
  rows: (string | number)[][]
  tags?: ComplianceTag[]
}

export interface CanvasCitationsBlock {
  kind: 'citations'
  id: string
  title?: string
  sources: { label: string; url?: string; note?: string }[]
}

export type CanvasBlock =
  | CanvasTextBlock
  | CanvasChartBlock
  | CanvasTableBlock
  | CanvasCitationsBlock

export interface CanvasEvent {
  type: 'block' | 'clear' | 'status'
  sessionId?: string
  block?: CanvasBlock
  status?: string
}

interface MinimalWsClient {
  readyState: number
  send(data: string): void
  on(event: string, handler: (...args: unknown[]) => void): void
  close(): void
}

interface MinimalWsServer {
  on(event: string, handler: (client: MinimalWsClient) => void): void
  clients: Set<MinimalWsClient>
  close(cb?: () => void): void
}

interface WsModule {
  WebSocketServer: new (opts: { port: number }) => MinimalWsServer
  default?: { WebSocketServer: new (opts: { port: number }) => MinimalWsServer }
}

const CHANNEL_ID = 'canvas'
const OPEN_STATE = 1

let server: MinimalWsServer | null = null

function resolvePort(): number | null {
  const raw = process.env.OPENSEABRI_CANVAS_WS_PORT
  if (!raw) return null
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n <= 0 || n > 65535) return null
  return n
}

export async function startCanvasServer(): Promise<void> {
  const port = resolvePort()
  if (port === null) {
    console.log('[canvas] OPENSEABRI_CANVAS_WS_PORT not set — canvas WS server not started.')
    return
  }

  const mod = await tryImport<WsModule>('ws', CHANNEL_ID)
  if (!mod) return

  const Ctor = mod.WebSocketServer ?? mod.default?.WebSocketServer
  if (!Ctor) {
    console.warn('[canvas] ws package did not expose WebSocketServer — not started.')
    return
  }

  try {
    server = new Ctor({ port })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn(`[canvas] failed to bind port ${port}: ${message}`)
    return
  }

  server.on('connection', (client) => {
    const hello: CanvasEvent = { type: 'status', status: 'connected' }
    try {
      client.send(JSON.stringify(hello))
    } catch {
      // non-fatal
    }
  })

  console.log(`[canvas] WebSocket server listening on ws://127.0.0.1:${port}`)
}

export function broadcast(event: CanvasEvent): void {
  if (!server) return
  const payload = JSON.stringify(event)
  for (const client of server.clients) {
    if (client.readyState !== OPEN_STATE) continue
    try {
      client.send(payload)
    } catch {
      // per-client failure is non-fatal
    }
  }
}

export async function stopCanvasServer(): Promise<void> {
  if (!server) return
  await new Promise<void>((resolve) => server!.close(() => resolve()))
  server = null
}

import WebSocket from 'ws'
import { config } from 'dotenv'

config({ path: '.env.production' })
config({ path: '.env' })

const baseUrl = (process.env.OPENSEABRI_BASE_URL || `http://127.0.0.1:${process.env.GATEWAY_PORT || '18790'}`).replace(/\/$/, '')
const apiKey = process.env.OPENSEABRI_API_KEY || ''
const wsUrl = (process.env.OPENSEABRI_WS_URL || baseUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')).replace(/\/$/, '')
const wsToken = process.env.SEABRI_WS_TOKEN || ''
const canvasUrl = (process.env.OPENSEABRI_CANVAS_WS_URL || '').replace(/\/$/, '')
const canvasToken = process.env.OPENSEABRI_CANVAS_WS_TOKEN || ''

function fail(message: string): never {
  console.error(`[check:operational] FAIL: ${message}`)
  process.exit(1)
}

async function fetchJson(path: string, auth = false, init?: RequestInit): Promise<unknown> {
  const headers: Record<string, string> = { ...(init?.headers as Record<string, string> | undefined) }
  if (auth) headers['x-openseabri-key'] = apiKey
  const res = await fetch(`${baseUrl}${path}`, { ...init, headers })
  if (!res.ok) throw new Error(`${path} returned HTTP ${res.status}`)
  return res.json()
}

async function wsSmoke(): Promise<void> {
  if (!wsToken) {
    console.log('[check:operational] websocket: SKIP (SEABRI_WS_TOKEN not set)')
    return
  }
  await new Promise<void>((resolve, reject) => {
    const ws = new WebSocket(`${wsUrl}?token=${encodeURIComponent(wsToken)}`)
    const timer = setTimeout(() => {
      ws.close()
      reject(new Error('websocket smoke timed out'))
    }, 10_000)
    ws.on('open', () => ws.send(JSON.stringify({ type: 'init', agentId: 'general', sessionId: 'operational-smoke' })))
    ws.on('message', (raw) => {
      const msg = JSON.parse(String(raw)) as { type?: string }
      if (msg.type === 'ready') ws.send(JSON.stringify({ type: 'chat', content: '/status' }))
      if (msg.type === 'done') {
        clearTimeout(timer)
        ws.close()
        resolve()
      }
    })
    ws.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
  })
  console.log('[check:operational] websocket/slash: PASS')
}

async function canvasSmoke(): Promise<void> {
  if (!canvasUrl || !canvasToken) {
    console.log('[check:operational] canvas: SKIP (OPENSEABRI_CANVAS_WS_URL or OPENSEABRI_CANVAS_WS_TOKEN not set)')
    return
  }
  await new Promise<void>((resolve, reject) => {
    const ws = new WebSocket(`${canvasUrl}?token=${encodeURIComponent(canvasToken)}`)
    const timer = setTimeout(() => {
      ws.close()
      reject(new Error('canvas smoke timed out'))
    }, 10_000)
    ws.on('message', (raw) => {
      const msg = JSON.parse(String(raw)) as { type?: string; status?: string }
      if (msg.type === 'status' && msg.status === 'connected') {
        clearTimeout(timer)
        ws.close()
        resolve()
      }
    })
    ws.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
  })
  console.log('[check:operational] canvas: PASS')
}

async function main(): Promise<void> {
  if (!apiKey) fail('OPENSEABRI_API_KEY is required for operational smoke')
  console.log(`[check:operational] base URL: ${baseUrl}`)

  await fetchJson('/health')
  console.log('[check:operational] health: PASS')

  const snapshot = await fetchJson('/api/seabri/registry-snapshot', true) as {
    snapshot?: { hash?: string; counts?: Record<string, number> }
  }
  if (!snapshot.snapshot?.hash) fail('registry snapshot hash missing')
  console.log('[check:operational] registry snapshot: PASS')

  const readiness = await fetchJson('/api/seabri/admin/provider-readiness', true) as { providers?: unknown[] }
  if (!Array.isArray(readiness.providers) || readiness.providers.length === 0) fail('provider readiness returned no providers')
  console.log(`[check:operational] provider readiness: PASS providers=${readiness.providers.length}`)

  await fetchJson('/api/seabri/admin/provider-validation-evidence', true)
  console.log('[check:operational] provider validation evidence: PASS')

  const incident = await fetchJson('/api/seabri/living-companion/incident', true, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: 'My bathroom is flooding.', sessionId: 'operational-smoke' }),
  }) as { handled?: boolean; response?: unknown; actionPlan?: unknown }
  if (!incident.handled || (!incident.response && !incident.actionPlan)) fail('safe incident endpoint returned no actionable incident result')
  console.log('[check:operational] safe demo endpoint: PASS')

  const responseText = JSON.stringify({ readiness, snapshot })
  for (const secret of [apiKey, wsToken, canvasToken].filter(Boolean)) {
    if (responseText.includes(secret)) fail('secret leaked in operational smoke response')
  }

  if (process.env.OPENSEABRI_SKIP_WS_SMOKE === 'true') {
    console.log('[check:operational] websocket smoke: SKIPPED (OPENSEABRI_SKIP_WS_SMOKE=true)')
  } else {
    await wsSmoke()
  }
  await canvasSmoke()
  console.log('[check:operational] PASS')
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error))
})

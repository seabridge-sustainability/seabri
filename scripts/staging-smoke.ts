import WebSocket from 'ws'

const origin = (process.env.OPENSEABRI_STAGING_ORIGIN || `http://127.0.0.1:${process.env.GATEWAY_PORT || '18790'}`).replace(/\/$/, '')
const apiKey = process.env.OPENSEABRI_API_KEY || ''
const wsToken = process.env.SEABRI_WS_TOKEN || ''
const wsUrl = (process.env.OPENSEABRI_STAGING_WS_URL || origin.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')).replace(/\/$/, '')
const canvasUrl = (process.env.OPENSEABRI_STAGING_CANVAS_WS_URL || '').replace(/\/$/, '')
const canvasToken = process.env.OPENSEABRI_CANVAS_WS_TOKEN || ''

function requireValue(name: string, value: string): void {
  if (!value) {
    throw new Error(`${name} is required for staging smoke`)
  }
}

async function fetchJson(path: string, auth = false): Promise<unknown> {
  const headers: Record<string, string> = {}
  if (auth) headers['x-openseabri-key'] = apiKey
  const res = await fetch(`${origin}${path}`, { headers })
  if (!res.ok) throw new Error(`${path} returned HTTP ${res.status}`)
  return res.json()
}

function wsSlashSmoke(): Promise<void> {
  if (!wsToken) {
    console.log('[smoke:staging] WebSocket skipped: SEABRI_WS_TOKEN not set')
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${wsUrl}?token=${encodeURIComponent(wsToken)}`)
    let ready = false
    const timer = setTimeout(() => {
      ws.close()
      reject(new Error('WebSocket slash smoke timed out'))
    }, 10_000)

    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'init', agentId: 'general', sessionId: 'staging-smoke' }))
    })
    ws.on('message', (raw) => {
      const msg = JSON.parse(String(raw)) as { type?: string }
      if (msg.type === 'ready' && !ready) {
        ready = true
        ws.send(JSON.stringify({ type: 'chat', content: '/agents' }))
      }
      if (msg.type === 'done') {
        clearTimeout(timer)
        ws.close()
        resolve()
      }
    })
    ws.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

function canvasSmoke(): Promise<void> {
  if (!canvasUrl || !canvasToken) {
    console.log('[smoke:staging] Canvas skipped: OPENSEABRI_STAGING_CANVAS_WS_URL or OPENSEABRI_CANVAS_WS_TOKEN not set')
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${canvasUrl}?token=${encodeURIComponent(canvasToken)}`)
    const timer = setTimeout(() => {
      ws.close()
      reject(new Error('Canvas smoke timed out'))
    }, 10_000)
    ws.on('message', (raw) => {
      const msg = JSON.parse(String(raw)) as { type?: string; status?: string }
      if (msg.type === 'status' && msg.status === 'connected') {
        clearTimeout(timer)
        ws.close()
        resolve()
      }
    })
    ws.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

async function main(): Promise<void> {
  requireValue('OPENSEABRI_API_KEY', apiKey)

  const health = await fetchJson('/health')
  console.log('[smoke:staging] health: PASS')

  const snapshot = await fetchJson('/api/seabri/registry-snapshot', true) as {
    snapshot?: { version?: string; hash?: string; counts?: Record<string, number> }
  }
  if (!snapshot.snapshot?.hash || !/^[a-f0-9]{64}$/.test(snapshot.snapshot.hash)) {
    throw new Error('registry snapshot hash missing or invalid')
  }
  console.log(`[smoke:staging] registry-snapshot: PASS version=${snapshot.snapshot.version ?? 'unknown'} hash=${snapshot.snapshot.hash.slice(0, 12)}...`)

  const readiness = await fetchJson('/api/seabri/admin/provider-readiness', true) as {
    providers?: unknown[]
  }
  if (!Array.isArray(readiness.providers) || readiness.providers.length === 0) {
    throw new Error('provider readiness returned no providers')
  }
  const readinessText = JSON.stringify(readiness)
  for (const forbidden of [apiKey, wsToken, canvasToken].filter(Boolean)) {
    if (readinessText.includes(forbidden)) throw new Error('provider readiness leaked a smoke secret')
  }
  console.log(`[smoke:staging] provider-readiness: PASS providers=${readiness.providers.length}`)

  await wsSlashSmoke()
  console.log('[smoke:staging] websocket/slash: PASS or skipped')

  await canvasSmoke()
  console.log('[smoke:staging] canvas: PASS or skipped')
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  console.error(`[smoke:staging] FAIL: ${message}`)
  process.exit(1)
})


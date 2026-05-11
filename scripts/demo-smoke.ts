import { createServer } from 'http'
import { handleSeabriApiRequest } from '../gateway/seabri/api-handler.js'

process.env.OPENSEABRI_API_KEY = process.env.OPENSEABRI_API_KEY || 'demo-smoke-key'

const server = createServer(async (req, res) => {
  await handleSeabriApiRequest(req, res)
})

await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
const port = (server.address() as { port: number }).port
const base = `http://127.0.0.1:${port}`

async function post(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-openseabri-key': process.env.OPENSEABRI_API_KEY!,
    },
    body: JSON.stringify(body),
  })
  const payload = await res.json()
  if (!res.ok) throw new Error(`${path} failed: HTTP ${res.status} ${JSON.stringify(payload)}`)
  return payload
}

try {
  const incident = await post('/api/seabri/living-companion/incident', { message: 'My bathroom is flooding.' }) as { mode?: string }
  if (incident.mode !== 'incident') throw new Error('incident workflow did not enter incident mode')
  console.log('[demo-smoke] incident workflow: PASS')

  const resources = await post('/api/seabri/living-companion/local-resources', { category: 'plumber', location: '33101' }) as { status?: string }
  if (resources.status !== 'ok' && resources.status !== 'fallback') throw new Error('local resource search returned invalid status')
  console.log(`[demo-smoke] local resource search: PASS (${resources.status})`)

  const image = await post('/api/seabri/living-companion/incident-image', { imageBase64: 'abcd1234abcd1234', mimeType: 'image/jpeg' }) as { status?: string }
  if (image.status !== 'analyzed' && image.status !== 'fallback') throw new Error('image incident check returned invalid status')
  console.log(`[demo-smoke] image incident: PASS (${image.status})`)

  const comparison = await post('/api/seabri/living-companion/product-comparison', {
    products: [
      { name: 'Durable steel bottle', attributes: { durable: true, repairable: true, reusable: true } },
      { name: 'Disposable plastic bottle pack', attributes: { durable: false, repairable: false, reusable: false } },
    ],
  }) as { recommendation?: string }
  if (!comparison.recommendation) throw new Error('product comparison missing recommendation')
  console.log('[demo-smoke] product comparison: PASS')

  const compute = await post('/api/seabri/harness/optimize-sustainable-compute', {
    workflow_name: 'demo smoke',
    task_type: 'classification',
    current_model: 'claude-opus-4-6',
    estimated_tokens: 5000,
    latency_priority: 'medium',
    cost_priority: 'high',
    privacy_priority: 'medium',
    sustainability_priority: 'high',
    repeated_task: true,
    cacheable: true,
    batchable: true,
  }) as { telemetry_id?: string }
  if (!compute.telemetry_id) throw new Error('compute optimizer missing telemetry_id')
  console.log('[demo-smoke] sustainable compute optimizer: PASS')
} finally {
  await new Promise<void>((resolve) => server.close(() => resolve()))
}

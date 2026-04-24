/**
 * Dev harness: broadcasts a rotating set of canvas blocks over the WS hub
 * every 5 s, so the CanvasPane UI can be smoke-tested without a real agent.
 *
 * Usage (two shells):
 *   OPENSEABRI_CANVAS_WS_PORT=18791 npm run gateway        # or this script alone
 *   tsx scripts/dev-canvas-seed.ts                         # pushes blocks
 *   npm run dev                                            # open SPA, toggle canvas
 *
 * When run standalone, this script also starts the canvas WS server itself
 * on OPENSEABRI_CANVAS_WS_PORT (default 18791) so the gateway is optional.
 */

import { randomUUID } from 'node:crypto'
import { broadcast, startCanvasServer, stopCanvasServer } from '../gateway/canvas/server.js'
import type { CanvasBlock } from '../gateway/canvas/server.js'

if (!process.env.OPENSEABRI_CANVAS_WS_PORT) {
  process.env.OPENSEABRI_CANVAS_WS_PORT = '18791'
}

function textBlock(): CanvasBlock {
  return {
    kind: 'text',
    id: randomUUID(),
    title: 'TNFD Materiality Snapshot',
    body: 'Operations in South-East Asia show elevated nature-related dependencies on freshwater and pollination services. Consider LEAP assessment for Tier-1 sites.',
    tags: ['TNFD', 'ISSB'],
  }
}

function chartBlock(): CanvasBlock {
  return {
    kind: 'chart',
    id: randomUUID(),
    title: 'Scope 1+2 emissions by site (tCO2e)',
    unit: 'tCO2e',
    series: [
      { label: 'Jakarta Plant', value: 1240 },
      { label: 'Rotterdam Hub', value: 860 },
      { label: 'São Paulo DC', value: 410 },
      { label: 'Singapore HQ', value: 95 },
    ],
    tags: ['GHG_PROTOCOL', 'ISSB'],
  }
}

function tableBlock(): CanvasBlock {
  return {
    kind: 'table',
    id: randomUUID(),
    title: 'Transition risk exposure',
    columns: ['Asset', 'Policy scenario', 'NPV Δ (USD m)'],
    rows: [
      ['Jakarta Plant', 'NZE 2050', -42],
      ['Rotterdam Hub', 'NZE 2050', -11],
      ['São Paulo DC', 'Delayed', -3],
    ],
    tags: ['TCFD', 'CSRD'],
  }
}

function citationsBlock(): CanvasBlock {
  return {
    kind: 'citations',
    id: randomUUID(),
    title: 'Sources',
    sources: [
      { label: 'TNFD Recommendations v1.0', url: 'https://tnfd.global/', note: 'LEAP approach' },
      { label: 'IEA World Energy Outlook 2025', note: 'NZE scenario pricing' },
      { label: 'CDP Water disclosure 2024', url: 'https://www.cdp.net/' },
    ],
  }
}

const generators: Array<() => CanvasBlock> = [textBlock, chartBlock, tableBlock, citationsBlock]

async function main(): Promise<void> {
  await startCanvasServer()
  console.log('[seed] broadcasting sample canvas blocks every 5s — Ctrl+C to stop')
  let i = 0
  const timer = setInterval(() => {
    const block = generators[i % generators.length]()
    broadcast({ type: 'block', block })
    console.log(`[seed] emitted ${block.kind} (${block.id})`)
    i += 1
  }, 5000)

  const shutdown = async () => {
    clearInterval(timer)
    await stopCanvasServer()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((err) => {
  console.error('[seed] failed:', err)
  process.exit(1)
})

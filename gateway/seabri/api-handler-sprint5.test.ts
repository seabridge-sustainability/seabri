import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createServer, type Server } from 'http'
import { handleSeabriApiRequest } from './api-handler.js'

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

describe('Sprint 5 API — score-inference & research findings', () => {
  let server: Server
  let baseUrl: () => string

  beforeEach(async () => {
    ;({ server, baseUrl } = makeServer())
    await listen(server)
  })

  afterEach(async () => {
    await close(server)
  })

  // ── Sustainability: score-inference ───────────────────────────────────────

  it('POST /api/seabri/sustainability/score-inference returns SustainabilityScore', async () => {
    const res = await fetch(`${baseUrl()}/api/seabri/sustainability/score-inference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ costUsd: 0.0003, carbonGrams: 0.005, modelTier: 'haiku' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as {
      composite: number
      tier: string
      costEfficiency: number
      carbonEfficiency: number
      breakdown: { costUsd: number; carbonGrams: number; modelTier: string }
    }
    expect(typeof body.composite).toBe('number')
    expect(typeof body.tier).toBe('string')
    expect(['excellent', 'good', 'fair', 'poor']).toContain(body.tier)
    expect(typeof body.costEfficiency).toBe('number')
    expect(typeof body.carbonEfficiency).toBe('number')
    expect(body.breakdown.modelTier).toBe('haiku')
  })

  it('POST /api/seabri/sustainability/score-inference haiku within budget scores high', async () => {
    // haiku budget: carbon=0.01g, cost=$0.0005 — stay well under budget
    const res = await fetch(`${baseUrl()}/api/seabri/sustainability/score-inference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ costUsd: 0.0001, carbonGrams: 0.001, modelTier: 'haiku' }),
    })
    const body = await res.json() as { composite: number; tier: string }
    expect(body.composite).toBeGreaterThanOrEqual(75)
    expect(body.tier).toBe('excellent')
  })

  it('POST /api/seabri/sustainability/score-inference opus scores lower composite than haiku for same absolute spend', async () => {
    const [haikuRes, opusRes] = await Promise.all([
      fetch(`${baseUrl()}/api/seabri/sustainability/score-inference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ costUsd: 0.0001, carbonGrams: 0.001, modelTier: 'haiku' }),
      }),
      fetch(`${baseUrl()}/api/seabri/sustainability/score-inference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ costUsd: 0.0001, carbonGrams: 0.001, modelTier: 'opus' }),
      }),
    ])
    const haiku = await haikuRes.json() as { composite: number }
    const opus = await opusRes.json() as { composite: number }
    // haiku has no tier penalty; opus has -10 penalty
    expect(haiku.composite).toBeGreaterThan(opus.composite)
  })

  it('POST /api/seabri/sustainability/score-inference 400 when costUsd missing', async () => {
    const res = await fetch(`${baseUrl()}/api/seabri/sustainability/score-inference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ carbonGrams: 0.005, modelTier: 'haiku' }),
    })
    expect(res.status).toBe(400)
  })

  it('POST /api/seabri/sustainability/score-inference 400 when modelTier invalid', async () => {
    const res = await fetch(`${baseUrl()}/api/seabri/sustainability/score-inference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ costUsd: 0.001, carbonGrams: 0.005, modelTier: 'gpt-4' }),
    })
    expect(res.status).toBe(400)
  })

  // ── Research: findings ────────────────────────────────────────────────────

  it('GET /api/seabri/research/findings without date returns dates array', async () => {
    const res = await fetch(`${baseUrl()}/api/seabri/research/findings`)
    expect(res.status).toBe(200)
    const body = await res.json() as { dates: unknown }
    expect(Array.isArray(body.dates)).toBe(true)
  })

  it('GET /api/seabri/research/findings?date=... returns 404 for non-existent date', async () => {
    const res = await fetch(`${baseUrl()}/api/seabri/research/findings?date=1900-01-01`)
    expect(res.status).toBe(404)
  })

  it('GET /api/seabri/research/findings?date=... returns findings when file exists', async () => {
    // Write a temp findings file for today and test
    const { writeFileSync, mkdirSync, existsSync, unlinkSync } = await import('node:fs')
    const { join, dirname } = await import('node:path')
    const { fileURLToPath } = await import('node:url')

    const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
    const findingsDir = join(root, 'research', 'findings')
    if (!existsSync(findingsDir)) mkdirSync(findingsDir, { recursive: true })

    const testDate = '2099-12-31'
    const testFile = join(findingsDir, `${testDate}.md`)
    writeFileSync(testFile, '# Test Findings\n\nThis is a test.')

    try {
      const res = await fetch(`${baseUrl()}/api/seabri/research/findings?date=${testDate}`)
      expect(res.status).toBe(200)
      const body = await res.json() as { date: string; content: string }
      expect(body.date).toBe(testDate)
      expect(body.content).toContain('Test Findings')
    } finally {
      unlinkSync(testFile)
    }
  })
})

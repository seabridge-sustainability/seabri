import { afterEach, describe, expect, it, vi } from 'vitest'
import { analyzeIncidentImage } from './vision-analysis.js'

afterEach(() => {
  delete process.env.OPENSEABRI_VISION_PROVIDER_URL
  vi.restoreAllMocks()
})

describe('incident image analysis', () => {
  it('returns safe fallback when vision is unavailable', async () => {
    const result = await analyzeIncidentImage({
      imageBase64: 'abcd1234abcd1234',
      mimeType: 'image/jpeg',
      incidentContext: 'bathroom flooding',
    })

    expect(result.status).toBe('fallback')
    expect(result.summary).toContain('not configured')
    expect(result.recommendedAngles.length).toBeGreaterThan(2)
    expect(JSON.stringify(result)).not.toMatch(/OPENAI_API_KEY|stack|undefined/i)
  })

  it('uses configured vision provider and avoids fake certainty', async () => {
    process.env.OPENSEABRI_VISION_PROVIDER_URL = 'https://vision.example.test/analyze'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        summary: 'Visible water on tile floor near vanity; source not certain from image alone.',
        visibleFindings: ['standing water on floor', 'wet baseboard area'],
        confidence: 'medium',
      }),
    }))

    const result = await analyzeIncidentImage({
      imageBase64: 'abcd1234abcd1234',
      mimeType: 'image/jpeg',
      incidentContext: 'bathroom flooding',
    })

    expect(result.status).toBe('analyzed')
    expect(result.source).toBe('configured-vision-provider')
    expect(result.visibleFindings).toContain('standing water on floor')
    expect(result.summary).toContain('not certain')
  })
})

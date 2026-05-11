import { mkdtemp, writeFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { createResourceActionCard, searchLocalResources } from './local-resources.js'

let tempDir: string | null = null

afterEach(async () => {
  delete process.env.OPENSEABRI_LOCAL_RESOURCE_FILE
  delete process.env.OPENSEABRI_LOCAL_RESOURCE_SEARCH_URL
  if (tempDir) await rm(tempDir, { recursive: true, force: true })
  tempDir = null
})

describe('local resource search', () => {
  it('returns structured configured resources without inventing contacts', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'openseabri-resources-'))
    const file = join(tempDir, 'resources.json')
    await writeFile(file, JSON.stringify({
      resources: [
        {
          name: 'Miami 24 Hour Plumbing',
          category: 'plumber',
          phone: '+1 305-555-0101',
          address: 'Miami FL 33101',
          hours: '24/7',
          source: 'operator-verified-test-directory',
          confidence: 'high',
        },
      ],
    }))
    process.env.OPENSEABRI_LOCAL_RESOURCE_FILE = file

    const result = await searchLocalResources({ category: 'plumber', location: '33101' })

    expect(result.status).toBe('ok')
    expect(result.resources[0]).toMatchObject({
      name: 'Miami 24 Hour Plumbing',
      phone: '+1 305-555-0101',
      source: 'operator-verified-test-directory',
      confidence: 'high',
    })
  })

  it('returns a safe fallback when search is unavailable', async () => {
    const result = await searchLocalResources({ category: 'water_mitigation', location: 'Miami 33101' })

    expect(result.status).toBe('fallback')
    expect(result.resources).toEqual([])
    expect(result.fallbackMessage).toContain('I will not invent contacts')
    expect(result.fallbackMessage).not.toMatch(/OPENAI_API_KEY|stack|undefined/i)
  })

  it('creates an approval-gated action card from a selected resource with phone', () => {
    const card = createResourceActionCard({
      id: 'r1',
      name: 'Miami 24 Hour Plumbing',
      category: 'plumber',
      rank: 1,
      phone: '+1 305-555-0101',
      source: 'test',
      confidence: 'high',
    })

    expect(card).toContain('PROPOSED ACTION')
    expect(card).toContain('Confirm? Reply YES')
    expect(card).toContain('+1 305-555-0101')
  })
})

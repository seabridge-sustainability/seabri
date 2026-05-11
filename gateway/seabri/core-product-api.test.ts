import { createServer, type Server } from 'http'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { handleSeabriApiRequest } from './api-handler.js'

function makeServer(): { server: Server; baseUrl: () => string } {
  const server = createServer(async (req, res) => {
    await handleSeabriApiRequest(req, res)
  })
  return {
    server,
    baseUrl: () => `http://127.0.0.1:${(server.address() as { port: number }).port}`,
  }
}

async function listen(server: Server): Promise<void> {
  return new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
}

async function close(server: Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()))
}

describe('core product APIs', () => {
  let server: Server
  let baseUrl: () => string

  beforeEach(async () => {
    process.env.OPENSEABRI_API_KEY = 'test-key'
    ;({ server, baseUrl } = makeServer())
    await listen(server)
  })

  afterEach(async () => {
    delete process.env.OPENSEABRI_LOCAL_RESOURCE_FILE
    delete process.env.OPENSEABRI_LOCAL_RESOURCE_SEARCH_URL
    await close(server)
  })

  async function api(path: string, body: unknown): Promise<Response> {
    return fetch(`${baseUrl()}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-openseabri-key': 'test-key' },
      body: JSON.stringify(body),
    })
  }

  it('compares products through HTTP without invented certifications', async () => {
    const res = await api('/api/seabri/living-companion/product-comparison', {
      products: [
        { name: 'Bottle A', attributes: { durable: true, repairable: true, certifications: ['user-label'] } },
        { name: 'Bottle B', attributes: { durable: false, minimalPackaging: true } },
      ],
    })

    expect(res.status).toBe(200)
    const body = await res.json() as { recommendation: string; products: Array<{ considerations: { certifications: string } }> }
    expect(body.recommendation).toContain('Bottle')
    expect(body.products[1].considerations.certifications).toContain('no certifications invented')
  })

  it('optimizes sustainable compute through HTTP with transparent assumptions', async () => {
    const res = await api('/api/seabri/harness/optimize-sustainable-compute', {
      workflow_name: 'classification triage',
      task_type: 'classification',
      current_model: 'claude-opus-4-6',
      estimated_tokens: 6000,
      latency_priority: 'medium',
      cost_priority: 'high',
      privacy_priority: 'medium',
      sustainability_priority: 'high',
      repeated_task: true,
      cacheable: true,
      batchable: true,
    })

    expect(res.status).toBe(200)
    const body = await res.json() as { recommended_model_strategy: string; telemetry_id: string; assumptions: string[] }
    expect(body.recommended_model_strategy).toContain('Downshift')
    expect(body.telemetry_id).toMatch(/^sco_/)
    expect(body.assumptions.length).toBeGreaterThan(1)
  })

  it('serves new practical sustainability workflows over HTTP with Spanish labels', async () => {
    const carbon = await api('/api/seabri/living-companion/household-carbon-footprint', {
      householdSize: 2,
      monthlyElectricityKwh: 700,
      preferredLanguage: 'Spanish',
    })
    expect(carbon.status).toBe(200)
    const carbonBody = await carbon.json() as { labels: { estimate: string }; estimatedAnnualEmissionsRange: string }
    expect(carbonBody.labels.estimate).toBe('Rango estimado')
    expect(carbonBody.estimatedAnnualEmissionsRange).toContain('tCO2e/year')

    const energy = await api('/api/seabri/living-companion/home-energy-plan', {
      homeType: 'single_family',
      budgetLevel: 'low',
      zip: '33101',
      preferredLanguage: 'es',
    })
    expect(energy.status).toBe(200)
    expect(await energy.json()).toMatchObject({ labels: { actions: 'Acciones recomendadas' } })

    const community = await api('/api/seabri/living-companion/community-project-plan', {
      organizationType: 'school',
      goal: 'plan a community cleanup',
      location: 'Miami',
    })
    expect(community.status).toBe(200)
    expect(await community.json()).toHaveProperty('volunteerTaskList')

    const cert = await api('/api/seabri/living-companion/certification-navigator', {
      userType: 'small_business',
      goal: 'energy readiness',
      preferredLanguage: 'Spanish',
    })
    expect(cert.status).toBe(200)
    const certBody = await cert.json() as { disclaimer: string; labels: { nextSteps: string } }
    expect(certBody.disclaimer).toContain('does not certify eligibility')
    expect(certBody.labels.nextSteps).toBe('Próximos pasos')

    const offset = await api('/api/seabri/living-companion/carbon-offset-checker', {
      projectType: 'forest',
      pricePerTonUsd: 2,
      preferredLanguage: 'español',
    })
    expect(offset.status).toBe(200)
    const offsetBody = await offset.json() as { summary: string; labels: { confidence: string } }
    expect(offsetBody.summary).toContain('Verification status is not invented')
    expect(offsetBody.labels.confidence).toBe('Confianza')

    const purchasing = await api('/api/seabri/living-companion/sustainable-purchasing-checklist', {
      productCategory: 'backpack',
      durabilityNeed: 'high',
      repairabilityPreference: 'high',
    })
    expect(purchasing.status).toBe(200)
    expect(await purchasing.json()).toHaveProperty('buyingChecklist')

    const resilience = await api('/api/seabri/living-companion/community-resilience-checklist', {
      communityType: 'neighborhood',
      hazards: ['flood', 'heat'],
      volunteers: 8,
    })
    expect(resilience.status).toBe(200)
    expect(await resilience.json()).toHaveProperty('communicationPlan')
  })

  it('returns client-safe local resource fallback over HTTP', async () => {
    const res = await api('/api/seabri/living-companion/local-resources', {
      category: 'plumber',
      location: '33101',
    })

    expect(res.status).toBe(200)
    const body = await res.json() as { status: string; fallbackMessage: string }
    expect(body.status).toBe('fallback')
    expect(body.fallbackMessage).toContain('will not invent contacts')
    expect(JSON.stringify(body)).not.toMatch(/OPENSEABRI|stack|undefined/i)
  })

  it('updates, reads, and deletes a persistent profile', async () => {
    const update = await api('/api/seabri/profile', {
      userId: 'demo-user',
      channel: 'web',
      name: 'Demo User',
      address: '45 Water St',
      zip: '33101',
      phone: '+13055551212',
      preferredLanguage: 'en',
    })
    expect(update.status).toBe(200)

    const read = await fetch(`${baseUrl()}/api/seabri/profile?userId=demo-user&channel=web`, {
      headers: { 'x-openseabri-key': 'test-key' },
    })
    const readBody = await read.json() as { profile: { name: string; phone: string } }
    expect(readBody.profile.name).toBe('Demo User')
    expect(readBody.profile.phone).toBe('+13055551212')

    const del = await fetch(`${baseUrl()}/api/seabri/profile?userId=demo-user&channel=web`, {
      method: 'DELETE',
      headers: { 'x-openseabri-key': 'test-key' },
    })
    expect(del.status).toBe(200)

    const after = await fetch(`${baseUrl()}/api/seabri/profile?userId=demo-user&channel=web`, {
      headers: { 'x-openseabri-key': 'test-key' },
    })
    const afterBody = await after.json() as { profile: unknown }
    expect(afterBody.profile).toBeNull()
  })

  it('does not expose profile data through registry snapshots', async () => {
    await api('/api/seabri/profile', {
      userId: 'snapshot-user',
      channel: 'web',
      name: 'Snapshot User',
      address: '777 Pilot Ave',
      zip: '33101',
      phone: '+13055550123',
      preferredLanguage: 'en',
    })

    const snapshot = await fetch(`${baseUrl()}/api/seabri/registry-snapshot`, {
      headers: { 'x-openseabri-key': 'test-key' },
    })
    expect(snapshot.status).toBe(200)
    const text = JSON.stringify(await snapshot.json())
    expect(text).not.toContain('777 Pilot Ave')
    expect(text).not.toContain('+13055550123')
    expect(text).not.toContain('Snapshot User')
  })
})

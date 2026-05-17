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

    const repair = await api('/api/seabri/living-companion/repair-vs-replace', {
      productType: 'washing machine',
      ageYears: 9,
      estimatedRepairCostUsd: 180,
      replacementBudgetUsd: 900,
      energyEfficiency: 'average',
      condition: 'repairable',
      preferredLanguage: 'Spanish',
    })
    expect(repair.status).toBe(200)
    const repairBody = await repair.json() as { sustainabilityTradeoff: string; labels: { confidence: string } }
    expect(repairBody.sustainabilityTradeoff).toContain('avoids waste')
    expect(repairBody.labels.confidence).toBe('Confianza')

    const retrofit = await api('/api/seabri/living-companion/home-resilience-retrofit-plan', {
      homeType: 'single_family',
      location: '33101',
      hazards: ['flood', 'storm', 'power_outage'],
      budgetLevel: 'medium',
      painPoints: ['basement water', 'power outages'],
    })
    expect(retrofit.status).toBe(200)
    const retrofitBody = await retrofit.json() as { localRiskStatus: string; prioritizedResilienceUpgrades: string[] }
    expect(retrofitBody.localRiskStatus).toBe('not_verified')
    expect(retrofitBody.prioritizedResilienceUpgrades.length).toBeGreaterThan(0)

    const materials = await api('/api/seabri/living-companion/building-material-comparison', {
      materialCategory: 'flooring',
      durabilityNeed: 'high',
      moistureConcern: true,
      budgetLevel: 'medium',
      maintenanceTolerance: 'low',
    })
    expect(materials.status).toBe(200)
    const materialsBody = await materials.json() as { materialOptions: unknown[]; embodiedCarbonGuidance: string }
    expect(materialsBody.materialOptions.length).toBeGreaterThan(0)
    expect(materialsBody.embodiedCarbonGuidance).toContain('screening guidance')

    const preparedness = await api('/api/seabri/living-companion/emergency-preparedness-plan', {
      householdSize: 4,
      location: 'Miami, FL',
      hazards: ['storm', 'flood', 'heat'],
      hasPets: true,
      hasChildren: true,
      evacuationConstraints: ['one car'],
    })
    expect(preparedness.status).toBe(200)
    const preparednessBody = await preparedness.json() as { localGuidanceStatus: string; emergencyChecklist: string[] }
    expect(preparednessBody.localGuidanceStatus).toBe('not_verified')
    expect(preparednessBody.emergencyChecklist).toContain('Sign up for verified local emergency alerts and keep a battery-powered way to receive updates.')

    const resilience = await api('/api/seabri/living-companion/community-resilience-checklist', {
      communityType: 'neighborhood',
      hazards: ['flood', 'heat'],
      volunteers: 8,
    })
    expect(resilience.status).toBe(200)
    expect(await resilience.json()).toHaveProperty('communicationPlan')

    const grant = await api('/api/seabri/living-companion/grant-opportunities', {
      organizationType: 'nonprofit',
      projectDescription: 'Community cooling center and flood preparedness workshops',
      location: 'Miami, FL',
      budgetUsd: 150000,
      preferredLanguage: 'Spanish',
    })
    expect(grant.status).toBe(200)
    const grantBody = await grant.json() as { dataStatus: string; noSpecificGrantsDisclaimer: string; labels: { confidence: string } }
    expect(grantBody.dataStatus).toBe('not_verified')
    expect(grantBody.noSpecificGrantsDisclaimer).toContain('No specific grant listings')
    expect(grantBody.labels.confidence).toBe('Confianza')

    const water = await api('/api/seabri/living-companion/water-conservation-plan', {
      householdType: 'single_family',
      location: '33101',
      monthlyWaterUseGallons: 9000,
      painPoints: ['high bill', 'irrigation'],
      preferredLanguage: 'Spanish',
    })
    expect(water.status).toBe(200)
    const waterBody = await water.json() as { localRulesStatus: string; labels: { actions: string } }
    expect(waterBody.localRulesStatus).toBe('not_verified')
    expect(waterBody.labels.actions).toBe('Acciones recomendadas')

    const waste = await api('/api/seabri/living-companion/waste-recycling-guide', {
      itemOrMaterial: 'old laptop battery',
      location: '33101',
      condition: 'broken',
      quantity: '2',
    })
    expect(waste.status).toBe(200)
    const wasteBody = await waste.json() as { hazardousWarning: string; localLookup: { status: string } }
    expect(wasteBody.hazardousWarning).toContain('batter')
    expect(wasteBody.localLookup.status).toBe('not_verified')

    const utility = await api('/api/seabri/living-companion/utility-bill-interpreter', {
      utilityType: 'electricity',
      billingDays: 31,
      totalCostUsd: 185,
      totalUsage: 980,
      usageUnit: 'kWh',
      location: '33101',
      householdSize: 3,
    })
    expect(utility.status).toBe(200)
    const utilityBody = await utility.json() as { noFakeSavingsClaim: string; billBreakdown: Record<string, unknown> }
    expect(utilityBody.noFakeSavingsClaim).toContain('not a savings guarantee')
    expect(utilityBody.billBreakdown).toHaveProperty('estimatedUnitCost')

    const localSources = await api('/api/seabri/living-companion/local-sustainability-sources', {
      location: '33101',
      needs: ['water_restrictions', 'recycling_rules', 'rebates', 'public_works'],
      preferredLanguage: 'Spanish',
    })
    expect(localSources.status).toBe(200)
    const localSourcesBody = await localSources.json() as { lookupStatus: string; labels: { confidence: string }; nextSteps: string[] }
    expect(localSourcesBody.lookupStatus).toBe('not_verified')
    expect(localSourcesBody.labels.confidence).toBe('Confianza')
    expect(localSourcesBody.nextSteps).toContain('Verify any restriction, rebate, pickup rule, or public works contact directly with the official local source before acting.')

    const evidence = await api('/api/seabri/living-companion/product-material-evidence-check', {
      productOrMaterial: 'low-VOC flooring',
      claimType: 'material_epd',
      claimedEvidence: ['marketing page says sustainable'],
      sourceUrls: ['https://example.invalid/product'],
    })
    expect(evidence.status).toBe(200)
    const evidenceBody = await evidence.json() as { verificationStatus: string; redFlags: string[] }
    expect(evidenceBody.verificationStatus).toBe('user_evidence_supplied')
    expect(evidenceBody.redFlags).toContain('logos, badges, or sustainability claims without issuer name, certificate ID, date, scope, and product model')

    const insurance = await api('/api/seabri/living-companion/insurance-declarations-review', {
      documentText: 'Carrier: Example Mutual\nPolicy Number: HO-12345\nDwelling Coverage A $350,000\nWind/Hail Deductible 2%\nFlood Exclusion applies',
      concern: 'storm and flood preparation',
    })
    expect(insurance.status).toBe(200)
    const insuranceBody = await insurance.json() as { reviewStatus: string; notLegalAdvice: string; coverageSignals: string[] }
    expect(insuranceBody.reviewStatus).toBe('screening_only')
    expect(insuranceBody.notLegalAdvice).toContain('not legal, insurance, or claims advice')
    expect(insuranceBody.coverageSignals).toContain('Dwelling Coverage A $350,000')
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

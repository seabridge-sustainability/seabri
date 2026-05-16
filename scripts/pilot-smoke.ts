import { createServer, type Server } from 'http'
import { resolve } from 'path'
import { handleSeabriApiRequest } from '../gateway/seabri/api-handler.js'
import { registerBuiltinTools } from '../gateway/tools/register-builtin.js'

const API_KEY = 'pilot-smoke-key'

function listen(server: Server): Promise<void> {
  return new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen))
}

function close(server: Server): Promise<void> {
  return new Promise((resolveClose) => server.close(() => resolveClose()))
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

async function main() {
  process.env.OPENSEABRI_API_KEY = API_KEY
  process.env.OPENSEABRI_LOCAL_RESOURCE_FILE = resolve(process.cwd(), 'docs/pilot/fixtures/local-resources.staging.json')
  process.env.OPENSEABRI_LIVE_PROVIDER_ALLOW = 'false'
  process.env.OPENSEABRI_PROVIDER_TEST_MODE = 'true'
  registerBuiltinTools()

  const server = createServer(async (req, res) => {
    const handled = await handleSeabriApiRequest(req, res)
    if (!handled) {
      res.writeHead(404, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: 'not found' }))
    }
  })

  await listen(server)
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`
  const headers = { 'content-type': 'application/json', 'x-openseabri-key': API_KEY }

  async function post(path: string, body: unknown) {
    const res = await fetch(`${base}${path}`, { method: 'POST', headers, body: JSON.stringify(body) })
    const json = await res.json()
    assert(res.ok, `${path} failed: ${JSON.stringify(json)}`)
    return json
  }

  async function get(path: string) {
    const res = await fetch(`${base}${path}`, { headers })
    const json = await res.json()
    assert(res.ok, `${path} failed: ${JSON.stringify(json)}`)
    return json
  }

  try {
    const profilePayload = {
      userId: 'pilot-smoke-user',
      channel: 'web',
      name: 'Pilot User',
      address: '123 Water St',
      city: 'Miami',
      state: 'FL',
      zip: '33101',
      phone: '+13055550100',
      preferredLanguage: 'English',
    }
    await post('/api/seabri/profile', profilePayload)
    const profile = await get('/api/seabri/profile?userId=pilot-smoke-user&channel=web')
    assert(profile.profile?.zip === '33101', 'profile was not persisted')
    console.log('[smoke:pilot] profile onboarding/update: PASS')

    const incident = await post('/api/seabri/living-companion/incident', {
      message: 'My bathroom is flooding.',
      profile: profilePayload,
    })
    assert(typeof incident.response === 'string' && incident.response.includes('IMMEDIATE STEPS'), 'incident action plan missing')
    console.log('[smoke:pilot] living companion incident: PASS')

    const resources = await post('/api/seabri/living-companion/local-resources', {
      category: 'water_mitigation',
      location: 'Miami FL 33101',
    })
    assert(resources.status === 'ok', 'configured local resource fixture not used')
    assert(resources.resources[0].source === 'configured-staging-demo-fixture', 'resource source label missing')
    assert(/DEMO PLACEHOLDER/.test(resources.resources[0].notes), 'demo placeholder not clearly labeled')
    console.log('[smoke:pilot] local resource fixture: PASS')

    const action = await post('/api/seabri/living-companion/local-resources/action-card', {
      resource: resources.resources[0],
    })
    assert(action.actionCard.includes('Confirm? Reply YES'), 'approval gate missing from action card')
    console.log('[smoke:pilot] approval-gated action card: PASS')

    const comparison = await post('/api/seabri/living-companion/product-comparison', {
      products: [
        { name: 'Durable steel bottle', attributes: { durable: true, repairable: true, minimalPackaging: true } },
        { name: 'Disposable plastic bottle pack', attributes: { durable: false, repairable: false, minimalPackaging: false } },
      ],
      priorities: ['durability', 'packaging'],
    })
    assert(comparison.recommendation.includes('Durable steel bottle'), 'comparison recommendation missing')
    assert(!JSON.stringify(comparison).match(/invented certification/i), 'comparison invented certification language found')
    console.log('[smoke:pilot] product comparison: PASS')

    const carbon = await post('/api/seabri/living-companion/household-carbon-footprint', {
      householdSize: 2,
      zip: '33101',
      monthlyElectricityKwh: 700,
      preferredLanguage: 'Spanish',
    })
    assert(carbon.labels.estimate === 'Rango estimado', 'carbon Spanish label missing')
    assert(String(carbon.estimatedAnnualEmissionsRange).includes('tCO2e/year'), 'carbon range missing')
    console.log('[smoke:pilot] household carbon footprint: PASS')

    const energy = await post('/api/seabri/living-companion/home-energy-plan', {
      homeType: 'single_family',
      zip: '33101',
      budgetLevel: 'low',
      monthlyBillUsd: 220,
      preferredLanguage: 'es',
    })
    assert(Array.isArray(energy.noCostActions), 'energy actions missing')
    console.log('[smoke:pilot] home energy planner: PASS')

    const community = await post('/api/seabri/living-companion/community-project-plan', {
      organizationType: 'school',
      goal: 'plan a community cleanup',
      location: 'Miami',
      volunteers: 20,
    })
    assert(Array.isArray(community.volunteerTaskList), 'community volunteer tasks missing')
    console.log('[smoke:pilot] community project planner: PASS')

    const certification = await post('/api/seabri/living-companion/certification-navigator', {
      userType: 'small_business',
      goal: 'energy readiness',
      preferredLanguage: 'Spanish',
    })
    assert(certification.disclaimer.includes('does not certify eligibility'), 'certification disclaimer missing')
    console.log('[smoke:pilot] certification navigator: PASS')

    const offset = await post('/api/seabri/living-companion/carbon-offset-checker', {
      projectType: 'forest',
      pricePerTonUsd: 2,
      preferredLanguage: 'español',
    })
    assert(offset.summary.includes('Verification status is not invented'), 'offset verification guard missing')
    console.log('[smoke:pilot] offset quality checker: PASS')

    const repair = await post('/api/seabri/living-companion/repair-vs-replace', {
      productType: 'washing machine',
      ageYears: 9,
      estimatedRepairCostUsd: 180,
      replacementBudgetUsd: 900,
      energyEfficiency: 'average',
      condition: 'repairable',
    })
    assert(String(repair.sustainabilityTradeoff).includes('avoids waste'), 'repair-vs-replace sustainability tradeoff missing')
    assert(!JSON.stringify(repair).match(/\b\d+\.\d{2,}\s*(kg|tCO2e)\b/i), 'repair-vs-replace used fake carbon precision')
    console.log('[smoke:pilot] repair vs replace assistant: PASS')

    const retrofit = await post('/api/seabri/living-companion/home-resilience-retrofit-plan', {
      homeType: 'single_family',
      location: '33101',
      hazards: ['flood', 'storm', 'power_outage'],
      budgetLevel: 'medium',
      painPoints: ['basement water', 'power outages'],
    })
    assert(retrofit.localRiskStatus === 'not_verified', 'retrofit local risk status missing')
    assert(Array.isArray(retrofit.prioritizedResilienceUpgrades), 'retrofit priorities missing')
    console.log('[smoke:pilot] home resilience retrofit planner: PASS')

    const materials = await post('/api/seabri/living-companion/building-material-comparison', {
      materialCategory: 'flooring',
      durabilityNeed: 'high',
      moistureConcern: true,
      budgetLevel: 'medium',
      maintenanceTolerance: 'low',
    })
    assert(Array.isArray(materials.materialOptions), 'building material options missing')
    assert(String(materials.embodiedCarbonGuidance).includes('screening guidance'), 'building material embodied-carbon caveat missing')
    console.log('[smoke:pilot] building material comparator: PASS')

    const preparedness = await post('/api/seabri/living-companion/emergency-preparedness-plan', {
      householdSize: 4,
      location: 'Miami, FL',
      hazards: ['storm', 'flood', 'heat'],
      hasPets: true,
      hasChildren: true,
      evacuationConstraints: ['one car'],
    })
    assert(preparedness.localGuidanceStatus === 'not_verified', 'preparedness local guidance status missing')
    assert(Array.isArray(preparedness.emergencyChecklist), 'emergency preparedness checklist missing')
    console.log('[smoke:pilot] emergency preparedness planner: PASS')

    const compute = await post('/api/seabri/harness/optimize-sustainable-compute', {
      workflow_name: 'pilot incident triage',
      task_type: 'classification',
      current_model: 'claude-opus-4-6',
      estimated_tokens: 8000,
      latency_priority: 'medium',
      cost_priority: 'high',
      privacy_priority: 'medium',
      sustainability_priority: 'high',
      repeated_task: true,
      cacheable: true,
      batchable: true,
    })
    assert(compute.recommended_model_strategy.includes('Downshift'), 'compute optimizer did not downshift')
    assert(/^sco_/.test(compute.telemetry_id), 'compute telemetry id missing')
    console.log('[smoke:pilot] sustainable compute: PASS')

    const snapshot = await get('/api/seabri/registry-snapshot')
    const snapshotText = JSON.stringify(snapshot)
    assert(!snapshotText.includes('123 Water St'), 'registry snapshot leaked address')
    assert(!snapshotText.includes('+13055550100'), 'registry snapshot leaked phone')
    for (const toolName of [
      'estimate_household_carbon',
      'plan_home_energy_actions',
      'plan_community_sustainability_project',
      'navigate_sustainability_certification',
      'check_carbon_offset_quality',
      'advise_repair_vs_replace',
      'plan_home_resilience_retrofits',
      'compare_building_materials',
      'plan_emergency_preparedness',
    ]) {
      assert(snapshotText.includes(toolName), `registry snapshot missing ${toolName}`)
    }
    console.log('[smoke:pilot] no profile leakage in registry snapshot: PASS')

    const readiness = await get('/api/seabri/admin/provider-readiness')
    assert(Array.isArray(readiness.providers), 'provider readiness missing')
    assert(readiness.providers.every((p: { canRunLiveTest: boolean }) => p.canRunLiveTest === false), 'live-provider gate unexpectedly open')
    console.log('[smoke:pilot] live-provider gates closed: PASS')

    const del = await fetch(`${base}/api/seabri/profile?userId=pilot-smoke-user&channel=web`, { method: 'DELETE', headers })
    assert(del.ok, 'profile delete failed')
    console.log('[smoke:pilot] profile delete: PASS')
  } finally {
    await close(server)
  }
}

main().catch((err) => {
  console.error(`[smoke:pilot] FAIL: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})

import { describe, expect, it } from 'vitest'
import { InMemoryTelemetryStore, setTelemetryStoreForTesting } from '../telemetry/store.js'
import {
  buildCommunityResilienceChecklist,
  buildSustainablePurchasingChecklist,
  checkCarbonOffsetQuality,
  estimateHouseholdCarbon,
  navigateCertification,
  planCommunityProject,
  planHomeEnergyActions,
} from './practical-sustainability.js'

describe('practical sustainability workflows', () => {
  it('estimates household carbon as a broad range with actions and telemetry', async () => {
    const store = new InMemoryTelemetryStore()
    setTelemetryStoreForTesting(store)
    const result = await estimateHouseholdCarbon({
      householdSize: 3,
      zip: '33101',
      monthlyElectricityKwh: 900,
      vehicles: [{ milesPerWeek: 180, fuel: 'gasoline' }],
      dietPattern: 'average',
      recyclingHabit: 'medium',
    })
    expect(result.estimatedAnnualEmissionsRange).toMatch(/\d+\.\d-\d+\.\d tCO2e\/year/)
    expect(result.topContributingCategories).toBeDefined()
    expect(result.categoryBreakdown).toHaveProperty('electricity')
    expect(result.categoryBreakdown).toHaveProperty('heatingFuel')
    expect(result.categoryBreakdown).toHaveProperty('transport')
    expect(result.categoryBreakdown).toHaveProperty('food')
    expect(result.categoryBreakdown).toHaveProperty('waste')
    const actionPriorities = result.actionPriorities as Array<Record<string, unknown>>
    expect(actionPriorities[0]).toMatchObject({ cost: '$0', difficulty: 'easy' })
    expect(result.monthlyTrackingPrompt).toContain('Once a month')
    expect(result.householdComparisonWarning).toContain('Do not use this to shame')
    expect(result.reductionActions).toHaveLength(5)
    expect(result.summary).toContain('screening range')
    expect(store.events.some((event) => event.data.workflow === 'household_carbon_footprint')).toBe(true)
    setTelemetryStoreForTesting(null)
  })

  it('returns Spanish labels for deterministic household and energy workflows', async () => {
    const carbon = await estimateHouseholdCarbon({ householdSize: 2, preferredLanguage: 'Spanish' })
    const energy = await planHomeEnergyActions({ homeType: 'apartment', budgetLevel: 'low', preferredLanguage: 'es' })
    expect(carbon.labels.actions).toBe('Acciones recomendadas')
    expect(energy.labels.unknowns).toBe('Datos desconocidos')
  })

  it('plans a community project with funding prompts and risk checklist', async () => {
    const result = await planCommunityProject({
      organizationType: 'school',
      goal: 'plan a community cleanup',
      location: 'Miami',
      timeline: 'one month',
      volunteers: 20,
    })
    expect(result.projectPlan).toContain('Run pilot event.')
    expect(result.projectPhases).toHaveProperty('prepare')
    expect(result.roleAssignments).toHaveProperty('coordinator')
    expect(result.impactMetrics).toHaveProperty('participation')
    expect(result.fundingGrantSearchPrompts).toBeDefined()
    expect(result.riskPermitChecklist).toContain('site permission')
  })

  it('navigates certifications without inventing certification status', async () => {
    const result = await navigateCertification({
      userType: 'small_business',
      goal: 'prepare energy and ESG documents',
      budgetLevel: 'low',
      preferredLanguage: 'Spanish',
    })
    expect(result.recommendedPath).toContain('ENERGY STAR')
    expect(result.documentChecklist).toContain('utility bills')
    expect(result.lowerComplexityAlternative).toContain('utility rebates')
    expect(result.disclaimer).toContain('does not certify eligibility')
    expect(JSON.stringify(result)).not.toMatch(/certified|approved/i)
    expect(result.labels.nextSteps).toBe('Próximos pasos')
  })

  it('checks offset quality without inventing verification status', async () => {
    const result = await checkCarbonOffsetQuality({
      projectName: 'Unknown forest offset',
      projectType: 'forest',
      pricePerTonUsd: 2,
      preferredLanguage: 'español',
    })
    expect(result.greenwashingRisk).toBe('high')
    expect(result.qualityDimensions).toHaveProperty('additionality')
    const trafficLightFlags = result.trafficLightFlags as { red: string[] }
    expect(trafficLightFlags.red[0]).toContain('Unknown registry')
    expect(result.questionsToAskSeller).toContain('What registry and project ID?')
    expect(result.guidance).toContain('avoid')
    expect(result.qualityFlags).toContain('No registry supplied; verification status is unknown.')
    expect(result.summary).toContain('Verification status is not invented')
    expect(result.labels.confidence).toBe('Confianza')
  })

  it('builds sustainable purchasing checklist without fake certifications', async () => {
    const result = await buildSustainablePurchasingChecklist({
      productCategory: 'backpack',
      budgetUsd: 80,
      durabilityNeed: 'high',
      repairabilityPreference: 'high',
    })
    expect(result.buyingChecklist).toContain('Can common parts be repaired or replaced?')
    expect(result.redFlags).toContain('certification logos without certificate IDs')
    expect(JSON.stringify(result)).not.toMatch(/certified|approved/i)
  })

  it('builds community resilience checklist without fake local partners', async () => {
    const result = await buildCommunityResilienceChecklist({
      communityType: 'neighborhood',
      hazards: ['flood', 'heat'],
      vulnerableGroups: ['older adults'],
      volunteers: 8,
    })
    expect(result.preparednessChecklist).toContain('Create a contact tree and backup communication channel.')
    expect(result.localPartnerCategories).toContain('city emergency management')
    expect(result.drillExercisePlan).toContain('Test contact tree.')
    expect(JSON.stringify(result)).not.toMatch(/specific partner|Acme/i)
  })
})

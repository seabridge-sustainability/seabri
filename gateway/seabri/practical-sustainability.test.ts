import { describe, expect, it } from 'vitest'
import { InMemoryTelemetryStore, setTelemetryStoreForTesting } from '../telemetry/store.js'
import {
  buildCommunityResilienceChecklist,
  buildSustainablePurchasingChecklist,
  buildWasteRecyclingGuide,
  checkCarbonOffsetQuality,
  compareBuildingMaterials,
  estimateHouseholdCarbon,
  findGrantOpportunities,
  interpretUtilityBill,
  navigateCertification,
  planEmergencyPreparedness,
  planCommunityProject,
  planHomeEnergyActions,
  planHomeResilienceRetrofits,
  planWaterConservation,
  adviseRepairVsReplace,
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

  it('advises repair versus replace with financial, sustainability, and waste tradeoffs', async () => {
    const store = new InMemoryTelemetryStore()
    setTelemetryStoreForTesting(store)
    const result = await adviseRepairVsReplace({
      productType: 'washing machine',
      ageYears: 9,
      estimatedRepairCostUsd: 180,
      replacementBudgetUsd: 900,
      energyEfficiency: 'average',
      condition: 'repairable',
      preferredLanguage: 'Spanish',
    })

    expect(result.summary).toContain('Repair vs replace')
    expect(result.repairRecommendation).toContain('repair')
    expect(result.replacementRecommendation).toContain('replacement')
    expect(result.sustainabilityTradeoff).toContain('avoids waste')
    expect(result.financialTradeoff).toContain('repair cost')
    expect(result.wasteImpact).toContain('Keep the old item')
    expect(result.labels.confidence).toBe('Confianza')
    expect(JSON.stringify(result)).not.toMatch(/\b\d+\.\d{2,}\s*(kg|tCO2e)\b/i)
    expect(store.events.some((event) => event.data.workflow === 'repair_vs_replace_assistant')).toBe(true)
    setTelemetryStoreForTesting(null)
  })

  it('plans home resilience retrofits without inventing local hazard or insurance details', async () => {
    const result = await planHomeResilienceRetrofits({
      homeType: 'single_family',
      location: '33101',
      hazards: ['flood', 'storm', 'power_outage'],
      budgetLevel: 'medium',
      painPoints: ['basement water', 'power outages'],
    })

    expect(result.summary).toContain('Home resilience retrofit plan')
    expect(result.prioritizedResilienceUpgrades).toContain('Inspect drainage paths, gutters, downspouts, and grading before buying equipment.')
    expect(result.lowCostActions).toContain('Move important documents and valuables above likely water lines.')
    expect(result.majorUpgrades).toContain('Professional drainage, sump pump, backflow preventer, or floodproofing evaluation where flood risk is verified.')
    expect(result.insuranceImplications).toContain('Ask the insurer')
    expect(result.localRiskStatus).toBe('not_verified')
    expect(JSON.stringify(result)).not.toMatch(/guaranteed|premium reduction|FEMA says/i)
  })

  it('compares sustainable building materials with durability and indoor-air caveats', async () => {
    const result = await compareBuildingMaterials({
      materialCategory: 'flooring',
      durabilityNeed: 'high',
      moistureConcern: true,
      fireConcern: false,
      budgetLevel: 'medium',
      maintenanceTolerance: 'low',
    })

    expect(result.summary).toContain('Building material comparison')
    expect(result.materialOptions).toHaveLength(4)
    expect(result.embodiedCarbonGuidance).toContain('screening guidance')
    expect(result.indoorAirQualityConcerns).toContain('low-VOC')
    expect(result.bestFitRecommendation).toContain('moisture')
    expect(JSON.stringify(result)).not.toMatch(/LEED certified|verified EPD|exact embodied carbon/i)
  })

  it('plans emergency preparedness with household-specific supplies and no fake local orders', async () => {
    const result = await planEmergencyPreparedness({
      householdSize: 4,
      location: 'Miami, FL',
      hazards: ['storm', 'flood', 'heat'],
      hasPets: true,
      hasChildren: true,
      hasOlderAdults: false,
      evacuationConstraints: ['one car', 'school pickup'],
    })

    expect(result.summary).toContain('Emergency preparedness plan')
    expect(result.emergencyChecklist).toContain('Sign up for verified local emergency alerts and keep a battery-powered way to receive updates.')
    expect(result.supplyList).toContain('Pet food, leash/carrier, medication, and vaccination records if pets are present.')
    expect(result.communicationPlan).toContain('Choose one out-of-area contact and one neighborhood check-in contact.')
    expect(result.localGuidanceStatus).toBe('not_verified')
    expect(JSON.stringify(result)).not.toMatch(/mandatory evacuation|official shelter at/i)
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

  it('plans water conservation without inventing local restrictions', async () => {
    const store = new InMemoryTelemetryStore()
    setTelemetryStoreForTesting(store)
    const result = await planWaterConservation({
      householdType: 'single_family',
      location: '33101',
      monthlyWaterUseGallons: 9000,
      painPoints: ['high bill', 'lawn irrigation'],
      preferredLanguage: 'Spanish',
    })

    expect(result.summary).toContain('Water conservation plan')
    expect(result.noCostActions).toContain('Check toilets, faucets, hose bibs, and irrigation valves for silent leaks.')
    expect(result.lowCostActions).toContain('Install WaterSense-labeled showerheads or faucet aerators where fixtures are old.')
    expect(result.outdoorWateringActions).toContain('Water early morning only when plants need it; follow verified local rules if they exist.')
    expect(result.localRulesStatus).toBe('not_verified')
    expect(result.labels.actions).toBe('Acciones recomendadas')
    expect(store.events.some((event) => event.data.workflow === 'water_conservation_planner')).toBe(true)
    setTelemetryStoreForTesting(null)
  })

  it('builds waste and recycling guidance with hazardous warnings and local lookup status', async () => {
    const result = await buildWasteRecyclingGuide({
      itemOrMaterial: 'old laptop battery',
      location: '33101',
      condition: 'broken',
      quantity: '2 items',
    })

    expect(result.summary).toContain('Waste and recycling guide')
    expect(result.hazardousWarning).toContain('batter')
    expect((result.localLookup as { status: string }).status).toBe('not_verified')
    expect(result.nextSteps).toContain('Check your city or county solid waste site for ZIP-specific rules before disposal.')
    expect(JSON.stringify(result)).not.toMatch(/accepted by Miami|guaranteed/i)
  })

  it('interprets utility bills with transparent missing data and no fake savings', async () => {
    const result = await interpretUtilityBill({
      utilityType: 'electricity',
      billingDays: 31,
      totalCostUsd: 185,
      totalUsage: 980,
      usageUnit: 'kWh',
      location: '33101',
      householdSize: 3,
    })

    expect(result.summary).toContain('Utility bill interpretation')
    expect(result.billBreakdown).toHaveProperty('estimatedUnitCost')
    expect(result.noFakeSavingsClaim).toContain('not a savings guarantee')
    expect(result.nextSteps).toContain('Compare at least 12 months of bills before judging a trend.')
    expect(result.assumptions).toContain('This tool interprets user-provided bill fields only.')
  })

  it('findGrantOpportunities returns strategies without inventing specific grants', async () => {
    const result = await findGrantOpportunities({
      organizationType: 'nonprofit',
      projectDescription: 'Community solar installation for low-income households in Miami',
      location: 'Miami, FL',
      budgetUsd: 150000,
    }) as Record<string, unknown>
    expect(result.noSpecificGrantsDisclaimer).toContain('No specific grant listings are provided')
    expect(Array.isArray(result.searchStrategies)).toBe(true)
    expect((result.searchStrategies as string[]).length).toBeGreaterThan(0)
    expect(Array.isArray(result.typesToLook)).toBe(true)
    expect(Array.isArray(result.keyQuestions)).toBe(true)
    expect(Array.isArray(result.timingAdvice)).toBe(true)
    expect(result.confidence).toBe('low')
    expect(result.dataStatus).toBe('not_verified')
  })

  it('findGrantOpportunities contains dataStatus not_verified', async () => {
    const result = await findGrantOpportunities({
      organizationType: 'school',
      projectDescription: 'Rainwater harvesting and resilience education program',
    }) as Record<string, unknown>
    expect(result.dataStatus).toBe('not_verified')
  })

  it('findGrantOpportunities returns Spanish labels when preferredLanguage is Spanish', async () => {
    const result = await findGrantOpportunities({
      organizationType: 'organización sin fines de lucro',
      projectDescription: 'Proyecto de energía solar comunitaria para familias de bajos ingresos',
      preferredLanguage: 'Spanish',
    }) as Record<string, unknown>
    const lbl = result.labels as Record<string, string>
    expect(lbl.searchStrategies).toBe('Estrategias de búsqueda')
    expect(lbl.keyQuestions).toBe('Preguntas clave de elegibilidad')
    expect(lbl.confidence).toBe('Confianza')
  })

  it('findGrantOpportunities returns safe output when location is omitted', async () => {
    const result = await findGrantOpportunities({
      organizationType: 'community group',
      projectDescription: 'Neighborhood resilience training and emergency preparedness workshops',
    }) as Record<string, unknown>
    expect(result.confidence).toBe('low')
    expect(result.dataStatus).toBe('not_verified')
    expect(Array.isArray(result.searchStrategies)).toBe(true)
  })

  it('findGrantOpportunities emits telemetry event', async () => {
    const store = new InMemoryTelemetryStore()
    setTelemetryStoreForTesting(store)
    await findGrantOpportunities({
      organizationType: 'NGO',
      projectDescription: 'Urban tree canopy expansion project to reduce heat island effects',
      location: 'Chicago, IL',
    })
    expect(store.events.some((e) => e.data.workflow === 'grant_search_guidance')).toBe(true)
    setTelemetryStoreForTesting(null)
  })
})

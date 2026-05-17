import { z } from 'zod'
import { recordTelemetryEvent } from '../telemetry/store.js'
import { getMunicipalAdapter } from './municipal-lookup.js'

const LanguageSchema = z.string().trim().max(40).optional()

function isSpanish(language?: string): boolean {
  return /^(es|spanish|espanol|español)/i.test(language ?? '')
}

function labels(language?: string): Record<string, string> {
  if (!isSpanish(language)) {
    return {
      title: 'Result',
      estimate: 'Estimated range',
      actions: 'Recommended actions',
      assumptions: 'Assumptions',
      confidence: 'Confidence',
      unknowns: 'Unknowns',
      nextSteps: 'Next steps',
    }
  }
  return {
    title: 'Resultado',
    estimate: 'Rango estimado',
    actions: 'Acciones recomendadas',
    assumptions: 'Supuestos',
    confidence: 'Confianza',
    unknowns: 'Datos desconocidos',
    nextSteps: 'Próximos pasos',
  }
}

function range(value: number, spread = 0.25, unit = 'tCO2e/year'): string {
  const low = Math.max(0, value * (1 - spread))
  const high = value * (1 + spread)
  return `${low.toFixed(1)}-${high.toFixed(1)} ${unit}`
}

function impact(level: 'low' | 'medium' | 'high'): string {
  return level === 'high' ? 'high impact' : level === 'medium' ? 'medium impact' : 'low impact'
}

export const HouseholdCarbonInputSchema = z.object({
  householdSize: z.number().int().positive().max(20),
  zip: z.string().trim().max(20).optional(),
  monthlyElectricityKwh: z.number().nonnegative().max(100_000).optional(),
  monthlyElectricityBillUsd: z.number().nonnegative().max(20_000).optional(),
  naturalGasThermsMonthly: z.number().nonnegative().max(10_000).optional(),
  heatingType: z.enum(['gas', 'electric', 'oil', 'propane', 'heat_pump', 'unknown']).optional(),
  vehicles: z.array(z.object({
    milesPerWeek: z.number().nonnegative().max(10_000),
    fuel: z.enum(['gasoline', 'diesel', 'hybrid', 'electric', 'unknown']).default('gasoline'),
  })).max(8).optional(),
  flightsShortHaulAnnual: z.number().int().nonnegative().max(200).optional(),
  flightsLongHaulAnnual: z.number().int().nonnegative().max(200).optional(),
  dietPattern: z.enum(['meat_heavy', 'average', 'low_meat', 'vegetarian', 'vegan', 'unknown']).optional(),
  recyclingHabit: z.enum(['low', 'medium', 'high', 'unknown']).optional(),
  preferredLanguage: LanguageSchema,
}).strict()

export const HomeEnergyInputSchema = z.object({
  homeType: z.enum(['single_family', 'apartment', 'condo', 'mobile_home', 'small_business', 'unknown']),
  zip: z.string().trim().max(20).optional(),
  climate: z.string().trim().max(80).optional(),
  heatingCoolingType: z.string().trim().max(120).optional(),
  monthlyBillUsd: z.number().nonnegative().max(20_000).optional(),
  knownIssues: z.array(z.string().trim().max(120)).max(10).optional(),
  budgetLevel: z.enum(['no_cost', 'low', 'medium', 'high']),
  preferredLanguage: LanguageSchema,
}).strict()

export const CommunityProjectInputSchema = z.object({
  organizationType: z.string().trim().min(2).max(120),
  goal: z.string().trim().min(3).max(240),
  location: z.string().trim().max(160).optional(),
  timeline: z.string().trim().max(120).optional(),
  budgetUsd: z.number().nonnegative().max(10_000_000).optional(),
  volunteers: z.number().int().nonnegative().max(100_000).optional(),
  stakeholders: z.array(z.string().trim().max(100)).max(20).optional(),
  constraints: z.array(z.string().trim().max(160)).max(20).optional(),
  preferredLanguage: LanguageSchema,
}).strict()

export const CertificationNavigatorInputSchema = z.object({
  userType: z.enum(['household', 'school', 'ngo', 'small_business', 'building_owner', 'community_group', 'unknown']),
  goal: z.string().trim().min(3).max(240),
  buildingType: z.string().trim().max(120).optional(),
  location: z.string().trim().max(160).optional(),
  budgetLevel: z.enum(['low', 'medium', 'high', 'unknown']).optional(),
  documentationReady: z.boolean().optional(),
  preferredLanguage: LanguageSchema,
}).strict()

export const CarbonOffsetCheckerInputSchema = z.object({
  projectName: z.string().trim().max(160).optional(),
  projectType: z.enum(['forest', 'soil', 'renewable_energy', 'cookstove', 'direct_air_capture', 'methane', 'unknown']),
  location: z.string().trim().max(160).optional(),
  registry: z.string().trim().max(120).optional(),
  pricePerTonUsd: z.number().nonnegative().max(100_000).optional(),
  permanenceInfo: z.string().trim().max(500).optional(),
  additionalityInfo: z.string().trim().max(500).optional(),
  preferredLanguage: LanguageSchema,
}).strict()

export const SustainablePurchasingInputSchema = z.object({
  productCategory: z.string().trim().min(2).max(120),
  budgetUsd: z.number().nonnegative().max(100_000).optional(),
  durabilityNeed: z.enum(['low', 'medium', 'high', 'unknown']).default('unknown'),
  repairabilityPreference: z.enum(['low', 'medium', 'high', 'unknown']).default('unknown'),
  certificationsKnown: z.array(z.string().trim().max(80)).max(12).optional(),
  localAvailabilityKnown: z.boolean().optional(),
  preferredLanguage: LanguageSchema,
}).strict()

export const CommunityResilienceInputSchema = z.object({
  communityType: z.string().trim().min(2).max(120),
  hazards: z.array(z.enum(['flood', 'heat', 'wildfire', 'storm', 'power_outage', 'drought', 'air_quality', 'other'])).min(1).max(8),
  vulnerableGroups: z.array(z.string().trim().max(100)).max(12).optional(),
  volunteers: z.number().int().nonnegative().max(100_000).optional(),
  availableResources: z.array(z.string().trim().max(120)).max(16).optional(),
  preferredLanguage: LanguageSchema,
}).strict()

export const WaterConservationInputSchema = z.object({
  householdType: z.enum(['single_family', 'apartment', 'condo', 'mobile_home', 'small_business', 'unknown']),
  location: z.string().trim().max(160).optional(),
  householdSize: z.number().int().positive().max(100).optional(),
  monthlyWaterUseGallons: z.number().nonnegative().max(1_000_000).optional(),
  monthlyWaterBillUsd: z.number().nonnegative().max(100_000).optional(),
  outdoorArea: z.enum(['none', 'small', 'medium', 'large', 'unknown']).default('unknown'),
  painPoints: z.array(z.string().trim().max(120)).max(12).optional(),
  preferredLanguage: LanguageSchema,
}).strict()

export const WasteRecyclingInputSchema = z.object({
  itemOrMaterial: z.string().trim().min(2).max(160),
  location: z.string().trim().max(160).optional(),
  condition: z.enum(['usable', 'repairable', 'broken', 'expired', 'unknown']).default('unknown'),
  quantity: z.string().trim().max(80).optional(),
  preferredLanguage: LanguageSchema,
}).strict()

export const UtilityBillInputSchema = z.object({
  utilityType: z.enum(['electricity', 'gas', 'water', 'other']),
  billingDays: z.number().int().positive().max(400).optional(),
  totalCostUsd: z.number().nonnegative().max(1_000_000).optional(),
  totalUsage: z.number().nonnegative().max(100_000_000).optional(),
  usageUnit: z.string().trim().max(30).optional(),
  fixedFeesUsd: z.number().nonnegative().max(1_000_000).optional(),
  demandChargeUsd: z.number().nonnegative().max(1_000_000).optional(),
  previousUsage: z.number().nonnegative().max(100_000_000).optional(),
  location: z.string().trim().max(160).optional(),
  householdSize: z.number().int().positive().max(100).optional(),
  notes: z.string().trim().max(600).optional(),
  preferredLanguage: LanguageSchema,
}).strict()

export const GrantSearchInputSchema = z.object({
  organizationType: z.string().trim().min(2).max(120),
  projectDescription: z.string().trim().min(10).max(500),
  location: z.string().trim().max(160).optional(),
  budgetUsd: z.number().nonnegative().max(100_000_000).optional(),
  preferredLanguage: LanguageSchema,
}).strict()

export const RepairVsReplaceInputSchema = z.object({
  productType: z.string().trim().min(2).max(120),
  ageYears: z.number().nonnegative().max(100).optional(),
  estimatedRepairCostUsd: z.number().nonnegative().max(1_000_000).optional(),
  replacementBudgetUsd: z.number().nonnegative().max(1_000_000).optional(),
  energyEfficiency: z.enum(['poor', 'average', 'good', 'unknown']).default('unknown'),
  condition: z.enum(['working', 'repairable', 'broken', 'unsafe', 'unknown']).default('unknown'),
  preferredLanguage: LanguageSchema,
}).strict()

export const HomeResilienceRetrofitInputSchema = z.object({
  homeType: z.enum(['single_family', 'apartment', 'condo', 'mobile_home', 'townhouse', 'unknown']),
  location: z.string().trim().max(160).optional(),
  hazards: z.array(z.enum(['flood', 'storm', 'wildfire', 'heat', 'power_outage', 'air_quality', 'freeze', 'drought', 'other'])).min(1).max(10),
  budgetLevel: z.enum(['no_cost', 'low', 'medium', 'high']),
  painPoints: z.array(z.string().trim().max(120)).max(12).optional(),
  preferredLanguage: LanguageSchema,
}).strict()

export const BuildingMaterialInputSchema = z.object({
  materialCategory: z.string().trim().min(2).max(120),
  durabilityNeed: z.enum(['low', 'medium', 'high', 'unknown']).default('unknown'),
  moistureConcern: z.boolean().optional(),
  fireConcern: z.boolean().optional(),
  budgetLevel: z.enum(['low', 'medium', 'high', 'unknown']).default('unknown'),
  maintenanceTolerance: z.enum(['low', 'medium', 'high', 'unknown']).default('unknown'),
  preferredLanguage: LanguageSchema,
}).strict()

export const EmergencyPreparednessInputSchema = z.object({
  householdSize: z.number().int().positive().max(100),
  location: z.string().trim().max(160).optional(),
  hazards: z.array(z.enum(['flood', 'storm', 'wildfire', 'heat', 'power_outage', 'air_quality', 'freeze', 'earthquake', 'other'])).min(1).max(10),
  hasPets: z.boolean().optional(),
  hasChildren: z.boolean().optional(),
  hasOlderAdults: z.boolean().optional(),
  medicalNeeds: z.array(z.string().trim().max(120)).max(12).optional(),
  evacuationConstraints: z.array(z.string().trim().max(160)).max(12).optional(),
  preferredLanguage: LanguageSchema,
}).strict()

export const LocalSustainabilitySourceInputSchema = z.object({
  location: z.string().trim().min(2).max(160),
  needs: z.array(z.enum(['water_restrictions', 'recycling_rules', 'hazardous_dropoff', 'rebates', 'public_works'])).min(1).max(5)
    .default(['water_restrictions', 'recycling_rules', 'hazardous_dropoff', 'rebates', 'public_works']),
  preferredLanguage: LanguageSchema,
}).strict()

export const ProductMaterialEvidenceInputSchema = z.object({
  productOrMaterial: z.string().trim().min(2).max(160),
  claimType: z.enum(['repairability', 'warranty', 'service_parts', 'material_epd', 'certification', 'low_voc', 'code_acceptance', 'green_claim', 'unknown']).default('unknown'),
  claimedEvidence: z.array(z.string().trim().max(240)).max(12).optional(),
  sourceUrls: z.array(z.string().trim().max(500)).max(10).optional(),
  certificateIds: z.array(z.string().trim().max(120)).max(10).optional(),
  preferredLanguage: LanguageSchema,
}).strict()

export const InsuranceDeclarationsInputSchema = z.object({
  documentText: z.string().trim().max(100_000).optional(),
  documentType: z.enum(['declarations', 'policy', 'claim', 'unknown']).default('unknown'),
  concern: z.string().trim().max(240).optional(),
  preferredLanguage: LanguageSchema,
}).strict()

export type HouseholdCarbonInput = z.infer<typeof HouseholdCarbonInputSchema>
export type HomeEnergyInput = z.infer<typeof HomeEnergyInputSchema>
export type CommunityProjectInput = z.infer<typeof CommunityProjectInputSchema>
export type CertificationNavigatorInput = z.infer<typeof CertificationNavigatorInputSchema>
export type CarbonOffsetCheckerInput = z.infer<typeof CarbonOffsetCheckerInputSchema>
export type SustainablePurchasingInput = z.infer<typeof SustainablePurchasingInputSchema>
export type CommunityResilienceInput = z.infer<typeof CommunityResilienceInputSchema>
export type WaterConservationInput = z.infer<typeof WaterConservationInputSchema>
export type WasteRecyclingInput = z.infer<typeof WasteRecyclingInputSchema>
export type UtilityBillInput = z.infer<typeof UtilityBillInputSchema>
export type GrantSearchInput = z.infer<typeof GrantSearchInputSchema>
export type RepairVsReplaceInput = z.infer<typeof RepairVsReplaceInputSchema>
export type HomeResilienceRetrofitInput = z.infer<typeof HomeResilienceRetrofitInputSchema>
export type BuildingMaterialInput = z.infer<typeof BuildingMaterialInputSchema>
export type EmergencyPreparednessInput = z.infer<typeof EmergencyPreparednessInputSchema>
export type LocalSustainabilitySourceInput = z.infer<typeof LocalSustainabilitySourceInputSchema>
export type ProductMaterialEvidenceInput = z.infer<typeof ProductMaterialEvidenceInputSchema>
export type InsuranceDeclarationsInput = z.infer<typeof InsuranceDeclarationsInputSchema>

export interface PracticalSustainabilityResult {
  labels: Record<string, string>
  summary: string
  confidence: 'low' | 'medium' | 'high'
  assumptions: string[]
  unknowns: string[]
  [key: string]: unknown
}

async function telemetry(workflow: string, confidence: string): Promise<void> {
  await recordTelemetryEvent({ type: 'sustainability_scored', data: { workflow, confidence } })
}

function priorityAction(action: string, category: string, impactLevel: 'low' | 'medium' | 'high', cost: '$0' | 'under $100' | 'under $500' | 'major upgrade', difficulty: 'easy' | 'moderate' | 'hard', timeHorizon: 'this week' | 'this month' | 'this season' | 'longer term') {
  return { action, category, impact: impact(impactLevel), cost, difficulty, timeHorizon }
}

export async function estimateHouseholdCarbon(input: unknown): Promise<PracticalSustainabilityResult> {
  const parsed = HouseholdCarbonInputSchema.parse(input)
  const electricityKwh = parsed.monthlyElectricityKwh ?? (parsed.monthlyElectricityBillUsd ? parsed.monthlyElectricityBillUsd / 0.17 : 850)
  const electricity = electricityKwh * 12 * 0.00039
  const gas = (parsed.naturalGasThermsMonthly ?? (parsed.heatingType === 'gas' ? 45 : 0)) * 12 * 0.0053
  const vehicle = (parsed.vehicles ?? []).reduce((sum, v) => {
    const factor = v.fuel === 'electric' ? 0.08 : v.fuel === 'hybrid' ? 0.22 : v.fuel === 'diesel' ? 0.45 : 0.39
    return sum + v.milesPerWeek * 52 * factor / 1000
  }, 0)
  const flights = (parsed.flightsShortHaulAnnual ?? 0) * 0.18 + (parsed.flightsLongHaulAnnual ?? 0) * 0.9
  const food = parsed.householdSize * ({ meat_heavy: 3.2, average: 2.4, low_meat: 1.8, vegetarian: 1.4, vegan: 1.0, unknown: 2.4 }[parsed.dietPattern ?? 'unknown'])
  const waste = parsed.householdSize * ({ low: 0.7, medium: 0.45, high: 0.25, unknown: 0.5 }[parsed.recyclingHabit ?? 'unknown'])
  const total = electricity + gas + vehicle + flights + food + waste
  const categories = [
    { category: 'home electricity', estimatedTco2e: Number(electricity.toFixed(1)) },
    { category: 'heating/fuels', estimatedTco2e: Number(gas.toFixed(1)) },
    { category: 'transportation', estimatedTco2e: Number(vehicle.toFixed(1)) },
    { category: 'flights', estimatedTco2e: Number(flights.toFixed(1)) },
    { category: 'food', estimatedTco2e: Number(food.toFixed(1)) },
    { category: 'waste', estimatedTco2e: Number(waste.toFixed(1)) },
  ].sort((a, b) => b.estimatedTco2e - a.estimatedTco2e)
  const unknowns = [
    !parsed.monthlyElectricityKwh && !parsed.monthlyElectricityBillUsd ? 'actual electricity usage or bill' : '',
    parsed.naturalGasThermsMonthly === undefined ? 'actual natural gas or heating fuel use' : '',
    !parsed.vehicles?.length ? 'vehicle mileage and fuel type' : '',
    !parsed.dietPattern ? 'diet pattern' : '',
  ].filter(Boolean)
  const result: PracticalSustainabilityResult = {
    labels: labels(parsed.preferredLanguage),
    summary: `Estimated household footprint is ${range(total)}. Treat this as a screening range, not an audit.`,
    estimatedAnnualEmissionsRange: range(total),
    categoryBreakdown: {
      electricity: { estimatedRange: range(electricity), source: parsed.monthlyElectricityKwh ? 'user kWh' : parsed.monthlyElectricityBillUsd ? 'bill-derived estimate' : 'default estimate' },
      heatingFuel: { estimatedRange: range(gas), source: parsed.naturalGasThermsMonthly !== undefined ? 'user therms' : parsed.heatingType ? 'heating-type estimate' : 'unknown/default' },
      transport: { estimatedRange: range(vehicle), source: parsed.vehicles?.length ? 'user vehicle mileage' : 'missing vehicle data' },
      food: { estimatedRange: range(food), source: parsed.dietPattern ?? 'unknown/default' },
      waste: { estimatedRange: range(waste), source: parsed.recyclingHabit ?? 'unknown/default' },
    },
    topContributingCategories: categories.slice(0, 4),
    reductionActions: [
      'Use the utility bill to replace estimates with actual kWh and fuel use.',
      categories[0]?.category === 'transportation' ? 'Reduce car miles, combine trips, or consider transit/EV options where practical.' : 'Prioritize the largest category first rather than symbolic actions.',
      'Switch high-use bulbs to LEDs and reduce standby loads.',
      'Improve air sealing/insulation before oversizing HVAC upgrades.',
      'Shift some meals toward lower-carbon proteins if food is a top contributor.',
    ],
    actionPriorities: [
      priorityAction('Replace estimates with 12 months of utility data.', 'measurement', 'medium', '$0', 'easy', 'this week'),
      priorityAction('Air seal obvious leaks and change HVAC filters.', 'heating/fuel', 'medium', 'under $100', 'easy', 'this week'),
      priorityAction('Reduce weekly car miles through trip combining, transit, carpooling, or remote days.', 'transport', 'high', '$0', 'moderate', 'this month'),
      priorityAction('Switch high-use lighting and plug loads first.', 'electricity', 'medium', 'under $100', 'easy', 'this month'),
      priorityAction('Plan insulation, heat pump, or vehicle upgrades only after measuring current use.', 'major upgrades', 'high', 'major upgrade', 'hard', 'longer term'),
    ],
    whatToMeasureNext: unknowns.length ? unknowns : ['monthly utility use', 'vehicle mileage', 'food pattern', 'waste/recycling volume'],
    monthlyTrackingPrompt: 'Once a month, record electricity kWh, heating fuel, car miles, flights, and one action taken. Compare ranges over time, not against other households.',
    householdComparisonWarning: 'Do not use this to shame a household. Homes, climate, income, health needs, and transit access differ. Use ranges and focus on practical next actions.',
    confidence: unknowns.length <= 1 ? 'medium' : 'low',
    assumptions: ['US-average emissions factors are used for a screening estimate.', 'Ranges are intentionally broad to avoid fake precision.'],
    unknowns,
    dataThatWouldImproveAccuracy: ['12 months of utility bills', 'vehicle odometer/commute mileage', 'flight history', 'home heating fuel receipts'],
  }
  await telemetry('household_carbon_footprint', result.confidence)
  return result
}

export async function planHomeEnergyActions(input: unknown): Promise<PracticalSustainabilityResult> {
  const parsed = HomeEnergyInputSchema.parse(input)
  const issues = parsed.knownIssues ?? []
  const result: PracticalSustainabilityResult = {
    labels: labels(parsed.preferredLanguage),
    summary: `Energy action plan for ${parsed.homeType.replace('_', ' ')} with ${parsed.budgetLevel.replace('_', ' ')} budget.`,
    noCostActions: ['Set thermostat schedules.', 'Close blinds during extreme heat and open them for winter sun.', 'Unplug idle loads and clean HVAC filters.'],
    lowCostActions: ['Weatherstrip doors/windows.', 'Add LED bulbs in high-use rooms.', 'Use smart plugs or timers for repeat loads.'],
    upgradeActions: parsed.budgetLevel === 'no_cost' || parsed.budgetLevel === 'low'
      ? ['Get quotes only after low/no-cost fixes; ask utility about rebates.']
      : ['Air sealing and insulation audit.', 'Heat pump or efficient HVAC evaluation.', 'Heat pump water heater or smart thermostat if compatible.'],
    expectedImpactLevel: parsed.monthlyBillUsd && parsed.monthlyBillUsd > 250 ? impact('high') : impact('medium'),
    seasonalPriority: /heat|cool|hvac|ac|air/i.test(`${parsed.heatingCoolingType} ${issues.join(' ')}`) ? 'Start before the next heating/cooling season.' : 'Start with weatherization and bill review.',
    seasonalPlan: {
      thisWeek: ['Review last utility bill.', 'Replace/clean HVAC filter.', 'Set thermostat schedule.', 'Check obvious drafts.'],
      thisMonth: ['Weatherstrip doors/windows.', 'Install LEDs in high-use rooms.', 'Ask utility for audit/rebate options.'],
      beforeWinterSummer: ['Book HVAC service before peak season.', 'Prioritize insulation/air sealing quote.', 'Check heat pump or efficient equipment incentives if replacement is likely.'],
    },
    budgetTiers: {
      '$0': ['Thermostat schedule', 'filter cleaning/replacement if spare is available', 'shade/sun management', 'unplug idle loads'],
      under100: ['weatherstripping', 'LED bulbs', 'smart plugs/timers', 'low-flow showerhead if water heating is high'],
      under500: ['basic air sealing materials', 'smart thermostat if compatible', 'professional energy audit where subsidized'],
      majorUpgrade: ['insulation', 'heat pump HVAC', 'heat pump water heater', 'window or ductwork upgrades after audit evidence'],
    },
    utilityRebateLookup: {
      sourceStatus: parsed.zip ? 'fallback-search-prompt' : 'location-needed',
      prompt: parsed.zip ? `Search: utility rebates energy efficiency ${parsed.zip}` : 'Add ZIP to look up utility and rebate programs.',
    },
    safetyNotes: ['Use licensed professionals for electrical panel, wiring, gas, refrigerant, and combustion appliance work.', 'Do not block ventilation or bypass safety controls.', 'If you smell gas or suspect carbon monoxide, leave and call the utility/emergency line.'],
    confidence: parsed.monthlyBillUsd && parsed.heatingCoolingType ? 'medium' : 'low',
    assumptions: ['This is a practical screening plan, not an energy audit.', 'Utility programs require local verification.'],
    unknowns: [!parsed.zip ? 'ZIP/local utility' : '', !parsed.monthlyBillUsd ? 'monthly bill' : '', !parsed.heatingCoolingType ? 'heating/cooling system' : ''].filter(Boolean),
  }
  await telemetry('home_energy_action_plan', result.confidence)
  return result
}

export async function planCommunityProject(input: unknown): Promise<PracticalSustainabilityResult> {
  const parsed = CommunityProjectInputSchema.parse(input)
  const result: PracticalSustainabilityResult = {
    labels: labels(parsed.preferredLanguage),
    summary: `${parsed.organizationType} project plan for: ${parsed.goal}.`,
    projectPlan: ['Define scope and site owner.', 'Recruit core team and assign leads.', 'Confirm permits/safety needs.', 'Run pilot event.', 'Measure and report outcomes.'],
    projectPhases: {
      prepare: ['Define site, scope, safety rules, and permissions.', 'Create materials list and budget.'],
      recruit: ['Invite volunteers and partners.', 'Assign shift leads and backup contacts.'],
      execute: ['Run kickoff briefing.', 'Track participation and issues during the event.'],
      measure: ['Record outputs such as bags collected, trees planted, households reached, or kWh/water saved.'],
      reportBack: ['Share results, thank participants, and publish next-step commitments.'],
    },
    roleAssignments: {
      coordinator: 'Owns timeline, permissions, budget, and final go/no-go.',
      volunteerLead: 'Recruits volunteers, manages shifts, and handles day-of check-in.',
      partnershipsLead: 'Coordinates school/NGO/city/business partners and in-kind support.',
      dataImpactLead: 'Tracks participation, photos, outputs, and follow-up metrics.',
    },
    stakeholderMap: ['organizer/core team', ...(parsed.stakeholders ?? []), 'local government or property owner', 'volunteers', 'funders/sponsors'],
    fundingGrantSearchPrompts: [
      `Search local grants for ${parsed.goal} ${parsed.location ?? ''}`.trim(),
      `Search corporate volunteer or school sustainability grants ${parsed.location ?? ''}`.trim(),
    ],
    riskPermitChecklist: ['site permission', 'insurance/liability', 'waste handling', 'weather backup', 'accessibility and safety plan'],
    volunteerTaskList: ['outreach', 'materials', 'site lead', 'data/photos', 'cleanup/logistics', 'thank-you/follow-up'],
    impactMetrics: {
      participation: ['participants', 'volunteer hours', 'partner organizations'],
      wasteDiverted: ['bags/items collected', 'estimated pounds diverted if weighed', 'hazardous items handled safely'],
      emissionsAvoidedEstimate: ['only estimate emissions avoided when method and assumptions are explicit'],
      educationReach: ['households reached', 'students engaged', 'materials distributed'],
    },
    metricsToTrack: ['participants', 'hours volunteered', 'waste diverted or energy/water saved', 'cost', 'before/after photos', 'follow-up commitments'],
    grantFundingChecklist: ['clear project goal', 'beneficiary description', 'budget', 'timeline', 'partner letters if available', 'impact metrics', 'photos/site description', 'maintenance plan'],
    confidence: parsed.location && parsed.timeline && parsed.volunteers !== undefined ? 'medium' : 'low',
    assumptions: ['Funding and permits must be verified locally.', 'Plan is sized for an early pilot project.'],
    unknowns: [!parsed.location ? 'location' : '', !parsed.timeline ? 'timeline' : '', parsed.budgetUsd === undefined ? 'budget' : '', parsed.volunteers === undefined ? 'volunteer count' : ''].filter(Boolean),
  }
  await telemetry('community_sustainability_project', result.confidence)
  return result
}

export async function navigateCertification(input: unknown): Promise<PracticalSustainabilityResult> {
  const parsed = CertificationNavigatorInputSchema.parse(input)
  const lower = `${parsed.goal} ${parsed.buildingType ?? ''}`.toLowerCase()
  const path = lower.includes('building') || lower.includes('renovation')
    ? 'LEED or local green building program'
    : lower.includes('health') || lower.includes('wellness')
      ? 'WELL readiness path'
      : lower.includes('energy') || parsed.userType === 'household'
        ? 'ENERGY STAR / utility rebate path'
        : parsed.userType === 'small_business'
          ? 'small business ESG readiness path'
          : 'community sustainability reporting path'
  const result: PracticalSustainabilityResult = {
    labels: labels(parsed.preferredLanguage),
    summary: `Likely fit: ${path}. This is a navigator, not certification approval.`,
    recommendedPath: path,
    readinessChecklist: ['clear goal', 'site or organization owner identified', 'utility/data access', 'budget owner', 'document owner', 'timeline for application or self-assessment'],
    eligibilityQuestions: ['Who owns or controls the site?', 'Is there utility/bill documentation?', 'Are drawings, equipment specs, or policies available?', 'Is third-party certification budget available?'],
    requiredDocuments: ['utility bills', 'building or project description', 'equipment/spec sheets where relevant', 'photos/site notes', 'policies or procedures if pursuing organizational readiness'],
    documentChecklist: ['utility bills', 'floor/site description', 'equipment list', 'policies/procedures', 'photos', 'maintenance records', 'procurement or operations notes'],
    nextSteps: ['Confirm goal and budget.', 'Gather required documents.', 'Check local utility/rebate programs.', 'Contact the certification body or accredited professional if formal certification is desired.'],
    complexityCostLevel: path.includes('LEED') || path.includes('WELL') ? 'medium to high' : 'low to medium',
    estimatedComplexity: path.includes('LEED') || path.includes('WELL') ? 'medium/high: formal documentation and professional support may be needed' : 'low/medium: start with checklist, utility programs, and self-assessment',
    startHereRecommendation: path.includes('LEED') || path.includes('WELL') ? 'Start with document readiness and a short feasibility call before paying application fees.' : 'Start with free utility/rebate or self-assessment resources before paid certification.',
    frameworkComparison: [
      { framework: 'ENERGY STAR / utility rebates', bestFor: 'energy savings and equipment/building efficiency', complexity: 'low to medium' },
      { framework: 'LEED/BREEAM', bestFor: 'formal green building certification', complexity: 'medium to high' },
      { framework: 'WELL', bestFor: 'health and occupant experience', complexity: 'medium to high' },
      { framework: 'ESG readiness', bestFor: 'small business customer/lender requests', complexity: 'low to medium' },
    ],
    lowerComplexityAlternative: 'If formal certification is too heavy, start with utility rebates, ENERGY STAR Portfolio Manager-style tracking, or a simple ESG readiness checklist.',
    disclaimer: 'OpenSeaBri does not certify eligibility and does not invent certification status.',
    confidence: parsed.goal && parsed.userType !== 'unknown' ? 'medium' : 'low',
    assumptions: ['Recommendation is based on stated goal and user type only.', 'Local rules and program fees must be verified.'],
    unknowns: [!parsed.location ? 'location' : '', parsed.documentationReady === undefined ? 'document readiness' : '', !parsed.budgetLevel || parsed.budgetLevel === 'unknown' ? 'budget level' : ''].filter(Boolean),
  }
  await telemetry('certification_navigator', result.confidence)
  return result
}

export async function checkCarbonOffsetQuality(input: unknown): Promise<PracticalSustainabilityResult> {
  const parsed = CarbonOffsetCheckerInputSchema.parse(input)
  const flags: string[] = []
  if (!parsed.registry) flags.push('No registry supplied; verification status is unknown.')
  if (!parsed.permanenceInfo && ['forest', 'soil'].includes(parsed.projectType)) flags.push('Permanence/reversal risk needs verification.')
  if (!parsed.additionalityInfo) flags.push('Additionality evidence not supplied.')
  if (parsed.pricePerTonUsd !== undefined && parsed.pricePerTonUsd < 3) flags.push('Very low price may indicate quality risk or missing project details.')
  const risk = flags.length >= 3 ? 'high' : flags.length >= 1 ? 'medium' : 'low'
  const yellow = flags
  const red = !parsed.registry ? ['Unknown registry means the project cannot pass this screening.'] : []
  const green = parsed.registry && parsed.additionalityInfo && parsed.permanenceInfo ? ['Registry, additionality, and permanence information were supplied for review.'] : []
  const result: PracticalSustainabilityResult = {
    labels: labels(parsed.preferredLanguage),
    summary: `Offset quality screen: ${risk} greenwashing risk based on supplied attributes. Verification status is not invented.`,
    qualityFlags: flags.length ? flags : ['No immediate red flags from supplied attributes, but registry documents still need review.'],
    qualityDimensions: {
      additionality: parsed.additionalityInfo ? 'information supplied; verify evidence quality' : 'unknown',
      permanence: parsed.permanenceInfo ? 'information supplied; verify monitoring and reversal buffer' : 'unknown',
      leakage: 'unknown unless project documents address it',
      verification: parsed.registry ? 'registry supplied; live status not checked' : 'unknown registry',
      vintage: 'unknown unless credit vintage is supplied in documents',
      registry: parsed.registry || 'unknown',
      coBenefits: 'unknown unless independently documented',
    },
    trafficLightFlags: {
      red,
      yellow,
      green,
    },
    greenwashingRisk: risk,
    questionsToVerify: ['Is the project listed in the claimed registry?', 'Is the credit retired or still for sale?', 'What is the additionality argument?', 'How is permanence monitored?', 'Are leakage and double-counting addressed?'],
    questionsToAskSeller: ['What registry and project ID?', 'What vintage?', 'Has the credit already been retired?', 'Where are the monitoring reports?', 'What happens if stored carbon is reversed?'],
    guidance: risk === 'high' ? 'avoid until evidence is verified' : risk === 'medium' ? 'verify before purchase' : 'consider only after checking registry documents and retirement status',
    recommendation: risk === 'high' ? 'Do not rely on this offset until registry, additionality, and permanence evidence are verified.' : 'Proceed only after checking registry documents and retirement status.',
    confidence: parsed.registry && parsed.additionalityInfo && parsed.permanenceInfo ? 'medium' : 'low',
    assumptions: ['This tool evaluates supplied attributes only.', 'It does not confirm live registry status.'],
    unknowns: [!parsed.registry ? 'registry' : '', !parsed.location ? 'location' : '', !parsed.permanenceInfo ? 'permanence evidence' : '', !parsed.additionalityInfo ? 'additionality evidence' : ''].filter(Boolean),
  }
  await telemetry('carbon_offset_quality', result.confidence)
  return result
}

export async function buildSustainablePurchasingChecklist(input: unknown): Promise<PracticalSustainabilityResult> {
  const parsed = SustainablePurchasingInputSchema.parse(input)
  const unknowns = [
    parsed.budgetUsd === undefined ? 'budget' : '',
    !parsed.certificationsKnown?.length ? 'verified certifications' : '',
    parsed.localAvailabilityKnown === undefined ? 'local availability' : '',
  ].filter(Boolean)
  const result: PracticalSustainabilityResult = {
    labels: labels(parsed.preferredLanguage),
    summary: `Buying checklist for ${parsed.productCategory}. Use this to ask better questions before purchase, not to certify a product.`,
    buyingChecklist: [
      'Can this product last long enough to avoid repeat purchases?',
      'Can common parts be repaired or replaced?',
      'Is packaging minimal, recyclable, or reusable in your area?',
      'Are any certifications user-provided and verifiable?',
      'Is there a used, refurbished, refillable, or shared option?',
    ],
    redFlags: ['vague eco claims without documents', 'single-use design for a durable need', 'no repair parts or warranty information', 'certification logos without certificate IDs'],
    betterAlternativeTypes: parsed.durabilityNeed === 'high'
      ? ['durable repairable option', 'refurbished higher-quality option', 'local used option with inspection']
      : ['borrow/rent/share option', 'refillable or reusable option', 'lower-packaging option'],
    questionsBeforePurchase: ['How long should it last?', 'What breaks first?', 'Can it be repaired?', 'What happens at end of life?', 'Is the certification verifiable?'],
    endOfLifeConsiderations: ['reuse or donate first if safe', 'check local recycling rules', 'separate batteries/electronics/hazardous components', 'avoid wishcycling unknown materials'],
    confidence: unknowns.length <= 1 ? 'medium' : 'low',
    assumptions: ['No marketplace or lifecycle database is queried.', 'Checklist is based on user-provided attributes and general sustainable purchasing principles.'],
    unknowns,
  }
  await telemetry('sustainable_purchasing_checklist', result.confidence)
  return result
}

export async function adviseRepairVsReplace(input: unknown): Promise<PracticalSustainabilityResult> {
  const parsed = RepairVsReplaceInputSchema.parse(input)
  const repairCostKnown = parsed.estimatedRepairCostUsd !== undefined
  const replacementKnown = parsed.replacementBudgetUsd !== undefined
  const repairRatio = repairCostKnown && replacementKnown && parsed.replacementBudgetUsd! > 0
    ? parsed.estimatedRepairCostUsd! / parsed.replacementBudgetUsd!
    : undefined
  const oldItem = (parsed.ageYears ?? 0) >= 10
  const unsafe = parsed.condition === 'unsafe'
  const inefficient = parsed.energyEfficiency === 'poor'
  const repairFavored = !unsafe && (parsed.condition === 'repairable' || parsed.condition === 'working') && (repairRatio === undefined || repairRatio < 0.5) && !(oldItem && inefficient)
  const unknowns = [
    parsed.ageYears === undefined ? 'product age' : '',
    !repairCostKnown ? 'repair cost' : '',
    !replacementKnown ? 'replacement budget or quote' : '',
    parsed.energyEfficiency === 'unknown' ? 'energy efficiency' : '',
    parsed.condition === 'unknown' ? 'condition and safety status' : '',
  ].filter(Boolean)

  const result: PracticalSustainabilityResult = {
    labels: labels(parsed.preferredLanguage),
    summary: `Repair vs replace screening for ${parsed.productType}. This is a decision aid, not a product audit.`,
    decision: unsafe
      ? 'Do not keep using an unsafe item; get qualified safety guidance and compare repair versus replacement after safety is addressed.'
      : repairFavored
        ? 'Repair first if a qualified repair is available and the item can keep working safely.'
        : 'Compare replacement options because age, efficiency, condition, or repair cost may make replacement reasonable.',
    repairRecommendation: unsafe
      ? 'Pause normal repair decisions until safety is checked by a qualified professional.'
      : repairFavored
        ? 'Repair is the first sustainability choice when the item can be made reliable at a modest repair cost.'
        : 'Repair may still be worthwhile if it extends useful life, but confirm reliability and parts availability before spending.',
    replacementRecommendation: unsafe || (oldItem && inefficient)
      ? 'Replacement may be justified if the current item is unsafe, very inefficient, or near end of useful life; choose durable and repairable options.'
      : 'Delay replacement unless repair is unavailable, unreliable, or close to replacement cost.',
    sustainabilityTradeoff: repairFavored
      ? 'Repair usually avoids waste and delays manufacturing impacts when the item can remain useful and safe.'
      : 'Replacement may reduce operating energy or water use for inefficient appliances, but creates disposal and manufacturing impacts.',
    financialTradeoff: repairRatio !== undefined
      ? `Known repair cost is about ${Math.round(repairRatio * 100)}% of the replacement budget; use this as a rough threshold, not a rule.`
      : 'Repair cost and replacement budget are incomplete, so compare written repair quotes, warranty, expected life, and operating costs.',
    wasteImpact: 'Keep the old item out of disposal when safe; if replacing, use take-back, donation, repair resale, or verified recycling routes before trash.',
    nextSteps: [
      'Get one written repair diagnosis with parts/labor and expected life.',
      'Compare warranty, repair parts availability, and likely operating use of replacement options.',
      'Check whether the old item can be donated, reused for parts, or recycled through a verified program.',
      'Avoid buying only because of vague eco claims; look for durability and serviceability.',
    ],
    confidence: unknowns.length <= 1 ? 'medium' : 'low',
    assumptions: ['No product database, warranty database, energy label database, or lifecycle database is queried.', 'Operating savings and embodied impacts are qualitative unless the user provides verified data.'],
    unknowns,
  }
  await telemetry('repair_vs_replace_assistant', result.confidence)
  return result
}

export async function planHomeResilienceRetrofits(input: unknown): Promise<PracticalSustainabilityResult> {
  const parsed = HomeResilienceRetrofitInputSchema.parse(input)
  const hazards = new Set(parsed.hazards)
  const flood = hazards.has('flood')
  const storm = hazards.has('storm')
  const heat = hazards.has('heat')
  const wildfire = hazards.has('wildfire') || hazards.has('air_quality')
  const outage = hazards.has('power_outage')
  const unknowns = [
    !parsed.location ? 'location for local hazard and permit checks' : '',
    !parsed.painPoints?.length ? 'specific weak points or prior damage history' : '',
  ].filter(Boolean)

  const prioritizedResilienceUpgrades = [
    'Inspect drainage paths, gutters, downspouts, and grading before buying equipment.',
    flood ? 'Move critical items, documents, mechanicals, and electrical loads above likely water lines where practical.' : '',
    storm ? 'Check roof, flashing, shutters, window/door seals, and tree-limb risks before storm season.' : '',
    outage ? 'Create a backup power plan for phones, lights, refrigeration, and medical devices before buying a generator.' : '',
    heat ? 'Prioritize shade, air sealing, safe cooling rooms, and HVAC maintenance before peak heat.' : '',
    wildfire ? 'Improve filtration, close smoke entry points, and maintain defensible space where locally applicable.' : '',
  ].filter(Boolean)

  const result: PracticalSustainabilityResult = {
    labels: labels(parsed.preferredLanguage),
    summary: `Home resilience retrofit plan for ${parsed.homeType.replace('_', ' ')}. Local hazard maps, permits, and insurance terms are not verified by this tool.`,
    prioritizedResilienceUpgrades,
    lowCostActions: [
      'Move important documents and valuables above likely water lines.',
      'Photograph home systems and keep policy, deed/lease, and receipts in cloud plus waterproof storage.',
      'Clear gutters, drains, and debris around doors, vents, and exterior drains.',
      outage ? 'Add battery packs, flashlights, and a refrigerator/medical-device outage plan.' : 'Create a basic power outage plan even if outages are not the main concern.',
    ],
    majorUpgrades: [
      flood ? 'Professional drainage, sump pump, backflow preventer, or floodproofing evaluation where flood risk is verified.' : 'Professional site drainage evaluation if water enters or pools near the home.',
      storm ? 'Roof reinforcement, impact-rated openings, or storm shutters after local code and permit review.' : 'Envelope repairs such as roof, window, and door upgrades when inspection evidence supports them.',
      outage ? 'Transfer-switch and battery/backup-power design by qualified professionals if backup power is needed.' : 'Electrical and mechanical upgrades only after a qualified assessment.',
    ],
    expectedResilienceImpact: 'Low-cost actions improve readiness and reduce avoidable damage; major upgrades should be prioritized only after verified hazard, inspection, permit, and budget review.',
    seasonalPriority: flood || storm ? 'Complete drainage, roof, and document-prep tasks before storm season.' : heat ? 'Prepare cooling and HVAC maintenance before peak heat.' : 'Start with household readiness and the highest verified local hazard.',
    insuranceImplications: 'Ask the insurer what documentation, inspections, deductibles, exclusions, and mitigation discounts apply. This tool does not promise coverage or lower insurance cost.',
    nextSteps: [
      'Verify hazards with local emergency management, flood maps, utility outage history, and insurer resources.',
      'Get qualified inspections before structural, electrical, drainage, gas, or roof work.',
      'Prioritize fixes that reduce immediate failure points before cosmetic upgrades.',
    ],
    localRiskStatus: 'not_verified',
    confidence: unknowns.length <= 1 ? 'medium' : 'low',
    assumptions: ['No live hazard map, permit database, contractor database, or insurance policy is queried.', 'Recommendations are screening guidance and may not fit every building or code jurisdiction.'],
    unknowns,
  }
  await telemetry('home_resilience_retrofit_planner', result.confidence)
  return result
}

export async function compareBuildingMaterials(input: unknown): Promise<PracticalSustainabilityResult> {
  const parsed = BuildingMaterialInputSchema.parse(input)
  const moisture = parsed.moistureConcern === true
  const fire = parsed.fireConcern === true
  const lowMaintenance = parsed.maintenanceTolerance === 'low'
  const materialOptions = [
    'Durable reclaimed, salvaged, or refurbished materials where quality and safety can be inspected.',
    'Long-life conventional materials with repairable parts, replaceable sections, and clear maintenance instructions.',
    moisture ? 'Moisture-tolerant assemblies and finishes that can dry, be inspected, and resist mold in wet areas.' : 'Lower-impact finishes with low-VOC documentation where moisture exposure is limited.',
    fire ? 'Noncombustible or ignition-resistant options that match local code and wildfire/fire exposure.' : 'Locally available options that balance durability, maintenance, and cost.',
  ]

  const result: PracticalSustainabilityResult = {
    labels: labels(parsed.preferredLanguage),
    summary: `Building material comparison for ${parsed.materialCategory}. Use this to narrow options before getting product-specific documentation.`,
    materialOptions,
    prosCons: [
      'Reused or salvaged materials can reduce waste, but quality, contaminants, fit, and code acceptance must be checked.',
      'High-durability materials can lower replacement frequency, but may cost more up front.',
      'Low-maintenance materials reduce upkeep burden, but some options are harder to repair or recycle.',
      'Bio-based or recycled-content materials need product-specific moisture, fire, and indoor-air documentation.',
    ],
    sustainabilityConsiderations: [
      'Favor long service life, repairability, low waste, and product transparency over vague green claims.',
      'Ask for Environmental Product Declarations only when project scale warrants it; do not assume an EPD means best choice.',
      'Prefer right-sized materials and avoid overbuilding when durability requirements are moderate.',
    ],
    durability: parsed.durabilityNeed === 'high'
      ? 'High durability is a primary requirement; avoid fragile finishes that need frequent replacement.'
      : 'Match durability to room use so the lowest-impact material is not replaced prematurely.',
    maintenance: lowMaintenance
      ? 'Choose materials with simple cleaning, replaceable sections, and clear maintenance instructions.'
      : 'Higher-maintenance materials can work if the household can keep up with sealing, cleaning, or refinishing.',
    embodiedCarbonGuidance: 'This is screening guidance only. Do not claim precise embodied-carbon performance without product-specific quantity takeoff, EPDs, transport assumptions, and service-life comparison.',
    indoorAirQualityConcerns: 'Ask for low-VOC finishes, adhesives, sealants, and ventilation guidance; avoid products with unclear emissions information in bedrooms, nurseries, or tight homes.',
    bestFitRecommendation: moisture
      ? 'Best fit is a durable, moisture-tolerant, repairable option with low-VOC finish documentation and installer experience in wet areas.'
      : fire
        ? 'Best fit is a durable option that meets local fire/code requirements with clear maintenance and product documentation.'
        : 'Best fit is the longest-lived repairable option within budget that avoids vague green claims and provides clear maintenance information.',
    confidence: parsed.durabilityNeed !== 'unknown' && parsed.budgetLevel !== 'unknown' ? 'medium' : 'low',
    assumptions: ['No brand, EPD, certification, code, or supplier database is queried.', 'Material fit depends on installation quality, local code, moisture exposure, and maintenance.'],
    unknowns: [
      parsed.budgetLevel === 'unknown' ? 'budget level' : '',
      parsed.durabilityNeed === 'unknown' ? 'durability requirement' : '',
      parsed.maintenanceTolerance === 'unknown' ? 'maintenance tolerance' : '',
      parsed.moistureConcern === undefined ? 'moisture exposure' : '',
      parsed.fireConcern === undefined ? 'fire/code concern' : '',
    ].filter(Boolean),
  }
  await telemetry('building_material_comparator', result.confidence)
  return result
}

export async function planEmergencyPreparedness(input: unknown): Promise<PracticalSustainabilityResult> {
  const parsed = EmergencyPreparednessInputSchema.parse(input)
  const hazards = new Set(parsed.hazards)
  const hasFlood = hazards.has('flood')
  const hasStorm = hazards.has('storm')
  const hasHeat = hazards.has('heat')
  const hasOutage = hazards.has('power_outage') || hasStorm
  const unknowns = [
    !parsed.location ? 'location for verified alerts, evacuation zones, and shelters' : '',
    !parsed.evacuationConstraints?.length ? 'evacuation constraints' : '',
    !parsed.medicalNeeds?.length && !parsed.hasOlderAdults ? 'medical/device support needs' : '',
  ].filter(Boolean)

  const result: PracticalSustainabilityResult = {
    labels: labels(parsed.preferredLanguage),
    summary: `Emergency preparedness plan for a ${parsed.householdSize}-person household. Verify all local orders and shelter information with official sources.`,
    emergencyChecklist: [
      'Sign up for verified local emergency alerts and keep a battery-powered way to receive updates.',
      'Choose a safe room or meetup point for shelter-in-place and one backup location outside the hazard area.',
      'Photograph IDs, insurance, medicines, pets, home systems, and important documents before an event.',
      hasFlood ? 'Move documents, chargers, medications, and valuables above likely water lines before heavy rain.' : 'Keep documents and chargers in a grab-and-go location.',
      hasHeat ? 'Identify a cooling plan for the hottest room, vulnerable people, and medication storage.' : 'Include heat and cold contingencies even if they are not the main hazard.',
    ],
    supplyList: [
      'Water, shelf-stable food, manual can opener, first aid, sanitation supplies, and flashlights.',
      hasOutage ? 'Battery packs, spare cables, headlamps, and a refrigeration plan for food or medicine.' : 'Basic lights and chargers for short outages.',
      parsed.hasPets ? 'Pet food, leash/carrier, medication, and vaccination records if pets are present.' : 'Pet supplies if pets join the household later or visitors bring animals.',
      parsed.hasChildren ? 'Child-specific food, comfort items, school pickup contacts, and copies of custody/medical documents if relevant.' : 'Household-specific comfort and accessibility items.',
      parsed.medicalNeeds?.length ? 'Medication list, device power needs, prescriptions, and clinician/pharmacy contacts.' : 'A printed medication and allergy list if anyone uses regular medicine.',
    ],
    communicationPlan: [
      'Choose one out-of-area contact and one neighborhood check-in contact.',
      'Write down phone numbers because phones may be locked, lost, or uncharged.',
      'Set a check-in schedule for before, during, and after the event.',
      'Plan language, accessibility, child pickup, and pet communication needs.',
    ],
    evacuationConsiderations: [
      hasStorm || hasFlood ? 'Know your evacuation zone from official local sources before a storm or flood threat.' : 'Identify at least two routes away from the home.',
      parsed.evacuationConstraints?.length ? `Constraints to plan around: ${parsed.evacuationConstraints.join(', ')}.` : 'Add transportation, mobility, work, school, and caregiver constraints.',
      'Keep fuel/charging, keys, go-bags, documents, and pet carriers ready when risk is elevated.',
      'Do not wait for this app if officials issue evacuation or safety instructions.',
    ],
    nextPreparednessSteps: [
      'Verify local alert signup, evacuation zone, and shelter sources.',
      'Build or refresh supplies this week using what the household actually eats and uses.',
      'Run a 15-minute household drill: lights out, phones low, one person away from home.',
      'Update the plan every season and after any incident.',
    ],
    localGuidanceStatus: 'not_verified',
    confidence: unknowns.length <= 1 ? 'medium' : 'low',
    assumptions: ['No live emergency alert, weather, shelter, evacuation, or public-safety provider is queried.', 'Official local instructions override this general preparedness checklist.'],
    unknowns,
  }
  await telemetry('emergency_preparedness_planner', result.confidence)
  return result
}

export async function buildCommunityResilienceChecklist(input: unknown): Promise<PracticalSustainabilityResult> {
  const parsed = CommunityResilienceInputSchema.parse(input)
  const hazardText = parsed.hazards.join(', ')
  const result: PracticalSustainabilityResult = {
    labels: labels(parsed.preferredLanguage),
    summary: `Resilience checklist for ${parsed.communityType} focused on ${hazardText}.`,
    preparednessChecklist: [
      'Identify who may need extra help before, during, and after an event.',
      'Create a contact tree and backup communication channel.',
      'Map cooling/warming/charging/shelter locations by category, not fake names.',
      'Prepare supplies for likely hazards.',
      'Schedule a short drill or tabletop exercise.',
    ],
    communicationPlan: ['primary alert channel', 'backup text/phone tree', 'language/accessibility needs', 'post-event check-in script'],
    localPartnerCategories: ['city emergency management', 'public works/utility', 'school or faith site', 'local clinic/pharmacy', 'volunteer groups', 'food/shelter partners'],
    supplyList: parsed.hazards.includes('flood')
      ? ['flashlights', 'battery packs', 'water', 'first aid', 'plastic bins for documents', 'mops/towels', 'PPE for cleanup']
      : ['water', 'first aid', 'battery packs', 'flashlights', 'printed contacts', 'medication backup list'],
    drillExercisePlan: ['Pick one hazard scenario.', 'Walk through first 2 hours.', 'Test contact tree.', 'Record gaps.', 'Assign fixes before next meeting.'],
    vulnerableGroups: parsed.vulnerableGroups ?? ['older adults', 'people with medical devices', 'children', 'people without cars', 'outdoor workers'],
    confidence: parsed.volunteers !== undefined && parsed.availableResources?.length ? 'medium' : 'low',
    assumptions: ['Local partner names are not invented.', 'Emergency instructions must be adapted to local official guidance.'],
    unknowns: [parsed.volunteers === undefined ? 'volunteer count' : '', !parsed.availableResources?.length ? 'available resources' : ''].filter(Boolean),
  }
  await telemetry('community_resilience_checklist', result.confidence)
  return result
}

export async function planWaterConservation(input: unknown): Promise<PracticalSustainabilityResult> {
  const parsed = WaterConservationInputSchema.parse(input)
  const highUse = parsed.monthlyWaterUseGallons !== undefined && parsed.monthlyWaterUseGallons > 8000
  const irrigationConcern = (parsed.painPoints ?? []).some((p) => /lawn|irrigat|sprinkler|outdoor|garden/i.test(p)) || parsed.outdoorArea === 'large'
  const leakConcern = highUse || (parsed.painPoints ?? []).some((p) => /leak|high bill|running toilet/i.test(p))
  const unknowns = [
    !parsed.location ? 'ZIP/location for local water rules' : '',
    parsed.monthlyWaterUseGallons === undefined && parsed.monthlyWaterBillUsd === undefined ? 'water use or bill amount' : '',
    parsed.householdSize === undefined ? 'household size' : '',
    parsed.outdoorArea === 'unknown' ? 'outdoor irrigation area' : '',
  ].filter(Boolean)

  const result: PracticalSustainabilityResult = {
    labels: labels(parsed.preferredLanguage),
    summary: `Water conservation plan for ${parsed.householdType.replace('_', ' ')}. Local watering rules are not verified by this tool.`,
    noCostActions: [
      'Check toilets, faucets, hose bibs, and irrigation valves for silent leaks.',
      'Run full dishwasher and laundry loads where practical.',
      'Shorten showers by a few minutes before buying equipment.',
      'Sweep hard surfaces instead of hosing them down.',
    ],
    lowCostActions: [
      'Install WaterSense-labeled showerheads or faucet aerators where fixtures are old.',
      'Add toilet leak dye tablets or food coloring checks this week.',
      'Use a hose shutoff nozzle and mulch exposed soil.',
      'Repair dripping faucets and worn toilet flappers promptly.',
    ],
    fixtureApplianceUpgrades: [
      'Prioritize WaterSense toilets if current toilets are old or frequently running.',
      'Choose efficient washing machines only when replacement is already needed.',
      'Consider smart leak sensors near water heater, washing machine, and sinks.',
    ],
    outdoorWateringActions: irrigationConcern
      ? ['Water early morning only when plants need it; follow verified local rules if they exist.', 'Check sprinkler heads for overspray onto pavement.', 'Group plants by water need and consider drought-tolerant landscaping over time.']
      : ['Skip outdoor irrigation actions unless you have a yard, garden, or shared landscaping responsibility.'],
    leakCheckSteps: [
      'Turn off fixtures and check whether the water meter still moves.',
      'Put dye in toilet tanks and wait 10 minutes without flushing.',
      'Inspect under sinks, around the water heater, washing machine, and outdoor hose bibs.',
      'If the meter moves with everything off, call the utility or a licensed plumber for next steps.',
    ],
    localRulesStatus: 'not_verified',
    localLookupPrompt: parsed.location ? `Search: water restrictions rebate WaterSense ${parsed.location}` : 'Add ZIP or city to look up verified water restrictions and rebates.',
    priority: leakConcern ? 'Start with leak checks before behavior changes or upgrades.' : 'Start with fixtures and outdoor watering habits that match your home.',
    confidence: unknowns.length <= 1 ? 'medium' : 'low',
    assumptions: ['No live utility, rebate, or local watering-rule database is queried.', 'Recommendations are general conservation steps and must be checked against local rules.'],
    unknowns,
  }
  await telemetry('water_conservation_planner', result.confidence)
  return result
}

export async function buildWasteRecyclingGuide(input: unknown): Promise<PracticalSustainabilityResult> {
  const parsed = WasteRecyclingInputSchema.parse(input)
  const item = parsed.itemOrMaterial.toLowerCase()
  const hazardous = /\b(batter|paint|solvent|oil|pesticide|chemical|propane|electronics?|laptop|phone|fluorescent|medicine|sharps|needle)\b/i.test(item)
  const reusable = parsed.condition === 'usable' || parsed.condition === 'repairable'
  const unknowns = [!parsed.location ? 'ZIP/location for local recycling rules' : '', !parsed.quantity ? 'quantity' : ''].filter(Boolean)

  const result: PracticalSustainabilityResult = {
    labels: labels(parsed.preferredLanguage),
    summary: `Waste and recycling guide for ${parsed.itemOrMaterial}. Local acceptance rules are not verified by this tool.`,
    reuseRepairRecycleDisposeGuidance: [
      reusable ? 'Reuse, repair, donate, or sell first if the item is safe and functional.' : 'Reuse is unlikely if the item is broken or expired; prioritize safe handling.',
      hazardous ? 'Do not place hazardous or battery-containing items in normal trash or curbside recycling unless your local program explicitly says to.' : 'Check whether your local program accepts this material curbside, drop-off only, or not at all.',
      'Keep materials clean, dry, and separated where your local program requires it.',
      'When in doubt, search your city/county solid waste site rather than wishcycling.',
    ],
    hazardousWarning: hazardous
      ? 'Possible hazardous or special-handling item: batteries, electronics, chemicals, oils, paints, medicines, and sharp items need verified local instructions.'
      : 'No obvious hazardous-material flag from the item name, but local rules still control disposal.',
    localLookup: {
      status: parsed.location ? 'not_verified' : 'location_needed',
      prompt: parsed.location ? `Search: ${parsed.itemOrMaterial} recycle dispose ${parsed.location}` : 'Add ZIP or city to verify reuse, recycling, hazardous waste, or disposal options.',
    },
    nextSteps: [
      'Check your city or county solid waste site for ZIP-specific rules before disposal.',
      hazardous ? 'Look for household hazardous waste, battery, electronics, or medication take-back programs.' : 'Check curbside, drop-off, reuse, and donation options in that order.',
      'Avoid mixing unknown items into recycling bins.',
    ],
    confidence: unknowns.length === 0 ? 'medium' : 'low',
    assumptions: ['No municipal recycling database is queried.', 'Guidance is conservative and avoids fake local acceptance claims.'],
    unknowns,
  }
  await telemetry('waste_recycling_local_guide', result.confidence)
  return result
}

export async function interpretUtilityBill(input: unknown): Promise<PracticalSustainabilityResult> {
  const parsed = UtilityBillInputSchema.parse(input)
  const usageUnit = parsed.usageUnit || (parsed.utilityType === 'electricity' ? 'kWh' : parsed.utilityType === 'water' ? 'gallons or CCF' : 'units')
  const variableCost = Math.max(0, (parsed.totalCostUsd ?? 0) - (parsed.fixedFeesUsd ?? 0) - (parsed.demandChargeUsd ?? 0))
  const unitCost = parsed.totalUsage && parsed.totalUsage > 0 && parsed.totalCostUsd !== undefined
    ? parsed.totalCostUsd / parsed.totalUsage
    : undefined
  const dailyUsage = parsed.totalUsage !== undefined && parsed.billingDays ? parsed.totalUsage / parsed.billingDays : undefined
  const changeFromPrevious = parsed.totalUsage !== undefined && parsed.previousUsage !== undefined && parsed.previousUsage > 0
    ? ((parsed.totalUsage - parsed.previousUsage) / parsed.previousUsage) * 100
    : undefined
  const unknowns = [
    parsed.totalCostUsd === undefined ? 'total cost' : '',
    parsed.totalUsage === undefined ? 'total usage' : '',
    !parsed.billingDays ? 'billing days' : '',
    !parsed.usageUnit ? 'usage unit' : '',
    !parsed.location ? 'location/utility territory' : '',
  ].filter(Boolean)

  const result: PracticalSustainabilityResult = {
    labels: labels(parsed.preferredLanguage),
    summary: `Utility bill interpretation for ${parsed.utilityType}. Use this as a bill-reading aid, not a savings guarantee.`,
    billBreakdown: {
      totalCostUsd: parsed.totalCostUsd ?? 'unknown',
      totalUsage: parsed.totalUsage ?? 'unknown',
      usageUnit,
      estimatedUnitCost: unitCost !== undefined ? `$${unitCost.toFixed(3)} per ${usageUnit}` : 'unknown',
      estimatedDailyUsage: dailyUsage !== undefined ? `${dailyUsage.toFixed(1)} ${usageUnit}/day` : 'unknown',
      fixedFeesUsd: parsed.fixedFeesUsd ?? 'unknown',
      demandChargeUsd: parsed.demandChargeUsd ?? 'unknown',
      estimatedVariableCostUsd: parsed.totalCostUsd !== undefined ? Number(variableCost.toFixed(2)) : 'unknown',
      changeFromPrevious: changeFromPrevious !== undefined ? `${changeFromPrevious.toFixed(1)}%` : 'unknown',
    },
    interpretationFlags: [
      unitCost !== undefined ? 'Unit cost estimated from total bill divided by usage; tariffs may include tiers and fixed fees.' : 'Unit cost cannot be calculated without both cost and usage.',
      parsed.demandChargeUsd ? 'Demand charge is present; peak load management may matter.' : 'Demand charge not supplied or not present.',
      changeFromPrevious !== undefined && Math.abs(changeFromPrevious) > 15 ? 'Usage changed materially from the previous bill; check weather, occupancy, leaks, or equipment.' : 'Trend cannot be judged from one bill alone.',
    ],
    nextSteps: [
      'Compare at least 12 months of bills before judging a trend.',
      parsed.utilityType === 'water' ? 'Check for leaks if usage or cost jumped.' : 'Separate usage changes from rate, fee, and weather changes.',
      'Ask the utility about rebates, bill assistance, rate plans, or audit programs where relevant.',
    ],
    noFakeSavingsClaim: 'This interpretation is not a savings guarantee and does not estimate avoided cost without local tariff and baseline data.',
    confidence: unknowns.length <= 1 ? 'medium' : 'low',
    assumptions: ['This tool interprets user-provided bill fields only.', 'Tariff, weather, utility territory, and household baseline are not independently verified.'],
    unknowns,
  }
  await telemetry('utility_bill_interpreter', result.confidence)
  return result
}

export async function lookupLocalSustainabilitySources(input: unknown): Promise<PracticalSustainabilityResult> {
  const parsed = LocalSustainabilitySourceInputSchema.parse(input)
  const adapter = getMunicipalAdapter()
  const needs = new Set(parsed.needs)
  const waterRestrictions = needs.has('water_restrictions') ? await adapter.getWaterRestrictions(parsed.location) : undefined
  const recyclingRules = needs.has('recycling_rules') ? await adapter.getRecyclingRules(parsed.location) : undefined
  const hazardousDropoff = needs.has('hazardous_dropoff') ? await adapter.getHazardousDropoffSites(parsed.location) : undefined
  const rebates = needs.has('rebates') ? await adapter.getRebates(parsed.location) : undefined
  const publicWorksContacts = needs.has('public_works') ? await adapter.getPublicWorksContacts(parsed.location) : undefined
  const requestedResults = [waterRestrictions, recyclingRules, hazardousDropoff, rebates, publicWorksContacts].filter(Boolean)
  const hasOk = requestedResults.some((result) => result?.status === 'ok')
  const hasFixture = requestedResults.some((result) => result?.status === 'fixture')
  const lookupStatus = hasOk ? 'partially_verified' : hasFixture ? 'fixture_only' : 'not_verified'
  const unknowns = [
    lookupStatus === 'not_verified' ? 'configured official municipal data source' : '',
    hasFixture ? 'fixture adapter is example-only and not safe for real decisions' : '',
  ].filter(Boolean)

  const result: PracticalSustainabilityResult = {
    labels: labels(parsed.preferredLanguage),
    summary: `Local sustainability source lookup for ${parsed.location}. Results are gated by the configured municipal adapter and do not create fake local rules.`,
    adapterId: adapter.adapterId,
    lookupStatus,
    waterRestrictions,
    recyclingRules,
    hazardousDropoff,
    rebates,
    publicWorksContacts,
    sourceActions: [
      'Use official city, county, utility, water authority, or public works pages as the source of truth.',
      'Save source links, dates checked, program names, contact numbers, and eligibility notes before acting.',
      'Do not treat fixture/example data as real local guidance.',
    ],
    nextSteps: [
      'Verify any restriction, rebate, pickup rule, or public works contact directly with the official local source before acting.',
      'For urgent safety issues, call local emergency services or the utility emergency line instead of relying on this lookup.',
      'Add a live municipal adapter only after source, licensing, rate-limit, and test-mode rules are approved.',
    ],
    confidence: hasOk ? 'medium' : 'low',
    assumptions: ['No live municipal provider is called by the default adapter.', 'Fixture data, when enabled for tests, is labeled example-only and not verified.'],
    unknowns,
  }
  await telemetry('local_sustainability_source_lookup', result.confidence)
  return result
}

export async function checkProductOrMaterialEvidence(input: unknown): Promise<PracticalSustainabilityResult> {
  const parsed = ProductMaterialEvidenceInputSchema.parse(input)
  const evidenceCount = (parsed.claimedEvidence?.length ?? 0) + (parsed.sourceUrls?.length ?? 0) + (parsed.certificateIds?.length ?? 0)
  const verificationStatus = evidenceCount > 0 ? 'user_evidence_supplied' : 'not_verified'
  const needsTechnicalDoc = parsed.claimType === 'material_epd' || parsed.claimType === 'low_voc' || parsed.claimType === 'code_acceptance'
  const needsServiceDoc = parsed.claimType === 'repairability' || parsed.claimType === 'warranty' || parsed.claimType === 'service_parts'
  const unknowns = [
    !parsed.sourceUrls?.length ? 'source URL from issuer/manufacturer/retailer' : '',
    !parsed.certificateIds?.length && parsed.claimType !== 'green_claim' ? 'certificate, model, warranty, EPD, or report ID' : '',
    !parsed.claimedEvidence?.length ? 'user-provided evidence text' : '',
  ].filter(Boolean)

  const result: PracticalSustainabilityResult = {
    labels: labels(parsed.preferredLanguage),
    summary: `Evidence check for ${parsed.productOrMaterial}. This screens documentation quality but does not verify databases or certify claims.`,
    claimType: parsed.claimType,
    verificationStatus,
    evidenceChecklist: [
      'Ask for the original EPD, certificate, warranty, repair manual, parts list, or test report from the issuing source.',
      'Match the exact product model, material, batch, date, geography, and scope to the purchase decision.',
      'Check expiration dates, issuer accreditation, installation assumptions, and exclusions.',
      needsTechnicalDoc ? 'For materials, request EPD scope, VOC/emissions documentation, fire/moisture suitability, and local code review by a qualified professional.' : 'For products, request warranty duration, parts availability, repair instructions, and end-of-life handling.',
      needsServiceDoc ? 'Confirm whether common failure parts can be purchased separately and repaired without voiding warranty.' : 'Confirm the claim still matters for the actual use case, not only marketing copy.',
    ],
    redFlags: [
      'logos, badges, or sustainability claims without issuer name, certificate ID, date, scope, and product model',
      'claims such as green, eco, sustainable, natural, non-toxic, or carbon neutral without method and boundary',
      'EPD, recycled-content, or low-VOC claims that do not match the exact product or finish being purchased',
      'repairability claims without parts, service manuals, warranty terms, or repair-network details',
    ],
    questionsForSeller: [
      'Which exact product model does the evidence cover?',
      'Who issued the certificate, EPD, warranty, or test report, and when does it expire?',
      'What assumptions, exclusions, installation conditions, or maintenance requirements apply?',
      'What happens if the item breaks, gets wet, fails inspection, or reaches end of life?',
    ],
    nextSteps: [
      'Save source documents before purchase and record the date checked.',
      'Prefer durable, repairable, right-sized options over vague environmental claims.',
      'Escalate code, fire, structural, electrical, moisture, and indoor-air questions to qualified local professionals.',
    ],
    confidence: unknowns.length <= 1 ? 'medium' : 'low',
    assumptions: ['No URL, marketplace, certificate, EPD, code, warranty, or repairability database is queried.', 'This tool evaluates evidence completeness, not truth of the claim.'],
    unknowns,
  }
  await telemetry('product_material_evidence_checker', result.confidence)
  return result
}

function firstMatch(text: string, pattern: RegExp): string | undefined {
  const match = text.match(pattern)
  return match?.[1]?.trim()
}

function matchingLines(text: string, pattern: RegExp, max = 8): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => pattern.test(line))
    .slice(0, max)
}

export async function reviewInsuranceDeclarations(input: unknown): Promise<PracticalSustainabilityResult> {
  const parsed = InsuranceDeclarationsInputSchema.parse(input)
  const text = parsed.documentText ?? ''
  const extractedFields = {
    carrier: firstMatch(text, /(?:carrier|insurer|company)\s*[:#-]?\s*([^\n]+)/i) ?? 'unknown',
    policyNumber: firstMatch(text, /policy\s*(?:no\.?|number|#)\s*[:#-]?\s*([A-Z0-9-]+)/i) ?? 'unknown',
    policyPeriod: firstMatch(text, /(?:policy period|effective dates?)\s*[:#-]?\s*([^\n]+)/i) ?? 'unknown',
    propertyAddress: firstMatch(text, /(?:property address|insured location|premises)\s*[:#-]?\s*([^\n]+)/i) ?? 'unknown',
  }
  const coverageSignals = matchingLines(text, /\b(dwelling|coverage\s*[A-Z]?|personal property|loss of use|liability|medical payments|wind|hail|hurricane|flood|water backup)\b/i)
  const deductibleSignals = matchingLines(text, /\b(deductible|wind\/hail|hurricane deductible|all other peril)\b/i)
  const exclusionSignals = matchingLines(text, /\b(exclusion|excluded|endorsement|limitation|flood|earth movement|mold|ordinance|law)\b/i)
  const unknowns = [
    !text ? 'document text' : '',
    extractedFields.carrier === 'unknown' ? 'carrier' : '',
    extractedFields.policyNumber === 'unknown' ? 'policy number' : '',
    extractedFields.policyPeriod === 'unknown' ? 'policy period' : '',
    coverageSignals.length === 0 ? 'coverage lines' : '',
    deductibleSignals.length === 0 ? 'deductible lines' : '',
  ].filter(Boolean)

  const result: PracticalSustainabilityResult = {
    labels: labels(parsed.preferredLanguage),
    summary: `Insurance declaration screening${parsed.concern ? ` for ${parsed.concern}` : ''}. This extracts visible signals and prepares follow-up questions only.`,
    reviewStatus: 'screening_only',
    extractedFields,
    coverageSignals,
    deductibleSignals,
    exclusionSignals,
    mitigationDocumentChecklist: [
      'Declarations page and full policy form.',
      'Photos of roof, windows, drainage, mechanicals, valuables, and prior mitigation work.',
      'Receipts, permits, inspection reports, warranties, and contractor invoices.',
      'Before/after photos for resilience upgrades and incident damage.',
      'Written insurer or agent answers about deductibles, exclusions, endorsements, and mitigation discounts.',
    ],
    questionsForAgentOrInsurer: [
      'Which hazards are covered, excluded, limited, or subject to special deductibles?',
      'Does water backup, flood, wind/hail, ordinance or law, temporary housing, or debris removal require endorsements?',
      'What documentation is required before and after a claim?',
      'Are mitigation upgrades eligible for discounts or underwriting review, and what proof is required?',
    ],
    notLegalAdvice: 'This is not legal, insurance, or claims advice. Coverage depends on the full policy, endorsements, facts, state law, and insurer determination.',
    nextSteps: [
      'Ask the agent or insurer to confirm any unknown or ambiguous coverage in writing.',
      'Do not rely on a declarations page alone; review endorsements and exclusions.',
      'Use qualified professionals for legal, insurance, structural, electrical, mold, or safety decisions.',
    ],
    confidence: unknowns.length <= 2 ? 'medium' : 'low',
    assumptions: ['Only user-provided text is screened.', 'No insurer, claims, legal, policy, or catastrophe database is queried.', 'Extracted lines may be incomplete if the document text was partial or OCR quality was poor.'],
    unknowns,
  }
  await telemetry('insurance_declarations_reviewer', result.confidence)
  return result
}

function grantLabels(language?: string): Record<string, string> {
  if (!isSpanish(language)) {
    return {
      title: 'Grant Search Guidance',
      searchStrategies: 'Search strategies',
      typesToLook: 'Types of funding to look for',
      keyQuestions: 'Key eligibility questions',
      timingAdvice: 'Timing advice',
      assumptions: 'Assumptions',
      confidence: 'Confidence',
      disclaimer: 'Disclaimer',
    }
  }
  return {
    title: 'Orientación para búsqueda de subvenciones',
    searchStrategies: 'Estrategias de búsqueda',
    typesToLook: 'Tipos de financiamiento a buscar',
    keyQuestions: 'Preguntas clave de elegibilidad',
    timingAdvice: 'Consejos de timing',
    assumptions: 'Supuestos',
    confidence: 'Confianza',
    disclaimer: 'Aviso',
  }
}

export async function findGrantOpportunities(input: z.infer<typeof GrantSearchInputSchema>): Promise<object> {
  const parsed = GrantSearchInputSchema.parse(input)
  const loc = parsed.location ? ` ${parsed.location}` : ''
  const lbl = grantLabels(parsed.preferredLanguage)

  const result = {
    labels: lbl,
    summary: `Grant-search guidance for ${parsed.organizationType}: ${parsed.projectDescription.slice(0, 80)}${parsed.projectDescription.length > 80 ? '...' : ''}`,
    noSpecificGrantsDisclaimer: 'No specific grant listings are provided. Grant availability, eligibility, and deadlines change constantly and must be verified directly at each source.',
    searchStrategies: [
      `Search Grants.gov for federal opportunities matching your project type${loc}.`,
      `Search your state's environmental, housing, or community development agency website for state grants${loc}.`,
      parsed.organizationType.toLowerCase().includes('ngo') || parsed.organizationType.toLowerCase().includes('nonprofit') || parsed.organizationType.toLowerCase().includes('non-profit')
        ? 'Search Foundation Directory Online (Candid/GrantStation) for foundation funding relevant to your mission.'
        : `Search local community foundations and county government grant portals${loc}.`,
      `Search EPA Environmental Justice grants and USDA Rural Development grants if the project has an environmental or rural component.`,
      `Search HUD Community Development Block Grants (CDBG) for community and resilience projects.`,
      `Search DOE Weatherization and State Energy Program grants for energy-related projects.`,
      `Search corporate foundation grant portals (energy utilities, banks, local employers) for community sustainability grants.`,
      `Contact your local United Way, community foundation, or nonprofit resource center for local grant databases${loc}.`,
    ],
    typesToLook: [
      'Federal formula grants distributed through states (CDBG, BRIC, LIHEAP)',
      'Federal competitive grants (EPA, USDA, DOE, HUD, FEMA)',
      'State environmental and resilience grants',
      'Foundation grants from private and community foundations',
      'Corporate social responsibility (CSR) grants from utilities, banks, and local employers',
      'Local government small grants and mini-grants programs',
      'Capacity-building grants for nonprofit organizational strength',
      'Matching or challenge grants that leverage local contributions',
    ],
    keyQuestions: [
      'Is your organization a registered 501(c)(3), government entity, tribal nation, or other eligible applicant type?',
      'Does the project location match the funder\'s geographic eligibility requirements?',
      'Does your project goal match the specific program priority areas described in the Notice of Funding Availability (NOFA)?',
      'What is the application deadline and are you in the current cycle?',
      'Are there cost-share or matching fund requirements you can meet?',
      'Does your organization have the fiscal and reporting capacity to manage grant funds?',
      'Are there audit or compliance requirements (OMB Uniform Guidance, 2 CFR 200) your organization can satisfy?',
    ],
    timingAdvice: [
      'Federal grants often open in the fall or spring; check Grants.gov and agency websites for current cycles.',
      'Foundation grants have varied cycles; some accept letters of inquiry (LOIs) before full applications.',
      'Build relationships with program officers before deadlines — a brief pre-application call can save significant effort.',
      'Allow at least 4–8 weeks to write a strong proposal; competitive grants require clear outcomes and a realistic budget.',
      'Track deadlines in a shared calendar and set alerts 6 weeks before each target deadline.',
    ],
    budgetContext: parsed.budgetUsd !== undefined
      ? `For a project of approximately $${parsed.budgetUsd.toLocaleString()}, look for grants that match this scale. Small grants (<$25k) are often less competitive but require the same application effort. Large grants (>$250k) typically require detailed financials and audited statements.`
      : 'Budget size affects grant eligibility. Many programs have minimum and maximum award ranges. Confirm award sizes early before investing application effort.',
    confidence: 'low' as const,
    dataStatus: 'not_verified' as const,
    assumptions: [
      'This guidance is based on general knowledge of US grant programs as of the model training date.',
      'Program availability, eligibility rules, and deadlines change frequently and must be verified at source.',
      'No live database or grant API is queried by this tool.',
    ],
  }

  await recordTelemetryEvent({ type: 'sustainability_scored', data: { workflow: 'grant_search_guidance', confidence: result.confidence } })
  return result
}

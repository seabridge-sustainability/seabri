import { z } from 'zod'
import { recordTelemetryEvent } from '../telemetry/store.js'

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

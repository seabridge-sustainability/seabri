import { registerTool } from './registry.js'
import { COMPARE_PRODUCTS_TOOL, OPENKB_TOOLS, executeTool as executeBuiltinTool } from '../agents/tools.js'
import { ALL_PERIL_TOOLS } from '../agents/perils.js'
import { TAVILY_API_KEY } from '../config.js'
import type { AgentId } from '../schemas.js'
import { searchLocalResources } from '../seabri/local-resources.js'
import { analyzeIncidentImage } from '../seabri/vision-analysis.js'
import { optimizeSustainableCompute } from '../seabri/sustainable-compute.js'
import {
  adviseRepairVsReplace,
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
} from '../seabri/practical-sustainability.js'

const CLIMATE_AGENTS: AgentId[] = ['climate-risk', 'home-community', 'investment-screening']
const GEO_AGENTS: AgentId[] = ['climate-risk', 'home-community', 'nature-biodiversity', 'natural-capital']
const OPENKB_AGENTS: AgentId[] = ['sustainability-reporting', 'investment-screening', 'net-zero', 'general', 'sustainability-companion']
const PRODUCT_COMPARE_AGENTS: AgentId[] = ['sustainability-companion', 'home-community', 'general']
const INCIDENT_AGENTS: AgentId[] = ['seabri-orchestrator', 'emergency-resilience', 'contractor-coordination', 'home-community', 'general']

export function registerBuiltinTools(): void {
  registerTool(
    {
      name: 'web_search',
      description:
        'Search the web for current information about climate risk, sustainability regulations, energy incentives, flood zones, wildfire data, carbon markets, or any sustainability topic.',
      input_schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query' },
        },
        required: ['query'],
      },
    },
    (input) => executeBuiltinTool('web_search', input),
    'all',
  )

  registerTool(
    {
      name: 'geocode_address',
      description:
        'Convert a US street address to latitude and longitude coordinates using the US Census geocoder.',
      input_schema: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Full US address (e.g. "123 Main St, Springfield, IL 62701")' },
        },
        required: ['address'],
      },
    },
    (input) => executeBuiltinTool('geocode_address', input),
    GEO_AGENTS,
  )

  registerTool(
    {
      name: 'lookup_flood_zone',
      description:
        'Look up the FEMA NFHL flood zone designation for a latitude/longitude point.',
      input_schema: {
        type: 'object',
        properties: {
          latitude: { type: 'number', description: 'Latitude in decimal degrees' },
          longitude: { type: 'number', description: 'Longitude in decimal degrees' },
        },
        required: ['latitude', 'longitude'],
      },
    },
    (input) => executeBuiltinTool('lookup_flood_zone', input),
    ['climate-risk', 'home-community'],
  )

  for (const perilTool of ALL_PERIL_TOOLS) {
    registerTool(
      perilTool,
      (input) => executeBuiltinTool(perilTool.name, input),
      CLIMATE_AGENTS,
    )
  }

  for (const openKbTool of OPENKB_TOOLS) {
    registerTool(
      openKbTool,
      (input) => executeBuiltinTool(openKbTool.name, input),
      OPENKB_AGENTS,
    )
  }

  registerTool(
    COMPARE_PRODUCTS_TOOL,
    (input) => executeBuiltinTool(COMPARE_PRODUCTS_TOOL.name, input),
    PRODUCT_COMPARE_AGENTS,
  )

  registerTool(
    {
      name: 'search_local_resources',
      description: 'Search configured real local sustainability and resilience resources for incident help. Returns safe fallback instead of invented contacts when search is unavailable.',
      input_schema: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Resource category: plumber, water_mitigation, city_public_works, city_hall, utility_emergency, hotel, insurance_claim_line.' },
          location: { type: 'string', description: 'City, ZIP, or address context.' },
        },
        required: ['category', 'location'],
      },
    },
    async (input) => JSON.stringify(await searchLocalResources(input)),
    INCIDENT_AGENTS,
  )

  registerTool(
    {
      name: 'analyze_incident_image',
      description: 'Analyze a Living Companion sustainability and resilience incident image through a configured vision provider, with safe fallback when unavailable.',
      input_schema: {
        type: 'object',
        properties: {
          imageBase64: { type: 'string', description: 'Base64 image bytes.' },
          mimeType: { type: 'string', description: 'Image MIME type.' },
          incidentContext: { type: 'string', description: 'Incident context.' },
        },
        required: ['imageBase64'],
      },
    },
    async (input) => JSON.stringify(await analyzeIncidentImage(input)),
    INCIDENT_AGENTS,
  )

  registerTool(
    {
      name: 'optimize_sustainable_compute',
      description: 'Optimize an agent/model workflow for sustainability, cost, tokens, caching, batching, local-model use, and carbon proxy reduction.',
      input_schema: {
        type: 'object',
        properties: {
          workflow_name: { type: 'string', description: 'Workflow name.' },
          task_type: { type: 'string', description: 'Task type.' },
          current_model: { type: 'string', description: 'Current model.' },
          estimated_tokens: { type: 'number', description: 'Estimated token count.' },
          latency_priority: { type: 'string', description: 'low, medium, or high.' },
          cost_priority: { type: 'string', description: 'low, medium, or high.' },
          privacy_priority: { type: 'string', description: 'low, medium, or high.' },
          sustainability_priority: { type: 'string', description: 'low, medium, or high.' },
          repeated_task: { type: 'boolean', description: 'Whether task repeats.' },
          cacheable: { type: 'boolean', description: 'Whether stable inputs can be cached.' },
          batchable: { type: 'boolean', description: 'Whether runs can be batched.' },
        },
        required: ['workflow_name', 'task_type', 'current_model', 'estimated_tokens', 'repeated_task', 'cacheable', 'batchable'],
      },
    },
    async (input) => JSON.stringify(await optimizeSustainableCompute(input)),
    'all',
  )

  registerTool(
    {
      name: 'estimate_household_carbon',
      description: 'Estimate household sustainability emissions from electricity, heating, transportation, food, flights, and waste using broad ranges and assumptions.',
      input_schema: {
        type: 'object',
        properties: {
          householdSize: { type: 'number', description: 'Number of people in household.' },
          zip: { type: 'string', description: 'ZIP or location.' },
          monthlyElectricityKwh: { type: 'number', description: 'Monthly electricity use.' },
          preferredLanguage: { type: 'string', description: 'Preferred language.' },
        },
        required: ['householdSize'],
      },
    },
    async (input) => JSON.stringify(await estimateHouseholdCarbon(input)),
    ['sustainability-companion', 'home-community', 'general'],
  )

  registerTool(
    {
      name: 'plan_home_energy_actions',
      description: 'Create a practical household sustainability and energy action plan with no-cost, low-cost, upgrade, utility lookup, assumptions, and unknowns.',
      input_schema: {
        type: 'object',
        properties: {
          homeType: { type: 'string', description: 'Home type.' },
          budgetLevel: { type: 'string', description: 'Budget level.' },
          zip: { type: 'string', description: 'ZIP or location.' },
          preferredLanguage: { type: 'string', description: 'Preferred language.' },
        },
        required: ['homeType', 'budgetLevel'],
      },
    },
    async (input) => JSON.stringify(await planHomeEnergyActions(input)),
    ['sustainability-companion', 'home-community', 'general'],
  )

  registerTool(
    {
      name: 'plan_community_sustainability_project',
      description: 'Plan NGO, school, neighborhood, or community sustainability projects with stakeholders, grants, permits, volunteers, metrics, and risks.',
      input_schema: {
        type: 'object',
        properties: {
          organizationType: { type: 'string', description: 'Organization or community type.' },
          goal: { type: 'string', description: 'Project goal.' },
          location: { type: 'string', description: 'Location.' },
          preferredLanguage: { type: 'string', description: 'Preferred language.' },
        },
        required: ['organizationType', 'goal'],
      },
    },
    async (input) => JSON.stringify(await planCommunityProject(input)),
    ['sustainability-companion', 'home-community', 'general'],
  )

  registerTool(
    {
      name: 'navigate_sustainability_certification',
      description: 'Navigate sustainability certification and framework options such as ENERGY STAR, LEED, WELL, utility rebates, and ESG readiness without inventing eligibility.',
      input_schema: {
        type: 'object',
        properties: {
          userType: { type: 'string', description: 'User type.' },
          goal: { type: 'string', description: 'Goal.' },
          location: { type: 'string', description: 'Location.' },
          preferredLanguage: { type: 'string', description: 'Preferred language.' },
        },
        required: ['userType', 'goal'],
      },
    },
    async (input) => JSON.stringify(await navigateCertification(input)),
    ['sustainability-companion', 'sustainability-reporting', 'home-community', 'general'],
  )

  registerTool(
    {
      name: 'check_carbon_offset_quality',
      description: 'Evaluate carbon offset quality and greenwashing risk from supplied attributes without inventing registry verification status.',
      input_schema: {
        type: 'object',
        properties: {
          projectType: { type: 'string', description: 'Project type.' },
          registry: { type: 'string', description: 'Registry if known.' },
          pricePerTonUsd: { type: 'number', description: 'Price per ton.' },
          preferredLanguage: { type: 'string', description: 'Preferred language.' },
        },
        required: ['projectType'],
      },
    },
    async (input) => JSON.stringify(await checkCarbonOffsetQuality(input)),
    ['sustainability-companion', 'investment-screening', 'general'],
  )

  registerTool(
    {
      name: 'build_sustainable_purchasing_checklist',
      description: 'Build a sustainable purchasing checklist with buying criteria, red flags, better alternatives, questions, and end-of-life considerations.',
      input_schema: {
        type: 'object',
        properties: {
          productCategory: { type: 'string', description: 'Product category.' },
          budgetUsd: { type: 'number', description: 'Budget if known.' },
          durabilityNeed: { type: 'string', description: 'Durability need.' },
          preferredLanguage: { type: 'string', description: 'Preferred language.' },
        },
        required: ['productCategory'],
      },
    },
    async (input) => JSON.stringify(await buildSustainablePurchasingChecklist(input)),
    ['sustainability-companion', 'home-community', 'general'],
  )

  registerTool(
    {
      name: 'advise_repair_vs_replace',
      description: 'Advise on repair versus replacement for household products and appliances with sustainability, financial, waste, assumptions, and confidence guidance.',
      input_schema: {
        type: 'object',
        properties: {
          productType: { type: 'string', description: 'Product or appliance type.' },
          ageYears: { type: 'number', description: 'Approximate age in years.' },
          estimatedRepairCostUsd: { type: 'number', description: 'Estimated repair cost.' },
          replacementBudgetUsd: { type: 'number', description: 'Replacement quote or budget.' },
          energyEfficiency: { type: 'string', description: 'poor, average, good, or unknown.' },
          condition: { type: 'string', description: 'working, repairable, broken, unsafe, or unknown.' },
          preferredLanguage: { type: 'string', description: 'Preferred language.' },
        },
        required: ['productType'],
      },
    },
    async (input) => JSON.stringify(await adviseRepairVsReplace(input)),
    ['sustainability-companion', 'home-community', 'general'],
  )

  registerTool(
    {
      name: 'plan_home_resilience_retrofits',
      description: 'Plan practical homeowner resilience retrofits for flood, storm, heat, outage, smoke, and other hazards without inventing local risk or insurance facts.',
      input_schema: {
        type: 'object',
        properties: {
          homeType: { type: 'string', description: 'Home type.' },
          location: { type: 'string', description: 'ZIP, city, or location.' },
          hazards: { type: 'array', description: 'Hazards of concern.' },
          budgetLevel: { type: 'string', description: 'no_cost, low, medium, or high.' },
          painPoints: { type: 'array', description: 'Known home weak points or recurring problems.' },
          preferredLanguage: { type: 'string', description: 'Preferred language.' },
        },
        required: ['homeType', 'hazards', 'budgetLevel'],
      },
    },
    async (input) => JSON.stringify(await planHomeResilienceRetrofits(input)),
    ['sustainability-companion', 'emergency-resilience', 'home-community', 'general'],
  )

  registerTool(
    {
      name: 'compare_building_materials',
      description: 'Compare sustainable building and renovation material choices using durability, moisture, fire, maintenance, embodied-carbon caveats, and indoor-air guidance.',
      input_schema: {
        type: 'object',
        properties: {
          materialCategory: { type: 'string', description: 'Material category such as flooring, roofing, insulation, or paint.' },
          durabilityNeed: { type: 'string', description: 'low, medium, high, or unknown.' },
          moistureConcern: { type: 'boolean', description: 'Whether moisture exposure is a concern.' },
          fireConcern: { type: 'boolean', description: 'Whether fire/code exposure is a concern.' },
          budgetLevel: { type: 'string', description: 'low, medium, high, or unknown.' },
          maintenanceTolerance: { type: 'string', description: 'low, medium, high, or unknown.' },
          preferredLanguage: { type: 'string', description: 'Preferred language.' },
        },
        required: ['materialCategory'],
      },
    },
    async (input) => JSON.stringify(await compareBuildingMaterials(input)),
    ['sustainability-companion', 'home-community', 'general'],
  )

  registerTool(
    {
      name: 'plan_emergency_preparedness',
      description: 'Build a household emergency preparedness sustainability and resilience plan with supplies, communication, evacuation considerations, assumptions, and official-guidance caveats.',
      input_schema: {
        type: 'object',
        properties: {
          householdSize: { type: 'number', description: 'Number of people in the household.' },
          location: { type: 'string', description: 'ZIP, city, or location.' },
          hazards: { type: 'array', description: 'Hazards of concern.' },
          hasPets: { type: 'boolean', description: 'Whether pets are present.' },
          hasChildren: { type: 'boolean', description: 'Whether children are present.' },
          hasOlderAdults: { type: 'boolean', description: 'Whether older adults are present.' },
          medicalNeeds: { type: 'array', description: 'Medication, device, or support needs.' },
          evacuationConstraints: { type: 'array', description: 'Transportation, mobility, school, work, or caregiver constraints.' },
          preferredLanguage: { type: 'string', description: 'Preferred language.' },
        },
        required: ['householdSize', 'hazards'],
      },
    },
    async (input) => JSON.stringify(await planEmergencyPreparedness(input)),
    ['sustainability-companion', 'emergency-resilience', 'home-community', 'general'],
  )

  registerTool(
    {
      name: 'build_community_resilience_checklist',
      description: 'Build a community sustainability and resilience checklist with preparedness steps, communication plan, partner categories, supplies, and drill plan.',
      input_schema: {
        type: 'object',
        properties: {
          communityType: { type: 'string', description: 'Community type.' },
          hazards: { type: 'array', description: 'Hazards of concern.' },
          volunteers: { type: 'number', description: 'Volunteer count.' },
          preferredLanguage: { type: 'string', description: 'Preferred language.' },
        },
        required: ['communityType', 'hazards'],
      },
    },
    async (input) => JSON.stringify(await buildCommunityResilienceChecklist(input)),
    ['sustainability-companion', 'emergency-resilience', 'home-community', 'general'],
  )

  registerTool(
    {
      name: 'plan_water_conservation',
      description: 'Build a household water conservation plan with no-cost, low-cost, fixture/appliance, outdoor watering, and leak-check actions without inventing local rules.',
      input_schema: {
        type: 'object',
        properties: {
          householdType: { type: 'string', description: 'Household type.' },
          location: { type: 'string', description: 'ZIP, city, or location.' },
          monthlyWaterUseGallons: { type: 'number', description: 'Monthly water use if known.' },
          painPoints: { type: 'array', description: 'Pain points such as high bill, leaks, or irrigation.' },
          preferredLanguage: { type: 'string', description: 'Preferred language.' },
        },
        required: ['householdType'],
      },
    },
    async (input) => JSON.stringify(await planWaterConservation(input)),
    ['sustainability-companion', 'home-community', 'general'],
  )

  registerTool(
    {
      name: 'build_waste_recycling_guide',
      description: 'Build reuse, repair, recycling, hazardous warning, and disposal guidance without fake local acceptance claims.',
      input_schema: {
        type: 'object',
        properties: {
          itemOrMaterial: { type: 'string', description: 'Item or material.' },
          location: { type: 'string', description: 'ZIP, city, or location.' },
          condition: { type: 'string', description: 'usable, repairable, broken, expired, or unknown.' },
          quantity: { type: 'string', description: 'Optional quantity.' },
          preferredLanguage: { type: 'string', description: 'Preferred language.' },
        },
        required: ['itemOrMaterial'],
      },
    },
    async (input) => JSON.stringify(await buildWasteRecyclingGuide(input)),
    ['sustainability-companion', 'home-community', 'general'],
  )

  registerTool(
    {
      name: 'find_grant_opportunities',
      description: 'Provide grant-search strategies, funding type guidance, and eligibility questions for sustainability and resilience projects. Does not invent specific grant listings.',
      input_schema: {
        type: 'object',
        properties: {
          organizationType: { type: 'string', description: 'Type of organization (NGO, school, municipality, etc.).' },
          projectDescription: { type: 'string', description: 'Brief description of the project seeking funding.' },
          location: { type: 'string', description: 'Project location (city, state, ZIP).' },
          budgetUsd: { type: 'number', description: 'Approximate project budget in USD if known.' },
          preferredLanguage: { type: 'string', description: 'Preferred language for labels.' },
        },
        required: ['organizationType', 'projectDescription'],
      },
    },
    async (input) => JSON.stringify(await findGrantOpportunities(input as Parameters<typeof findGrantOpportunities>[0])),
    ['sustainability-companion', 'home-community', 'general'],
  )

  registerTool(
    {
      name: 'interpret_utility_bill',
      description: 'Interpret a utility bill from user-provided fields with transparent assumptions and no fake savings guarantee.',
      input_schema: {
        type: 'object',
        properties: {
          utilityType: { type: 'string', description: 'electricity, gas, water, or other.' },
          billingDays: { type: 'number', description: 'Billing days.' },
          totalCostUsd: { type: 'number', description: 'Total cost.' },
          totalUsage: { type: 'number', description: 'Total usage.' },
          usageUnit: { type: 'string', description: 'Usage unit.' },
          preferredLanguage: { type: 'string', description: 'Preferred language.' },
        },
        required: ['utilityType'],
      },
    },
    async (input) => JSON.stringify(await interpretUtilityBill(input)),
    ['sustainability-companion', 'home-community', 'general'],
  )
}

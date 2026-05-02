import { registerTool } from './registry.js'
import { executeTool as executeBuiltinTool } from '../agents/tools.js'
import { ALL_PERIL_TOOLS } from '../agents/perils.js'
import { TAVILY_API_KEY } from '../config.js'
import type { AgentId } from '../schemas.js'

const CLIMATE_AGENTS: AgentId[] = ['climate-risk', 'home-community', 'investment-screening']
const GEO_AGENTS: AgentId[] = ['climate-risk', 'home-community', 'nature-biodiversity', 'natural-capital']

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
}

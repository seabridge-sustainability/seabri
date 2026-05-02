// Carbon proxy model based on Luccioni et al. 2023 LLM energy benchmarks
// Energy unit: Wh per 1000 tokens (sonnet baseline = 1.0)
// Grid intensity unit: gCO2e per kWh (from IEA Electricity Maps, 2023)

export const MODEL_ENERGY_FACTOR: Record<string, number> = {
  'claude-haiku-4-5': 0.1,
  'claude-haiku-4-5-20251001': 0.1,
  'claude-sonnet-4-6': 1.0,
  'claude-opus-4-7': 3.0,
  'claude-opus-4-5': 3.0,
}

// gCO2e per kWh — regional averages from IEA 2023
export const GRID_INTENSITY_BY_REGION: Record<string, number> = {
  'us-east-1': 386,      // US East (Virginia) — mixed grid
  'us-west-2': 136,      // US West (Oregon) — high renewables
  'eu-west-1': 295,      // Ireland — moderate renewables
  'eu-central-1': 338,   // Frankfurt — mixed European grid
  'ap-southeast-1': 493, // Singapore — natural gas heavy
  'ap-northeast-1': 465, // Tokyo — mixed, some coal
  'ap-south-1': 713,     // Mumbai — coal heavy
  'sa-east-1': 74,       // São Paulo — hydroelectric dominant
}

// Global average grid intensity (gCO2e/kWh) used as fallback
export const DEFAULT_GRID_INTENSITY = 386 // US average as default

// Baseline energy consumption: Wh per 1000 tokens at sonnet scale
// Derived from Luccioni et al. 2023: ~0.001–0.01 kWh per query; midpoint at 1k tokens ≈ 0.003 kWh
const SONNET_WH_PER_1K_TOKENS = 3.0

// Carbon overhead per tool call (API round-trip ≈ 0.01 Wh at server side)
const TOOL_CALL_WH = 0.01

export interface CarbonInput {
  model: string
  inputTokens: number
  outputTokens: number
  region?: string
  toolCalls?: number
}

export function estimateCarbonGrams(input: CarbonInput): number {
  const { model, inputTokens, outputTokens, region, toolCalls = 0 } = input

  const energyFactor = MODEL_ENERGY_FACTOR[model] ?? MODEL_ENERGY_FACTOR['claude-sonnet-4-6']
  const gridIntensity = (region ? GRID_INTENSITY_BY_REGION[region] : undefined) ?? DEFAULT_GRID_INTENSITY

  const totalTokens = inputTokens + outputTokens
  const llmWh = (totalTokens / 1000) * SONNET_WH_PER_1K_TOKENS * energyFactor
  const toolWh = toolCalls * TOOL_CALL_WH

  const totalWh = llmWh + toolWh
  // Convert Wh → kWh, multiply by gCO2e/kWh
  return (totalWh / 1000) * gridIntensity
}

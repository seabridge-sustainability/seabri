import type { AgentId } from '../schemas.js'

export type ModelTier = 'haiku' | 'sonnet' | 'opus'

export interface ModelSelection {
  model: string
  tier: ModelTier
  reason: string
}

const TIER_MODELS: Record<ModelTier, string> = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-6',
  opus: 'claude-opus-4-6',
}

const TIER_COST_PER_1K: Record<ModelTier, { input: number; output: number }> = {
  haiku: { input: 0.001, output: 0.005 },
  sonnet: { input: 0.003, output: 0.015 },
  opus: { input: 0.015, output: 0.075 },
}

interface ComplexitySignals {
  messageLength: number
  questionCount: number
  hasComparisonRequest: boolean
  hasMultiStepRequest: boolean
  hasDataAnalysis: boolean
  hasReportGeneration: boolean
  conversationDepth: number
}

const COMPARISON_PATTERNS = /\b(compare|contrast|versus|vs\.?|differ|trade.?off|pros?\s+(?:and|&)\s+cons?)\b/i
const MULTI_STEP_PATTERNS = /\b(first|then|next|after that|step\s+\d|followed\s+by|plan|strategy|roadmap|assess\s+and)\b/i
const DATA_ANALYSIS_PATTERNS = /\b(analy[sz]\w*|calculat\w*|quantif\w*|model\w*|forecast\w*|project\w*|simulat\w*|estimat\w*|benchmark\w*|scenario\w*)\b/i
const REPORT_PATTERNS = /\b(report|brief|summary|overview|assessment|audit|review|disclosure|memo)\b/i

function countPatternMatches(pattern: RegExp, message: string): number {
  const global = new RegExp(pattern.source, 'gi')
  return (message.match(global) || []).length
}

function extractComplexitySignals(message: string, conversationDepth: number): ComplexitySignals & { dataAnalysisCount: number } {
  const questionCount = (message.match(/\?/g) || []).length
  const dataAnalysisCount = countPatternMatches(DATA_ANALYSIS_PATTERNS, message)
  return {
    messageLength: message.length,
    questionCount,
    hasComparisonRequest: COMPARISON_PATTERNS.test(message),
    hasMultiStepRequest: MULTI_STEP_PATTERNS.test(message),
    hasDataAnalysis: dataAnalysisCount > 0,
    hasReportGeneration: REPORT_PATTERNS.test(message),
    conversationDepth,
    dataAnalysisCount,
  }
}

function scoreComplexity(signals: ComplexitySignals & { dataAnalysisCount?: number }): number {
  let score = 0

  if (signals.messageLength > 500) score += 2
  else if (signals.messageLength > 200) score += 1

  score += Math.min(signals.questionCount, 3)

  if (signals.hasComparisonRequest) score += 2
  if (signals.hasMultiStepRequest) score += 2
  if (signals.hasDataAnalysis) score += Math.min(signals.dataAnalysisCount ?? 1, 3)
  if (signals.hasReportGeneration) score += 1

  if (signals.conversationDepth > 10) score += 1

  return score
}

const AGENT_FLOOR: Partial<Record<AgentId, ModelTier>> = {
  'investment-screening': 'sonnet',
  'sustainability-reporting': 'sonnet',
}

export function selectModel(
  message: string,
  agentId: AgentId,
  conversationDepth: number = 0,
  forceModel?: string,
): ModelSelection {
  if (forceModel) {
    const tier = Object.entries(TIER_MODELS).find(([, m]) => m === forceModel)?.[0] as ModelTier | undefined
    return { model: forceModel, tier: tier ?? 'sonnet', reason: 'user-specified model' }
  }

  const signals = extractComplexitySignals(message, conversationDepth)
  const complexity = scoreComplexity(signals)

  let tier: ModelTier
  let reason: string

  if (complexity >= 7) {
    tier = 'opus'
    reason = `high complexity (score=${complexity}): ${describeSignals(signals)}`
  } else if (complexity >= 3) {
    tier = 'sonnet'
    reason = `medium complexity (score=${complexity}): ${describeSignals(signals)}`
  } else {
    tier = 'haiku'
    reason = `low complexity (score=${complexity}): simple query`
  }

  const floor = AGENT_FLOOR[agentId]
  if (floor) {
    const tierRank: Record<ModelTier, number> = { haiku: 0, sonnet: 1, opus: 2 }
    if (tierRank[tier] < tierRank[floor]) {
      tier = floor
      reason += ` (elevated to ${floor} floor for ${agentId})`
    }
  }

  return { model: TIER_MODELS[tier], tier, reason }
}

function describeSignals(signals: ComplexitySignals): string {
  const parts: string[] = []
  if (signals.hasMultiStepRequest) parts.push('multi-step')
  if (signals.hasComparisonRequest) parts.push('comparison')
  if (signals.hasDataAnalysis) parts.push('data-analysis')
  if (signals.hasReportGeneration) parts.push('report')
  if (signals.questionCount > 1) parts.push(`${signals.questionCount} questions`)
  if (signals.messageLength > 500) parts.push('long-message')
  return parts.join(', ') || 'general'
}

export function getModelCost(
  tier: ModelTier,
  inputTokens: number,
  outputTokens: number,
): number {
  const rates = TIER_COST_PER_1K[tier]
  return (inputTokens / 1000) * rates.input + (outputTokens / 1000) * rates.output
}

export function getFailoverModels(primary: string): string[] {
  if (primary === TIER_MODELS.haiku) return [primary]
  return [primary, TIER_MODELS.haiku]
}

export { TIER_MODELS }

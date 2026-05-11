import { getRecentMetrics } from '../orchestrator/metrics.js'

export interface CarbonBudget {
  limitGrams: number
  usedGrams: number
  remainingGrams: number
  percentUsed: number
  status: 'ok' | 'warning' | 'exceeded'
  periodStart: string
  periodEnd: string
}

export interface BudgetAlert {
  type: 'soft' | 'hard'
  message: string
  percentUsed: number
  usedGrams: number
  limitGrams: number
}

const SOFT_THRESHOLD = 0.8
const HARD_THRESHOLD = 1.0

const DEFAULT_DAILY_BUDGET_GRAMS = 5.0
const DEFAULT_SESSION_BUDGET_GRAMS = 1.0

export function getDailyBudgetLimit(): number {
  const envLimit = process.env.OPENSEABRI_DAILY_CARBON_LIMIT_GRAMS
  return envLimit ? parseFloat(envLimit) : DEFAULT_DAILY_BUDGET_GRAMS
}

export function getSessionBudgetLimit(): number {
  const envLimit = process.env.OPENSEABRI_SESSION_CARBON_LIMIT_GRAMS
  return envLimit ? parseFloat(envLimit) : DEFAULT_SESSION_BUDGET_GRAMS
}

export function checkDailyBudget(): CarbonBudget {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay = new Date(startOfDay.getTime() + 86400000)

  const all = getRecentMetrics(500)
  const todayMetrics = all.filter((m) => m.timestamp >= startOfDay && m.timestamp < endOfDay)
  const usedGrams = todayMetrics.reduce((s, m) => s + m.carbonGrams, 0)

  const limitGrams = getDailyBudgetLimit()
  const remainingGrams = Math.max(0, limitGrams - usedGrams)
  const percentUsed = limitGrams > 0 ? (usedGrams / limitGrams) * 100 : 0

  let status: 'ok' | 'warning' | 'exceeded'
  if (percentUsed >= HARD_THRESHOLD * 100) status = 'exceeded'
  else if (percentUsed >= SOFT_THRESHOLD * 100) status = 'warning'
  else status = 'ok'

  return {
    limitGrams,
    usedGrams,
    remainingGrams,
    percentUsed,
    status,
    periodStart: startOfDay.toISOString(),
    periodEnd: endOfDay.toISOString(),
  }
}

export function checkSessionBudget(sessionId: string): CarbonBudget {
  const all = getRecentMetrics(500)
  const sessionMetrics = all.filter((m) => m.sessionId === sessionId)
  const usedGrams = sessionMetrics.reduce((s, m) => s + m.carbonGrams, 0)

  const limitGrams = getSessionBudgetLimit()
  const remainingGrams = Math.max(0, limitGrams - usedGrams)
  const percentUsed = limitGrams > 0 ? (usedGrams / limitGrams) * 100 : 0

  let status: 'ok' | 'warning' | 'exceeded'
  if (percentUsed >= HARD_THRESHOLD * 100) status = 'exceeded'
  else if (percentUsed >= SOFT_THRESHOLD * 100) status = 'warning'
  else status = 'ok'

  const first = sessionMetrics[0]
  const last = sessionMetrics.at(-1)

  return {
    limitGrams,
    usedGrams,
    remainingGrams,
    percentUsed,
    status,
    periodStart: first?.timestamp.toISOString() ?? new Date().toISOString(),
    periodEnd: last?.timestamp.toISOString() ?? new Date().toISOString(),
  }
}

export function checkBudgetAlert(budget: CarbonBudget): BudgetAlert | null {
  if (budget.percentUsed >= HARD_THRESHOLD * 100) {
    return {
      type: 'hard',
      message: `Carbon budget exceeded: ${budget.usedGrams.toFixed(3)}g / ${budget.limitGrams}g (${Math.round(budget.percentUsed)}%). Consider using lighter models.`,
      percentUsed: budget.percentUsed,
      usedGrams: budget.usedGrams,
      limitGrams: budget.limitGrams,
    }
  }
  if (budget.percentUsed >= SOFT_THRESHOLD * 100) {
    return {
      type: 'soft',
      message: `Carbon budget at ${Math.round(budget.percentUsed)}%: ${budget.usedGrams.toFixed(3)}g / ${budget.limitGrams}g. Approaching limit.`,
      percentUsed: budget.percentUsed,
      usedGrams: budget.usedGrams,
      limitGrams: budget.limitGrams,
    }
  }
  return null
}

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../orchestrator/metrics.js', () => {
  const now = new Date()
  return {
    getRecentMetrics: vi.fn().mockReturnValue([
      {
        model: 'claude-haiku-4-5',
        tier: 'haiku',
        inputTokens: 500,
        outputTokens: 300,
        latencyMs: 200,
        toolCalls: 0,
        costUsd: 0.002,
        carbonGrams: 0.003,
        timestamp: now,
        sessionId: 'sess-1',
        agentId: 'general',
      },
      {
        model: 'claude-sonnet-4-6',
        tier: 'sonnet',
        inputTokens: 1000,
        outputTokens: 600,
        latencyMs: 400,
        toolCalls: 1,
        costUsd: 0.02,
        carbonGrams: 0.025,
        timestamp: now,
        sessionId: 'sess-1',
        agentId: 'climate-risk',
      },
      {
        model: 'claude-haiku-4-5',
        tier: 'haiku',
        inputTokens: 200,
        outputTokens: 100,
        latencyMs: 100,
        toolCalls: 0,
        costUsd: 0.001,
        carbonGrams: 0.001,
        timestamp: now,
        sessionId: 'sess-2',
        agentId: 'general',
      },
    ]),
  }
})

import {
  checkDailyBudget,
  checkSessionBudget,
  checkBudgetAlert,
  getDailyBudgetLimit,
  getSessionBudgetLimit,
} from './carbon-budget.js'

describe('carbon-budget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.OPENSEABRI_DAILY_CARBON_LIMIT_GRAMS
    delete process.env.OPENSEABRI_SESSION_CARBON_LIMIT_GRAMS
  })

  describe('getDailyBudgetLimit', () => {
    it('returns default of 5g', () => {
      expect(getDailyBudgetLimit()).toBe(5.0)
    })

    it('respects env override', () => {
      process.env.OPENSEABRI_DAILY_CARBON_LIMIT_GRAMS = '10'
      expect(getDailyBudgetLimit()).toBe(10)
    })
  })

  describe('getSessionBudgetLimit', () => {
    it('returns default of 1g', () => {
      expect(getSessionBudgetLimit()).toBe(1.0)
    })

    it('respects env override', () => {
      process.env.OPENSEABRI_SESSION_CARBON_LIMIT_GRAMS = '2.5'
      expect(getSessionBudgetLimit()).toBe(2.5)
    })
  })

  describe('checkDailyBudget', () => {
    it('returns budget with all required fields', () => {
      const budget = checkDailyBudget()
      expect(budget.limitGrams).toBe(5.0)
      expect(budget.usedGrams).toBeGreaterThanOrEqual(0)
      expect(budget.remainingGrams).toBeGreaterThanOrEqual(0)
      expect(budget.percentUsed).toBeGreaterThanOrEqual(0)
      expect(['ok', 'warning', 'exceeded']).toContain(budget.status)
      expect(budget.periodStart).toBeTruthy()
      expect(budget.periodEnd).toBeTruthy()
    })

    it('status is ok when well under budget', () => {
      const budget = checkDailyBudget()
      expect(budget.status).toBe('ok')
    })
  })

  describe('checkSessionBudget', () => {
    it('tracks carbon for a specific session', () => {
      const budget = checkSessionBudget('sess-1')
      expect(budget.usedGrams).toBeCloseTo(0.028, 3)
    })

    it('returns zero usage for unknown session', () => {
      const budget = checkSessionBudget('nonexistent')
      expect(budget.usedGrams).toBe(0)
    })
  })

  describe('checkBudgetAlert', () => {
    it('returns null when under 80%', () => {
      const alert = checkBudgetAlert({
        limitGrams: 5,
        usedGrams: 2,
        remainingGrams: 3,
        percentUsed: 40,
        status: 'ok',
        periodStart: '',
        periodEnd: '',
      })
      expect(alert).toBeNull()
    })

    it('returns soft alert at 80%+', () => {
      const alert = checkBudgetAlert({
        limitGrams: 5,
        usedGrams: 4.2,
        remainingGrams: 0.8,
        percentUsed: 84,
        status: 'warning',
        periodStart: '',
        periodEnd: '',
      })
      expect(alert).not.toBeNull()
      expect(alert!.type).toBe('soft')
      expect(alert!.message).toContain('84%')
    })

    it('returns hard alert at 100%+', () => {
      const alert = checkBudgetAlert({
        limitGrams: 5,
        usedGrams: 5.5,
        remainingGrams: 0,
        percentUsed: 110,
        status: 'exceeded',
        periodStart: '',
        periodEnd: '',
      })
      expect(alert).not.toBeNull()
      expect(alert!.type).toBe('hard')
      expect(alert!.message).toContain('exceeded')
    })
  })
})

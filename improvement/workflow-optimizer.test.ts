import { describe, it, expect } from 'vitest'
import {
  analyzeWorkflow,
  buildOptimizationSuggestions,
  type WorkflowProfile,
  type StepProfile,
  type OptimizationSuggestion,
} from './workflow-optimizer.js'
import type { WorkflowDefinition } from '../gateway/workflows/schema.js'

const makeStep = (overrides: Partial<StepProfile> = {}): StepProfile => ({
  stepId: 's1',
  model: 'claude-sonnet-4-6',
  avgLatencyMs: 2000,
  avgCostUsd: 0.05,
  successRate: 95,
  dependsOn: [],
  ...overrides,
})

const makeProfile = (overrides: Partial<WorkflowProfile> = {}): WorkflowProfile => ({
  workflowId: 'w1',
  steps: [makeStep()],
  totalAvgLatencyMs: 2000,
  totalAvgCostUsd: 0.05,
  ...overrides,
})

describe('analyzeWorkflow', () => {
  it('identifies the slowest step', () => {
    const profile = makeProfile({
      steps: [
        makeStep({ stepId: 'fast', avgLatencyMs: 500 }),
        makeStep({ stepId: 'slow', avgLatencyMs: 15000 }),
        makeStep({ stepId: 'medium', avgLatencyMs: 3000 }),
      ],
      totalAvgLatencyMs: 18500,
    })
    const result = analyzeWorkflow(profile)
    expect(result.slowestStepId).toBe('slow')
  })

  it('identifies the most expensive step', () => {
    const profile = makeProfile({
      steps: [
        makeStep({ stepId: 'cheap', avgCostUsd: 0.01 }),
        makeStep({ stepId: 'expensive', avgCostUsd: 0.5 }),
      ],
      totalAvgCostUsd: 0.51,
    })
    const result = analyzeWorkflow(profile)
    expect(result.mostExpensiveStepId).toBe('expensive')
  })

  it('detects parallelizable steps (no dependencies between them)', () => {
    const profile = makeProfile({
      steps: [
        makeStep({ stepId: 'a', dependsOn: [] }),
        makeStep({ stepId: 'b', dependsOn: [] }),
        makeStep({ stepId: 'c', dependsOn: ['a', 'b'] }),
      ],
    })
    const result = analyzeWorkflow(profile)
    expect(result.parallelizableGroups).toContainEqual(expect.arrayContaining(['a', 'b']))
  })

  it('returns empty parallelizable groups when all steps are sequential', () => {
    const profile = makeProfile({
      steps: [
        makeStep({ stepId: 'a', dependsOn: [] }),
        makeStep({ stepId: 'b', dependsOn: ['a'] }),
        makeStep({ stepId: 'c', dependsOn: ['b'] }),
      ],
    })
    const result = analyzeWorkflow(profile)
    expect(result.parallelizableGroups).toHaveLength(0)
  })

  it('detects over-powered model usage for simple steps', () => {
    const profile = makeProfile({
      steps: [makeStep({ stepId: 'overkill', model: 'claude-opus-4-7', avgCostUsd: 0.5 })],
    })
    const result = analyzeWorkflow(profile)
    expect(result.overpoweredStepIds).toContain('overkill')
  })

  it('does not flag haiku steps as over-powered', () => {
    const profile = makeProfile({
      steps: [makeStep({ stepId: 'lean', model: 'claude-haiku-4-5-20251001', avgCostUsd: 0.001 })],
    })
    const result = analyzeWorkflow(profile)
    expect(result.overpoweredStepIds).not.toContain('lean')
  })
})

describe('buildOptimizationSuggestions', () => {
  it('suggests model downgrade for over-powered steps', () => {
    const profile = makeProfile({
      steps: [makeStep({ stepId: 'overkill', model: 'claude-opus-4-7' })],
    })
    const suggestions = buildOptimizationSuggestions(profile)
    const downgrade = suggestions.find((s) => s.type === 'downgrade_model')
    expect(downgrade).toBeDefined()
    expect(downgrade!.stepId).toBe('overkill')
  })

  it('suggests parallelization when steps can run concurrently', () => {
    const profile = makeProfile({
      steps: [
        makeStep({ stepId: 'a', dependsOn: [] }),
        makeStep({ stepId: 'b', dependsOn: [] }),
      ],
    })
    const suggestions = buildOptimizationSuggestions(profile)
    const par = suggestions.find((s) => s.type === 'parallelize')
    expect(par).toBeDefined()
  })

  it('suggests caching for expensive repeated steps', () => {
    const expensiveStep = makeStep({ stepId: 'costly', avgCostUsd: 0.3 })
    const profile = makeProfile({
      steps: [expensiveStep, expensiveStep],
      totalAvgCostUsd: 0.6,
    })
    const suggestions = buildOptimizationSuggestions(profile)
    const cache = suggestions.find((s) => s.type === 'cache')
    expect(cache).toBeDefined()
  })

  it('returns empty array when workflow is already optimal', () => {
    const profile = makeProfile({
      steps: [makeStep({ stepId: 'a', model: 'claude-haiku-4-5-20251001', avgCostUsd: 0.001, dependsOn: [] })],
    })
    const suggestions = buildOptimizationSuggestions(profile)
    expect(suggestions).toHaveLength(0)
  })

  it('estimates potential cost savings for downgrade suggestions', () => {
    const profile = makeProfile({
      steps: [makeStep({ stepId: 'opus-step', model: 'claude-opus-4-7', avgCostUsd: 1.0 })],
      totalAvgCostUsd: 1.0,
    })
    const suggestions = buildOptimizationSuggestions(profile)
    const downgrade = suggestions.find((s) => s.type === 'downgrade_model')
    expect(downgrade?.estimatedCostSavingUsd).toBeGreaterThan(0)
  })
})

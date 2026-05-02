import { describe, it, expect, beforeEach } from 'vitest'
import { buildExecutionPlan, getExecutableSteps, resetStepCounter } from './planner.js'
import type { ClassificationResult } from './classifier.js'
import type { ModelSelection } from './model-router.js'

describe('Execution Planner', () => {
  const defaultModel: ModelSelection = {
    model: 'claude-sonnet-4-6',
    tier: 'sonnet',
    reason: 'test',
  }

  beforeEach(() => {
    resetStepCounter()
  })

  describe('buildExecutionPlan', () => {
    it('creates single-agent plan for unambiguous routing', () => {
      const classification: ClassificationResult = {
        primaryAgent: 'climate-risk',
        confidence: 0.9,
        secondaryAgents: [],
        reasoning: 'test',
        isMultiAgent: false,
      }
      const plan = buildExecutionPlan(classification, defaultModel)
      expect(plan.strategy).toBe('single')
      expect(plan.steps).toHaveLength(1)
      expect(plan.estimatedCalls).toBe(1)
      expect(plan.steps[0].agentId).toBe('climate-risk')
      expect(plan.steps[0].dependsOn).toHaveLength(0)
    })

    it('creates fan-out plan for two agents', () => {
      const classification: ClassificationResult = {
        primaryAgent: 'climate-risk',
        confidence: 0.55,
        secondaryAgents: ['nature-biodiversity'],
        reasoning: 'test',
        isMultiAgent: true,
      }
      const plan = buildExecutionPlan(classification, defaultModel)
      expect(plan.strategy).toBe('fan-out-aggregate')
      expect(plan.steps).toHaveLength(3)
      expect(plan.estimatedCalls).toBe(3)

      const agentSteps = plan.steps.filter((s) => s.type === 'agent')
      expect(agentSteps).toHaveLength(2)

      const aggregateStep = plan.steps.find((s) => s.type === 'aggregate')!
      expect(aggregateStep).toBeDefined()
      expect(aggregateStep.dependsOn).toHaveLength(2)
    })

    it('creates fan-out plan for three agents', () => {
      const classification: ClassificationResult = {
        primaryAgent: 'climate-risk',
        confidence: 0.4,
        secondaryAgents: ['nature-biodiversity', 'investment-screening'],
        reasoning: 'test',
        isMultiAgent: true,
      }
      const plan = buildExecutionPlan(classification, defaultModel)
      expect(plan.strategy).toBe('fan-out-aggregate')
      expect(plan.steps).toHaveLength(4)
      expect(plan.estimatedCalls).toBe(4)
    })

    it('falls back to single agent when isMultiAgent is false', () => {
      const classification: ClassificationResult = {
        primaryAgent: 'general',
        confidence: 0.8,
        secondaryAgents: ['climate-risk'],
        reasoning: 'test',
        isMultiAgent: false,
      }
      const plan = buildExecutionPlan(classification, defaultModel)
      expect(plan.strategy).toBe('single')
      expect(plan.steps).toHaveLength(1)
    })

    it('assigns model selection to all steps', () => {
      const classification: ClassificationResult = {
        primaryAgent: 'net-zero',
        confidence: 0.5,
        secondaryAgents: ['climate-risk'],
        reasoning: 'test',
        isMultiAgent: true,
      }
      const plan = buildExecutionPlan(classification, defaultModel)
      for (const step of plan.steps) {
        expect(step.model).toEqual(defaultModel)
      }
    })
  })

  describe('getExecutableSteps', () => {
    it('returns all steps with no dependencies initially', () => {
      const classification: ClassificationResult = {
        primaryAgent: 'climate-risk',
        confidence: 0.5,
        secondaryAgents: ['nature-biodiversity'],
        reasoning: 'test',
        isMultiAgent: true,
      }
      const plan = buildExecutionPlan(classification, defaultModel)
      const executable = getExecutableSteps(plan, new Set())
      const agentSteps = plan.steps.filter((s) => s.type === 'agent')
      expect(executable).toEqual(agentSteps)
    })

    it('unlocks aggregate step after dependencies complete', () => {
      const classification: ClassificationResult = {
        primaryAgent: 'climate-risk',
        confidence: 0.5,
        secondaryAgents: ['nature-biodiversity'],
        reasoning: 'test',
        isMultiAgent: true,
      }
      const plan = buildExecutionPlan(classification, defaultModel)
      const agentStepIds = new Set(plan.steps.filter((s) => s.type === 'agent').map((s) => s.id))

      const executable = getExecutableSteps(plan, agentStepIds)
      expect(executable).toHaveLength(1)
      expect(executable[0].type).toBe('aggregate')
    })

    it('returns empty when all steps completed', () => {
      const classification: ClassificationResult = {
        primaryAgent: 'general',
        confidence: 0.9,
        secondaryAgents: [],
        reasoning: 'test',
        isMultiAgent: false,
      }
      const plan = buildExecutionPlan(classification, defaultModel)
      const allIds = new Set(plan.steps.map((s) => s.id))
      const executable = getExecutableSteps(plan, allIds)
      expect(executable).toHaveLength(0)
    })
  })
})

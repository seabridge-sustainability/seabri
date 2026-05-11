import { describe, it, expect } from 'vitest'
import { routeTask } from './task-router.js'
import { TIER_MODELS } from '../orchestrator/model-router.js'
import { Product } from '../product.js'

describe('routeTask', () => {
  it('returns a routing decision with required fields', () => {
    const decision = routeTask({ task: 'What is a flood zone?' })
    expect(decision.taskId).toMatch(/^task_/)
    expect(decision.agentId).toBeTruthy()
    expect(decision.modelId).toBeTruthy()
    expect(decision.modelTier).toBeTruthy()
    expect(decision.routingReason).toBeTruthy()
  })

  it('routes climate task to climate-risk agent', () => {
    const decision = routeTask({ task: 'What flood risk does my coastal property face?' })
    expect(decision.agentId).toBe('climate-risk')
    expect(decision.classificationConfidence).toBeGreaterThan(0)
  })

  it('respects forced agentId override', () => {
    const decision = routeTask({ task: 'Any question', agentId: 'net-zero' })
    expect(decision.agentId).toBe('net-zero')
    expect(decision.routingReason).toContain('user-specified agent')
  })

  it('falls back to general for unknown forced agentId', () => {
    const decision = routeTask({ task: 'Any question', agentId: 'nonexistent-agent' })
    // Falls back to classifier result — should not throw
    expect(decision.agentId).toBeTruthy()
  })

  it('respects forced modelId override', () => {
    const decision = routeTask({ task: 'Hello', modelId: TIER_MODELS.haiku })
    expect(decision.modelId).toBe(TIER_MODELS.haiku)
    expect(decision.routingReason).toContain('user-specified model')
  })

  it('produces non-negative estimated cost and carbon', () => {
    const decision = routeTask({ task: 'Explain TCFD requirements for a bank' })
    expect(decision.estimatedCostUsd).toBeGreaterThan(0)
    expect(decision.estimatedCarbonGrams).toBeGreaterThan(0)
  })

  it('includes a sustainability score', () => {
    const decision = routeTask({ task: 'What is scope 3 emissions?' })
    expect(decision.sustainability.composite).toBeGreaterThanOrEqual(0)
    expect(decision.sustainability.composite).toBeLessThanOrEqual(100)
    expect(['excellent', 'good', 'fair', 'poor']).toContain(decision.sustainability.tier)
  })

  it('generates unique task ids for each call', () => {
    const d1 = routeTask({ task: 'test' })
    const d2 = routeTask({ task: 'test' })
    expect(d1.taskId).not.toBe(d2.taskId)
  })

  it('routes reporting task to sustainability-reporting agent', () => {
    const decision = routeTask({ task: 'Help me understand CSRD double materiality assessment' })
    expect(decision.agentId).toBe('sustainability-reporting')
  })

  it('routes investment question to investment-screening agent', () => {
    const decision = routeTask({ task: 'How should I screen my portfolio for stranded asset risk?' })
    expect(decision.agentId).toBe('investment-screening')
  })

  it('defaults to COMPANION product when no channelId provided', () => {
    const decision = routeTask({ task: 'Hello' })
    expect(decision.product).toBe(Product.COMPANION)
  })

  it('routes telegram channel to COMPANION product', () => {
    const decision = routeTask({ task: 'Hello', channelId: 'telegram' })
    expect(decision.product).toBe(Product.COMPANION)
  })

  it('routes mcp channel to HARNESS product', () => {
    const decision = routeTask({ task: 'Hello', channelId: 'mcp' })
    expect(decision.product).toBe(Product.HARNESS)
  })

  it('routes cli channel to HARNESS product', () => {
    const decision = routeTask({ task: 'Hello', channelId: 'cli' })
    expect(decision.product).toBe(Product.HARNESS)
  })

  it('uses higher tier model for complex tasks', () => {
    const simple = routeTask({ task: 'What is ESG?' })
    const complex = routeTask({
      task: 'Compare TCFD vs CSRD vs ISSB S2. Analyze which applies to our German-listed company. ' +
            'Estimate transition risk exposure under 1.5C and 2C pathways. Build a scenario analysis. ' +
            'Calculate the implied temperature rise for our portfolio. What are the trade-offs?',
    })
    const tierRank: Record<string, number> = { haiku: 0, sonnet: 1, opus: 2 }
    expect(tierRank[complex.modelTier] ?? 0).toBeGreaterThanOrEqual(tierRank[simple.modelTier] ?? 0)
  })
})

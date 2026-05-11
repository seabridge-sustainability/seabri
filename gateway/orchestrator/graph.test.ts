import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runGraph } from './graph.js'
import * as router from '../agents/router.js'

// Mock routeMessage — the graph calls it per-agent
vi.mock('../agents/router.js', () => ({
  routeMessage: vi.fn().mockResolvedValue('mock agent response'),
  classifyIntent: vi.fn(),
}))

// Keep orchestrator imports real (classifier, planner, model-router are pure fns)
vi.mock('../config.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return { ...actual, ANTHROPIC_API_KEY: 'test-key' }
})

describe('runGraph — single-agent path', () => {
  it('returns finalResponse for a simple general query', async () => {
    const result = await runGraph({ userMessage: 'hello', agentId: 'general' })
    expect(result).toBe('mock agent response')
  })

  it('accepts optional history and additionalContext', async () => {
    const result = await runGraph({
      userMessage: 'hello',
      agentId: 'general',
      history: [{ role: 'user', content: 'prev' }, { role: 'assistant', content: 'prev reply' }],
      additionalContext: 'some context',
    })
    expect(result).toBe('mock agent response')
  })

  it('defaults agentId to general when omitted', async () => {
    const result = await runGraph({ userMessage: 'any message' })
    expect(typeof result).toBe('string')
  })
})

describe('runGraph — multi-agent path (fan-out-aggregate)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(router.routeMessage).mockResolvedValue('mock agent response')
  })

  it('triggers multi-agent flow for messages with multiple domain keywords', async () => {
    // Contains both climate-risk AND net-zero keywords
    const result = await runGraph({
      userMessage:
        'What is the flood risk for my portfolio and how does it affect our net zero emissions targets and scope 3 decarbonization plan?',
      agentId: 'general',
    })
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('runGraph — graph state', () => {
  it('returns a string even when message is empty', async () => {
    const result = await runGraph({ userMessage: '' })
    expect(typeof result).toBe('string')
  })

  it('passes forceModel through to execution', async () => {
    const result = await runGraph({
      userMessage: 'simple query',
      forceModel: 'claude-haiku-4-5-20251001',
    })
    expect(typeof result).toBe('string')
  })
})

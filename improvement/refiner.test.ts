import { describe, it, expect, vi } from 'vitest'
import {
  buildRefinementPrompt,
  parseRefinementResponse,
  createRefiner,
  type FailurePattern,
  type RefinementProposal,
} from './refiner.js'

const samplePatterns: FailurePattern[] = [
  { category: 'wrong_data', count: 12, examples: ['gave 2019 emissions instead of 2023'] },
  { category: 'incomplete_answer', count: 8, examples: ['omitted Scope 3'] },
]

describe('buildRefinementPrompt', () => {
  it('includes agentId in the prompt', () => {
    const p = buildRefinementPrompt('climate-risk', samplePatterns)
    expect(p).toContain('climate-risk')
  })

  it('includes failure categories', () => {
    const p = buildRefinementPrompt('climate-risk', samplePatterns)
    expect(p).toContain('wrong_data')
    expect(p).toContain('incomplete_answer')
  })

  it('includes example failures', () => {
    const p = buildRefinementPrompt('climate-risk', samplePatterns)
    expect(p).toContain('gave 2019 emissions instead of 2023')
  })

  it('returns a non-empty string', () => {
    const p = buildRefinementPrompt('general', [])
    expect(typeof p).toBe('string')
    expect(p.length).toBeGreaterThan(0)
  })
})

describe('parseRefinementResponse', () => {
  it('parses a valid JSON response', () => {
    const raw = JSON.stringify({
      improvedSystemPrompt: 'Always use the most recent emissions data.',
      reasoning: 'Users complained about stale data.',
      expectedImprovements: ['reduced wrong_data', 'higher accuracy'],
    })
    const proposal = parseRefinementResponse('climate-risk', raw)
    expect(proposal.agentId).toBe('climate-risk')
    expect(proposal.improvedSystemPrompt).toContain('most recent')
    expect(proposal.reasoning).toBeTruthy()
    expect(proposal.expectedImprovements).toHaveLength(2)
    expect(proposal.status).toBe('pending')
  })

  it('wraps JSON inside markdown fences', () => {
    const raw = `\`\`\`json\n${JSON.stringify({
      improvedSystemPrompt: 'Be precise.',
      reasoning: 'test',
      expectedImprovements: [],
    })}\n\`\`\``
    const proposal = parseRefinementResponse('general', raw)
    expect(proposal.improvedSystemPrompt).toBe('Be precise.')
  })

  it('throws on invalid JSON', () => {
    expect(() => parseRefinementResponse('general', 'not json at all')).toThrow()
  })

  it('throws when required fields are missing', () => {
    const raw = JSON.stringify({ reasoning: 'ok' })
    expect(() => parseRefinementResponse('general', raw)).toThrow()
  })

  it('assigns a unique id each call', () => {
    const raw = JSON.stringify({
      improvedSystemPrompt: 'x',
      reasoning: 'y',
      expectedImprovements: [],
    })
    const a = parseRefinementResponse('general', raw)
    const b = parseRefinementResponse('general', raw)
    expect(a.id).not.toBe(b.id)
  })
})

describe('createRefiner', () => {
  it('calls the LLM with the built prompt and returns a proposal', async () => {
    const mockLlm = vi.fn().mockResolvedValue(
      JSON.stringify({
        improvedSystemPrompt: 'Be more precise about Scope 3.',
        reasoning: 'Users asked for Scope 3 info.',
        expectedImprovements: ['fewer incomplete answers'],
      }),
    )
    const refiner = createRefiner({ llm: mockLlm })
    const proposal = await refiner.refine('climate-risk', samplePatterns)
    expect(mockLlm).toHaveBeenCalledOnce()
    expect(proposal.agentId).toBe('climate-risk')
    expect(proposal.status).toBe('pending')
  })

  it('propagates LLM errors as RefinerError', async () => {
    const mockLlm = vi.fn().mockRejectedValue(new Error('network timeout'))
    const refiner = createRefiner({ llm: mockLlm })
    await expect(refiner.refine('general', [])).rejects.toThrow('network timeout')
  })

  it('works with the noop LLM (returns a placeholder proposal)', async () => {
    const refiner = createRefiner()
    const proposal = await refiner.refine('net-zero', [])
    expect(proposal.agentId).toBe('net-zero')
    expect(proposal.status).toBe('pending')
  })
})

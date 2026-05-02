import { describe, it, expect, beforeEach } from 'vitest'
import { submitFeedback, getFeedbackSummary, clearFeedback } from './feedback.js'

beforeEach(() => {
  clearFeedback()
})

describe('submitFeedback', () => {
  it('returns an entry with a unique id', () => {
    const e1 = submitFeedback({ sessionId: 's1', rating: 'up' })
    const e2 = submitFeedback({ sessionId: 's2', rating: 'down' })
    expect(e1.id).toMatch(/^fb_/)
    expect(e1.id).not.toBe(e2.id)
  })

  it('stores sessionId and rating', () => {
    const e = submitFeedback({ sessionId: 'abc', rating: 'up', agentId: 'climate-risk' })
    expect(e.sessionId).toBe('abc')
    expect(e.rating).toBe('up')
    expect(e.agentId).toBe('climate-risk')
  })

  it('stores optional correction', () => {
    const e = submitFeedback({ sessionId: 's3', rating: 'down', correction: 'Wrong scope.' })
    expect(e.correction).toBe('Wrong scope.')
  })

  it('timestamp is a Date', () => {
    const e = submitFeedback({ sessionId: 's4', rating: 'up' })
    expect(e.timestamp).toBeInstanceOf(Date)
  })
})

describe('getFeedbackSummary', () => {
  it('returns zero counts on empty state', () => {
    const s = getFeedbackSummary()
    expect(s.total).toBe(0)
    expect(s.upvotes).toBe(0)
    expect(s.upvoteRate).toBe(0)
  })

  it('counts upvotes and downvotes', () => {
    submitFeedback({ sessionId: 's1', rating: 'up' })
    submitFeedback({ sessionId: 's2', rating: 'up' })
    submitFeedback({ sessionId: 's3', rating: 'down' })
    const s = getFeedbackSummary()
    expect(s.total).toBe(3)
    expect(s.upvotes).toBe(2)
    expect(s.downvotes).toBe(1)
    expect(s.upvoteRate).toBeCloseTo(2 / 3, 5)
  })

  it('groups by agent', () => {
    submitFeedback({ sessionId: 's1', rating: 'up', agentId: 'climate-risk' })
    submitFeedback({ sessionId: 's2', rating: 'down', agentId: 'climate-risk' })
    submitFeedback({ sessionId: 's3', rating: 'up', agentId: 'net-zero' })
    const s = getFeedbackSummary()
    expect(s.byAgent['climate-risk']).toEqual({ up: 1, down: 1 })
    expect(s.byAgent['net-zero']).toEqual({ up: 1, down: 0 })
  })
})

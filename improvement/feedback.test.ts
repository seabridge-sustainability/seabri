import { describe, it, expect } from 'vitest'
import {
  createExplicitFeedback,
  createImplicitFeedback,
  aggregateFeedback,
  classifySignal,
  type ExplicitFeedback,
  type ImplicitFeedback,
  type FeedbackAggregate,
  type ImplicitSignalType,
} from './feedback.js'

describe('createExplicitFeedback', () => {
  it('creates a thumbs-up record', () => {
    const fb = createExplicitFeedback({ sessionId: 's1', agentId: 'climate-risk', rating: 'up' })
    expect(fb.type).toBe('explicit')
    expect(fb.rating).toBe('up')
    expect(fb.sessionId).toBe('s1')
    expect(fb.agentId).toBe('climate-risk')
  })

  it('creates a thumbs-down record with optional correction', () => {
    const fb = createExplicitFeedback({
      sessionId: 's2',
      agentId: 'general',
      rating: 'down',
      correction: 'The emission factor was wrong',
    })
    expect(fb.rating).toBe('down')
    expect(fb.correction).toBe('The emission factor was wrong')
  })

  it('assigns a unique id each call', () => {
    const a = createExplicitFeedback({ sessionId: 's1', agentId: 'general', rating: 'up' })
    const b = createExplicitFeedback({ sessionId: 's1', agentId: 'general', rating: 'up' })
    expect(a.id).not.toBe(b.id)
  })

  it('records a timestamp', () => {
    const before = Date.now()
    const fb = createExplicitFeedback({ sessionId: 's1', agentId: 'general', rating: 'up' })
    const after = Date.now()
    expect(fb.createdAt).toBeGreaterThanOrEqual(before)
    expect(fb.createdAt).toBeLessThanOrEqual(after)
  })
})

describe('createImplicitFeedback', () => {
  it('creates a follow-up signal', () => {
    const fb = createImplicitFeedback({ sessionId: 's3', agentId: 'climate-risk', signal: 'follow_up' })
    expect(fb.type).toBe('implicit')
    expect(fb.signal).toBe('follow_up')
  })

  it('creates an abandonment signal', () => {
    const fb = createImplicitFeedback({ sessionId: 's4', agentId: 'general', signal: 'abandonment' })
    expect(fb.signal).toBe('abandonment')
  })

  it('creates a re-routing signal', () => {
    const fb = createImplicitFeedback({ sessionId: 's5', agentId: 'net-zero', signal: 're_routing' })
    expect(fb.signal).toBe('re_routing')
  })

  it('assigns a unique id each call', () => {
    const a = createImplicitFeedback({ sessionId: 's1', agentId: 'general', signal: 'follow_up' })
    const b = createImplicitFeedback({ sessionId: 's1', agentId: 'general', signal: 'follow_up' })
    expect(a.id).not.toBe(b.id)
  })
})

describe('classifySignal', () => {
  it('classifies thumbs-up as positive', () => {
    expect(classifySignal('up')).toBe('positive')
  })

  it('classifies thumbs-down as negative', () => {
    expect(classifySignal('down')).toBe('negative')
  })

  it('classifies follow_up as neutral (partial success)', () => {
    expect(classifySignal('follow_up')).toBe('neutral')
  })

  it('classifies abandonment as negative', () => {
    expect(classifySignal('abandonment')).toBe('negative')
  })

  it('classifies re_routing as negative', () => {
    expect(classifySignal('re_routing')).toBe('negative')
  })
})

describe('aggregateFeedback', () => {
  const explicitUp: ExplicitFeedback = {
    id: 'e1',
    type: 'explicit',
    sessionId: 's1',
    agentId: 'climate-risk',
    rating: 'up',
    createdAt: 1000,
  }
  const explicitDown: ExplicitFeedback = {
    id: 'e2',
    type: 'explicit',
    sessionId: 's2',
    agentId: 'climate-risk',
    rating: 'down',
    createdAt: 2000,
  }
  const implicitAbandonment: ImplicitFeedback = {
    id: 'i1',
    type: 'implicit',
    sessionId: 's3',
    agentId: 'climate-risk',
    signal: 'abandonment',
    createdAt: 3000,
  }
  const implicitFollowUp: ImplicitFeedback = {
    id: 'i2',
    type: 'implicit',
    sessionId: 's4',
    agentId: 'climate-risk',
    signal: 'follow_up',
    createdAt: 4000,
  }

  it('returns zero counts for empty input', () => {
    const agg = aggregateFeedback([])
    expect(agg.total).toBe(0)
    expect(agg.positiveCount).toBe(0)
    expect(agg.negativeCount).toBe(0)
    expect(agg.neutralCount).toBe(0)
    expect(agg.satisfactionRate).toBe(0)
  })

  it('counts a single thumbs-up correctly', () => {
    const agg = aggregateFeedback([explicitUp])
    expect(agg.total).toBe(1)
    expect(agg.positiveCount).toBe(1)
    expect(agg.negativeCount).toBe(0)
    expect(agg.satisfactionRate).toBeCloseTo(100, 5)
  })

  it('counts a thumbs-down correctly', () => {
    const agg = aggregateFeedback([explicitDown])
    expect(agg.negativeCount).toBe(1)
    expect(agg.satisfactionRate).toBeCloseTo(0, 5)
  })

  it('calculates satisfaction rate across mixed signals', () => {
    const agg = aggregateFeedback([explicitUp, explicitDown, implicitAbandonment, implicitFollowUp])
    expect(agg.total).toBe(4)
    expect(agg.positiveCount).toBe(1)
    expect(agg.negativeCount).toBe(2)
    expect(agg.neutralCount).toBe(1)
    // satisfactionRate = positive / total * 100
    expect(agg.satisfactionRate).toBeCloseTo(25, 5)
  })

  it('groups by agentId when requested', () => {
    const netZeroFb: ExplicitFeedback = {
      id: 'e3',
      type: 'explicit',
      sessionId: 's5',
      agentId: 'net-zero',
      rating: 'up',
      createdAt: 5000,
    }
    const agg = aggregateFeedback([explicitUp, netZeroFb], { groupByAgent: true })
    expect(agg.byAgent).toBeDefined()
    expect(agg.byAgent!['climate-risk'].total).toBe(1)
    expect(agg.byAgent!['net-zero'].total).toBe(1)
  })

  it('identifies the worst-performing agent by satisfaction rate', () => {
    const netZeroDown: ExplicitFeedback = {
      id: 'e4',
      type: 'explicit',
      sessionId: 's6',
      agentId: 'net-zero',
      rating: 'down',
      createdAt: 6000,
    }
    const agg = aggregateFeedback([explicitUp, netZeroDown], { groupByAgent: true })
    expect(agg.worstAgent).toBe('net-zero')
  })

  it('returns worstAgent undefined when byAgent is not computed', () => {
    const agg = aggregateFeedback([explicitUp])
    expect(agg.worstAgent).toBeUndefined()
  })
})

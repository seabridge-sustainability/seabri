export type Rating = 'up' | 'down'
export type ImplicitSignalType = 'follow_up' | 'abandonment' | 're_routing'
export type SentimentClass = 'positive' | 'negative' | 'neutral'

export interface ExplicitFeedback {
  id: string
  type: 'explicit'
  sessionId: string
  agentId: string
  rating: Rating
  correction?: string
  createdAt: number
}

export interface ImplicitFeedback {
  id: string
  type: 'implicit'
  sessionId: string
  agentId: string
  signal: ImplicitSignalType
  createdAt: number
}

export type Feedback = ExplicitFeedback | ImplicitFeedback

export interface AgentAggregate {
  total: number
  positiveCount: number
  negativeCount: number
  neutralCount: number
  satisfactionRate: number
}

export interface FeedbackAggregate extends AgentAggregate {
  byAgent?: Record<string, AgentAggregate>
  worstAgent?: string
}

let _counter = 0
function generateId(): string {
  return `fb_${Date.now()}_${++_counter}_${Math.random().toString(36).slice(2, 7)}`
}

export function createExplicitFeedback(input: {
  sessionId: string
  agentId: string
  rating: Rating
  correction?: string
}): ExplicitFeedback {
  return {
    id: generateId(),
    type: 'explicit',
    sessionId: input.sessionId,
    agentId: input.agentId,
    rating: input.rating,
    correction: input.correction,
    createdAt: Date.now(),
  }
}

export function createImplicitFeedback(input: {
  sessionId: string
  agentId: string
  signal: ImplicitSignalType
}): ImplicitFeedback {
  return {
    id: generateId(),
    type: 'implicit',
    sessionId: input.sessionId,
    agentId: input.agentId,
    signal: input.signal,
    createdAt: Date.now(),
  }
}

export function classifySignal(signal: Rating | ImplicitSignalType): SentimentClass {
  if (signal === 'up') return 'positive'
  if (signal === 'follow_up') return 'neutral'
  return 'negative'
}

function classifyFeedback(fb: Feedback): SentimentClass {
  if (fb.type === 'explicit') return classifySignal(fb.rating)
  return classifySignal(fb.signal)
}

function computeAgentAggregate(items: Feedback[]): AgentAggregate {
  if (items.length === 0) {
    return { total: 0, positiveCount: 0, negativeCount: 0, neutralCount: 0, satisfactionRate: 0 }
  }
  let pos = 0, neg = 0, neu = 0
  for (const fb of items) {
    const cls = classifyFeedback(fb)
    if (cls === 'positive') pos++
    else if (cls === 'negative') neg++
    else neu++
  }
  return {
    total: items.length,
    positiveCount: pos,
    negativeCount: neg,
    neutralCount: neu,
    satisfactionRate: (pos / items.length) * 100,
  }
}

export function aggregateFeedback(
  items: Feedback[],
  opts: { groupByAgent?: boolean } = {},
): FeedbackAggregate {
  const base = computeAgentAggregate(items)

  if (!opts.groupByAgent) return base

  const groups: Record<string, Feedback[]> = {}
  for (const fb of items) {
    ;(groups[fb.agentId] ??= []).push(fb)
  }

  const byAgent: Record<string, AgentAggregate> = {}
  for (const [agentId, fbs] of Object.entries(groups)) {
    byAgent[agentId] = computeAgentAggregate(fbs)
  }

  let worstAgent: string | undefined
  let worstRate = Infinity
  for (const [agentId, agg] of Object.entries(byAgent)) {
    if (agg.satisfactionRate < worstRate) {
      worstRate = agg.satisfactionRate
      worstAgent = agentId
    }
  }

  return { ...base, byAgent, worstAgent }
}

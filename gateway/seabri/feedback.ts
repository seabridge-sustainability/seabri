export type Rating = 'up' | 'down'

export interface FeedbackEntry {
  id: string
  sessionId: string
  agentId?: string
  taskId?: string
  rating: Rating
  correction?: string
  timestamp: Date
}

interface FeedbackSummary {
  total: number
  upvotes: number
  downvotes: number
  upvoteRate: number
  byAgent: Record<string, { up: number; down: number }>
}

const entries: FeedbackEntry[] = []

export function submitFeedback(input: {
  sessionId: string
  agentId?: string
  taskId?: string
  rating: Rating
  correction?: string
}): FeedbackEntry {
  const entry: FeedbackEntry = {
    id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    sessionId: input.sessionId,
    agentId: input.agentId,
    taskId: input.taskId,
    rating: input.rating,
    correction: input.correction,
    timestamp: new Date(),
  }
  entries.push(entry)
  return entry
}

export function getFeedbackSummary(): FeedbackSummary {
  const total = entries.length
  const upvotes = entries.filter((e) => e.rating === 'up').length
  const downvotes = total - upvotes

  const byAgent: Record<string, { up: number; down: number }> = {}
  for (const e of entries) {
    const key = e.agentId ?? 'unknown'
    if (!byAgent[key]) byAgent[key] = { up: 0, down: 0 }
    if (e.rating === 'up') byAgent[key].up++
    else byAgent[key].down++
  }

  return {
    total,
    upvotes,
    downvotes,
    upvoteRate: total > 0 ? upvotes / total : 0,
    byAgent,
  }
}

export function clearFeedback(): void {
  entries.length = 0
}

import { scoreFinding, type QualityScore } from './scorer.js'

export interface WorkerTask {
  topic: string
  section: string
}

export interface WorkerResult {
  id: string
  topic: string
  section: string
  startedAt: number
  completedAt: number
  finding?: string
  score?: QualityScore
  kept: boolean
  timedOut: boolean
  error?: string
}

const RESEARCH_PROMPT = (topic: string, section: string) => `You are a sustainability research agent. Research the following topic and provide a detailed finding.

Topic: ${topic}
Section: ${section}

Provide:
1. Key finding (2-3 sentences, factual and specific)
2. Data sources or evidence
3. Practical implications
4. Confidence level (high/medium/low) and why

Be specific with numbers, dates, and named sources where possible.`

function newId(): string {
  return `exp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export async function runExperimentWithBudget(
  task: WorkerTask,
  apiKey: string,
  model: string,
  budgetMs: number
): Promise<WorkerResult> {
  const id = newId()
  const startedAt = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), budgetMs)

  const result: WorkerResult = {
    id,
    topic: task.topic,
    section: task.section,
    startedAt,
    completedAt: startedAt,
    kept: false,
    timedOut: false,
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: RESEARCH_PROMPT(task.topic, task.section) }],
      }),
    })

    if (!response.ok) {
      result.error = `HTTP ${response.status}`
      result.completedAt = Date.now()
      return result
    }

    const data = (await response.json()) as { content: Array<{ type: string; text: string }> }
    const textBlock = data.content.find((c) => c.type === 'text')
    if (!textBlock) {
      result.error = 'No text content in response'
      result.completedAt = Date.now()
      return result
    }

    result.finding = textBlock.text
    const score = await scoreFinding(task.topic, [textBlock.text], task.section)
    result.score = score
    result.kept = score.keep
    result.completedAt = Date.now()
    return result
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    if (controller.signal.aborted) {
      result.timedOut = true
      result.error = `Budget exceeded (${budgetMs}ms)`
    } else {
      result.error = message
    }
    result.completedAt = Date.now()
    return result
  } finally {
    clearTimeout(timer)
  }
}

export async function runPool(
  tasks: WorkerTask[],
  apiKey: string,
  model: string,
  budgetMs: number,
  concurrency: number,
  deadline: number,
  onResult?: (r: WorkerResult) => void
): Promise<WorkerResult[]> {
  const results: WorkerResult[] = []
  let cursor = 0

  async function worker(): Promise<void> {
    while (true) {
      if (Date.now() >= deadline) return
      const index = cursor++
      if (index >= tasks.length) return
      const task = tasks[index]
      const remaining = deadline - Date.now()
      if (remaining <= 0) return
      const budget = Math.min(budgetMs, remaining)
      const result = await runExperimentWithBudget(task, apiKey, model, budget)
      results.push(result)
      onResult?.(result)
    }
  }

  const workers = Array.from({ length: Math.max(1, concurrency) }, () => worker())
  await Promise.all(workers)
  return results
}

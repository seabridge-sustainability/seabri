import { ANTHROPIC_API_KEY, ANTHROPIC_API_URL } from '../config.js'

const HAIKU_MODEL = 'claude-haiku-4-5-20251001'

export interface ParsedCron {
  expression: string   // valid cron expression
  description: string  // human-readable interpretation
  task: string         // what to do when triggered
}

export async function parseNaturalLanguageCron(input: string): Promise<ParsedCron | null> {
  if (!ANTHROPIC_API_KEY) return null

  const prompt = `Convert this natural language schedule into a cron expression and task description.

Input: "${input}"

Return JSON with exactly these fields:
{
  "expression": "<valid cron expression with 5 fields: min hour dom month dow>",
  "description": "<human-readable: e.g., 'Every day at 8:00 AM'>",
  "task": "<what to do: clean, 1-sentence description of the task>"
}

Rules:
- The cron expression must be valid (5 fields: minute hour day-of-month month day-of-week)
- Assume the user's local time
- For "daily at X": use the specific hour
- For "weekly": pick the day mentioned or Monday if unspecified
- For "every N hours": use */N in the hour field
- Keep the task description clear and actionable

Return only valid JSON, no markdown.`

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: HAIKU_MODEL,
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(15_000),
    })

    if (!response.ok) return null

    const data = (await response.json()) as { content: Array<{ type: string; text: string }> }
    const textBlock = data.content.find((c) => c.type === 'text')
    if (!textBlock) return null

    const parsed = JSON.parse(textBlock.text) as {
      expression: string
      description: string
      task: string
    }

    if (!parsed.expression || !parsed.description || !parsed.task) return null

    // Basic validation: cron expression should have 5 space-separated parts
    const parts = parsed.expression.trim().split(/\s+/)
    if (parts.length !== 5) return null

    return parsed
  } catch {
    return null
  }
}

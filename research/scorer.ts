import { ANTHROPIC_API_KEY } from '../gateway/config.js'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const HAIKU_MODEL = 'claude-haiku-4-5-20251001'

export interface QualityScore {
  relevance: number       // 0-10: does this actually address a real sustainability decision?
  sourceQuality: number   // 0-10: are sources credible and specific?
  actionability: number   // 0-10: can a real person act on this?
  overall: number         // avg of the three
  reason: string          // one sentence explaining the score
  keep: boolean           // overall >= 6.0
}

export async function scoreFinding(
  topic: string,
  takeaways: string[],
  rawContext: string
): Promise<QualityScore> {
  if (!ANTHROPIC_API_KEY) {
    // No API key — use a heuristic score
    return heuristicScore(topic, takeaways)
  }

  const prompt = `Score this sustainability research finding on three dimensions. Return JSON only.

Topic: "${topic}"

Takeaways:
${takeaways.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Raw context excerpt (first 500 chars):
${rawContext.slice(0, 500)}

Score each dimension 0-10:
- relevance: Does this address a real decision a homeowner, farmer, investor, or business could face?
- sourceQuality: Are the claims based on named organizations, data sources, or measurable figures? (vs. vague generalities)
- actionability: Can a real person act on at least one takeaway today or this year?

Return exactly this JSON structure:
{
  "relevance": <number 0-10>,
  "sourceQuality": <number 0-10>,
  "actionability": <number 0-10>,
  "reason": "<one sentence explaining the overall score>"
}`

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
    })

    if (!response.ok) {
      return heuristicScore(topic, takeaways)
    }

    const data = (await response.json()) as { content: Array<{ type: string; text: string }> }
    const textBlock = data.content.find((c) => c.type === 'text')
    if (!textBlock) return heuristicScore(topic, takeaways)

    const parsed = JSON.parse(textBlock.text) as {
      relevance: number
      sourceQuality: number
      actionability: number
      reason: string
    }

    const overall = (parsed.relevance + parsed.sourceQuality + parsed.actionability) / 3
    return {
      relevance: parsed.relevance,
      sourceQuality: parsed.sourceQuality,
      actionability: parsed.actionability,
      overall: Math.round(overall * 10) / 10,
      reason: parsed.reason,
      keep: overall >= 6.0,
    }
  } catch {
    return heuristicScore(topic, takeaways)
  }
}

function heuristicScore(topic: string, takeaways: string[]): QualityScore {
  // Simple heuristic when API unavailable
  const hasNumbers = takeaways.some((t) => /\d/.test(t))
  const hasSource = takeaways.some((t) => /\b(NOAA|EPA|FEMA|IPCC|NRDC|World Bank|study|report|data shows)\b/i.test(t))
  const hasCta = takeaways.some((t) => /\b(can|should|consider|check|request|purchase|install|contact)\b/i.test(t))

  const relevance = topic.length > 10 ? 7 : 5
  const sourceQuality = hasNumbers ? (hasSource ? 7 : 5) : 4
  const actionability = hasCta ? 7 : 5
  const overall = (relevance + sourceQuality + actionability) / 3

  return {
    relevance,
    sourceQuality,
    actionability,
    overall: Math.round(overall * 10) / 10,
    reason: 'Heuristic score (API unavailable)',
    keep: overall >= 6.0,
  }
}

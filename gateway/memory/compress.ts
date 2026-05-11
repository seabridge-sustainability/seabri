import { ANTHROPIC_API_KEY } from '../config.js'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const HAIKU_MODEL = 'claude-haiku-4-5-20251001'

const COMPRESS_THRESHOLD = 20  // compress when history exceeds this many messages
const KEEP_RECENT = 6          // always keep this many recent messages verbatim

export interface Message {
  role: string
  content: string
}

export function needsCompression(history: Message[]): boolean {
  return history.length > COMPRESS_THRESHOLD
}

export async function compressHistory(history: Message[]): Promise<{
  compressed: boolean
  history: Message[]
  summary: string
}> {
  if (history.length <= COMPRESS_THRESHOLD) {
    return { compressed: false, history, summary: '' }
  }

  const toCompress = history.slice(0, history.length - KEEP_RECENT)
  const toKeep = history.slice(history.length - KEEP_RECENT)

  if (!ANTHROPIC_API_KEY || toCompress.length === 0) {
    // Fallback: just truncate to kept messages
    return {
      compressed: true,
      history: toKeep,
      summary: `[${toCompress.length} earlier messages omitted]`,
    }
  }

  const conversationText = toCompress
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n')

  const prompt = `Summarize this conversation in 3-5 sentences. Capture: what the user is trying to do, their situation, key facts established, and any conclusions reached. Write as a factual brief for continuing the conversation.

${conversationText}`

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
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(20_000),
    })

    if (!response.ok) {
      return { compressed: true, history: toKeep, summary: `[${toCompress.length} earlier messages compressed]` }
    }

    const data = (await response.json()) as { content: Array<{ type: string; text: string }> }
    const textBlock = data.content.find((c) => c.type === 'text')
    const summary = textBlock?.text ?? `[${toCompress.length} earlier messages compressed]`

    // Inject as a user/assistant pair so the model reads this as context,
    // not as a real user message (avoids prompt injection via the summary).
    const summaryPair: Message[] = [
      { role: 'user', content: '[SYSTEM: Earlier conversation compressed]' },
      { role: 'assistant', content: `[Summary of earlier conversation: ${summary}]` },
    ]

    return {
      compressed: true,
      history: [...summaryPair, ...toKeep],
      summary,
    }
  } catch {
    return {
      compressed: true,
      history: toKeep,
      summary: `[${toCompress.length} earlier messages omitted due to compression error]`,
    }
  }
}

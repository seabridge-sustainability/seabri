import { DEFAULT_MODEL } from './agents'
import type { Message } from '../types/openseabri'

const API_URL = 'https://api.anthropic.com/v1/messages'
const API_VERSION = '2023-06-01'

export interface RawAttachment {
  kind: 'image' | 'document' | 'file'
  mime: string
  name: string
  data: string // base64
}

type AnthropicBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
  | { type: 'document'; source: { type: 'base64'; media_type: string; data: string } }

export interface StreamOptions {
  apiKey: string
  model?: string
  systemPrompt: string
  history: Pick<Message, 'role' | 'content'>[]
  attachments?: RawAttachment[]
  maxTokens?: number
  signal?: AbortSignal
  onDelta: (text: string) => void
}

export async function streamAnthropicMessage(opts: StreamOptions): Promise<void> {
  const {
    apiKey,
    model = DEFAULT_MODEL,
    systemPrompt,
    history,
    attachments,
    maxTokens = 2048,
    signal,
    onDelta,
  } = opts

  const response = await fetch(API_URL, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': API_VERSION,
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      stream: true,
      system: systemPrompt,
      messages: history.map(({ role, content }, i) => {
        const isLastUser = role === 'user' && i === history.length - 1
        if (isLastUser && attachments && attachments.length > 0) {
          const blocks: AnthropicBlock[] = []
          for (const a of attachments) {
            if (a.mime.startsWith('image/')) {
              blocks.push({ type: 'image', source: { type: 'base64', media_type: a.mime, data: a.data } })
            } else if (a.mime === 'application/pdf') {
              blocks.push({ type: 'document', source: { type: 'base64', media_type: a.mime, data: a.data } })
            }
          }
          if (content) blocks.push({ type: 'text', text: content })
          return { role, content: blocks }
        }
        return { role, content }
      }),
    }),
  })

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({} as { error?: { message?: string } }))
    throw new Error(errBody?.error?.message || `HTTP ${response.status}`)
  }

  if (!response.body) {
    throw new Error('Response body is not readable')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (!data || data === '[DONE]') continue
      try {
        const parsed = JSON.parse(data) as {
          type?: string
          delta?: { type?: string; text?: string }
        }
        if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta' && parsed.delta.text) {
          onDelta(parsed.delta.text)
        }
      } catch {
        // Ignore partial SSE lines
      }
    }
  }
}

import { ANTHROPIC_API_KEY, MODEL } from '../config.js'
import { getSystemPrompt } from './agents.js'
import { buildSystemContext } from '../memory/memory.js'
import { compressHistory } from '../memory/compress.js'
import { checkAndImprove } from '../skills/improver.js'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
const MAX_TOKENS = 4096

// Primary → backup model failover
const MODEL_FAILOVER = [MODEL, 'claude-haiku-4-5-20251001']

interface Message {
  role: string
  content: string
}

interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AnthropicResponse {
  content: Array<{ type: string; text: string }>
  error?: { message: string }
}

function toAnthropicMessages(history: Message[]): AnthropicMessage[] {
  return history
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))
}

export async function routeMessage(
  agentId: string,
  userMessage: string,
  conversationHistory: Message[],
  additionalContext?: string
): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    return (
      'ANTHROPIC_API_KEY is not set. Please add it to your .env file or environment variables.\n' +
      'Run `seabri onboard` to set it up interactively.'
    )
  }

  let systemContext = ''
  try {
    systemContext = await buildSystemContext()
  } catch {
    // Context build failure is non-fatal
  }

  const agentPrompt = getSystemPrompt(agentId)

  const systemParts: string[] = []
  if (systemContext) systemParts.push(systemContext)
  if (additionalContext) systemParts.push(additionalContext)
  systemParts.push(agentPrompt)
  const system = systemParts.join('\n\n---\n\n')

  // Compress history if too long before sending to API
  let effectiveHistory = conversationHistory
  try {
    const compression = await compressHistory(conversationHistory)
    effectiveHistory = compression.history
  } catch {
    // Compression failure is non-fatal — use raw history
  }

  const messages: AnthropicMessage[] = [
    ...toAnthropicMessages(effectiveHistory),
    { role: 'user', content: userMessage },
  ]

  let lastError = ''
  for (const model of MODEL_FAILOVER) {
    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': ANTHROPIC_VERSION,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: MAX_TOKENS,
          system,
          messages,
        }),
      })

      if (!response.ok) {
        let errorDetail = `HTTP ${response.status}`
        try {
          const errorBody = (await response.json()) as { error?: { message?: string } }
          if (errorBody?.error?.message) errorDetail = errorBody.error.message
        } catch { /* ignore */ }

        if (response.status === 401) {
          return 'Authentication failed. Your ANTHROPIC_API_KEY may be invalid or expired. Run `seabri doctor` to check.'
        }
        if (response.status === 429 && model !== MODEL_FAILOVER[MODEL_FAILOVER.length - 1]) {
          lastError = errorDetail
          continue // Try next model in failover chain
        }
        if (response.status === 429) {
          return 'Rate limit reached. Please wait a moment before trying again.'
        }
        return `API request failed: ${errorDetail}`
      }

      const data = (await response.json()) as AnthropicResponse

      if (!data.content || data.content.length === 0) {
        return 'Received an empty response from the API. Please try again.'
      }

      const textBlock = data.content.find((block) => block.type === 'text')
      if (!textBlock) {
        return 'Received a non-text response from the API. Please try again.'
      }

      const responseText = textBlock.text

      // Fire-and-forget skills self-improvement after complex responses
      checkAndImprove(userMessage, responseText, agentId).catch(() => {})

      return responseText
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes('fetch failed') || message.includes('ECONNREFUSED') || message.includes('network')) {
        return 'Could not reach the Anthropic API. Check your internet connection and try again.'
      }
      lastError = message
      // Try next model in failover chain
    }
  }

  return `An unexpected error occurred: ${lastError}. Please try again.`
}

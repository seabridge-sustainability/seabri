import type { Message } from '../types/openseabri'

export interface RawAttachment {
  kind: 'image' | 'document' | 'file'
  mime: string
  name: string
  data: string // base64
}

export interface StreamOptions {
  /** @deprecated apiKey is no longer used — all LLM calls route through the gateway. */
  apiKey?: string
  model?: string
  systemPrompt: string
  history: Pick<Message, 'role' | 'content'>[]
  attachments?: RawAttachment[]
  maxTokens?: number
  signal?: AbortSignal
  onDelta: (text: string) => void
}

/**
 * @deprecated Direct browser Anthropic API calls are disabled for security.
 * LLM streaming is handled by the gateway via streamViaGateway in store/chat.ts.
 * This function will throw if called — configure VITE_GATEWAY_URL instead.
 */
export async function streamAnthropicMessage(_opts: StreamOptions): Promise<void> {
  throw new Error(
    'Direct browser Anthropic API calls are disabled. ' +
    'Configure VITE_GATEWAY_URL and VITE_OPENSEABRI_API_KEY to use the gateway.',
  )
}

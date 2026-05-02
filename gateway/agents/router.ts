import { ANTHROPIC_API_KEY, MODEL } from '../config.js'
import { getSystemPrompt } from './agents.js'
import { buildSystemContext } from '../memory/memory.js'
import { compressHistory } from '../memory/compress.js'
import { checkAndImprove } from '../skills/improver.js'
import { type AnthropicTool, getToolsForAgent, executeTool } from './tools.js'
import { buildRagSkillsContext } from '../skills/loader.js'
import {
  augmentSustainabilityContext,
  augmentWorldRiskContext,
  augmentClimateRiskContext,
  augmentNatureRiskContext,
  augmentTransitionRiskContext,
  augmentMaterialityContext,
  augmentRegulationContext,
  augmentMcpToolsContext,
} from '../../bridge/agent_bridge.js'
import { loadUserConfig } from '../user_config.js'
import { selectModel, getFailoverModels } from '../orchestrator/model-router.js'
import { classifyIntent } from '../orchestrator/classifier.js'
import { recordMetric } from '../orchestrator/metrics.js'
import type { AgentId } from '../schemas.js'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
const MAX_TOKENS = 8192
const MAX_TOOL_ROUNDS = 8


interface Message {
  role: string
  content: string
}

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string }

interface ApiMessage {
  role: 'user' | 'assistant'
  content: string | ContentBlock[]
}

interface ToolUse {
  id: string
  name: string
  input: Record<string, unknown>
  parseError?: string
}

interface StreamResult {
  text: string
  toolUses: ToolUse[]
  stopReason: string
}

function toApiMessages(history: Message[]): ApiMessage[] {
  return history
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
}

// Stream one API turn. Collects both text tokens and tool_use blocks from the
// SSE stream. Returns all three (text, toolUses, stopReason) so the caller can
// decide whether to loop for another tool round.
async function streamOneTurn(
  model: string,
  systemText: string,
  messages: ApiMessage[],
  tools: AnthropicTool[],
  onToken?: (token: string) => void,
  signal?: AbortSignal
): Promise<StreamResult> {
  const body: Record<string, unknown> = {
    model,
    max_tokens: MAX_TOKENS,
    // Array format for system enables prompt caching — same prompt across turns
    // hits the server cache, reducing latency and cost.
    system: [{ type: 'text', text: systemText, cache_control: { type: 'ephemeral' } }],
    messages,
    stream: true,
  }
  if (tools.length > 0) body.tools = tools

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': ANTHROPIC_VERSION,
      'anthropic-beta': 'prompt-caching-2024-07-31',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status}`
    try {
      const errorBody = (await response.json()) as { error?: { message?: string } }
      if (errorBody?.error?.message) errorDetail = errorBody.error.message
    } catch { /* ignore */ }
    throw Object.assign(new Error(errorDetail), { status: response.status })
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''
  let fullText = ''
  let stopReason = 'end_turn'

  // Per-block accumulation state, keyed by SSE block index.
  const textByIndex: Record<number, string> = {}
  const toolByIndex: Record<number, { id: string; name: string; inputJson: string }> = {}

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') continue
        try {
          const ev = JSON.parse(data) as {
            type: string
            index?: number
            content_block?: { type: string; id?: string; name?: string; text?: string }
            delta?: { type: string; text?: string; partial_json?: string; stop_reason?: string }
          }

          if (ev.type === 'content_block_start' && ev.index !== undefined && ev.content_block) {
            const blk = ev.content_block
            if (blk.type === 'text') {
              const seed = blk.text ?? ''
              textByIndex[ev.index] = seed
              // Anthropic rarely sends non-empty seed text in content_block_start,
              // but handle it to keep fullText in sync.
              if (seed) { fullText += seed; onToken?.(seed) }
            } else if (blk.type === 'tool_use') {
              toolByIndex[ev.index] = { id: blk.id ?? '', name: blk.name ?? '', inputJson: '' }
            }
          } else if (ev.type === 'content_block_delta' && ev.index !== undefined && ev.delta) {
            if (ev.delta.type === 'text_delta' && ev.delta.text !== undefined) {
              textByIndex[ev.index] = (textByIndex[ev.index] ?? '') + ev.delta.text
              fullText += ev.delta.text
              onToken?.(ev.delta.text)
            } else if (ev.delta.type === 'input_json_delta' && ev.delta.partial_json !== undefined) {
              if (toolByIndex[ev.index]) toolByIndex[ev.index].inputJson += ev.delta.partial_json
            }
          } else if (ev.type === 'message_delta' && ev.delta?.stop_reason) {
            stopReason = ev.delta.stop_reason
          }
        } catch { /* ignore malformed SSE frames */ }
      }
    }
  } finally {
    reader.releaseLock()
  }

  const toolUses: ToolUse[] = Object.values(toolByIndex).map((tu) => {
    let input: Record<string, unknown> = {}
    let parseError: string | undefined
    try {
      input = JSON.parse(tu.inputJson) as Record<string, unknown>
    } catch {
      parseError = `Malformed tool input JSON for "${tu.name}": ${tu.inputJson.slice(0, 120)}`
    }
    return { id: tu.id, name: tu.name, input, parseError }
  })

  if (!fullText && toolUses.length === 0) throw new Error('Empty response from API')
  return { text: fullText, toolUses, stopReason }
}

async function getBridgeContext(agentId: string): Promise<string> {
  const parts: string[] = []
  const cfg = await loadUserConfig()
  const { companyId, assetId, sector } = cfg

  // MCP tools context — works without companyId
  const mcpCtx = await augmentMcpToolsContext(agentId, 6)
  if (mcpCtx) parts.push(mcpCtx)

  if (agentId === 'investment-screening' || agentId === 'climate-risk') {
    const promises: Promise<string>[] = [augmentWorldRiskContext(), augmentSustainabilityContext(sector)]
    if (companyId) {
      promises.push(
        augmentClimateRiskContext('', companyId),
        augmentTransitionRiskContext(companyId)
      )
    }
    const results = await Promise.all(promises)
    for (const r of results) if (r) parts.push(r)
  } else if (agentId === 'nature-biodiversity' || agentId === 'natural-capital') {
    const promises: Promise<string>[] = [augmentSustainabilityContext(sector)]
    if (companyId) {
      promises.push(augmentNatureRiskContext(companyId))
    }
    const results = await Promise.all(promises)
    for (const r of results) if (r) parts.push(r)
  } else if (agentId === 'sustainability-reporting') {
    const promises: Promise<string>[] = [augmentSustainabilityContext(sector)]
    if (companyId) {
      promises.push(
        augmentMaterialityContext(companyId),
        augmentRegulationContext(companyId)
      )
    }
    const results = await Promise.all(promises)
    for (const r of results) if (r) parts.push(r)
  } else if (agentId === 'net-zero') {
    const promises: Promise<string>[] = [augmentSustainabilityContext(sector)]
    if (companyId) {
      promises.push(augmentTransitionRiskContext(companyId))
      if (assetId) {
        const { augmentTargetsContext } = await import('../../bridge/agent_bridge.js')
        promises.push(augmentTargetsContext(assetId))
      }
    }
    const results = await Promise.all(promises)
    for (const r of results) if (r) parts.push(r)
  } else {
    // general + home-community + any future agent
    const sustain = await augmentSustainabilityContext(sector)
    if (sustain) parts.push(sustain)
  }

  return parts.join('\n\n---\n\n')
}

export async function routeMessage(
  agentId: string,
  userMessage: string,
  conversationHistory: Message[],
  additionalContext?: string,
  onToken?: (token: string) => void,
  forceModel?: string,
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

  // RAG: find the most relevant SKILL.md guides for this specific query and
  // inject their full methodology into the system prompt.
  let skillsContext = ''
  try {
    skillsContext = await buildRagSkillsContext(userMessage)
  } catch {
    // Skills retrieval failure is non-fatal
  }

  // Backend data: inject quantitative context from SeaBridgeAI when available.
  let bridgeContext = ''
  try {
    bridgeContext = await getBridgeContext(agentId)
  } catch {
    // Bridge failure is non-fatal
  }

  const agentPrompt = getSystemPrompt(agentId)

  const systemParts: string[] = []
  if (systemContext) systemParts.push(systemContext)
  if (skillsContext) systemParts.push(skillsContext)
  if (bridgeContext) systemParts.push(bridgeContext)
  if (additionalContext) systemParts.push(additionalContext)
  systemParts.push(agentPrompt)
  const systemText = systemParts.join('\n\n---\n\n')

  // --- Orchestrator: dynamic model selection ---
  const effectiveAgentId = agentId as AgentId
  const conversationDepth = conversationHistory.filter((m) => m.role === 'user').length
  const modelSelection = selectModel(userMessage, effectiveAgentId, conversationDepth, forceModel)
  const modelFailover = getFailoverModels(modelSelection.model)

  let effectiveHistory = conversationHistory
  try {
    const compression = await compressHistory(conversationHistory)
    effectiveHistory = compression.history
  } catch {
    // Compression failure is non-fatal
  }

  const tools = getToolsForAgent(agentId)

  const messages: ApiMessage[] = [
    ...toApiMessages(effectiveHistory),
    { role: 'user', content: userMessage },
  ]

  const startTime = Date.now()
  let lastError = ''
  for (const model of modelFailover) {
    try {
      let finalText = ''
      let totalToolCalls = 0

      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const result = await streamOneTurn(model, systemText, messages, tools, onToken)
        finalText = result.text

        if (result.stopReason !== 'tool_use' || result.toolUses.length === 0) break

        totalToolCalls += result.toolUses.length

        const assistantBlocks: ContentBlock[] = []
        if (result.text) assistantBlocks.push({ type: 'text', text: result.text })
        for (const tu of result.toolUses) {
          assistantBlocks.push({ type: 'tool_use', id: tu.id, name: tu.name, input: tu.input })
        }
        messages.push({ role: 'assistant', content: assistantBlocks })

        const toolResultBlocks: ContentBlock[] = await Promise.all(
          result.toolUses.map(async (tu) => ({
            type: 'tool_result' as const,
            tool_use_id: tu.id,
            content: tu.parseError ?? await executeTool(tu.name, tu.input),
          }))
        )
        messages.push({ role: 'user', content: toolResultBlocks })
      }

      if (!finalText) {
        finalText = 'I retrieved the data but was unable to compose a response. Please try again.'
      }

      // Record metrics (fire-and-forget)
      const latencyMs = Date.now() - startTime
      const inputEstimate = Math.ceil(systemText.length / 4) + Math.ceil(userMessage.length / 4)
      const outputEstimate = Math.ceil(finalText.length / 4)
      recordMetric({
        agentId: effectiveAgentId,
        model,
        tier: modelSelection.tier,
        inputTokens: inputEstimate,
        outputTokens: outputEstimate,
        latencyMs,
        toolCalls: totalToolCalls,
      }).catch(() => {})

      checkAndImprove(userMessage, finalText, agentId).catch(() => {})

      return finalText
    } catch (err: unknown) {
      const status = (err as { status?: number }).status
      const message = err instanceof Error ? err.message : String(err)

      if (status === 401) {
        return 'Authentication failed. Your ANTHROPIC_API_KEY may be invalid or expired. Run `seabri doctor` to check.'
      }
      if (status === 429 && model !== modelFailover[modelFailover.length - 1]) {
        lastError = message
        continue
      }
      if (status === 429) {
        return 'Rate limit reached. Please wait a moment before trying again.'
      }
      if (
        message.includes('fetch failed') ||
        message.includes('ECONNREFUSED') ||
        message.includes('network')
      ) {
        return 'Could not reach the Anthropic API. Check your internet connection and try again.'
      }
      lastError = message
      if (model !== modelFailover[modelFailover.length - 1]) continue
    }
  }

  return `An unexpected error occurred: ${lastError}. Please try again.`
}

export { classifyIntent } from '../orchestrator/classifier.js'

/**
 * Subagent spawning — parallel specialist consultations.
 *
 * Fans a single question out to multiple OpenSeaBri specialists in parallel,
 * then synthesizes their responses through a lead agent. Useful for questions
 * that span multiple domains (e.g. "I bought farmland in Fresno — what are my
 * climate, nature, and investment risks?").
 *
 * Degrades gracefully: if any specialist fails, the panel still returns with
 * the successful responses plus an error note for the missing one.
 */

import { routeMessage } from './router.js'
import { getAgentName } from './agents.js'
import { AGENTS } from '../config.js'

export interface PanelResponse {
  agentId: string
  agentName: string
  response: string
  error?: string
  durationMs: number
}

export interface PanelResult {
  prompt: string
  leadAgentId: string
  responses: PanelResponse[]
  synthesis: string
  totalDurationMs: number
}

export interface PanelOptions {
  /** Panel member agent ids. If omitted, all 8 specialists are consulted. */
  agentIds?: string[]
  /** Lead agent id used for synthesis. Defaults to 'general'. */
  leadAgentId?: string
  /** Per-specialist timeout in ms. Defaults to 90s. */
  timeoutMs?: number
  /** Whether to compose a final synthesis. Defaults to true. */
  synthesize?: boolean
  /** Optional progress callback. */
  onProgress?: (msg: string) => void
  /** Conversation history to pass to each specialist for context. */
  conversationHistory?: Array<{ role: string; content: string }>
}

const DEFAULT_TIMEOUT_MS = 90_000

function validateAgents(ids: string[]): string[] {
  const known = new Set(AGENTS.map((a) => a.id))
  return ids.filter((id) => known.has(id))
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timeout: NodeJS.Timeout | undefined
  const timer = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms)
  })
  try {
    return await Promise.race([p, timer])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

async function consultOne(
  agentId: string,
  prompt: string,
  conversationHistory: Array<{ role: string; content: string }>,
  timeoutMs: number,
  onProgress?: (msg: string) => void
): Promise<PanelResponse> {
  const agentName = getAgentName(agentId)
  const start = Date.now()
  onProgress?.(`${agentName}: consulting...`)
  try {
    const response = await withTimeout(routeMessage(agentId, prompt, conversationHistory), timeoutMs)
    const durationMs = Date.now() - start
    onProgress?.(`${agentName}: done (${Math.round(durationMs / 1000)}s)`)
    return { agentId, agentName, response, durationMs }
  } catch (err: unknown) {
    const durationMs = Date.now() - start
    const error = err instanceof Error ? err.message : String(err)
    onProgress?.(`${agentName}: failed — ${error}`)
    return { agentId, agentName, response: '', error, durationMs }
  }
}

function buildSynthesisPrompt(prompt: string, responses: PanelResponse[]): string {
  const lines: string[] = [
    `The user asked: "${prompt}"`,
    '',
    'A panel of sustainability specialists was consulted in parallel. Their individual responses are below.',
    'Synthesize a single, coherent answer that:',
    '- Integrates the specialists\' perspectives without repeating each one verbatim',
    '- Flags where specialists disagree or emphasize different aspects',
    '- Keeps the concrete, actionable recommendations',
    '- Names the specialist for any specific claim so the user can dig deeper',
    '',
    '--- Specialist responses ---',
  ]
  for (const r of responses) {
    lines.push('')
    lines.push(`## ${r.agentName} (${r.agentId})`)
    if (r.error) {
      lines.push(`[unavailable: ${r.error}]`)
    } else {
      lines.push(r.response)
    }
  }
  lines.push('')
  lines.push('--- End of specialist responses ---')
  lines.push('')
  lines.push('Now provide the synthesized answer.')
  return lines.join('\n')
}

export async function consultPanel(
  prompt: string,
  options: PanelOptions = {}
): Promise<PanelResult> {
  const start = Date.now()
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const leadAgentId = options.leadAgentId ?? 'general'
  const synthesize = options.synthesize !== false

  const requested = options.agentIds ?? AGENTS.map((a) => a.id)
  const agentIds = validateAgents(requested)
  if (agentIds.length === 0) {
    throw new Error('No valid agent ids provided to consultPanel')
  }

  options.onProgress?.(`Consulting ${agentIds.length} specialists in parallel...`)

  const conversationHistory = options.conversationHistory ?? []
  const responses = await Promise.all(
    agentIds.map((id) => consultOne(id, prompt, conversationHistory, timeoutMs, options.onProgress))
  )

  let synthesis = ''
  const successful = responses.filter((r) => !r.error && r.response)
  if (successful.length === 0) {
    synthesis = 'All specialists were unavailable. Please try again in a moment.'
  } else if (!synthesize) {
    synthesis = successful.map((r) => `## ${r.agentName}\n\n${r.response}`).join('\n\n')
  } else {
    options.onProgress?.(`Synthesizing via ${getAgentName(leadAgentId)}...`)
    try {
      synthesis = await routeMessage(leadAgentId, buildSynthesisPrompt(prompt, responses), [])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      synthesis =
        `Synthesis failed (${msg}). Individual responses:\n\n` +
        successful.map((r) => `## ${r.agentName}\n\n${r.response}`).join('\n\n')
    }
  }

  return {
    prompt,
    leadAgentId,
    responses,
    synthesis,
    totalDurationMs: Date.now() - start,
  }
}

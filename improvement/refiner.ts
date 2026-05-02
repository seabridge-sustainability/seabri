export interface FailurePattern {
  category: string
  count: number
  examples: string[]
}

export interface RefinementProposal {
  id: string
  agentId: string
  improvedSystemPrompt: string
  reasoning: string
  expectedImprovements: string[]
  status: 'pending' | 'applied' | 'rejected'
  createdAt: number
}

type LlmCaller = (prompt: string) => Promise<string>

interface RefinerOptions {
  llm?: LlmCaller
}

interface Refiner {
  refine(agentId: string, patterns: FailurePattern[]): Promise<RefinementProposal>
}

const NOOP_RESPONSE = JSON.stringify({
  improvedSystemPrompt: '[No LLM configured — placeholder prompt]',
  reasoning: 'Noop LLM used for testing.',
  expectedImprovements: [],
})

const noopLlm: LlmCaller = async () => NOOP_RESPONSE

let _counter = 0
function generateId(): string {
  return `ref_${Date.now()}_${++_counter}_${Math.random().toString(36).slice(2, 7)}`
}

export function buildRefinementPrompt(agentId: string, patterns: FailurePattern[]): string {
  const patternLines = patterns
    .map((p) => `- ${p.category} (${p.count} occurrences): ${p.examples.slice(0, 2).join('; ')}`)
    .join('\n')

  return [
    `You are improving the system prompt for the "${agentId}" agent.`,
    '',
    'Failure patterns observed from user feedback:',
    patternLines || '(no failures recorded)',
    '',
    'Respond with a JSON object containing:',
    '  "improvedSystemPrompt": string  — the revised system prompt',
    '  "reasoning": string             — why these changes address the failures',
    '  "expectedImprovements": string[] — list of specific improvements expected',
  ].join('\n')
}

export function parseRefinementResponse(agentId: string, raw: string): RefinementProposal {
  // Strip markdown code fences if present
  const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(stripped)
  } catch {
    throw new Error(`RefinerError: invalid JSON from LLM: ${stripped.slice(0, 100)}`)
  }

  const obj = parsed as Record<string, unknown>
  if (typeof obj.improvedSystemPrompt !== 'string') {
    throw new Error('RefinerError: missing or invalid "improvedSystemPrompt" field')
  }
  if (typeof obj.reasoning !== 'string') {
    throw new Error('RefinerError: missing or invalid "reasoning" field')
  }

  return {
    id: generateId(),
    agentId,
    improvedSystemPrompt: obj.improvedSystemPrompt,
    reasoning: obj.reasoning,
    expectedImprovements: Array.isArray(obj.expectedImprovements)
      ? (obj.expectedImprovements as string[])
      : [],
    status: 'pending',
    createdAt: Date.now(),
  }
}

export function createRefiner(opts: RefinerOptions = {}): Refiner {
  const llm = opts.llm ?? noopLlm

  return {
    async refine(agentId, patterns) {
      const prompt = buildRefinementPrompt(agentId, patterns)
      const response = await llm(prompt)
      return parseRefinementResponse(agentId, response)
    },
  }
}

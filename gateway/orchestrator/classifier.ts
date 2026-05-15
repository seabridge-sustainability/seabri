import type { AgentId } from '../schemas.js'
import { ANTHROPIC_API_KEY, ANTHROPIC_API_URL } from '../config.js'

export interface ClassificationResult {
  primaryAgent: AgentId
  confidence: number
  secondaryAgents: AgentId[]
  reasoning: string
  isMultiAgent: boolean
}

interface KeywordRule {
  patterns: RegExp[]
  agent: AgentId
  weight: number
}

const KEYWORD_RULES: KeywordRule[] = [
  {
    agent: 'climate-risk',
    weight: 3,
    patterns: [
      /\b(flood|wildfire|fire\s*risk|hurricane|sea\s*level|storm\s*surge|extreme\s*heat|drought|physical\s*risk|climate\s*hazard)\b/i,
      /\b(fema|flood\s*zone|flood\s*map|fire\s*zone|heat\s*wave|coastal\s*erosion)\b/i,
    ],
  },
  {
    agent: 'nature-biodiversity',
    weight: 3,
    patterns: [
      /\b(biodiversity|species|habitat|ecosystem|deforestation|forest\s*loss|pollinator|wetland|coral|tnfd)\b/i,
      /\b(water\s*stress|water\s*risk|aquifer|watershed|nature\s*risk|natural\s*ecosystem)\b/i,
    ],
  },
  {
    agent: 'sustainability-reporting',
    weight: 3,
    patterns: [
      /\b(tcfd|csrd|esrs|issb|gri|cdp|sfdr|sec\s*climate|disclosure|reporting\s*framework)\b/i,
      /\b(double\s*materiality|material\s*topic|sustainability\s*report|esg\s*report)\b/i,
    ],
  },
  {
    agent: 'investment-screening',
    weight: 3,
    patterns: [
      /\b(portfolio|investm|asset\s*class|stranded\s*asset|esg\s*score|esg\s*rating)\b/i,
      /\b(sustainalytics|msci\s*esg|implied\s*temperature|itr|divestment|screening|fiduciary)\b/i,
    ],
  },
  {
    agent: 'home-community',
    weight: 3,
    patterns: [
      /\b(solar\s*panel|solar\b.*\broof|heat\s*pump|insulation|ev\s*charg|energy\s*bill|home\s*energy|weatheriz)\b/i,
      /\b(ira\s*credit|tax\s*credit|rebate|energy\s*star|community\s*solar|home\s*hardening)\b/i,
    ],
  },
  {
    agent: 'net-zero',
    weight: 3,
    patterns: [
      /\b(net\s*zero|carbon\s*neutral|scope\s*[123]|sbti|science.based\s*target|decarboni[sz])\b/i,
      /\b(carbon\s*credit|carbon\s*offset|carbon\s*offsets|ghg\s*protocol|emission|carbon\s*footprint|transition\s*plan)\b/i,
    ],
  },
  {
    agent: 'natural-capital',
    weight: 3,
    patterns: [
      /\b(carbon\s*market|conservation\s*easements?|eqip|crp|rcpp|usda|nrcs|land\s*trusts?)\b/i,
      /\b(regenerative|soil\s*carbon|biodiversity\s*credit|wetland\s*bank|timber|forest\s*management|conservation\s*easement|land\s*trust)\b/i,
    ],
  },
]

function classifyByKeywords(message: string): Map<AgentId, number> {
  const scores = new Map<AgentId, number>()

  for (const rule of KEYWORD_RULES) {
    let matchCount = 0
    for (const pattern of rule.patterns) {
      if (pattern.test(message)) matchCount++
    }
    if (matchCount > 0) {
      const current = scores.get(rule.agent) || 0
      scores.set(rule.agent, current + matchCount * rule.weight)
    }
  }

  return scores
}

export function classifyIntent(message: string): ClassificationResult {
  const scores = classifyByKeywords(message)

  if (scores.size === 0) {
    return {
      primaryAgent: 'general',
      confidence: 0.5,
      secondaryAgents: [],
      reasoning: 'no domain-specific keywords detected',
      isMultiAgent: false,
    }
  }

  const sorted = Array.from(scores.entries()).sort((a, b) => b[1] - a[1])
  const topScore = sorted[0][1]
  const primaryAgent = sorted[0][0]

  const totalScore = sorted.reduce((sum, [, s]) => sum + s, 0)
  const rawConfidence = topScore / Math.max(totalScore, 1)
  const confidence = sorted.length === 1 ? Math.min(rawConfidence * 0.9, 0.95) : rawConfidence

  const secondaryAgents = sorted
    .slice(1)
    .filter(([, s]) => s >= topScore * 0.5)
    .map(([agent]) => agent)

  const isMultiAgent = secondaryAgents.length > 0 && confidence < 0.7

  return {
    primaryAgent,
    confidence,
    secondaryAgents,
    reasoning: `keyword match: ${primaryAgent} (score=${topScore}/${totalScore})`,
    isMultiAgent,
  }
}

const CLASSIFIER_PROMPT = `You are an intent classifier for a sustainability AI assistant. Given a user message, determine which specialist agent(s) should handle it.

Available agents:
- climate-risk: flood, wildfire, heat, drought, sea level rise, physical climate risk
- nature-biodiversity: water stress, biodiversity, deforestation, TNFD, ecosystem services
- sustainability-reporting: TCFD, CSRD, ISSB, GRI, CDP, SEC climate rules, disclosure
- investment-screening: portfolio risk, ESG scores, stranded assets, screening
- home-community: home energy, solar, heat pumps, IRA credits, community resilience
- net-zero: emissions, scope 1/2/3, SBTi, carbon offsets, decarbonization
- natural-capital: carbon markets, USDA programs, conservation easements, land management
- general: anything that doesn't clearly fit one specialist

Respond with ONLY a JSON object:
{"primary": "<agent-id>", "secondary": ["<agent-id>", ...], "confidence": 0.0-1.0}

User message: `

export async function classifyWithLLM(message: string): Promise<ClassificationResult> {
  if (!ANTHROPIC_API_KEY) {
    return classifyIntent(message)
  }

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 100,
        messages: [{ role: 'user', content: CLASSIFIER_PROMPT + message }],
      }),
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) return classifyIntent(message)

    const data = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>
      usage?: { input_tokens?: number; output_tokens?: number }
    }

    const text = data.content?.find((b) => b.type === 'text')?.text ?? ''
    const parsed = JSON.parse(text) as {
      primary?: string
      secondary?: string[]
      confidence?: number
    }

    const validAgents = new Set([
      'climate-risk', 'nature-biodiversity', 'sustainability-reporting',
      'investment-screening', 'home-community', 'net-zero', 'natural-capital', 'general',
    ])

    const primary = (parsed.primary && validAgents.has(parsed.primary) ? parsed.primary : 'general') as AgentId
    const secondary = (parsed.secondary ?? []).filter((a) => validAgents.has(a)) as AgentId[]
    const confidence = typeof parsed.confidence === 'number' ? Math.min(Math.max(parsed.confidence, 0), 1) : 0.8

    return {
      primaryAgent: primary,
      confidence,
      secondaryAgents: secondary,
      reasoning: `llm-classified: ${primary} (confidence=${confidence})`,
      isMultiAgent: secondary.length > 0 && confidence < 0.7,
    }
  } catch {
    return classifyIntent(message)
  }
}

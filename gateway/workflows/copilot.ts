import { WorkflowDefinitionSchema } from './schema.js'
import type { WorkflowDefinition } from './schema.js'

export type LlmCaller = (prompt: string) => Promise<string>

interface CopilotOptions {
  llm?: LlmCaller
}

export class CopilotError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'CopilotError'
  }
}

const noopLlm: LlmCaller = async () => {
  throw new Error('No LLM configured')
}

const SYSTEM_INSTRUCTIONS = `You are a workflow builder for a sustainability AI platform.
Given a natural language description, produce a valid WorkflowDefinition as a JSON object.

The WorkflowDefinition schema:
{
  "version": 1,                    // required, must be 1
  "name": "string",                // required, descriptive name
  "description": "string",         // optional
  "steps": [WorkflowStep],         // required, at least one step
  "inputs": {},                    // optional input specs
  "trigger": TriggerConfig         // optional trigger (cron/webhook/manual/data-change)
}

WorkflowStep types:
- agent:    { id, type:"agent",     name, agentId, prompt, timeout?, retry?, outputKey? }
- tool:     { id, type:"tool",      name, toolName, input:{}, timeout?, retry?, outputKey? }
- condition:{ id, type:"condition", name, condition, onTrue:[steps], onFalse?:[steps] }
- parallel: { id, type:"parallel",  name, branches:[[steps]], timeout? }
- loop:     { id, type:"loop",      name, steps:[steps], condition, maxIterations? }

TriggerConfig types:
- cron:        { type:"cron",        expression:"0 9 * * 1", timezone? }
- webhook:     { type:"webhook",     path?:"/hook", secret? }
- manual:      { type:"manual" }
- data-change: { type:"data-change", event:"new-session"|"metric-threshold", config? }

Rules:
- Every step must have a unique string id (e.g. "step-1", "check-risk")
- Use agentId values from: "climate-risk" | "nature-biodiversity" | "sustainability-reporting" | "investment-screening" | "home-community" | "net-zero" | "natural-capital" | "general"
- Use toolName values like: "email-tool", "slack-tool", "http-tool", "database-tool"
- Respond with ONLY the JSON object — no markdown, no explanation, no code fences`

export class WorkflowCopilot {
  private readonly llm: LlmCaller

  constructor(opts: CopilotOptions = {}) {
    this.llm = opts.llm ?? noopLlm
  }

  buildPrompt(userRequest: string): string {
    return `${SYSTEM_INSTRUCTIONS}

User request: ${userRequest}

Respond with a valid WorkflowDefinition JSON object:`
  }

  async generate(userRequest: string): Promise<WorkflowDefinition> {
    let raw: string
    try {
      raw = await this.llm(this.buildPrompt(userRequest))
    } catch (err) {
      throw new CopilotError(`LLM call failed: ${err instanceof Error ? err.message : String(err)}`, err)
    }

    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim()

    let parsed: unknown
    try {
      parsed = JSON.parse(cleaned)
    } catch (err) {
      throw new CopilotError(`LLM returned invalid JSON: ${cleaned.slice(0, 200)}`, err)
    }

    const result = WorkflowDefinitionSchema.safeParse(parsed)
    if (!result.success) {
      const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
      throw new CopilotError(`Generated workflow failed validation: ${issues}`)
    }

    return result.data
  }
}

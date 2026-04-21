import { writeFile, mkdir, readFile } from 'fs/promises'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { ANTHROPIC_API_KEY } from '../config.js'
import { invalidateSkillCache } from './loader.js'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_MODEL = 'claude-sonnet-4-5'

const OPENSEABRI_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const SKILLS_DIR = resolve(OPENSEABRI_ROOT, 'openseabri', 'skills')

const COMPLEXITY_THRESHOLD = 800 // characters — responses longer than this trigger self-improvement check

export async function checkAndImprove(
  userMessage: string,
  assistantResponse: string,
  agentId: string
): Promise<void> {
  if (!ANTHROPIC_API_KEY) return
  if (assistantResponse.length < COMPLEXITY_THRESHOLD) return

  // Avoid blocking the caller — fire and forget
  improveSilently(userMessage, assistantResponse, agentId).catch(() => {})
}

async function improveSilently(
  userMessage: string,
  assistantResponse: string,
  agentId: string
): Promise<void> {
  if (!ANTHROPIC_API_KEY) return

  const prompt = `You are OpenSeaBri's self-improvement system. A complex sustainability task was just completed.

Task (user message):
${userMessage.slice(0, 600)}

Response given (excerpt):
${assistantResponse.slice(0, 1200)}

Agent used: ${agentId}

Evaluate: Did this task require a novel methodology, multi-step reasoning process, or specialized knowledge structure that would help future similar questions? Answer yes only if there is a reusable, teachable approach — not just a one-off answer.

If yes: Write a SKILL.md file for this methodology in this exact format:

# [Skill Name]

**Agent**: ${agentId}
**Use when**: [one sentence — what situation triggers this skill]

## The Method

[Step-by-step method, 4-8 steps, numbered. Each step: what to do and why.]

## Key Sources and Data

[List the key data sources, organizations, or tools the agent should use]

## Output Format

[Describe what the final answer should look like]

## Example

[A brief example showing the method in action]

---

If no methodology worth saving: respond with exactly the text "SKIP" and nothing else.`

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) return

    const data = (await response.json()) as { content: Array<{ type: string; text: string }> }
    const textBlock = data.content.find((c) => c.type === 'text')
    if (!textBlock) return

    const text = textBlock.text.trim()
    if (text === 'SKIP' || !text.startsWith('#')) return

    // Extract skill name from first heading
    const nameMatch = text.match(/^#\s+(.+)/)
    if (!nameMatch) return

    const skillName = nameMatch[1]
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50)

    if (!skillName) return

    // Check if skill already exists — append update note rather than overwrite
    const skillDir = resolve(SKILLS_DIR, skillName)
    const skillFile = resolve(skillDir, 'SKILL.md')

    let existing = ''
    try {
      existing = await readFile(skillFile, 'utf-8')
    } catch {
      // New skill
    }

    await mkdir(skillDir, { recursive: true })

    if (existing) {
      const updateNote = `\n\n---\n\n*Updated ${new Date().toISOString().split('T')[0]}*\n\n${text}`
      await writeFile(skillFile, existing + updateNote, 'utf-8')
    } else {
      await writeFile(skillFile, text, 'utf-8')
    }

    invalidateSkillCache()
    console.log(`[Skills] Self-improvement: saved skill "${skillName}"`)
  } catch {
    // Non-fatal
  }
}

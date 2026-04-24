import { writeFile, mkdir, readFile } from 'fs/promises'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { ANTHROPIC_API_KEY } from '../config.js'
import { invalidateSkillCache } from './loader.js'
import {
  COMPLIANCE_TAGS,
  parseFrontmatter,
  validateFrontmatter,
  SkillValidationError,
} from './schema.js'

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

If yes: Write a SKILL.md file for this methodology in this EXACT format. The file MUST begin with a YAML frontmatter block. The complianceTags field is MANDATORY and MUST be a non-empty inline array containing only values from this allowed list: ${COMPLIANCE_TAGS.join(', ')}. Use GENERAL only if no specific framework applies.

---
name: [Skill Name]
description: [one-line description]
complianceTags: [TAG1, TAG2]
evidenceSource: [primary data source, e.g. "CSRD Delegated Act Annex I"]
costTier: low
---

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
    if (text === 'SKIP') return

    // Compliance gate: every generated skill MUST carry valid YAML frontmatter
    // with a recognised complianceTags entry. This is the enforcement point
    // that keeps OpenSeaBri sustainability-only — skills that drift into
    // general-purpose territory are rejected before hitting disk.
    const parsed = parseFrontmatter(text)
    if (!parsed) {
      console.warn('[Skills] Self-improvement rejected: missing YAML frontmatter')
      return
    }

    // Extract skill name from the body's first heading for the directory slug
    const nameMatch = parsed.body.match(/^#\s+(.+)/m)
    if (!nameMatch) {
      console.warn('[Skills] Self-improvement rejected: missing body heading')
      return
    }

    const skillName = nameMatch[1]
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50)

    if (!skillName) return

    try {
      validateFrontmatter(parsed.raw, skillName)
    } catch (err) {
      const reason =
        err instanceof SkillValidationError ? err.message : String(err)
      console.warn(`[Skills] Self-improvement rejected: ${reason}`)
      return
    }

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

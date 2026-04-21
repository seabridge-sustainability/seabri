import { mkdir, readFile, writeFile, access } from 'fs/promises'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { WORKSPACE_DIR } from '../config.js'

const MEMORY_FILE = resolve(WORKSPACE_DIR, 'MEMORY.md')
const USER_FILE = resolve(WORKSPACE_DIR, 'USER.md')
const SKILLS_FILE = resolve(WORKSPACE_DIR, 'SKILLS.md')

// Resolve paths relative to this file's location for static assets
// memory.ts lives at gateway/memory/memory.ts — parent twice reaches openseabri root
const MEMORY_DIR = dirname(fileURLToPath(import.meta.url))
const GATEWAY_DIR = resolve(MEMORY_DIR, '..')
const AGENTS_MD = resolve(GATEWAY_DIR, '..', 'AGENTS.md')
const SOUL_MD = resolve(GATEWAY_DIR, '..', 'SOUL.md')
const TOOLS_MD = resolve(GATEWAY_DIR, '..', 'TOOLS.md')

// Every N turns, nudge the agent to update USER.md with observed facts
const USER_MODEL_NUDGE_INTERVAL = 10

const MEMORY_TEMPLATE = `# OpenSeaBri Memory

## About You
<!-- What OpenSeaBri has learned about your situation -->

## Your Location and Climate Context
<!-- Where you are, what climate risks are relevant to your area -->

## Your Assets and Responsibilities
<!-- What you own, manage, or are responsible for -->

## Your Goals
<!-- What you are trying to achieve on sustainability -->

## Your Reporting Obligations
<!-- What you are required to disclose and to whom -->

## Preferences
<!-- How you like information presented -->
`

const USER_TEMPLATE = `# Who You Are

## Your Role
<!-- homeowner / farmer / small business / investor / large company / community / student / consultant -->

## Your Knowledge Level
<!-- Beginner / developing / expert per topic area -->

## What You Are Working On
<!-- Active questions and projects -->

## Your Specific Situation
<!-- Enough context to give you relevant, personalized answers -->
`

const SKILLS_TEMPLATE = `# Learned Skills

## Skills Created from Our Conversations
<!-- Methodologies the agent developed after complex tasks -->

## Skills Queued for Improvement
<!-- Skills flagged as needing update -->
`

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function safeReadFile(path: string): Promise<string> {
  try {
    return await readFile(path, 'utf-8')
  } catch {
    return ''
  }
}

export async function initWorkspace(): Promise<void> {
  try {
    await mkdir(WORKSPACE_DIR, { recursive: true })
  } catch {
    // Directory already exists or cannot create — proceed anyway
  }

  const files: Array<{ path: string; template: string }> = [
    { path: MEMORY_FILE, template: MEMORY_TEMPLATE },
    { path: USER_FILE, template: USER_TEMPLATE },
    { path: SKILLS_FILE, template: SKILLS_TEMPLATE },
  ]

  for (const { path, template } of files) {
    if (!(await fileExists(path))) {
      try {
        await writeFile(path, template, 'utf-8')
      } catch {
        // Non-fatal — workspace write failed, continue
      }
    }
  }
}

export async function readMemory(): Promise<string> {
  return safeReadFile(MEMORY_FILE)
}

export async function readUser(): Promise<string> {
  return safeReadFile(USER_FILE)
}

export async function readSkills(): Promise<string> {
  return safeReadFile(SKILLS_FILE)
}

export async function appendMemory(content: string): Promise<void> {
  try {
    const existing = await safeReadFile(MEMORY_FILE)
    const section = '## About You'
    const insertAfter = existing.indexOf(section)
    if (insertAfter === -1) {
      // Section not found — just append to end
      await writeFile(MEMORY_FILE, existing + '\n' + content + '\n', 'utf-8')
      return
    }
    // Find end of section header line and insert content after it
    const lineEnd = existing.indexOf('\n', insertAfter)
    const before = existing.slice(0, lineEnd + 1)
    const after = existing.slice(lineEnd + 1)
    await writeFile(MEMORY_FILE, before + content + '\n' + after, 'utf-8')
  } catch {
    // Memory write failed silently — do not crash the session
  }
}

export async function updateUser(section: string, content: string): Promise<void> {
  try {
    const existing = (await safeReadFile(USER_FILE)) || USER_TEMPLATE
    const sectionHeader = `## ${section}`
    const idx = existing.indexOf(sectionHeader)
    if (idx === -1) {
      // Section not found — append new section
      const updated = existing.trimEnd() + `\n\n${sectionHeader}\n${content}\n`
      await writeFile(USER_FILE, updated, 'utf-8')
      return
    }
    // Find the next section header or end of file
    const afterHeader = existing.indexOf('\n', idx) + 1
    const nextSection = existing.indexOf('\n## ', afterHeader)
    const before = existing.slice(0, afterHeader)
    const after = nextSection === -1 ? '' : existing.slice(nextSection)
    await writeFile(USER_FILE, before + content + '\n' + after, 'utf-8')
  } catch {
    // Non-fatal
  }
}

export async function saveSkill(skillName: string, content: string): Promise<void> {
  try {
    const existing = await safeReadFile(SKILLS_FILE)
    const section = '## Skills Created from Our Conversations'
    const idx = existing.indexOf(section)
    const entry = `\n### ${skillName}\n${content}\n`
    if (idx === -1) {
      await writeFile(SKILLS_FILE, existing + entry, 'utf-8')
      return
    }
    const lineEnd = existing.indexOf('\n', idx)
    const before = existing.slice(0, lineEnd + 1)
    const after = existing.slice(lineEnd + 1)
    await writeFile(SKILLS_FILE, before + entry + after, 'utf-8')
  } catch {
    // Non-fatal
  }
}

export async function buildSystemContext(): Promise<string> {
  const parts: string[] = []

  const agentsMd = await safeReadFile(AGENTS_MD)
  if (agentsMd) {
    parts.push('--- AGENTS ---\n' + agentsMd)
  }

  const soulMd = await safeReadFile(SOUL_MD)
  if (soulMd) {
    parts.push('--- SOUL ---\n' + soulMd)
  }

  const toolsMd = await safeReadFile(TOOLS_MD)
  if (toolsMd) {
    parts.push('--- TOOLS ---\n' + toolsMd)
  }

  const memory = await readMemory()
  if (memory) {
    parts.push('--- YOUR MEMORY OF THIS USER ---\n' + memory)
  }

  const user = await readUser()
  if (user) {
    parts.push('--- USER PROFILE ---\n' + user)
  }

  return parts.join('\n\n')
}

export async function maybeNudgeUserModel(
  turnCount: number,
  recentHistory: Array<{ role: string; content: string }>,
  apiKey: string
): Promise<void> {
  if (turnCount === 0 || turnCount % USER_MODEL_NUDGE_INTERVAL !== 0) return
  if (!apiKey) return

  // Fire and forget — never blocks the user-facing response
  nudgeUserModelSilently(recentHistory, apiKey).catch(() => {})
}

async function nudgeUserModelSilently(
  history: Array<{ role: string; content: string }>,
  apiKey: string
): Promise<void> {
  try {
    const existing = await safeReadFile(USER_FILE)
    const excerpt = history
      .slice(-10)
      .map((m) => `${m.role}: ${m.content.slice(0, 200)}`)
      .join('\n')

    const prompt = `You are updating a user profile for OpenSeaBri based on recent conversation.

Recent conversation:
${excerpt}

Current profile:
${existing.slice(0, 800)}

Identify 1-3 new facts about the user's situation, role, or goals that are NOT already in the profile. Return them as a JSON array of strings, each one a short sentence. If nothing new was learned, return [].

Return only valid JSON, no markdown.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) return

    const data = (await response.json()) as { content: Array<{ type: string; text: string }> }
    const textBlock = data.content.find((c) => c.type === 'text')
    if (!textBlock) return

    const facts = JSON.parse(textBlock.text) as string[]
    if (!Array.isArray(facts) || facts.length === 0) return

    const timestamp = new Date().toLocaleDateString()
    const newContent = `\n*Observed ${timestamp}*\n${facts.map((f) => `- ${f}`).join('\n')}\n`
    await updateUser('Your Specific Situation', newContent)
  } catch {
    // Non-fatal
  }
}

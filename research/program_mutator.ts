import { readFile, writeFile, copyFile } from 'fs/promises'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const RESEARCH_DIR = resolve(dirname(fileURLToPath(import.meta.url)))
const PROGRAM_FILE = resolve(RESEARCH_DIR, 'program.md')

const BEGIN_MARKER = '<!-- openseabri:managed -->'
const END_MARKER = '<!-- openseabri:end -->'

export interface MutationInput {
  effectivePatterns?: string[]
  qualityObservations?: string[]
  topicsToDeprioritize?: Array<{ topic: string; reason: string }>
  topicsToPrioritize?: Array<{ topic: string; reason: string }>
}

function renderManagedBlock(input: MutationInput): string {
  const date = new Date().toISOString().split('T')[0]
  const section = (title: string, items: string[] | undefined): string => {
    if (!items || items.length === 0) return ''
    return `### ${title}\n${items.map((i) => `- ${i}`).join('\n')}\n`
  }
  const tagged = (title: string, items: Array<{ topic: string; reason: string }> | undefined): string => {
    if (!items || items.length === 0) return ''
    return `### ${title}\n${items.map((i) => `- **${i.topic}** — ${i.reason}`).join('\n')}\n`
  }

  const parts = [
    section('Effective Query Patterns (auto)', input.effectivePatterns),
    section('Quality Observations (auto)', input.qualityObservations),
    tagged('Topics to Deprioritize (auto)', input.topicsToDeprioritize),
    tagged('Topics to Prioritize (auto)', input.topicsToPrioritize),
  ].filter(Boolean)

  const body = parts.length > 0 ? parts.join('\n') : '_No automated notes for this cycle._\n'
  return `${BEGIN_MARKER}\n_Last updated: ${date} — do not edit this block by hand; changes are overwritten._\n\n${body}${END_MARKER}`
}

async function readProgram(): Promise<string | null> {
  try {
    return await readFile(PROGRAM_FILE, 'utf-8')
  } catch {
    return null
  }
}

async function backup(): Promise<string | null> {
  const existing = await readProgram()
  if (existing === null) return null
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const dest = resolve(RESEARCH_DIR, `program.md.${stamp}.bak`)
  await copyFile(PROGRAM_FILE, dest)
  return dest
}

function spliceManagedBlock(content: string, block: string): string {
  const beginIdx = content.indexOf(BEGIN_MARKER)
  const endIdx = content.indexOf(END_MARKER)

  if (beginIdx !== -1 && endIdx !== -1 && endIdx > beginIdx) {
    const before = content.slice(0, beginIdx)
    const after = content.slice(endIdx + END_MARKER.length)
    return `${before}${block}${after}`
  }

  const trailingNewline = content.endsWith('\n') ? '' : '\n'
  return `${content}${trailingNewline}\n${block}\n`
}

export async function mutateProgram(input: MutationInput): Promise<{ updated: boolean; backupPath: string | null; reason?: string }> {
  const existing = await readProgram()
  if (existing === null) {
    return { updated: false, backupPath: null, reason: 'program.md not found' }
  }

  const block = renderManagedBlock(input)
  const next = spliceManagedBlock(existing, block)

  if (next === existing) {
    return { updated: false, backupPath: null, reason: 'no change' }
  }

  const backupPath = await backup()
  await writeFile(PROGRAM_FILE, next, 'utf-8')
  return { updated: true, backupPath }
}

export function deriveMutationFromReport(notes: string[]): MutationInput {
  const patterns: string[] = []
  const observations: string[] = []
  const deprioritize: Array<{ topic: string; reason: string }> = []
  const prioritize: Array<{ topic: string; reason: string }> = []

  for (const note of notes) {
    const lower = note.toLowerCase()
    if (lower.includes('specific') || lower.includes('framing')) {
      patterns.push(note)
    } else if (lower.includes('quality') || lower.includes('threshold')) {
      observations.push(note)
    } else if (lower.includes('expand')) {
      prioritize.push({ topic: 'current section', reason: note })
    } else {
      observations.push(note)
    }
  }

  return {
    effectivePatterns: patterns,
    qualityObservations: observations,
    topicsToDeprioritize: deprioritize,
    topicsToPrioritize: prioritize,
  }
}

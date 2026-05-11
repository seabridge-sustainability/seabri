import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const OPENSEABRI_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')
const FINDINGS_DIR = join(OPENSEABRI_ROOT, 'research', 'findings')

export interface FindingsResult {
  date: string
  content: string
}

export function readFindings(date?: string): FindingsResult | null {
  const target = date ?? new Date().toISOString().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(target)) return null
  const filePath = join(FINDINGS_DIR, `${target}.md`)
  if (!existsSync(filePath)) return null
  return { date: target, content: readFileSync(filePath, 'utf-8') }
}

export function listFindingsDates(): string[] {
  if (!existsSync(FINDINGS_DIR)) return []
  return readdirSync(FINDINGS_DIR)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
    .map((f) => f.slice(0, 10))
    .sort()
    .reverse()
}

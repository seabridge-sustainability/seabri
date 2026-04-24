/**
 * integrations/autoresearch/handoff.ts
 *
 * Reader for research artifacts produced by the autoresearch stack.
 * Watches autoresearch/handoff/ for new JSON/Markdown outputs and exposes them
 * as OpenSeaBri research findings.
 *
 * Strictly one-way — this module never writes into the autoresearch repo.
 */

import { readdir, readFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { autoresearchDir } from './orchestrator.js'

export interface HandoffArtifact {
  path: string
  filename: string
  kind: 'markdown' | 'json' | 'other'
  size: number
  modified: Date
  source: 'feynman' | 'paper2agent' | 'strix' | 'graphify' | 'unknown'
}

export interface FeynmanBrief {
  task: string
  mode: 'standard' | 'deep'
  summary: string
  bullets: string[]
  citations: Array<{ title: string; url: string; snippet?: string }>
  generated_at: string
}

function handoffRoot(): string | null {
  const dir = autoresearchDir()
  if (!dir) return null
  const handoff = join(dir, 'handoff')
  return existsSync(handoff) ? handoff : null
}

function classify(filename: string): HandoffArtifact['source'] {
  const lower = filename.toLowerCase()
  if (lower.includes('feynman')) return 'feynman'
  if (lower.includes('paper2agent')) return 'paper2agent'
  if (lower.includes('strix')) return 'strix'
  if (lower.includes('graphify')) return 'graphify'
  return 'unknown'
}

function kindOf(filename: string): HandoffArtifact['kind'] {
  if (filename.endsWith('.md')) return 'markdown'
  if (filename.endsWith('.json')) return 'json'
  return 'other'
}

export async function listArtifacts(opts: { since?: Date } = {}): Promise<HandoffArtifact[]> {
  const root = handoffRoot()
  if (!root) return []
  const entries = await readdir(root, { withFileTypes: true })
  const out: HandoffArtifact[] = []
  for (const entry of entries) {
    if (!entry.isFile()) continue
    const full = join(root, entry.name)
    const st = await stat(full)
    if (opts.since && st.mtime <= opts.since) continue
    out.push({
      path: full,
      filename: entry.name,
      kind: kindOf(entry.name),
      size: st.size,
      modified: st.mtime,
      source: classify(entry.name),
    })
  }
  return out.sort((a, b) => b.modified.getTime() - a.modified.getTime())
}

export async function readArtifact<T = unknown>(artifact: HandoffArtifact): Promise<T | string | null> {
  try {
    const raw = await readFile(artifact.path, 'utf8')
    if (artifact.kind === 'json') {
      return JSON.parse(raw) as T
    }
    return raw
  } catch (err) {
    if (process.env.OPENSEABRI_DEBUG) {
      console.warn(`[handoff] read ${artifact.filename} failed:`, err instanceof Error ? err.message : err)
    }
    return null
  }
}

export async function latestFeynmanBrief(): Promise<FeynmanBrief | null> {
  const items = await listArtifacts()
  const brief = items.find((a) => a.source === 'feynman' && a.kind === 'json')
  if (!brief) return null
  return (await readArtifact<FeynmanBrief>(brief)) as FeynmanBrief | null
}

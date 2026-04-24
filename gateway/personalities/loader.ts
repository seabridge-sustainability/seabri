import { readFile, readdir, stat, mkdir, copyFile } from 'fs/promises'
import { resolve, dirname, basename, extname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'
import { WORKSPACE_DIR } from '../config.js'

const BUILTIN_DIR = resolve(dirname(fileURLToPath(import.meta.url)))
const USER_DIR = resolve(WORKSPACE_DIR, 'personalities')

export interface Personality {
  id: string
  name: string
  description: string
  prompt: string
  source: 'builtin' | 'user'
  path: string
}

interface CacheEntry {
  mtimeMs: number
  personality: Personality
}

const cache = new Map<string, CacheEntry>()

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const meta: Record<string, string> = {}
  if (!raw.startsWith('---')) return { meta, body: raw }

  const end = raw.indexOf('\n---', 3)
  if (end === -1) return { meta, body: raw }

  const block = raw.slice(3, end).trim()
  for (const line of block.split(/\r?\n/)) {
    const match = line.match(/^(\w+)\s*:\s*(.+)$/)
    if (match) meta[match[1].trim()] = match[2].trim()
  }

  const body = raw.slice(end + 4).replace(/^\r?\n/, '')
  return { meta, body }
}

function idFromFilename(file: string): string {
  return basename(file, extname(file)).toLowerCase()
}

async function readPersonality(path: string, source: 'builtin' | 'user'): Promise<Personality | null> {
  try {
    const raw = await readFile(path, 'utf-8')
    const { meta, body } = parseFrontmatter(raw)
    const id = (meta.id ?? idFromFilename(path)).toLowerCase()
    return {
      id,
      name: meta.name ?? id.replace(/^\w/, (c) => c.toUpperCase()),
      description: meta.description ?? '',
      prompt: body.trim(),
      source,
      path,
    }
  } catch {
    return null
  }
}

async function loadOne(path: string, source: 'builtin' | 'user'): Promise<Personality | null> {
  let mtimeMs: number
  try {
    const st = await stat(path)
    mtimeMs = st.mtimeMs
  } catch {
    cache.delete(path)
    return null
  }

  const hit = cache.get(path)
  if (hit && hit.mtimeMs === mtimeMs) return hit.personality

  const personality = await readPersonality(path, source)
  if (!personality) return null
  cache.set(path, { mtimeMs, personality })
  return personality
}

async function listDir(dir: string): Promise<string[]> {
  try {
    const files = await readdir(dir)
    return files.filter((f) => f.endsWith('.md')).map((f) => resolve(dir, f))
  } catch {
    return []
  }
}

export async function listPersonalities(): Promise<Personality[]> {
  const builtinFiles = await listDir(BUILTIN_DIR)
  const userFiles = await listDir(USER_DIR)

  const byId = new Map<string, Personality>()

  for (const file of builtinFiles) {
    const p = await loadOne(file, 'builtin')
    if (p) byId.set(p.id, p)
  }

  // User personalities override built-ins with the same id
  for (const file of userFiles) {
    const p = await loadOne(file, 'user')
    if (p) byId.set(p.id, p)
  }

  return Array.from(byId.values()).sort((a, b) => a.id.localeCompare(b.id))
}

export async function loadPersonality(id: string): Promise<Personality | null> {
  const normalized = id.toLowerCase().trim()
  const all = await listPersonalities()
  return all.find((p) => p.id === normalized) ?? null
}

export async function getPersonalityPrompt(id: string | undefined | null): Promise<string> {
  if (!id) return ''
  const personality = await loadPersonality(id)
  return personality?.prompt ?? ''
}

export async function initUserPersonalitiesDir(): Promise<void> {
  if (!existsSync(USER_DIR)) {
    await mkdir(USER_DIR, { recursive: true })
  }
}

export async function copyBuiltinToUser(id: string): Promise<string | null> {
  const personality = await loadPersonality(id)
  if (!personality || personality.source !== 'builtin') return null

  await initUserPersonalitiesDir()
  const dest = resolve(USER_DIR, `${personality.id}.md`)
  await copyFile(personality.path, dest)
  cache.delete(dest)
  return dest
}

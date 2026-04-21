import { readFile, writeFile, mkdir } from 'fs/promises'
import { resolve } from 'path'
import { WORKSPACE_DIR } from '../config.js'

const INDEX_FILE = resolve(WORKSPACE_DIR, 'search-index.json')

interface IndexEntry {
  sessionId: string
  sessionName: string
  agentId: string
  date: string
  keywords: string[]
  excerpt: string
}

interface SearchIndex {
  entries: IndexEntry[]
  lastUpdated: number
}

async function loadIndex(): Promise<SearchIndex> {
  try {
    const raw = await readFile(INDEX_FILE, 'utf-8')
    return JSON.parse(raw) as SearchIndex
  } catch {
    return { entries: [], lastUpdated: 0 }
  }
}

async function saveIndex(index: SearchIndex): Promise<void> {
  await mkdir(WORKSPACE_DIR, { recursive: true })
  await writeFile(INDEX_FILE, JSON.stringify(index, null, 2), 'utf-8')
}

function extractKeywords(text: string): string[] {
  const stopwords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'it', 'its', 'this', 'that', 'i', 'you',
    'we', 'they', 'what', 'how', 'when', 'where', 'why', 'my', 'your', 'our',
  ])

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopwords.has(w))
    .slice(0, 50)
}

export async function indexSession(
  sessionId: string,
  sessionName: string,
  agentId: string,
  history: Array<{ role: string; content: string }>
): Promise<void> {
  const index = await loadIndex()

  const fullText = history.map((m) => m.content).join(' ')
  const keywords = extractKeywords(fullText)
  const firstUserMessage = history.find((m) => m.role === 'user')?.content ?? ''
  const excerpt = firstUserMessage.slice(0, 120) + (firstUserMessage.length > 120 ? '…' : '')

  const entry: IndexEntry = {
    sessionId,
    sessionName,
    agentId,
    date: new Date().toISOString().split('T')[0],
    keywords,
    excerpt,
  }

  // Replace existing entry for this session or add new
  const idx = index.entries.findIndex((e) => e.sessionId === sessionId)
  if (idx >= 0) {
    index.entries[idx] = entry
  } else {
    index.entries.push(entry)
  }

  index.lastUpdated = Date.now()
  await saveIndex(index)
}

export interface SearchResult {
  sessionId: string
  sessionName: string
  agentId: string
  date: string
  excerpt: string
  score: number
}

export async function searchSessions(query: string): Promise<SearchResult[]> {
  const index = await loadIndex()
  const queryKeywords = extractKeywords(query)

  if (queryKeywords.length === 0) return []

  const results: SearchResult[] = []

  for (const entry of index.entries) {
    let score = 0
    for (const qk of queryKeywords) {
      if (entry.keywords.includes(qk)) score += 2
      if (entry.keywords.some((k) => k.includes(qk) || qk.includes(k))) score += 1
      if (entry.excerpt.toLowerCase().includes(qk)) score += 1
    }
    if (score > 0) {
      results.push({
        sessionId: entry.sessionId,
        sessionName: entry.sessionName,
        agentId: entry.agentId,
        date: entry.date,
        excerpt: entry.excerpt,
        score,
      })
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 10)
}

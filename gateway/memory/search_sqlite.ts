/**
 * gateway/memory/search_sqlite.ts
 *
 * FTS5-backed session search. Loads better-sqlite3 lazily so the module stays
 * importable even when the optional native dep is missing — callers check
 * isAvailable() before routing to this backend.
 *
 * Schema:
 *   sessions(session_id PK, session_name, agent_id, date, excerpt, updated_at)
 *   sessions_fts FTS5(name, agent_id, content, content='sessions', content_rowid=rowid)
 *
 * The FTS5 virtual table uses unicode61 so common accents and casing fold.
 */

import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { WORKSPACE_DIR } from '../config.js'

type Database = any
type Statement = any

let cachedDb: Database | null = null
let cachedAvailable: boolean | null = null

const DB_PATH = resolve(WORKSPACE_DIR, 'search.db')

async function loadDriver(): Promise<((path: string) => Database) | null> {
  try {
    // Indirection prevents TS/bundlers from hard-resolving the optional dep.
    const spec = 'better-sqlite3'
    const mod: any = await import(spec)
    return mod.default ?? mod
  } catch {
    return null
  }
}

export async function isAvailable(): Promise<boolean> {
  if (cachedAvailable !== null) return cachedAvailable
  const driver = await loadDriver()
  cachedAvailable = driver !== null
  return cachedAvailable
}

async function openDb(): Promise<Database | null> {
  if (cachedDb) return cachedDb
  const driver = await loadDriver()
  if (!driver) return null
  try {
    mkdirSync(WORKSPACE_DIR, { recursive: true })
    const db = driver(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id   TEXT PRIMARY KEY,
        session_name TEXT NOT NULL,
        agent_id     TEXT NOT NULL,
        date         TEXT NOT NULL,
        excerpt      TEXT NOT NULL,
        updated_at   INTEGER NOT NULL
      );
      CREATE VIRTUAL TABLE IF NOT EXISTS sessions_fts USING fts5(
        name, agent_id, content,
        tokenize = 'unicode61'
      );
    `)
    cachedDb = db
    return db
  } catch {
    cachedAvailable = false
    return null
  }
}

export async function initDb(): Promise<boolean> {
  const db = await openDb()
  return db !== null
}

export async function indexSessionSqlite(
  sessionId: string,
  sessionName: string,
  agentId: string,
  history: Array<{ role: string; content: string }>,
): Promise<boolean> {
  const db = await openDb()
  if (!db) return false

  const content = history.map((m) => `${m.role}: ${m.content}`).join('\n')
  const firstUser = history.find((m) => m.role === 'user')?.content ?? ''
  const excerpt = firstUser.slice(0, 120) + (firstUser.length > 120 ? '…' : '')
  const date = new Date().toISOString().split('T')[0]
  const updatedAt = Date.now()

  const tx = db.transaction(() => {
    const existing = db
      .prepare('SELECT rowid FROM sessions WHERE session_id = ?')
      .get(sessionId) as { rowid: number } | undefined

    if (existing) {
      db.prepare(
        `UPDATE sessions
           SET session_name = ?, agent_id = ?, date = ?, excerpt = ?, updated_at = ?
         WHERE session_id = ?`,
      ).run(sessionName, agentId, date, excerpt, updatedAt, sessionId)
      db.prepare('DELETE FROM sessions_fts WHERE rowid = ?').run(existing.rowid)
      db.prepare(
        'INSERT INTO sessions_fts(rowid, name, agent_id, content) VALUES (?, ?, ?, ?)',
      ).run(existing.rowid, sessionName, agentId, content)
    } else {
      const info = db
        .prepare(
          `INSERT INTO sessions(session_id, session_name, agent_id, date, excerpt, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(sessionId, sessionName, agentId, date, excerpt, updatedAt)
      db.prepare(
        'INSERT INTO sessions_fts(rowid, name, agent_id, content) VALUES (?, ?, ?, ?)',
      ).run(info.lastInsertRowid, sessionName, agentId, content)
    }
  })

  try {
    tx()
    return true
  } catch {
    return false
  }
}

export interface SqliteSearchResult {
  sessionId: string
  sessionName: string
  agentId: string
  date: string
  excerpt: string
  score: number
}

function escapeFtsQuery(query: string): string {
  // Split on whitespace, keep alphanumerics + '-', wrap each token in quotes,
  // and join with AND. This sidesteps FTS5 operator injection from user input.
  const tokens = query
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1)
  if (tokens.length === 0) return ''
  return tokens.map((t) => `"${t.replace(/"/g, '')}"`).join(' OR ')
}

export async function searchSessionsSqlite(
  query: string,
  limit = 10,
): Promise<SqliteSearchResult[] | null> {
  const db = await openDb()
  if (!db) return null

  const match = escapeFtsQuery(query)
  if (!match) return []

  try {
    const rows = db
      .prepare(
        `SELECT s.session_id  AS sessionId,
                s.session_name AS sessionName,
                s.agent_id     AS agentId,
                s.date         AS date,
                s.excerpt      AS excerpt,
                bm25(sessions_fts) AS bm25
           FROM sessions_fts
           JOIN sessions s ON s.rowid = sessions_fts.rowid
          WHERE sessions_fts MATCH ?
          ORDER BY bm25 ASC
          LIMIT ?`,
      )
      .all(match, limit) as Array<SqliteSearchResult & { bm25: number }>
    // bm25 returns lower-is-better; invert so callers see higher-is-better scores.
    return rows.map((r) => ({
      sessionId: r.sessionId,
      sessionName: r.sessionName,
      agentId: r.agentId,
      date: r.date,
      excerpt: r.excerpt,
      score: Number.isFinite(r.bm25) ? Math.max(0, 100 - r.bm25) : 0,
    }))
  } catch {
    return null
  }
}

/**
 * Wipe the FTS index and repopulate from a caller-supplied iterator over sessions.
 * Used by `seabri search --rebuild`.
 */
export async function rebuildIndex(
  sessions: Iterable<{
    sessionId: string
    sessionName: string
    agentId: string
    history: Array<{ role: string; content: string }>
  }>,
): Promise<{ ok: boolean; indexed: number }> {
  const db = await openDb()
  if (!db) return { ok: false, indexed: 0 }

  try {
    db.exec('DELETE FROM sessions_fts; DELETE FROM sessions;')
    let count = 0
    for (const s of sessions) {
      const ok = await indexSessionSqlite(s.sessionId, s.sessionName, s.agentId, s.history)
      if (ok) count += 1
    }
    return { ok: true, indexed: count }
  } catch {
    return { ok: false, indexed: 0 }
  }
}

export function dbPath(): string {
  return DB_PATH
}

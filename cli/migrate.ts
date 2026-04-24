/**
 * cli/migrate.ts
 *
 * `seabri migrate --from <path>` — import workspace data from a sibling agent
 * (OpenClaw, Hermes, or another OpenSeaBri install).
 *
 * Modes:
 *   --merge    (default) Section-aware merge for markdown; array-union for JSON;
 *              skip collisions for sessions. Non-destructive.
 *   --replace  Overwrite destination files. Also the only mode that copies the
 *              FTS index artefacts (search.db / search-index.json).
 *   --dry-run  Report what would be copied without writing.
 *
 * Source layout expected (flexible — missing files are skipped):
 *   <src>/MEMORY.md
 *   <src>/USER.md
 *   <src>/SKILLS.md
 *   <src>/sessions/*.json
 *   <src>/crons.json
 *   <src>/approved-senders.json
 *   <src>/search.db
 *   <src>/search-index.json
 *   <src>/skills/<name>/SKILL.md          (user-added skills)
 *   <src>/user-skills/<name>/SKILL.md     (alternate layout)
 */

import { readFile, writeFile, mkdir, readdir, copyFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve, basename } from 'node:path'
import { homedir } from 'node:os'
import chalk from 'chalk'

const WORKSPACE_DIR =
  process.env.OPENSEABRI_WORKSPACE || resolve(homedir(), '.openseabri', 'workspace')
const USER_SKILLS_DIR = resolve(homedir(), '.openseabri', 'user-skills')

export interface MigrateOptions {
  from: string
  merge?: boolean
  replace?: boolean
  dryRun?: boolean
}

interface MigrateReport {
  copied: string[]
  merged: string[]
  skipped: string[]
  missing: string[]
  errors: Array<{ path: string; error: string }>
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function safeRead(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf-8')
  } catch {
    return null
  }
}

async function safeReadJson<T>(path: string): Promise<T | null> {
  const raw = await safeRead(path)
  if (raw === null) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

/**
 * Split a markdown document into `## Heading` sections. Content before the
 * first heading is stored under the empty-string key. Preserves original
 * heading text verbatim so merges are idempotent on re-run.
 */
function splitSections(md: string): { preamble: string; sections: Map<string, string> } {
  const sections = new Map<string, string>()
  const lines = md.split(/\r?\n/)
  let preamble = ''
  let currentHeading: string | null = null
  let currentBody: string[] = []

  const flush = () => {
    if (currentHeading !== null) {
      sections.set(currentHeading, currentBody.join('\n'))
    }
  }

  for (const line of lines) {
    const h2 = /^##\s+(.*)$/.exec(line)
    if (h2) {
      if (currentHeading === null) {
        preamble = currentBody.join('\n')
      } else {
        flush()
      }
      currentHeading = h2[1].trim()
      currentBody = []
    } else {
      currentBody.push(line)
    }
  }
  if (currentHeading === null) {
    preamble = currentBody.join('\n')
  } else {
    flush()
  }
  return { preamble, sections }
}

function recomposeMarkdown(
  preamble: string,
  sections: Map<string, string>,
  headingOrder: string[],
): string {
  const parts: string[] = []
  if (preamble.trim().length > 0) parts.push(preamble.replace(/\s+$/, ''))
  for (const heading of headingOrder) {
    const body = sections.get(heading) ?? ''
    parts.push(`## ${heading}\n${body.replace(/^\n+|\n+$/g, '')}`)
  }
  return parts.join('\n\n') + '\n'
}

/**
 * Merge two markdown documents by `## Heading`. For each heading present in
 * either file, the destination section body is kept and the source section
 * body is appended under a dated marker. Headings unique to source are added
 * at the end. Preamble from destination is preserved.
 */
function mergeMarkdown(dest: string, src: string, label: string): string {
  const d = splitSections(dest)
  const s = splitSections(src)

  const order: string[] = []
  for (const key of d.sections.keys()) order.push(key)
  for (const key of s.sections.keys()) if (!order.includes(key)) order.push(key)

  const merged = new Map<string, string>()
  const today = new Date().toISOString().slice(0, 10)
  const marker = `<!-- migrated from ${label} on ${today} -->`

  for (const key of order) {
    const dBody = d.sections.get(key) ?? ''
    const sBody = s.sections.get(key) ?? ''
    if (!sBody.trim()) {
      merged.set(key, dBody)
    } else if (!dBody.trim()) {
      merged.set(key, `${marker}\n${sBody.trim()}\n`)
    } else if (dBody.includes(sBody.trim())) {
      merged.set(key, dBody)
    } else {
      merged.set(key, `${dBody.replace(/\s+$/, '')}\n\n${marker}\n${sBody.trim()}\n`)
    }
  }

  return recomposeMarkdown(d.preamble, merged, order)
}

async function migrateMarkdown(
  srcPath: string,
  destPath: string,
  label: string,
  opts: MigrateOptions,
  report: MigrateReport,
): Promise<void> {
  if (!(await pathExists(srcPath))) {
    report.missing.push(basename(srcPath))
    return
  }
  const srcContent = await safeRead(srcPath)
  if (srcContent === null) {
    report.errors.push({ path: srcPath, error: 'could not read' })
    return
  }

  if (opts.replace) {
    if (!opts.dryRun) {
      await mkdir(WORKSPACE_DIR, { recursive: true })
      await writeFile(destPath, srcContent, 'utf-8')
    }
    report.copied.push(basename(destPath))
    return
  }

  const destContent = (await safeRead(destPath)) ?? ''
  const merged = mergeMarkdown(destContent, srcContent, label)
  if (!opts.dryRun) {
    await mkdir(WORKSPACE_DIR, { recursive: true })
    await writeFile(destPath, merged, 'utf-8')
  }
  report.merged.push(basename(destPath))
}

interface CronJobShape {
  id: string
  expression: string
  description: string
  task: string
  channel: string
  createdAt: number
  lastRun?: number
  enabled: boolean
  nextRun?: number
}

async function migrateCrons(
  srcPath: string,
  destPath: string,
  opts: MigrateOptions,
  report: MigrateReport,
): Promise<void> {
  if (!(await pathExists(srcPath))) {
    report.missing.push('crons.json')
    return
  }
  const srcStore = await safeReadJson<{ jobs: CronJobShape[] }>(srcPath)
  if (!srcStore || !Array.isArray(srcStore.jobs)) {
    report.errors.push({ path: srcPath, error: 'invalid crons.json' })
    return
  }

  if (opts.replace) {
    if (!opts.dryRun) {
      await mkdir(WORKSPACE_DIR, { recursive: true })
      await writeFile(destPath, JSON.stringify(srcStore, null, 2), 'utf-8')
    }
    report.copied.push('crons.json')
    return
  }

  const destStore = (await safeReadJson<{ jobs: CronJobShape[] }>(destPath)) ?? { jobs: [] }
  const seenIds = new Set(destStore.jobs.map((j) => j.id))
  let added = 0
  for (const job of srcStore.jobs) {
    if (!seenIds.has(job.id)) {
      destStore.jobs.push(job)
      seenIds.add(job.id)
      added += 1
    }
  }
  if (!opts.dryRun) {
    await mkdir(WORKSPACE_DIR, { recursive: true })
    await writeFile(destPath, JSON.stringify(destStore, null, 2), 'utf-8')
  }
  report.merged.push(`crons.json (+${added})`)
}

interface ApprovedSendersShape {
  approved: string[]
  pending: Record<string, unknown>
}

async function migrateApprovedSenders(
  srcPath: string,
  destPath: string,
  opts: MigrateOptions,
  report: MigrateReport,
): Promise<void> {
  if (!(await pathExists(srcPath))) {
    report.missing.push('approved-senders.json')
    return
  }
  const srcData = await safeReadJson<ApprovedSendersShape>(srcPath)
  if (!srcData || !Array.isArray(srcData.approved)) {
    report.errors.push({ path: srcPath, error: 'invalid approved-senders.json' })
    return
  }

  if (opts.replace) {
    if (!opts.dryRun) {
      await mkdir(WORKSPACE_DIR, { recursive: true })
      await writeFile(destPath, JSON.stringify(srcData, null, 2), 'utf-8')
    }
    report.copied.push('approved-senders.json')
    return
  }

  const destData =
    (await safeReadJson<ApprovedSendersShape>(destPath)) ?? { approved: [], pending: {} }
  const approved = new Set(destData.approved)
  let added = 0
  for (const sender of srcData.approved) {
    if (!approved.has(sender)) {
      approved.add(sender)
      added += 1
    }
  }
  destData.approved = Array.from(approved)
  if (!opts.dryRun) {
    await mkdir(WORKSPACE_DIR, { recursive: true })
    await writeFile(destPath, JSON.stringify(destData, null, 2), 'utf-8')
  }
  report.merged.push(`approved-senders.json (+${added})`)
}

async function migrateSessions(
  srcDir: string,
  destDir: string,
  opts: MigrateOptions,
  report: MigrateReport,
): Promise<void> {
  if (!(await pathExists(srcDir))) {
    report.missing.push('sessions/')
    return
  }
  let entries: string[]
  try {
    entries = await readdir(srcDir)
  } catch {
    report.errors.push({ path: srcDir, error: 'could not read sessions dir' })
    return
  }

  if (!opts.dryRun) await mkdir(destDir, { recursive: true })

  let copied = 0
  let skipped = 0
  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue
    const srcFile = resolve(srcDir, entry)
    const destFile = resolve(destDir, entry)
    const collides = existsSync(destFile)
    if (collides && !opts.replace) {
      skipped += 1
      continue
    }
    if (!opts.dryRun) {
      await copyFile(srcFile, destFile)
    }
    copied += 1
  }

  if (copied > 0) report.copied.push(`sessions/ (${copied} file${copied === 1 ? '' : 's'})`)
  if (skipped > 0) report.skipped.push(`sessions/ (${skipped} collision${skipped === 1 ? '' : 's'})`)
}

async function migrateSearchIndex(
  srcRoot: string,
  opts: MigrateOptions,
  report: MigrateReport,
): Promise<void> {
  const candidates = ['search.db', 'search-index.json']
  for (const name of candidates) {
    const srcPath = resolve(srcRoot, name)
    if (!(await pathExists(srcPath))) continue
    if (!opts.replace) {
      report.skipped.push(`${name} (run 'seabri search --rebuild' instead)`)
      continue
    }
    const destPath = resolve(WORKSPACE_DIR, name)
    if (!opts.dryRun) {
      await mkdir(WORKSPACE_DIR, { recursive: true })
      await copyFile(srcPath, destPath)
    }
    report.copied.push(name)
  }
}

async function migrateUserSkills(srcRoot: string, opts: MigrateOptions, report: MigrateReport): Promise<void> {
  const candidates = [resolve(srcRoot, 'user-skills'), resolve(srcRoot, 'skills')]
  let sourceDir: string | null = null
  for (const dir of candidates) {
    if (await pathExists(dir)) {
      sourceDir = dir
      break
    }
  }
  if (sourceDir === null) {
    report.missing.push('skills/')
    return
  }

  let entries: string[]
  try {
    entries = await readdir(sourceDir)
  } catch {
    return
  }

  let copied = 0
  let skipped = 0
  for (const name of entries) {
    const srcSkillDir = resolve(sourceDir, name)
    let isDir = false
    try {
      isDir = (await stat(srcSkillDir)).isDirectory()
    } catch {
      continue
    }
    if (!isDir) continue
    const srcSkill = resolve(srcSkillDir, 'SKILL.md')
    if (!(await pathExists(srcSkill))) continue

    const destSkillDir = resolve(USER_SKILLS_DIR, name)
    const destSkill = resolve(destSkillDir, 'SKILL.md')
    const collides = existsSync(destSkill)
    if (collides && !opts.replace) {
      skipped += 1
      continue
    }
    if (!opts.dryRun) {
      await mkdir(destSkillDir, { recursive: true })
      await copyFile(srcSkill, destSkill)
    }
    copied += 1
  }

  if (copied > 0) report.copied.push(`user-skills/ (${copied})`)
  if (skipped > 0) report.skipped.push(`user-skills/ (${skipped} collision${skipped === 1 ? '' : 's'})`)
}

export async function runMigration(opts: MigrateOptions): Promise<MigrateReport> {
  const srcRoot = resolve(opts.from)
  if (!(await pathExists(srcRoot))) {
    throw new Error(`Source path not found: ${srcRoot}`)
  }

  const label = basename(srcRoot) || 'source'
  const report: MigrateReport = { copied: [], merged: [], skipped: [], missing: [], errors: [] }

  await migrateMarkdown(
    resolve(srcRoot, 'MEMORY.md'),
    resolve(WORKSPACE_DIR, 'MEMORY.md'),
    label,
    opts,
    report,
  )
  await migrateMarkdown(
    resolve(srcRoot, 'USER.md'),
    resolve(WORKSPACE_DIR, 'USER.md'),
    label,
    opts,
    report,
  )
  await migrateMarkdown(
    resolve(srcRoot, 'SKILLS.md'),
    resolve(WORKSPACE_DIR, 'SKILLS.md'),
    label,
    opts,
    report,
  )
  await migrateCrons(
    resolve(srcRoot, 'crons.json'),
    resolve(WORKSPACE_DIR, 'crons.json'),
    opts,
    report,
  )
  await migrateApprovedSenders(
    resolve(srcRoot, 'approved-senders.json'),
    resolve(WORKSPACE_DIR, 'approved-senders.json'),
    opts,
    report,
  )
  await migrateSessions(
    resolve(srcRoot, 'sessions'),
    resolve(WORKSPACE_DIR, 'sessions'),
    opts,
    report,
  )
  await migrateSearchIndex(srcRoot, opts, report)
  await migrateUserSkills(srcRoot, opts, report)

  return report
}

export function printMigrationReport(report: MigrateReport, opts: MigrateOptions): void {
  const prefix = opts.dryRun ? chalk.yellow('[dry-run] ') : ''
  console.log(`\n${prefix}${chalk.bold('Migration summary')}`)
  console.log(`  mode: ${opts.replace ? chalk.yellow('replace') : chalk.green('merge')}`)

  if (report.copied.length > 0) {
    console.log(chalk.green('  copied:'))
    for (const item of report.copied) console.log(`    + ${item}`)
  }
  if (report.merged.length > 0) {
    console.log(chalk.cyan('  merged:'))
    for (const item of report.merged) console.log(`    ~ ${item}`)
  }
  if (report.skipped.length > 0) {
    console.log(chalk.gray('  skipped:'))
    for (const item of report.skipped) console.log(`    - ${item}`)
  }
  if (report.missing.length > 0) {
    console.log(chalk.gray('  not present in source:'))
    for (const item of report.missing) console.log(`    · ${item}`)
  }
  if (report.errors.length > 0) {
    console.log(chalk.red('  errors:'))
    for (const err of report.errors) console.log(`    ! ${err.path}: ${err.error}`)
  }
  console.log('')
}

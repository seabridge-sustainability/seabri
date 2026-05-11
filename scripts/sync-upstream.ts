/**
 * scripts/sync-upstream.ts
 *
 * Upstream drift reporter. Per IMPORT_POLICY §3 we pin commit SHAs and never
 * auto-pull. This script fetches the remote, diffs the pinned SHA against
 * remote HEAD, and prints a summary. It does NOT modify manifest.json — a
 * human runs `import: bump <project> to <short-sha>` as its own PR.
 *
 * Usage:
 *   npx tsx scripts/sync-upstream.ts              # report all
 *   npx tsx scripts/sync-upstream.ts openclaw     # report one
 */

import { readFile } from 'fs/promises'
import { execFileSync } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const HERE = dirname(fileURLToPath(import.meta.url))
const OPENSEABRI_ROOT = resolve(HERE, '..')
const UPSTREAM_ROOT = resolve(OPENSEABRI_ROOT, '..', '_upstream')
const MANIFEST_PATH = resolve(OPENSEABRI_ROOT, 'imports', 'manifest.json')

interface UpstreamEntry {
  url: string
  commit: string
  license: string
  copyright: string
  imported_at: string
  imported_paths: string[]
  notes?: string
}

interface Manifest {
  upstreams: Record<string, UpstreamEntry>
}

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf-8' }).trim()
}

function gitMaybe(cwd: string, args: string[]): string | null {
  try {
    return git(cwd, args)
  } catch {
    return null
  }
}

async function reportOne(name: string, entry: UpstreamEntry): Promise<void> {
  const repoPath = resolve(UPSTREAM_ROOT, name)
  console.log(`\n── ${name} ──`)
  console.log(`  pinned: ${entry.commit.slice(0, 10)}  (${entry.imported_at})`)
  console.log(`  url:    ${entry.url}`)

  try {
    git(repoPath, ['fetch', '--quiet', 'origin'])
  } catch (err) {
    console.log(`  ! fetch failed: ${err instanceof Error ? err.message : String(err)}`)
    return
  }

  const remoteHead = git(repoPath, ['rev-parse', 'origin/HEAD']).trim()
  if (remoteHead === entry.commit) {
    console.log(`  status: up-to-date`)
    return
  }

  const count = git(repoPath, ['rev-list', '--count', `${entry.commit}..${remoteHead}`])
  const license = gitMaybe(repoPath, ['show', `${remoteHead}:LICENSE`])?.split('\n')[0]
  console.log(`  status: ${count} new commits on remote`)
  console.log(`  remote: ${remoteHead.slice(0, 10)}  license line 1: "${license ?? 'missing LICENSE'}"`)
  if (!license) {
    console.log(`  ! LICENSE file missing - do not import files until license is verified`)
  } else if (entry.license !== 'NOASSERTION' && license !== entry.license + ' License') {
    console.log(`  ! license header may have changed — re-audit before bumping pin`)
  }
  console.log(`  log:`)
  const log = git(repoPath, [
    'log',
    '--oneline',
    '--no-decorate',
    '-n',
    '10',
    `${entry.commit}..${remoteHead}`,
  ])
  for (const line of log.split('\n')) console.log(`    ${line}`)
}

async function main(): Promise<void> {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf-8')) as Manifest
  const filter = process.argv[2]
  const entries = Object.entries(manifest.upstreams).filter(
    ([name]) => !filter || name === filter,
  )
  if (entries.length === 0) {
    console.log(`No upstream matched "${filter}"`)
    process.exit(1)
  }
  for (const [name, entry] of entries) await reportOne(name, entry)
  console.log(
    `\nBumping a pin is a separate PR: update imports/manifest.json + re-run license audit per IMPORT_POLICY §7.`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

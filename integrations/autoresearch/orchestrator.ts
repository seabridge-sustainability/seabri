/**
 * integrations/autoresearch/orchestrator.ts
 *
 * PowerShell bridge to the co-scientist-orchestrator.ps1 in the autoresearch repo.
 * Invokes Feynman / Paper2Agent / Strix / Graphify runs and streams output back.
 *
 * Degrades gracefully: if AUTORESEARCH_DIR is unset or the script is missing,
 * every call returns { ok: false, reason: '...' } rather than throwing.
 *
 * Security note: task strings are passed as argv elements (never interpolated into
 * a shell string), so they cannot be used for command injection even when they
 * contain quotes, backticks, or semicolons.
 */

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { platform } from 'node:os'

export type OrchestratorAction =
  | 'run-feynman'
  | 'run-paper2agent'
  | 'run-strix'
  | 'run-graphify'
  | 'status'
  | 'help'

export interface OrchestratorRunArgs {
  action: OrchestratorAction
  task?: string
  target?: string
  mode?: 'quick' | 'full'
  deepResearch?: boolean
  extraArgs?: string[]
  timeoutMs?: number
  onStdout?: (chunk: string) => void
  onStderr?: (chunk: string) => void
}

export interface OrchestratorResult {
  ok: boolean
  exitCode: number | null
  stdout: string
  stderr: string
  reason?: string
  startedAt: string
  finishedAt: string
}

function findPowerShell(): string {
  const override = process.env.AUTORESEARCH_POWERSHELL
  if (override) return override
  return platform() === 'win32' ? 'powershell' : 'pwsh'
}

export function autoresearchDir(): string | null {
  const dir = process.env.AUTORESEARCH_DIR
  if (!dir) return null
  const abs = resolve(dir)
  return existsSync(abs) ? abs : null
}

export function orchestratorScript(): string | null {
  const dir = autoresearchDir()
  if (!dir) return null
  const script = join(dir, 'co-scientist-orchestrator.ps1')
  return existsSync(script) ? script : null
}

function buildArgs(args: OrchestratorRunArgs): string[] {
  const out: string[] = ['-Action', args.action]
  if (args.task) out.push('-Task', args.task)
  if (args.target) out.push('-StrixTarget', args.target)
  if (args.mode) out.push('-StrixMode', args.mode)
  if (args.deepResearch) out.push('-DeepResearch')
  if (args.extraArgs?.length) out.push(...args.extraArgs)
  return out
}

export async function runOrchestrator(args: OrchestratorRunArgs): Promise<OrchestratorResult> {
  const startedAt = new Date().toISOString()
  const script = orchestratorScript()
  if (!script) {
    return {
      ok: false,
      exitCode: null,
      stdout: '',
      stderr: '',
      reason: 'AUTORESEARCH_DIR not set or co-scientist-orchestrator.ps1 not found',
      startedAt,
      finishedAt: new Date().toISOString(),
    }
  }

  const shell = findPowerShell()
  const argv = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, ...buildArgs(args)]
  const timeoutMs = args.timeoutMs ?? 30 * 60 * 1000

  return new Promise((resolvePromise) => {
    const child = spawn(shell, argv, { cwd: autoresearchDir() ?? undefined })
    let stdout = ''
    let stderr = ''

    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      setTimeout(() => child.kill('SIGKILL'), 5000)
    }, timeoutMs)

    child.stdout?.on('data', (buf) => {
      const chunk = buf.toString('utf8')
      stdout += chunk
      args.onStdout?.(chunk)
    })
    child.stderr?.on('data', (buf) => {
      const chunk = buf.toString('utf8')
      stderr += chunk
      args.onStderr?.(chunk)
    })

    child.on('error', (err) => {
      clearTimeout(timer)
      resolvePromise({
        ok: false,
        exitCode: null,
        stdout,
        stderr: stderr + String(err),
        reason: `spawn error: ${err.message}`,
        startedAt,
        finishedAt: new Date().toISOString(),
      })
    })

    child.on('close', (code) => {
      clearTimeout(timer)
      resolvePromise({
        ok: code === 0,
        exitCode: code,
        stdout,
        stderr,
        startedAt,
        finishedAt: new Date().toISOString(),
      })
    })
  })
}

export async function runFeynman(task: string, opts: { deepResearch?: boolean } = {}): Promise<OrchestratorResult> {
  return runOrchestrator({ action: 'run-feynman', task, deepResearch: opts.deepResearch })
}

export async function runStrix(target: 'backend' | 'frontend' | 'custom', mode: 'quick' | 'full' = 'full'): Promise<OrchestratorResult> {
  return runOrchestrator({ action: 'run-strix', target, mode })
}

export async function runPaper2Agent(githubUrl: string, projectDir: string): Promise<OrchestratorResult> {
  return runOrchestrator({ action: 'run-paper2agent', extraArgs: ['-GithubUrl', githubUrl, '-ProjectDir', projectDir] })
}

export async function runGraphify(query: string): Promise<OrchestratorResult> {
  return runOrchestrator({ action: 'run-graphify', task: query })
}

export function ensureHandoffDir(): string | null {
  const dir = autoresearchDir()
  if (!dir) return null
  const handoff = join(dir, 'handoff')
  if (!existsSync(handoff)) mkdirSync(handoff, { recursive: true })
  return handoff
}

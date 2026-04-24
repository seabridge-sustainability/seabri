/**
 * gateway/cron/presets.ts
 *
 * Compliance-tagged cron presets. Each preset wraps an existing SeaBridgeAI
 * agent behind a stable schedule + delivery channel so operators can enable
 * regulatory cadence with one call instead of authoring free-text tasks.
 *
 * The preset runner calls runAgent() with an HMAC approval token — the caller
 * supplies the token factory so signing keys never live in this module.
 */

import { readFile, writeFile, mkdir } from 'fs/promises'
import { resolve } from 'path'
import { WORKSPACE_DIR } from '../config.js'
import { runAgent } from '../../bridge/seabridge_client.js'

const PRESET_STORE = resolve(WORKSPACE_DIR, 'cron-presets.json')

export type PresetId = 'regulation-monitoring-nightly'

export interface PresetDefinition {
  id: PresetId
  agent: string
  description: string
  defaultExpression: string
  complianceTags: string[]
  body: Record<string, unknown>
}

export const PRESETS: Record<PresetId, PresetDefinition> = {
  'regulation-monitoring-nightly': {
    id: 'regulation-monitoring-nightly',
    agent: 'regulation_monitoring',
    description: 'Nightly ESG regulation sweep (CSRD / SEC / ISSB / SFDR)',
    defaultExpression: '0 2 * * *', // 02:00 local every day
    complianceTags: ['CSRD', 'SEC', 'ISSB', 'SFDR'],
    body: { scope: 'global', include_draft: true },
  },
}

export interface RegisteredPreset {
  presetId: PresetId
  expression: string
  enabled: boolean
  lastRun?: number
  lastStatus?: 'ok' | 'failed'
}

interface PresetStore {
  presets: RegisteredPreset[]
}

async function loadStore(): Promise<PresetStore> {
  try {
    return JSON.parse(await readFile(PRESET_STORE, 'utf-8')) as PresetStore
  } catch {
    return { presets: [] }
  }
}

async function saveStore(store: PresetStore): Promise<void> {
  await mkdir(WORKSPACE_DIR, { recursive: true })
  await writeFile(PRESET_STORE, JSON.stringify(store, null, 2), 'utf-8')
}

export async function listRegisteredPresets(): Promise<RegisteredPreset[]> {
  const store = await loadStore()
  return store.presets
}

export async function enablePreset(
  presetId: PresetId,
  expression?: string,
): Promise<RegisteredPreset> {
  const def = PRESETS[presetId]
  if (!def) throw new Error(`Unknown preset: ${presetId}`)

  const store = await loadStore()
  const existing = store.presets.find((p) => p.presetId === presetId)
  if (existing) {
    existing.enabled = true
    if (expression) existing.expression = expression
    await saveStore(store)
    return existing
  }
  const entry: RegisteredPreset = {
    presetId,
    expression: expression ?? def.defaultExpression,
    enabled: true,
  }
  store.presets.push(entry)
  await saveStore(store)
  return entry
}

export async function disablePreset(presetId: PresetId): Promise<boolean> {
  const store = await loadStore()
  const entry = store.presets.find((p) => p.presetId === presetId)
  if (!entry) return false
  entry.enabled = false
  await saveStore(store)
  return true
}

/**
 * Approval-token factory contract. Callers wire this to their HMAC signer.
 * Receives the agent name + request body; returns a base64 HMAC.
 */
export type ApprovalTokenFactory = (
  agent: string,
  body: Record<string, unknown>,
) => Promise<string> | string

/**
 * Run a preset now, outside the cron schedule. Used by tests and by operators
 * who want a one-off sweep.
 */
export async function runPresetNow(
  presetId: PresetId,
  tokenFactory: ApprovalTokenFactory,
): Promise<{ ok: boolean; data: unknown }> {
  const def = PRESETS[presetId]
  if (!def) return { ok: false, data: { error: 'unknown_preset' } }

  const token = await tokenFactory(def.agent, def.body)
  const data = await runAgent(def.agent, def.body, token)

  const store = await loadStore()
  const entry = store.presets.find((p) => p.presetId === presetId)
  if (entry) {
    entry.lastRun = Date.now()
    entry.lastStatus = data === null ? 'failed' : 'ok'
    await saveStore(store)
  }

  return { ok: data !== null, data }
}

/**
 * Schedule every enabled preset using node-cron. Safe to call at gateway
 * boot — missing node-cron is logged but non-fatal.
 */
export async function startEnabledPresets(
  tokenFactory: ApprovalTokenFactory,
): Promise<number> {
  const store = await loadStore()
  const enabled = store.presets.filter((p) => p.enabled)
  if (enabled.length === 0) return 0

  let cron: typeof import('node-cron')
  try {
    cron = await import('node-cron')
  } catch {
    console.warn('[CronPresets] node-cron not installed — presets will not run')
    return 0
  }

  let started = 0
  for (const entry of enabled) {
    const def = PRESETS[entry.presetId]
    if (!def) continue
    if (!cron.validate(entry.expression)) {
      console.warn(
        `[CronPresets] Invalid expression for ${entry.presetId}: ${entry.expression}`,
      )
      continue
    }
    cron.schedule(entry.expression, async () => {
      try {
        await runPresetNow(entry.presetId, tokenFactory)
      } catch (err) {
        console.error(
          `[CronPresets] ${entry.presetId} failed:`,
          err instanceof Error ? err.message : String(err),
        )
      }
    })
    started += 1
  }
  console.log(`[CronPresets] Started ${started} preset(s)`)
  return started
}

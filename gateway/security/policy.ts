import { readFile, writeFile, mkdir } from 'fs/promises'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { WORKSPACE_DIR } from '../config.js'
import type { ComplianceTag } from '../skills/schema.js'
import { createLogger } from '../logger.js'

const policyLog = createLogger('gateway.policy.audit')

const OPENSEABRI_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const REPO_POLICY_FILE = resolve(OPENSEABRI_ROOT, 'openseabri', 'config', 'policy.json')
const WORKSPACE_POLICY_FILE = resolve(WORKSPACE_DIR, 'policy.json')

export interface SenderPolicy {
  agent?: string
  allow?: boolean
  note?: string
}

export interface ChannelPolicy {
  requirePairing?: boolean
  allowedAgents?: string[]
  /**
   * When set, skills invoked on this channel must carry at least one of the
   * listed compliance tags (see openseabri/skills SKILL.md frontmatter).
   * When unset or empty, all compliance tags are allowed — this is the opt-in
   * hook that lets a channel be restricted to, say, ISSB+CSRD disclosures
   * while another channel is for general-purpose use.
   */
  allowedComplianceTags?: ComplianceTag[]
}

export interface Policy {
  defaultAgent: string
  perSender: Record<string, SenderPolicy>
  channels: Record<string, ChannelPolicy>
}

const DEFAULT_POLICY: Policy = {
  defaultAgent: 'seabri-orchestrator',
  perSender: {},
  channels: {
    telegram: { requirePairing: true },
  },
}

let cached: { policy: Policy; loadedAt: number } | null = null
const CACHE_TTL_MS = 30_000

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

function hasDangerousKey(obj: unknown, depth = 0): boolean {
  if (depth > 20) return false
  if (typeof obj !== 'object' || obj === null) return false
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    if (DANGEROUS_KEYS.has(key)) return true
    if (hasDangerousKey(val, depth + 1)) return true
  }
  return false
}

async function tryRead(path: string): Promise<Policy | null> {
  try {
    const raw = await readFile(path, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<Policy>
    if (hasDangerousKey(parsed)) {
      console.warn(`[policy] Dangerous keys detected in ${path} — ignoring`)
      return null
    }
    return {
      defaultAgent: parsed.defaultAgent ?? DEFAULT_POLICY.defaultAgent,
      perSender: parsed.perSender ?? {},
      channels: parsed.channels ?? {},
    }
  } catch {
    return null
  }
}

export async function loadPolicy(force = false): Promise<Policy> {
  if (!force && cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    return cached.policy
  }
  // Prefer workspace override, then repo config, then defaults
  const policy =
    (await tryRead(WORKSPACE_POLICY_FILE)) ??
    (await tryRead(REPO_POLICY_FILE)) ??
    DEFAULT_POLICY
  cached = { policy, loadedAt: Date.now() }
  return policy
}

export async function savePolicy(policy: Policy): Promise<string> {
  await mkdir(WORKSPACE_DIR, { recursive: true })
  await writeFile(WORKSPACE_POLICY_FILE, JSON.stringify(policy, null, 2), 'utf-8')
  cached = { policy, loadedAt: Date.now() }
  return WORKSPACE_POLICY_FILE
}

export async function isAllowed(senderId: string, channel: string): Promise<boolean> {
  const policy = await loadPolicy()
  const sender = policy.perSender[senderId]
  let ruleMatched: string | null = null
  let allowed = true

  if (sender && sender.allow === false) {
    ruleMatched = 'sender_deny'
    allowed = false
  } else {
    const channelPolicy = policy.channels[channel]
    if (channelPolicy?.allowedAgents && sender?.agent) {
      if (!channelPolicy.allowedAgents.includes(sender.agent)) {
        ruleMatched = 'channel_agent_deny'
        allowed = false
      }
    }
  }

  policyLog.info('policy_decision', {
    result: allowed ? 'ALLOW' : 'DENY',
    senderId,
    channel,
    ruleMatched,
    ts: new Date().toISOString(),
  })

  return allowed
}

export async function getPreferredAgent(senderId: string): Promise<string> {
  const policy = await loadPolicy()
  return policy.perSender[senderId]?.agent ?? policy.defaultAgent
}

export async function setPreferredAgent(senderId: string, agentId: string): Promise<void> {
  const policy = await loadPolicy(true)
  const existing = policy.perSender[senderId] ?? {}
  policy.perSender[senderId] = { ...existing, agent: agentId }
  await savePolicy(policy)
}

export async function setSenderAllow(senderId: string, allow: boolean): Promise<void> {
  const policy = await loadPolicy(true)
  const existing = policy.perSender[senderId] ?? {}
  policy.perSender[senderId] = { ...existing, allow }
  await savePolicy(policy)
}

export async function clearSenderPolicy(senderId: string): Promise<void> {
  const policy = await loadPolicy(true)
  delete policy.perSender[senderId]
  await savePolicy(policy)
}

export async function requiresPairing(channel: string): Promise<boolean> {
  const policy = await loadPolicy()
  return policy.channels[channel]?.requirePairing ?? true
}

/**
 * Compliance-tag gate. A skill's complianceTags[] must intersect with the
 * channel's allowedComplianceTags[] when that field is set. An unset or empty
 * allowlist is treated as "no restriction" — the default. GENERAL is treated
 * literally: only matches a channel that explicitly lists GENERAL.
 */
export async function isComplianceTagAllowed(
  channel: string,
  skillTags: readonly ComplianceTag[]
): Promise<boolean> {
  const policy = await loadPolicy()
  const allowed = policy.channels[channel]?.allowedComplianceTags
  if (!allowed || allowed.length === 0) return true
  if (skillTags.length === 0) return false
  const allowedSet = new Set(allowed)
  return skillTags.some((t) => allowedSet.has(t))
}

export async function policyPath(): Promise<{ active: string; usingDefaults: boolean }> {
  const workspace = await tryRead(WORKSPACE_POLICY_FILE)
  if (workspace) return { active: WORKSPACE_POLICY_FILE, usingDefaults: false }
  const repo = await tryRead(REPO_POLICY_FILE)
  if (repo) return { active: REPO_POLICY_FILE, usingDefaults: false }
  return { active: '<built-in defaults>', usingDefaults: true }
}

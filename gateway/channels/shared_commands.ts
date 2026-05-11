import { AGENTS, INBOUND_PHONE_ALLOWLIST } from '../config.js'
import { getAgentName } from '../agents/agents.js'
import { readMemory } from '../memory/memory.js'
import { compressHistory } from '../memory/compress.js'
import { listPersonalities, loadPersonality } from '../personalities/loader.js'
import { consultPanel, type PanelResult } from '../agents/subagent.js'
import { loadUserConfig, setUserConfigField } from '../user_config.js'
import type { PendingAction } from '../seabri/approval.js'
import { isSupportedLocale, type Locale } from '../seabri/lang.js'
import {
  type UserProfile,
  getProfile,
  upsertProfile,
  deleteProfile,
  formatProfileDisplay,
  isProfileComplete,
} from '../seabri/user-profile.js'

export interface ChannelState {
  agentId: string
  history: Array<{ role: string; content: string }>
  personalityId?: string | null
  thinkMode?: boolean
  /** Set when the agent's last response contained an action card awaiting YES/NO */
  pendingApproval?: PendingAction
  /** Active locale for this session; defaults to 'en' */
  locale?: Locale
  /** Loaded user profile — null means no profile exists yet, undefined means not yet loaded */
  userProfile?: UserProfile | null
  /** Whether the first-session onboarding prompt has been shown */
  onboardingShown?: boolean
  /** Whether we're waiting for the user to reply to the onboarding prompt */
  awaitingOnboardingReply?: boolean
}

export interface SlashResult {
  handled: boolean
  reply?: string
  exit?: boolean
}

function agentListText(): string {
  const lines = ['*Available agents:*', '']
  for (const agent of AGENTS) {
    lines.push(`${agent.icon} \`${agent.id}\` — ${agent.name}`)
  }
  return lines.join('\n')
}

async function personalityListText(active?: string | null): Promise<string> {
  const all = await listPersonalities()
  if (all.length === 0) return '_No personalities available._'
  const lines = ['*Available personalities:*', '']
  for (const p of all) {
    const marker = active && active === p.id ? ' *(active)*' : ''
    const src = p.source === 'user' ? ' (user)' : ''
    const desc = p.description ? ` — ${p.description}` : ''
    lines.push(`• \`${p.id}\`${src}${marker}${desc}`)
  }
  lines.push('')
  lines.push('Use `/persona <id>` to switch, or `/persona off` to clear.')
  return lines.join('\n')
}

export function isInboundPhoneAllowed(phone: string): boolean {
  if (!INBOUND_PHONE_ALLOWLIST) return true
  const digits = phone.replace(/\D/g, '')
  return INBOUND_PHONE_ALLOWLIST.some(n => digits.endsWith(n) || n.endsWith(digits))
}

export function sanitizeForPlainText(text: string): string {
  return text
    .replace(/https?:\/\/[^\s)>\]]+/g, '[link removed]')
    .replace(/```[\s\S]*?```/g, '[code block]')
    .replace(/<[^>]+>/g, '')
    .slice(0, 1600)
}

export async function buildAdditionalContext(
  state: ChannelState,
): Promise<string> {
  const parts: string[] = []

  if (state.personalityId) {
    try {
      const personality = await loadPersonality(state.personalityId)
      if (personality?.prompt) {
        parts.push(`[Active personality: ${personality.name}]\n${personality.prompt}`)
      }
    } catch {
      // Non-fatal
    }
  }

  if (state.thinkMode) {
    parts.push(
      '[Extended thinking requested for this turn: take extra care to reason step-by-step, consider tradeoffs, and double-check claims before answering.]',
    )
  }

  if (state.locale && state.locale !== 'en') {
    parts.push(`[Language preference: respond in locale "${state.locale}"]`)
  }

  if (state.userProfile) {
    const { formatProfileContext } = await import('../seabri/user-profile.js')
    parts.push(formatProfileContext(state.userProfile))
  }

  return parts.join('\n\n---\n\n')
}

/**
 * Handle a slash command. Returns `handled: true` if the input was a slash
 * command (even if it failed), so the caller should short-circuit instead of
 * routing to the model.
 */
export async function handleSlashCommand(
  state: ChannelState,
  rawInput: string,
): Promise<SlashResult> {
  const input = rawInput.trim()
  if (!input.startsWith('/')) {
    return { handled: false }
  }

  const [commandRaw, ...rest] = input.split(/\s+/)
  const command = commandRaw.toLowerCase()
  const arg = rest.join(' ').trim()

  switch (command) {
    case '/quit':
    case '/exit':
      return { handled: true, exit: true, reply: 'Goodbye.' }

    case '/agents':
      return { handled: true, reply: agentListText() }

    case '/switch': {
      if (!arg) return { handled: true, reply: agentListText() }
      const found = AGENTS.find((a) => a.id === arg)
      if (!found) {
        return { handled: true, reply: `Unknown agent: \`${arg}\`\n\n` + agentListText() }
      }
      state.agentId = found.id
      state.history.length = 0
      return {
        handled: true,
        reply: `${found.icon} Switched to *${found.name}*. How can I help?`,
      }
    }

    case '/new':
    case '/reset': {
      state.history.length = 0
      state.thinkMode = false
      return { handled: true, reply: '🌱 Started a fresh conversation.' }
    }

    case '/status': {
      const agentName = getAgentName(state.agentId)
      const agentEntry = AGENTS.find((a) => a.id === state.agentId)
      const icon = agentEntry?.icon ?? '🌍'
      const turns = Math.floor(state.history.length / 2)
      const persona = state.personalityId ?? 'default'
      const think = state.thinkMode ? 'on' : 'off'
      return {
        handled: true,
        reply: [
          '*Status*',
          '',
          `Agent: ${icon} ${agentName}`,
          `Personality: ${persona}`,
          `Extended thinking: ${think}`,
          `Conversation turns: ${turns}`,
        ].join('\n'),
      }
    }

    case '/memory': {
      try {
        const memory = await readMemory()
        if (!memory || memory.trim() === '') {
          return { handled: true, reply: '_No memory yet — have a conversation to build context._' }
        }
        const MAX = 3500
        const trimmed = memory.length > MAX ? memory.slice(0, MAX) + '\n…(truncated)' : memory
        return { handled: true, reply: '*Current memory:*\n\n' + trimmed }
      } catch {
        return { handled: true, reply: 'Could not read memory file.' }
      }
    }

    case '/compact': {
      if (state.history.length === 0) {
        return { handled: true, reply: 'Nothing to compact yet.' }
      }
      try {
        const result = await compressHistory(state.history)
        if (!result.compressed) {
          return {
            handled: true,
            reply: `History is short (${state.history.length} messages) — nothing to compact.`,
          }
        }
        state.history.length = 0
        state.history.push(...result.history)
        const summaryLine = result.summary
          ? `\n\n*Summary:* ${result.summary.slice(0, 500)}`
          : ''
        return {
          handled: true,
          reply: `✅ Compacted conversation to ${result.history.length} messages.${summaryLine}`,
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        return { handled: true, reply: `Compaction failed: ${message}` }
      }
    }

    case '/think': {
      state.thinkMode = true
      return {
        handled: true,
        reply: '🧠 Extended thinking armed for the next message.',
      }
    }

    case '/persona': {
      if (!arg) return { handled: true, reply: await personalityListText(state.personalityId) }
      if (arg === 'off' || arg === 'clear' || arg === 'default') {
        state.personalityId = null
        return { handled: true, reply: 'Personality cleared.' }
      }
      const personality = await loadPersonality(arg)
      if (!personality) {
        return {
          handled: true,
          reply: `Unknown personality: \`${arg}\`\n\n` + (await personalityListText(state.personalityId)),
        }
      }
      state.personalityId = personality.id
      return {
        handled: true,
        reply: `🎭 Personality switched to *${personality.name}*.`,
      }
    }

    case '/company': {
      const [sub, ...subArgs] = rest
      const subCmd = (sub ?? '').toLowerCase()
      const subVal = subArgs.join(' ').trim()

      if (!subCmd || subCmd === 'show') {
        const cfg = await loadUserConfig()
        const lines = ['*Company context*', '']
        lines.push(`Company ID: ${cfg.companyId ?? '_not set_'}`)
        lines.push(`Asset ID:   ${cfg.assetId ?? '_not set_'}`)
        lines.push(`Sector:     ${cfg.sector ?? '_not set_'}`)
        lines.push('')
        lines.push('Use `/company set <id>` to set your company, `/company sector <name>` for sector, `/company asset <id>` for asset.')
        return { handled: true, reply: lines.join('\n') }
      }

      if (subCmd === 'set') {
        if (!subVal) return { handled: true, reply: 'Usage: `/company set <companyId>`' }
        await setUserConfigField('companyId', subVal)
        return { handled: true, reply: `Company ID set to \`${subVal}\`. Bridge context will use company-specific data.` }
      }

      if (subCmd === 'sector') {
        if (!subVal) return { handled: true, reply: 'Usage: `/company sector <sector-name>`' }
        await setUserConfigField('sector', subVal)
        return { handled: true, reply: `Sector set to \`${subVal}\`.` }
      }

      if (subCmd === 'asset') {
        if (!subVal) return { handled: true, reply: 'Usage: `/company asset <assetId>`' }
        await setUserConfigField('assetId', subVal)
        return { handled: true, reply: `Asset ID set to \`${subVal}\`.` }
      }

      if (subCmd === 'clear') {
        await setUserConfigField('companyId', undefined)
        await setUserConfigField('assetId', undefined)
        await setUserConfigField('sector', undefined)
        return { handled: true, reply: 'Company context cleared.' }
      }

      return {
        handled: true,
        reply: 'Usage: `/company [show|set <id>|sector <name>|asset <id>|clear]`',
      }
    }

    case '/lang': {
      if (!arg) {
        const current = state.locale ?? 'en'
        return {
          handled: true,
          reply: [
            `Current language: \`${current}\``,
            '',
            'Supported locales: `en` `es` `pt` `fr` `de` `ar` `zh` `ja` `ko` `hi` `ru` `tr`',
            '',
            'Use `/lang <code>` to switch, or `/lang off` to reset to English.',
          ].join('\n'),
        }
      }
      if (arg === 'off' || arg === 'en') {
        state.locale = 'en'
        return { handled: true, reply: 'Language reset to English.' }
      }
      if (!isSupportedLocale(arg)) {
        return {
          handled: true,
          reply: `Unsupported locale: \`${arg}\`\n\nSupported: \`en\` \`es\` \`pt\` \`fr\` \`de\` \`ar\` \`zh\` \`ja\` \`ko\` \`hi\` \`ru\` \`tr\``,
        }
      }
      state.locale = arg
      return { handled: true, reply: `Language set to \`${arg}\`. Responses will use this locale.` }
    }

    case '/panel': {
      if (!arg) {
        return {
          handled: true,
          reply: [
            'Usage: `/panel <your question>`',
            '',
            'Fans your question to all specialist agents in parallel and synthesizes their answers.',
            'Example: `/panel What are my climate and investment risks for a warehouse in Miami?`',
          ].join('\n'),
        }
      }
      const progressLog: string[] = []
      let result: PanelResult
      try {
        result = await consultPanel(arg, {
          conversationHistory: state.history,
          onProgress: (msg) => { progressLog.push(msg) },
        })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        return { handled: true, reply: `Panel consultation failed: ${message}` }
      }
      const successCount = result.responses.filter((r) => !r.error).length
      const secs = Math.round(result.totalDurationMs / 1000)
      const header = `*Panel synthesis* — ${successCount}/${result.responses.length} specialists, ${secs}s`
      return { handled: true, reply: `${header}\n\n${result.synthesis}` }
    }

    case '/profile': {
      // /profile                    — show profile
      // /profile set <field> <value> — set one field
      // /profile delete             — remove all profile data
      const [sub, ...subArgs] = rest
      const subCmd = (sub ?? '').toLowerCase()

      // Channel-agnostic: we need userId+channel to load/save; fallback to 'unknown'
      // Channels that support profiles should pass userId via a wrapper or the state.
      // For now, shared_commands doesn't have userId — handled per-channel via direct import.
      // Here we show a static usage hint.
      if (!subCmd || subCmd === 'show') {
        const profile = state.userProfile
        if (!profile) {
          return {
            handled: true,
            reply: [
              '_No profile saved yet._',
              '',
              'Use `/profile set <field> <value>` to set details.',
              'Fields: `name` `address` `city` `state` `zip` `phone` `language` `emergency` `household` `property`',
            ].join('\n'),
          }
        }
        return { handled: true, reply: formatProfileDisplay(profile) }
      }

      if (subCmd === 'set') {
        const [field, ...valueTokens] = subArgs
        const value = valueTokens.join(' ').trim()
        if (!field || !value) {
          return {
            handled: true,
            reply: 'Usage: `/profile set <field> <value>`\nFields: `name` `address` `city` `state` `zip` `phone` `language` `emergency` `household` `property`',
          }
        }
        const fieldMap: Record<string, keyof UserProfile> = {
          name: 'name', address: 'address', city: 'city', state: 'state', zip: 'zip',
          phone: 'phone', language: 'preferredLanguage', emergency: 'emergencyContact',
          household: 'householdNotes', property: 'propertyType',
        }
        const profileField = fieldMap[field.toLowerCase()]
        if (!profileField) {
          return {
            handled: true,
            reply: `Unknown field: \`${field}\`\nValid fields: \`name\` \`address\` \`city\` \`state\` \`zip\` \`phone\` \`language\` \`emergency\` \`household\` \`property\``,
          }
        }
        if (state.userProfile !== undefined && state.userProfile !== null) {
          ;(state.userProfile as unknown as Record<string, unknown>)[profileField] = value
          ;(state.userProfile as UserProfile).updatedAt = new Date().toISOString()
        }
        return { handled: true, reply: `✅ Profile updated: \`${field}\` → ${value}\n\nNote: Saved in session. Channels that support persistence save automatically.` }
      }

      if (subCmd === 'delete') {
        state.userProfile = null
        return { handled: true, reply: '🗑 Profile data cleared from this session. Use `/profile delete` on a persistent channel to remove stored data.' }
      }

      return {
        handled: true,
        reply: 'Usage: `/profile [show|set <field> <value>|delete]`',
      }
    }

    case '/privacy': {
      return {
        handled: true,
        reply: [
          '*Privacy*',
          '',
          'SeaBri stores your profile locally on the device running the gateway.',
          'Profile data is used only to personalize responses and prepare outbound actions.',
          'It is never sent to third parties without your explicit approval.',
          '',
          'Commands:',
          '• `/profile delete` — permanently remove your stored profile',
          '• `/profile show` — view what\'s stored',
        ].join('\n'),
      }
    }

    case '/skip': {
      // Acknowledge skip during onboarding or any prompted flow
      return { handled: true, reply: 'No problem — you can always use `/profile` to set this up later.' }
    }

    case '/help': {
      return {
        handled: true,
        reply: [
          '*Commands*',
          '',
          '`/agents` — list agents',
          '`/switch <id>` — change agent',
          '`/panel <question>` — consult all specialists in parallel',
          '`/lang [code|off]` — set response language (en es pt fr de ar zh ja ko hi ru tr)',
          '`/company [show|set <id>|sector <name>|asset <id>|clear]` — set company context for bridge data',
          '`/profile [show|set <field> <value>|delete]` — view and update your profile (name, address, phone, etc.)',
          '`/privacy` — data storage policy and how to delete your info',
          '`/status` — show current state',
          '`/memory` — show memory summary',
          '`/compact` — compress conversation history',
          '`/think` — arm extended thinking for next message',
          '`/persona [id|off]` — switch personality',
          '`/new` — start a fresh conversation',
          '`/quit` — end session',
        ].join('\n'),
      }
    }

    default:
      return {
        handled: true,
        reply:
          `Unknown command: \`${command}\`\n` +
          'Try `/help` to see available commands.',
      }
  }
}

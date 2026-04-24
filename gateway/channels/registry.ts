/**
 * Channel registry — single source of truth for optional channel adapters.
 *
 * gateway/index.ts iterates this array and calls channel.start() on each
 * enabled channel, so adding a new channel is a one-line import change here.
 *
 * OPENSEABRI_CHANNELS_ENABLED env var is a comma-separated allowlist of
 * channel ids (e.g. "discord,slack"). When unset/empty every channel whose
 * own isEnabled() returns true is started — preserves previous behavior.
 * When set, only ids in the list are considered; everything else is skipped
 * even if its token is present. This is the operator-side gate for the
 * multi-channel gateway.
 *
 * Telegram is NOT listed here because it predates the BaseChannel contract
 * and is still wired directly from gateway/index.ts. Migrating it is a
 * mechanical refactor for a later pass.
 */

import { whatsappChannel } from './whatsapp.js'
import { discordChannel } from './discord.js'
import { slackChannel } from './slack.js'
import type { BaseChannel } from './base.js'

export const CHANNELS: readonly BaseChannel[] = [
  whatsappChannel,
  discordChannel,
  slackChannel,
]

function allowlist(): Set<string> | null {
  const raw = (process.env.OPENSEABRI_CHANNELS_ENABLED || '').trim()
  if (!raw) return null
  const ids = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  return ids.length > 0 ? new Set(ids) : null
}

export async function startOptionalChannels(): Promise<void> {
  const allowed = allowlist()
  for (const ch of CHANNELS) {
    if (allowed && !allowed.has(ch.id)) continue
    if (!ch.isEnabled()) continue
    try {
      await ch.start()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.warn(`[${ch.id}] failed to start: ${message}`)
    }
  }
}

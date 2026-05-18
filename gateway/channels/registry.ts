/**
 * Channel registry — single source of truth for optional channel adapters.
 *
 * gateway/index.ts iterates this array and calls channel.start() on each
 * enabled channel, so adding a new channel is a one-line import change here.
 *
 * OPENSEABRI_CHANNELS_ENABLED env var is a comma-separated allowlist of
 * channel ids (e.g. "discord,slack,telegram"). When unset/empty the registry
 * does not auto-start anything — channels are opt-in via the allowlist.
 * When set to "all", every channel whose own isEnabled() returns true is
 * started. This is the operator-side gate for the multi-channel gateway.
 *
 * Telegram is now registered here alongside all other channels and goes
 * through the same startOptionalChannels() lifecycle.
 * Set OPENSEABRI_CHANNELS_ENABLED=telegram (or include it in a comma list)
 * to enable Telegram polling.
 */

import { whatsappChannel } from './whatsapp.js'
import { discordChannel } from './discord.js'
import { slackChannel } from './slack.js'
import { smsChannel } from './sms.js'
import { voiceChannel } from './voice.js'
import { telegramChannel } from './telegram.js'
import type { BaseChannel } from './base.js'
import { enabledChannelSet } from './enablement.js'

export const CHANNELS: readonly BaseChannel[] = [
  telegramChannel,
  whatsappChannel,
  discordChannel,
  slackChannel,
  smsChannel,
  voiceChannel,
]

function allowlist(): Set<string> | null {
  const ids = enabledChannelSet()
  return ids.size > 0 ? ids : null
}

export async function startOptionalChannels(): Promise<void> {
  const allowed = allowlist()
  for (const ch of CHANNELS) {
    if (!allowed || !allowed.has(ch.id)) continue
    if (!ch.isEnabled()) continue
    try {
      await ch.start()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.warn(`[${ch.id}] failed to start: ${message}`)
    }
  }
}

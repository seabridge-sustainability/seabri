/**
 * Discord channel (scaffold).
 *
 * Degrades gracefully:
 *   - no DISCORD_BOT_TOKEN env → channel disabled, zero warnings
 *   - token set but discord.js missing → warn once, skip
 *   - pairing gate via security/pairing + security/policy, identical to telegram.ts
 *
 * Implementation is intentionally a thin scaffold — the on('messageCreate')
 * handler mirrors telegram.ts exactly once discord.js is wired in.
 */

import { routeMessage } from '../agents/router.js'
import {
  isApproved,
  createPairingCode,
  verifyPairingCode,
  approveSender,
} from '../security/pairing.js'
import { getPreferredAgent, isAllowed, requiresPairing } from '../security/policy.js'
import {
  buildAdditionalContext,
  handleSlashCommand,
  type ChannelState,
} from './shared_commands.js'
import { tryImport, type BaseChannel } from './base.js'

const CHANNEL_ID = 'discord'

interface UserState extends ChannelState {}

function token(): string {
  return process.env.DISCORD_BOT_TOKEN || ''
}

export const discordChannel: BaseChannel = {
  id: CHANNEL_ID,
  displayName: 'Discord',

  isEnabled(): boolean {
    return Boolean(token())
  },

  async start(): Promise<void> {
    if (!token()) {
      console.log('[Discord] DISCORD_BOT_TOKEN not set — Discord channel not started.')
      return
    }

    const discord = await tryImport<Record<string, unknown>>('discord.js', CHANNEL_ID)
    if (!discord) return

    const userStates = new Map<string, UserState>()

    async function getState(userId: string): Promise<UserState> {
      if (!userStates.has(userId)) {
        const agentId = await getPreferredAgent(userId)
        userStates.set(userId, { agentId, history: [], personalityId: null, thinkMode: false })
      }
      return userStates.get(userId)!
    }

    async function handleInbound(
      senderId: string,
      text: string,
      send: (reply: string) => Promise<void>
    ): Promise<void> {
      const trimmed = text.trim()
      if (!trimmed) return

      if (!(await isAllowed(senderId, CHANNEL_ID))) {
        await send('Access denied by policy.')
        return
      }

      const pairingNeeded = await requiresPairing(CHANNEL_ID)
      const approved = await isApproved(senderId)

      if (pairingNeeded && !approved) {
        if (trimmed.startsWith('/pair ')) {
          const code = trimmed.replace('/pair ', '').trim()
          const valid = await verifyPairingCode(senderId, code)
          if (valid) {
            await approveSender(senderId)
            await send('Paired successfully. Welcome to OpenSeaBri.')
          } else {
            await send('Invalid or expired pairing code.')
          }
          return
        }
        const code = await createPairingCode(senderId)
        await send(
          `OpenSeaBri requires pairing.\nYour code: ${code}\n` +
            `Approve: seabri pairing approve ${senderId} ${code}\n` +
            `Or reply: /pair ${code}`
        )
        return
      }

      const state = await getState(senderId)

      if (trimmed.startsWith('/')) {
        const result = await handleSlashCommand(state, trimmed)
        if (result.handled) {
          if (result.reply) await send(result.reply)
          return
        }
      }

      try {
        const additional = await buildAdditionalContext(state)
        const response = await routeMessage(state.agentId, trimmed, state.history, additional)
        if (state.thinkMode) state.thinkMode = false
        state.history.push({ role: 'user', content: trimmed })
        state.history.push({ role: 'assistant', content: response })
        if (state.history.length > 40) {
          state.history.splice(0, state.history.length - 40)
        }
        await send(response)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        await send(`Something went wrong: ${message}`)
      }
    }

    console.warn(
      '[Discord] discord.js detected. Full wiring pending — inbound handler available but client hookup is a scaffold.'
    )
    // Intentional scaffold: discord.js requires Client({ intents: [...] }),
    // login(token), and an on('messageCreate') listener that routes DMs into
    // handleInbound(message.author.id, message.content, async (reply) => message.reply(reply)).
    // Guild channels should be gated by a separate policy (not covered here).
    void handleInbound
    void discord
    return
  },
}

export async function startDiscordChannel(): Promise<void> {
  if (!discordChannel.isEnabled()) return
  await discordChannel.start()
}

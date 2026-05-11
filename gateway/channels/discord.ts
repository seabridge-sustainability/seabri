/**
 * Discord channel.
 *
 * Degrades gracefully:
 *   - no DISCORD_BOT_TOKEN env → channel disabled, zero warnings
 *   - token set but discord.js missing → warn once, skip
 *   - pairing gate via security/pairing + security/policy, identical to telegram.ts
 *
 * Full SDK wiring: discord.js Client with DM + reaction intents.
 * Reaction-based approval: ✅ / ❌ on action card messages trigger the
 * approval flow as an alternative to text YES/NO.
 */

import { routeMessage } from '../agents/router.js'
import { APPROVAL_TTL_MS } from '../config.js'
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
import { Product } from '../product.js'
import { processAttachment } from '../seabri/attachments.js'
import { extractActionCard, isApproval, isDenial, logConsent, detectActionKind, requiresDoubleConfirmation, generateConfirmCode, isConfirmCode } from '../seabri/approval.js'
import { getExecutor } from '../seabri/action-executor.js'

const CHANNEL_ID = 'discord'
const USER_STATE_MAX = 10_000

function makeLruMap<V>(maxSize: number): Map<string, V> {
  const map = new Map<string, V>()
  const _set = map.set.bind(map)
  map.set = (k: string, v: V) => {
    if (map.has(k)) map.delete(k)
    else if (map.size >= maxSize) map.delete(map.keys().next().value as string)
    return _set(k, v)
  }
  return map
}

interface UserState extends ChannelState {
  lastActionCardMessageId?: string
  dmChannelId?: string
}

function token(): string {
  return process.env.DISCORD_BOT_TOKEN || ''
}

export const discordChannel: BaseChannel = {
  id: CHANNEL_ID,
  displayName: 'Discord',
  product: Product.COMPANION,

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

    const userStates = makeLruMap<UserState>(USER_STATE_MAX)

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
      send: (reply: string) => Promise<void>,
      attachment?: { type: 'image'; mediaType: string; data: string },
      attachmentContext?: string
    ): Promise<void> {
      const trimmed = text.trim()
      if (!trimmed && !attachment && !attachmentContext) return

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

      // --- Approval intercept ---
      // Sprint 3 note: Discord also supports reaction-based approval.
      // After posting an action card, add ✅ and ❌ reactions to the message.
      // Then listen for messageReactionAdd events:
      //   client.on('messageReactionAdd', async (reaction, user) => {
      //     if (user.bot) return
      //     const state = await getState(user.id)
      //     if (!state.pendingApproval) return
      //     if (reaction.emoji.name === '✅') { /* treat as YES */ }
      //     if (reaction.emoji.name === '❌') { /* treat as NO */ }
      //   })
      // Text-based YES/NO is kept as fallback for DM threads.
      if (state.pendingApproval) {
        if (Date.now() > state.pendingApproval.expiresAt) {
          state.pendingApproval = undefined
          await send('⏱ The pending action expired. Please ask again if you still want to proceed.')
        } else if (state.pendingApproval.awaitingConfirmCode) {
          if (isConfirmCode(trimmed) && trimmed === (state.pendingApproval as { confirmCode?: string }).confirmCode) {
            const { card, kind } = state.pendingApproval
            state.pendingApproval = undefined
            await logConsent(senderId, card, true)
            const result = await getExecutor(kind).execute(card, senderId)
            await send(result.ok ? `🚨 Emergency notification sent.` : `⚠️ ${result.error}`)
          } else {
            state.pendingApproval = undefined
            await send('🚫 Confirmation code did not match. Emergency action cancelled.')
          }
          state.history.push({ role: 'user', content: trimmed })
          state.history.push({ role: 'assistant', content: '🚨 Emergency flow completed.' })
          return
        } else if (isApproval(trimmed)) {
          const { card, kind } = state.pendingApproval
          if (requiresDoubleConfirmation(kind)) {
            const confirmCode = generateConfirmCode()
            state.pendingApproval = { ...state.pendingApproval, awaitingConfirmCode: true, confirmCode } as typeof state.pendingApproval & { confirmCode: string }
            await send(`⚠️ **Emergency alert confirmation required.**\n\nReply with this code to confirm: \`${confirmCode}\``)
            return
          }
          state.pendingApproval = undefined
          await logConsent(senderId, card, true)
          const result = await getExecutor(kind).execute(card, senderId)
          await send(result.ok ? `✅ ${result.message ?? 'Action completed.'}` : `⚠️ ${result.error}`)
          state.history.push({ role: 'user', content: 'YES — I approve the action.' })
          state.history.push({ role: 'assistant', content: '✅ Action confirmed and logged.' })
          return
        } else if (isDenial(trimmed)) {
          const { card } = state.pendingApproval
          state.pendingApproval = undefined
          await logConsent(senderId, card, false)
          await send('🚫 Action cancelled. What else can I help you with?')
          state.history.push({ role: 'user', content: 'NO — cancel the action.' })
          state.history.push({ role: 'assistant', content: '🚫 Action cancelled.' })
          return
        } else {
          state.pendingApproval = undefined
        }
      }

      if (trimmed.startsWith('/')) {
        const result = await handleSlashCommand(state, trimmed)
        if (result.handled) {
          if (result.reply) await send(result.reply)
          return
        }
      }

      const userText = [trimmed, attachmentContext].filter(Boolean).join('\n\n')

      try {
        const additional = await buildAdditionalContext(state)
        const response = await routeMessage(
          state.agentId,
          userText || '(attachment)',
          state.history,
          additional,
          undefined,
          undefined,
          attachment
        )
        if (state.thinkMode) state.thinkMode = false

        const actionCard = extractActionCard(response)
        if (actionCard) state.pendingApproval = { card: actionCard, expiresAt: Date.now() + APPROVAL_TTL_MS, kind: detectActionKind(actionCard) }

        state.history.push({ role: 'user', content: userText || '(attachment)' })
        state.history.push({ role: 'assistant', content: response })
        if (state.history.length > 40) {
          state.history = state.history.slice(-40)
        }
        await send(response)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        await send(`Something went wrong: ${message}`)
      }
    }

    type DiscordModule = {
      Client: new(opts: object) => DiscordClient
      GatewayIntentBits: Record<string, number>
      Events: { MessageCreate: string; MessageReactionAdd: string; ClientReady: string }
      Partials: Record<string, number>
    }
    type DiscordMessage = {
      author: { id: string; bot: boolean }
      content: string
      channel: { id: string; send(text: string): Promise<{ id: string }>; messages: { fetch(id: string): Promise<{ react(emoji: string): Promise<unknown> }> } }
      attachments: Map<string, { url: string; contentType: string | null; name: string }>
    }
    type DiscordReaction = {
      emoji: { name: string | null }
      message: { id: string; channel: { send(text: string): Promise<unknown> } }
      partial: boolean
      fetch(): Promise<DiscordReaction>
    }
    type DiscordUser = { id: string; bot: boolean }
    type DiscordClient = {
      login(token: string): Promise<unknown>
      destroy(): void
      on(event: string, handler: (...args: unknown[]) => unknown): void
      channels: { fetch(id: string): Promise<{ send(text: string): Promise<unknown> }> }
    }

    const { Client, GatewayIntentBits, Events, Partials } = discord as unknown as DiscordModule

    const client = new Client({
      intents: [
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.Guilds,
      ],
      partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.User],
    })

    client.on(Events.ClientReady, () => {
      console.log('[Discord] Connected and ready.')
    })

    client.on(Events.MessageCreate, async (...args: unknown[]) => {
      const message = args[0] as DiscordMessage
      if (message.author.bot) return

      const senderId = message.author.id
      const state = await getState(senderId)
      state.dmChannelId = message.channel.id

      let lastSentMessageId: string | undefined
      const send = async (reply: string): Promise<void> => {
        // Discord limit is 2000 chars per message
        const chunks: string[] = []
        for (let i = 0; i < reply.length; i += 1990) chunks.push(reply.slice(i, i + 1990))
        for (const chunk of chunks) {
          const sent = await message.channel.send(chunk)
          lastSentMessageId = sent.id
        }
      }

      // Fetch attachment if present
      let attachment: { type: 'image'; mediaType: string; data: string } | undefined
      let attachmentContext: string | undefined

      if (message.attachments.size > 0) {
        const first = [...message.attachments.values()][0]
        try {
          const resp = await fetch(first.url, { signal: AbortSignal.timeout(30_000) })
          if (resp.ok) {
            const buf = Buffer.from(await resp.arrayBuffer())
            const processed = await processAttachment(buf, first.contentType ?? 'application/octet-stream', first.name)
            if (processed.type === 'image') {
              attachment = { type: 'image', mediaType: processed.mediaType ?? 'image/jpeg', data: processed.content }
            } else {
              attachmentContext = processed.content
            }
          }
        } catch {
          // skip unprocessable attachments
        }
      }

      await handleInbound(senderId, message.content, send, attachment, attachmentContext)

      // After handleInbound, if a new action card was set, add ✅/❌ reactions
      if (state.pendingApproval && lastSentMessageId) {
        state.lastActionCardMessageId = lastSentMessageId
        try {
          const sent = await message.channel.messages.fetch(lastSentMessageId)
          await sent.react('✅')
          await sent.react('❌')
        } catch {
          // reactions are best-effort; text YES/NO fallback always works
        }
      }
    })

    client.on(Events.MessageReactionAdd, async (...args: unknown[]) => {
      let reaction = args[0] as DiscordReaction
      const user = args[1] as DiscordUser
      if (user.bot) return
      if (reaction.partial) {
        try { reaction = await reaction.fetch() } catch { return }
      }

      const state = userStates.get(user.id)
      if (!state?.pendingApproval || !state.dmChannelId) return
      if (reaction.message.id !== state.lastActionCardMessageId) return

      const emoji = reaction.emoji.name
      if (emoji !== '✅' && emoji !== '❌') return

      const channel = await client.channels.fetch(state.dmChannelId)
      const send = async (reply: string): Promise<void> => { await channel.send(reply) }

      // Synthesize the appropriate text response through handleInbound
      const syntheticText = emoji === '✅' ? 'YES' : 'NO'
      await handleInbound(user.id, syntheticText, send)
    })

    await client.login(token())
    console.log('[Discord] Started.')

    // Register stop handler
    ;(discordChannel as { _client?: { destroy(): void } })._client = client
  },

  async stop(): Promise<void> {
    const self = discordChannel as { _client?: { destroy(): void } }
    if (self._client) {
      self._client.destroy()
      self._client = undefined
    }
  },
}

export async function startDiscordChannel(): Promise<void> {
  if (!discordChannel.isEnabled()) return
  await discordChannel.start()
}

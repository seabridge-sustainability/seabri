/**
 * Slack channel.
 *
 * Degrades gracefully:
 *   - no SLACK_BOT_TOKEN or SLACK_APP_TOKEN env → channel disabled, zero warnings
 *   - tokens set but @slack/bolt missing → warn once, skip
 *   - pairing gate via security/pairing + security/policy, identical to
 *     discord.ts and telegram.ts. One compliance-tag allowlist can be set
 *     per-channel in policy.json under channels.slack.allowedComplianceTags.
 *
 * Full SDK wiring: @slack/bolt App with Socket Mode.
 * Reaction-based approval: white_check_mark / x on action card messages.
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

const CHANNEL_ID = 'slack'
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
  lastActionCardChannel?: string
}

function botToken(): string {
  return process.env.SLACK_BOT_TOKEN || ''
}

function appToken(): string {
  return process.env.SLACK_APP_TOKEN || ''
}

export const slackChannel: BaseChannel = {
  id: CHANNEL_ID,
  displayName: 'Slack',
  product: Product.COMPANION,

  isEnabled(): boolean {
    return Boolean(botToken() && appToken())
  },

  async start(): Promise<void> {
    if (!botToken() || !appToken()) {
      console.log(
        '[Slack] SLACK_BOT_TOKEN or SLACK_APP_TOKEN not set — Slack channel not started.'
      )
      return
    }

    const bolt = await tryImport<Record<string, unknown>>('@slack/bolt', CHANNEL_ID)
    if (!bolt) return

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
      // Sprint 3 note: Slack also supports reaction-based approval.
      // After posting an action card, use chat.postMessage with blocks containing
      // emoji reactions. Then listen for reaction_added events:
      //   app.event('reaction_added', async ({ event }) => {
      //     const state = await getState(event.user)
      //     if (!state.pendingApproval) return
      //     if (event.reaction === 'white_check_mark') { /* treat as YES */ }
      //     if (event.reaction === 'x') { /* treat as NO */ }
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
            await send(`⚠️ *Emergency alert confirmation required.*\n\nReply with this code to confirm: \`${confirmCode}\``)
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

    type BoltModule = {
      App: new(opts: object) => BoltApp
    }
    type SlackMessage = {
      user?: string
      text?: string
      channel?: string
      ts?: string
      subtype?: string
      files?: Array<{ url_private?: string; mimetype?: string; name?: string }>
    }
    type SlackReactionEvent = {
      user: string
      reaction: string
      item: { type: string; channel: string; ts: string }
    }
    type BoltApp = {
      message(handler: (args: { message: SlackMessage; say: (text: string) => Promise<{ ts?: string }> }) => Promise<void>): void
      event(eventName: string, handler: (args: { event: SlackReactionEvent; client: SlackWebClient }) => Promise<void>): void
      start(): Promise<void>
      stop(): Promise<void>
    }
    type SlackWebClient = {
      chat: { postMessage(args: { channel: string; text: string }) : Promise<{ ts?: string }> }
    }

    const { App } = bolt as unknown as BoltModule

    const app = new App({
      token: botToken(),
      appToken: appToken(),
      socketMode: true,
    })

    app.message(async ({ message, say }) => {
      // Ignore bot messages and subtypes (e.g. channel_join)
      if ((message as SlackMessage).subtype) return
      const msg = message as SlackMessage
      const senderId = msg.user
      if (!senderId) return

      let lastTs: string | undefined
      const send = async (reply: string): Promise<void> => {
        const result = await say(reply)
        lastTs = result.ts
      }

      // Fetch attachment if present
      let attachment: { type: 'image'; mediaType: string; data: string } | undefined
      let attachmentContext: string | undefined

      const files = msg.files ?? []
      if (files.length > 0) {
        const first = files[0]
        if (first.url_private) {
          try {
            // Slack private files require Bearer auth
            const resp = await fetch(first.url_private, {
              headers: { Authorization: `Bearer ${botToken()}` },
              signal: AbortSignal.timeout(30_000),
            })
            if (resp.ok) {
              const buf = Buffer.from(await resp.arrayBuffer())
              const processed = await processAttachment(buf, first.mimetype ?? 'application/octet-stream', first.name ?? '')
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
      }

      const state = await getState(senderId)
      if (msg.channel) state.lastActionCardChannel = msg.channel

      await handleInbound(senderId, msg.text ?? '', send, attachment, attachmentContext)

      // After handleInbound, if a new action card was set, store the message ts for reaction matching
      if (state.pendingApproval && lastTs) {
        state.lastActionCardMessageId = lastTs
      }
    })

    app.event('reaction_added', async ({ event, client }) => {
      const senderId = event.user
      const state = userStates.get(senderId)
      if (!state?.pendingApproval || !state.lastActionCardChannel) return
      if (event.item.ts !== state.lastActionCardMessageId) return

      const reaction = event.reaction
      if (reaction !== 'white_check_mark' && reaction !== 'x') return

      const channel = state.lastActionCardChannel
      const send = async (reply: string): Promise<void> => {
        await client.chat.postMessage({ channel, text: reply })
      }

      const syntheticText = reaction === 'white_check_mark' ? 'YES' : 'NO'
      await handleInbound(senderId, syntheticText, send)
    })

    await app.start()
    console.log('[Slack] Started (Socket Mode).')

    // Register stop handler
    ;(slackChannel as { _app?: { stop(): Promise<void> } })._app = app
  },

  async stop(): Promise<void> {
    const self = slackChannel as { _app?: { stop(): Promise<void> } }
    if (self._app) {
      await self._app.stop()
      self._app = undefined
    }
  },
}

export async function startSlackChannel(): Promise<void> {
  if (!slackChannel.isEnabled()) return
  await slackChannel.start()
}

/**
 * Slack channel (scaffold).
 *
 * Degrades gracefully:
 *   - no SLACK_BOT_TOKEN or SLACK_APP_TOKEN env → channel disabled, zero warnings
 *   - tokens set but @slack/bolt missing → warn once, skip
 *   - pairing gate via security/pairing + security/policy, identical to
 *     discord.ts and telegram.ts. One compliance-tag allowlist can be set
 *     per-channel in policy.json under channels.slack.allowedComplianceTags.
 *
 * The on('message') handler is intentionally a thin scaffold; full @slack/bolt
 * wiring (App({ token, appToken, socketMode: true })) lives behind the
 * tryImport fallback so the gateway still boots without the SDK present.
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

const CHANNEL_ID = 'slack'

interface UserState extends ChannelState {}

function botToken(): string {
  return process.env.SLACK_BOT_TOKEN || ''
}

function appToken(): string {
  return process.env.SLACK_APP_TOKEN || ''
}

export const slackChannel: BaseChannel = {
  id: CHANNEL_ID,
  displayName: 'Slack',

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
      '[Slack] @slack/bolt detected. Full wiring pending — inbound handler available but App hookup is a scaffold.'
    )
    // Intentional scaffold: @slack/bolt requires
    //   new App({ token: botToken(), appToken: appToken(), socketMode: true })
    //   app.message(async ({ message, say }) => handleInbound(message.user, message.text,
    //     async (reply) => { await say(reply) }))
    //   await app.start()
    // Channel-type gating (DM vs. public channel) is enforced in policy.json.
    void handleInbound
    void bolt
    return
  },
}

export async function startSlackChannel(): Promise<void> {
  if (!slackChannel.isEnabled()) return
  await slackChannel.start()
}

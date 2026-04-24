/**
 * WhatsApp channel (scaffold).
 *
 * Degrades gracefully:
 *   - no WHATSAPP_PROVIDER env  → channel disabled, zero warnings
 *   - provider set but SDK missing → warn once, skip
 *   - pairing gate via security/pairing + security/policy, identical to telegram.ts
 *
 * Supports two provider modes behind a single env flag:
 *   WHATSAPP_PROVIDER=baileys     → @whiskeysockets/baileys (self-hosted, free)
 *   WHATSAPP_PROVIDER=cloud       → Meta WhatsApp Cloud API (official, paid)
 *
 * Implementation is intentionally a thin scaffold — the on('message') handler
 * mirrors telegram.ts exactly once an SDK is wired in.
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

const CHANNEL_ID = 'whatsapp'

interface UserState extends ChannelState {}

function provider(): string {
  return (process.env.WHATSAPP_PROVIDER || '').toLowerCase()
}

export const whatsappChannel: BaseChannel = {
  id: CHANNEL_ID,
  displayName: 'WhatsApp',

  isEnabled(): boolean {
    return Boolean(provider())
  },

  async start(): Promise<void> {
    const mode = provider()
    if (!mode) {
      console.log('[WhatsApp] WHATSAPP_PROVIDER not set — WhatsApp channel not started.')
      return
    }

    if (mode !== 'baileys' && mode !== 'cloud') {
      console.warn(
        `[WhatsApp] Unknown WHATSAPP_PROVIDER='${mode}'. Expected 'baileys' or 'cloud'.`
      )
      return
    }

    // Shared inbound handler — identical contract to telegram.ts.
    // Both providers funnel into this same function.
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

    if (mode === 'baileys') {
      const baileys = await tryImport<Record<string, unknown>>(
        '@whiskeysockets/baileys',
        CHANNEL_ID
      )
      if (!baileys) return
      console.warn(
        '[WhatsApp] baileys provider detected. Full wiring pending — inbound handler available but SDK hookup is a scaffold.'
      )
      // Intentional scaffold: baileys requires pairing QR + persistent store.
      // Implementers should call handleInbound(sender, text, send) per message.
      void handleInbound
      return
    }

    if (mode === 'cloud') {
      const token = process.env.WHATSAPP_CLOUD_TOKEN
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
      if (!token || !phoneNumberId) {
        console.warn(
          '[WhatsApp] cloud provider needs WHATSAPP_CLOUD_TOKEN and WHATSAPP_PHONE_NUMBER_ID.'
        )
        return
      }
      console.warn(
        '[WhatsApp] cloud provider detected. Webhook receiver must be mounted by the host app.'
      )
      // Intentional scaffold: Meta Cloud API uses webhooks, not polling.
      // Expose handleInbound for the host HTTP server to call per webhook.
      void handleInbound
      return
    }
  },
}

export async function startWhatsappChannel(): Promise<void> {
  if (!whatsappChannel.isEnabled()) return
  await whatsappChannel.start()
}

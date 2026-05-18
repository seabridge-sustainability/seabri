import path from 'path'
import type { BaseChannel } from './base.js'
import { Product } from '../product.js'
import { TELEGRAM_TOKEN, AGENTS, APPROVAL_TTL_MS } from '../config.js'
import { initiateOutboundCall, initiateOutboundSms } from '../seabri/outbound.js'
import { geocodeCoordinates } from '../seabri/geocoder.js'
import { getExecutor } from '../seabri/action-executor.js'
import { requiresDoubleConfirmation, generateConfirmCode, isConfirmCode } from '../seabri/approval.js'
import { routeMessage } from '../agents/router.js'
import {
  isApproved,
  createPairingCode,
  verifyPairingCode,
  approveSender,
} from '../security/pairing.js'
import { getPreferredAgent, isAllowed, requiresPairing } from '../security/policy.js'
import { buildAdditionalContext, handleSlashCommand, type ChannelState } from './shared_commands.js'
import { processAttachment } from '../seabri/attachments.js'
import { extractActionCard, isApproval, isDenial, isCallApproval, isSmsApproval, logConsent, detectActionKind } from '../seabri/approval.js'
import { putBlob } from '../attachments/store.js'
import { getProfile, upsertProfile, parseOnboardingReply, ONBOARDING_PROMPT, isProfileComplete } from '../seabri/user-profile.js'

// Extracts the first E.164-ish phone number from an action card string.
function extractPhoneNumber(card: string): string | null {
  const match = card.match(/(\+?1?[\s\-.]?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4})/)
  if (!match) return null
  return match[1].replace(/[\s\-.()/]/g, '')
}

interface ConversationMediaContext {
  lastImageBase64: string
  lastImageMediaType: string
  capturedAt: number
}

interface UserState extends ChannelState {
  mediaContext?: ConversationMediaContext
}

const USER_STATE_MAX = 10_000

function makeLruMap<K, V>(maxSize: number): Map<K, V> {
  const map = new Map<K, V>()
  const _set = map.set.bind(map)
  map.set = (k: K, v: V) => {
    if (map.has(k)) map.delete(k)
    else if (map.size >= maxSize) map.delete(map.keys().next().value as K)
    return _set(k, v)
  }
  return map
}

type TelegramBot = {
  on(event: string, handler: (msg: TelegramMessage) => void): void
  sendMessage(chatId: number | string, text: string, options?: Record<string, unknown>): Promise<unknown>
  getFile(fileId: string): Promise<{ file_path?: string }>
  startPolling(): void
}

interface TelegramPhotoSize {
  file_id: string
  file_size?: number
  width: number
  height: number
}

interface TelegramDocument {
  file_id: string
  file_name?: string
  mime_type?: string
  file_size?: number
}

interface TelegramVoice {
  file_id: string
  mime_type?: string
  duration: number
  file_size?: number
}

interface TelegramAudio {
  file_id: string
  mime_type?: string
  duration: number
  file_size?: number
}

interface TelegramVideo {
  file_id: string
  mime_type?: string
  duration: number
  file_size?: number
}

interface TelegramVideoNote {
  file_id: string
  duration: number
  file_size?: number
}

interface TelegramLocation {
  latitude: number
  longitude: number
  horizontal_accuracy?: number
}

interface TelegramMessage {
  chat: { id: number }
  from?: { id: number }
  text?: string
  caption?: string
  photo?: TelegramPhotoSize[]
  document?: TelegramDocument
  voice?: TelegramVoice
  audio?: TelegramAudio
  video?: TelegramVideo
  video_note?: TelegramVideoNote
  location?: TelegramLocation
}

function buildAgentListText(): string {
  const lines = ['*Available agents:*', '']
  for (const agent of AGENTS) {
    lines.push(`${agent.icon} \`/switch ${agent.id}\` — ${agent.name}`)
  }
  lines.push('')
  lines.push('Type your question to start, or use a command to switch agent.')
  return lines.join('\n')
}

function buildWelcomeText(): string {
  return [
    '👋 *Welcome to OpenSeaBri*',
    '',
    'Your personal sustainability intelligence assistant.',
    '',
    buildAgentListText(),
    '',
    'Commands:',
    '`/status` — show connection status',
    '`/switch <agent-id>` — change specialist',
    '`/agents` — list agents',
    '`/new` — start a fresh conversation',
    '',
    'You can send photos and I\'ll analyze them. Documents and PDFs are supported where text extraction is available.',
  ].join('\n')
}

export async function startTelegramChannel(): Promise<void> {
  if (!TELEGRAM_TOKEN) {
    console.log('[Telegram] TELEGRAM_TOKEN not set — Telegram channel not started.')
    return
  }

  let BotConstructor: new (token: string, options: Record<string, unknown>) => TelegramBot

  try {
    const module = await import('node-telegram-bot-api')
    BotConstructor = module.default as typeof BotConstructor
  } catch {
    console.warn(
      '[Telegram] node-telegram-bot-api not installed. Run: npm install node-telegram-bot-api\n' +
        '[Telegram] Telegram channel not started.'
    )
    return
  }

  let bot: TelegramBot
  try {
    bot = new BotConstructor(TELEGRAM_TOKEN, { polling: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn(`[Telegram] Failed to start bot: ${message}`)
    return
  }

  const userStates = makeLruMap<number, UserState>(USER_STATE_MAX)

  async function getState(userId: number): Promise<UserState> {
    if (!userStates.has(userId)) {
      const agentId = await getPreferredAgent(String(userId))
      const profile = await getProfile(String(userId), 'telegram').catch(() => null)
      userStates.set(userId, {
        agentId,
        history: [],
        personalityId: null,
        thinkMode: false,
        mediaContext: undefined,
        userProfile: profile,
        onboardingShown: profile !== null,
      })
    }
    return userStates.get(userId)!
  }

  async function safeSend(chatId: number, text: string, options?: Record<string, unknown>): Promise<void> {
    try {
      await bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...options })
    } catch {
      try {
        await bot.sendMessage(chatId, text)
      } catch {
        // Non-fatal
      }
    }
  }

  /** Download a Telegram file by fileId and return its Buffer. */
  async function downloadTelegramFile(fileId: string): Promise<Buffer> {
    const fileInfo = await bot.getFile(fileId)
    if (!fileInfo.file_path) throw new Error('Telegram did not return a file_path')
    const url = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${fileInfo.file_path}`
    const resp = await fetch(url, { signal: AbortSignal.timeout(30_000) })
    if (!resp.ok) throw new Error(`File download failed: HTTP ${resp.status}`)
    const arrayBuffer = await resp.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  bot.on('message', async (msg: TelegramMessage) => {
    const chatId = msg.chat.id
    const senderId = String(chatId)
    const text = (msg.text || msg.caption || '').trim()

    // Policy allow/deny check
    if (!(await isAllowed(senderId, 'telegram'))) {
      await safeSend(chatId, '⛔ Access denied by policy.')
      return
    }

    // Pairing gate
    const pairingNeeded = await requiresPairing('telegram')
    const approved = await isApproved(senderId)

    if (pairingNeeded && !approved) {
      if (text.startsWith('/pair ')) {
        const code = text.replace('/pair ', '').trim()
        const valid = await verifyPairingCode(senderId, code)
        if (valid) {
          await approveSender(senderId)
          await safeSend(chatId, '✅ *Paired successfully!* Welcome to OpenSeaBri.\n\n' + buildWelcomeText())
        } else {
          await safeSend(chatId, '❌ Invalid or expired pairing code. Ask for a new one from the CLI: `seabri pairing approve`')
        }
        return
      }

      const code = await createPairingCode(senderId)
      await safeSend(
        chatId,
        `🔐 *OpenSeaBri — Authorization Required*\n\n` +
        `This instance requires pairing before use.\n\n` +
        `Your pairing code: \`${code}\`\n\n` +
        `Approve from the CLI:\n\`seabri pairing approve ${senderId} ${code}\`\n\n` +
        `Or enter the code here: \`/pair ${code}\`\n\n` +
        `_Code expires in 10 minutes._`
      )
      return
    }

    if (text === '/start') {
      await safeSend(chatId, buildWelcomeText())
      return
    }

    const state = await getState(chatId)

    // ── First-session onboarding ──────────────────────────────────────────────
    // Show profile collection prompt the first time a new user sends a non-slash,
    // non-empty text message. Voice/media without text skip the trigger so they
    // don't re-fire the prompt. Emergency messages route first; onboarding deferred.
    if (!state.onboardingShown && text && !text.startsWith('/')) {
      state.onboardingShown = true
      const emergencyKeywords = ['emergency', 'evacuate', 'flood', 'fire', 'water is rising', 'happening now', 'collapse', 'disaster']
      const isEmergency = emergencyKeywords.some(k => text.toLowerCase().includes(k))
      if (!isEmergency) {
        state.awaitingOnboardingReply = true
        await safeSend(chatId, ONBOARDING_PROMPT)
        return
      }
      // Emergency: route the message normally, show onboarding after
    }

    // ── Parse and persist onboarding reply ───────────────────────────────────
    if (state.awaitingOnboardingReply && text && !text.startsWith('/')) {
      state.awaitingOnboardingReply = false
      const parsed = parseOnboardingReply(text)
      if (parsed && Object.keys(parsed).length > 0) {
        try {
          const saved = await upsertProfile(String(chatId), 'telegram', parsed)
          state.userProfile = saved
        } catch {
          // Non-fatal — profile still lives in LLM context this session
        }
      }
      // Fall through so the LLM confirms the captured info
    }

    // --- Approval intercept ---
    if (state.pendingApproval) {
      if (Date.now() > state.pendingApproval.expiresAt) {
        state.pendingApproval = undefined
        await safeSend(chatId, '⏱ The pending action expired. Please ask again if you still want to proceed.')
      } else if (state.pendingApproval.awaitingConfirmCode) {
        // Second step of double-confirm (notify_emergency)
        if (isConfirmCode(text) && text.trim() === (state.pendingApproval as { confirmCode?: string }).confirmCode) {
          const { card, kind } = state.pendingApproval
          state.pendingApproval = undefined
          await logConsent(senderId, card, true)
          const result = await getExecutor(kind).execute(card, senderId)
          await safeSend(chatId, result.ok ? `🚨 Emergency notification sent.` : `⚠️ ${result.error}`)
          state.history.push({ role: 'user', content: 'Confirmed with code.' })
          state.history.push({ role: 'assistant', content: '🚨 Emergency notification processed.' })
        } else {
          state.pendingApproval = undefined
          await safeSend(chatId, '🚫 Confirmation code did not match. Emergency action cancelled.')
          state.history.push({ role: 'user', content: 'Invalid code.' })
          state.history.push({ role: 'assistant', content: '🚫 Emergency action cancelled.' })
        }
        return
      } else if (
        (state.pendingApproval.kind === 'outbound_call' && isCallApproval(text)) ||
        ((state.pendingApproval.kind === 'send_sms' || state.pendingApproval.kind === 'send_whatsapp') && isSmsApproval(text)) ||
        isApproval(text)
      ) {
        const { card, kind } = state.pendingApproval
        if (requiresDoubleConfirmation(kind)) {
          // First YES: issue confirmation code for second step
          const confirmCode = generateConfirmCode()
          state.pendingApproval = { ...state.pendingApproval, awaitingConfirmCode: true, confirmCode } as typeof state.pendingApproval & { confirmCode: string }
          await safeSend(
            chatId,
            `⚠️ *Emergency alert confirmation required.*\n\nTo proceed, reply with this confirmation code:\n\`${confirmCode}\`\n\nThis code expires when the action times out.`
          )
          return
        }
        state.pendingApproval = undefined
        await logConsent(senderId, card, true)
        const result = await getExecutor(kind).execute(card, senderId)
        if (result.ok) {
          await safeSend(chatId, `✅ ${result.message ?? 'Action completed.'}`)
        } else {
          await safeSend(chatId, `⚠️ ${result.error ?? 'Action could not be completed.'}`)
        }
        state.history.push({ role: 'user', content: 'YES — I approve the action.' })
        state.history.push({ role: 'assistant', content: '✅ Action confirmed and logged.' })
        return
      } else if (isDenial(text)) {
        const { card } = state.pendingApproval
        state.pendingApproval = undefined
        await logConsent(senderId, card, false)
        await safeSend(chatId, '🚫 Action cancelled. What else can I help you with?')
        state.history.push({ role: 'user', content: 'NO — cancel the action.' })
        state.history.push({ role: 'assistant', content: '🚫 Action cancelled.' })
        return
      } else {
        // Non-YES/NO message while approval pending — clear the card and continue normally
        state.pendingApproval = undefined
      }
    }

    // Slash commands
    if (text.startsWith('/')) {
      const result = await handleSlashCommand(state, text)
      if (result.handled) {
        if (result.reply) await safeSend(chatId, result.reply)
        return
      }
    }

    // --- Location pin handling ---
    let attachment: { type: 'image'; mediaType: string; data: string } | undefined
    let attachmentContext = ''

    if (msg.location) {
      const { latitude, longitude } = msg.location
      try {
        const geocoded = await geocodeCoordinates(latitude, longitude)
        attachmentContext = `[LOCATION: ${geocoded.formattedAddress} | ${latitude},${longitude}]`
      } catch {
        attachmentContext = `[LOCATION: ${latitude},${longitude}]`
      }
      if (state.agentId === 'general') {
        state.agentId = 'property-climate-risk'
      }
    }

    // --- Attachment handling ---
    try {
      if (msg.photo || msg.document || msg.voice || msg.audio || msg.video || msg.video_note) {
        let fileId: string
        let mimeType: string
        let fileName: string

        if (msg.photo) {
          // Use the largest available photo size
          const largest = msg.photo.reduce((a, b) => (b.file_size ?? 0) > (a.file_size ?? 0) ? b : a)
          fileId = largest.file_id
          mimeType = 'image/jpeg'
          fileName = 'photo.jpg'
        } else if (msg.document) {
          fileId = msg.document.file_id
          mimeType = msg.document.mime_type ?? 'application/octet-stream'
          fileName = path.basename(msg.document.file_name ?? 'document')
        } else if (msg.voice) {
          fileId = msg.voice.file_id
          mimeType = msg.voice.mime_type ?? 'audio/ogg'
          fileName = 'voice.ogg'
        } else if (msg.audio) {
          fileId = msg.audio.file_id
          mimeType = msg.audio.mime_type ?? 'audio/mpeg'
          fileName = 'audio.mp3'
        } else if (msg.video) {
          fileId = msg.video.file_id
          mimeType = msg.video.mime_type ?? 'video/mp4'
          fileName = 'video.mp4'
        } else {
          // video_note
          fileId = msg.video_note!.file_id
          mimeType = 'video/mp4'
          fileName = 'video_note.mp4'
        }

        const buffer = await downloadTelegramFile(fileId)
        const result = await processAttachment(buffer, mimeType, fileName)

        putBlob(buffer, { mimeType, filename: fileName, tags: ['telegram'] }).catch(() => undefined)

        if (result.type === 'image') {
          attachment = { type: 'image', mediaType: result.mediaType!, data: result.content }
          // Persist image in conversation media context so follow-up questions can reference it
          state.mediaContext = {
            lastImageBase64: result.content,
            lastImageMediaType: result.mediaType!,
            capturedAt: Date.now(),
          }
        } else {
          attachmentContext = result.content
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.warn(`[Telegram] Attachment processing failed: ${message}`)
      attachmentContext = '[Attachment could not be processed. Please describe what you sent.]'
    }

    // If we have neither text nor attachment content, skip
    if (!text && !attachment && !attachmentContext) return

    // Reconstruct image context for follow-up questions (e.g. "What do you see?")
    // when the current turn has no new image but a prior image was captured recently (24h).
    const MEDIA_CONTEXT_TTL_MS = 24 * 60 * 60 * 1000
    if (!attachment && state.mediaContext && (Date.now() - state.mediaContext.capturedAt) < MEDIA_CONTEXT_TTL_MS) {
      const referencesPriorMedia =
        /\b(image|photo|picture|photo|flood|damage|see|show|sent|that|it)\b/i.test(text)
      if (referencesPriorMedia || !text) {
        attachment = {
          type: 'image',
          mediaType: state.mediaContext.lastImageMediaType,
          data: state.mediaContext.lastImageBase64,
        }
      }
    }

    const userText = [text, attachmentContext].filter(Boolean).join('\n\n')

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

      // Check if this response contains an action card needing approval
      const actionCard = extractActionCard(response)
      if (actionCard) {
        state.pendingApproval = { card: actionCard, expiresAt: Date.now() + APPROVAL_TTL_MS, kind: detectActionKind(actionCard) }
      }

      state.history.push({ role: 'user', content: userText || '(attachment)' })
      state.history.push({ role: 'assistant', content: response })

      if (state.history.length > 40) {
        state.history = state.history.slice(-40)
      }

      await safeSend(chatId, response)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[Telegram] Message routing failed for chat ${chatId}: ${message}`)
      await safeSend(chatId, 'Something went wrong on my end. Please try again in a moment.')
    }
  })

  console.log('[Telegram] Bot started and polling for messages.')
}

// ── BaseChannel implementation ─────────────────────────────────────────────
// Wraps startTelegramChannel() in the registry contract so the channel
// lifecycle is managed uniformly by gateway/channels/registry.ts.

export const telegramChannel: BaseChannel = {
  id: 'telegram',
  displayName: 'Telegram',
  product: Product.COMPANION,

  isEnabled(): boolean {
    return Boolean(TELEGRAM_TOKEN)
  },

  async start(): Promise<void> {
    await startTelegramChannel()
  },
}

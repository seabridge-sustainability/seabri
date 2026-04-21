import { TELEGRAM_TOKEN, AGENTS } from '../config.js'
import { getAgentName } from '../agents/agents.js'
import { routeMessage } from '../agents/router.js'
import {
  isApproved,
  createPairingCode,
  verifyPairingCode,
  approveSender,
} from '../security/pairing.js'

interface UserState {
  agentId: string
  history: Array<{ role: string; content: string }>
}

// Imported lazily to avoid crash when package is missing
type TelegramBot = {
  on(event: string, handler: (msg: TelegramMessage) => void): void
  sendMessage(chatId: number | string, text: string, options?: Record<string, unknown>): Promise<unknown>
  startPolling(): void
}

interface TelegramMessage {
  chat: { id: number }
  text?: string
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
  ].join('\n')
}

export async function startTelegramChannel(): Promise<void> {
  if (!TELEGRAM_TOKEN) {
    console.log('[Telegram] TELEGRAM_TOKEN not set — Telegram channel not started.')
    return
  }

  let BotConstructor: new (token: string, options: Record<string, unknown>) => TelegramBot

  try {
    // Dynamic import to avoid crash if package not installed
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

  // Per-user state
  const userStates = new Map<number, UserState>()

  function getState(userId: number): UserState {
    if (!userStates.has(userId)) {
      userStates.set(userId, { agentId: 'general', history: [] })
    }
    return userStates.get(userId)!
  }

  async function safeSend(
    chatId: number,
    text: string,
    options?: Record<string, unknown>
  ): Promise<void> {
    try {
      await bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...options })
    } catch {
      // If Markdown fails, try plain text
      try {
        await bot.sendMessage(chatId, text)
      } catch {
        // Non-fatal — cannot reach user
      }
    }
  }

  bot.on('message', async (msg: TelegramMessage) => {
    const chatId = msg.chat.id
    const senderId = String(chatId)
    const text = (msg.text || '').trim()

    if (!text) return

    // Pairing gate — unknown senders must pair before access
    const approved = await isApproved(senderId)

    if (!approved) {
      // /pair XXXXXX — check pairing code
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

      // First contact from unknown sender — generate pairing code
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

    // /start
    if (text === '/start') {
      await safeSend(chatId, buildWelcomeText())
      return
    }

    // /agents
    if (text === '/agents') {
      await safeSend(chatId, buildAgentListText())
      return
    }

    // /status
    if (text === '/status') {
      const state = getState(chatId)
      const agentName = getAgentName(state.agentId)
      const agentEntry = AGENTS.find((a) => a.id === state.agentId)
      const icon = agentEntry?.icon ?? '🌍'
      await safeSend(
        chatId,
        `*Status*\n\nCurrent agent: ${icon} ${agentName}\nConversation turns: ${Math.floor(state.history.length / 2)}`
      )
      return
    }

    // /new — reset conversation
    if (text === '/new') {
      const state = getState(chatId)
      state.history = []
      await safeSend(chatId, '🌱 Started a fresh conversation. How can I help?')
      return
    }

    // /switch <agent-id>
    if (text.startsWith('/switch')) {
      const parts = text.split(/\s+/)
      const requestedId = parts[1]?.trim()

      if (!requestedId) {
        await safeSend(chatId, buildAgentListText())
        return
      }

      const found = AGENTS.find((a) => a.id === requestedId)
      if (!found) {
        await safeSend(
          chatId,
          `Unknown agent: \`${requestedId}\`\n\n` + buildAgentListText()
        )
        return
      }

      const state = getState(chatId)
      state.agentId = found.id
      state.history = [] // Fresh context on switch
      await safeSend(chatId, `${found.icon} Switched to *${found.name}*. How can I help?`)
      return
    }

    // Ignore other bot commands
    if (text.startsWith('/')) {
      await safeSend(
        chatId,
        'Unknown command. Available: /start · /agents · /switch <id> · /status · /new'
      )
      return
    }

    // Regular message — route to agent
    const state = getState(chatId)

    try {
      const response = await routeMessage(state.agentId, text, state.history)

      state.history.push({ role: 'user', content: text })
      state.history.push({ role: 'assistant', content: response })

      // Keep history bounded to last 20 exchanges (40 messages)
      if (state.history.length > 40) {
        state.history.splice(0, state.history.length - 40)
      }

      await safeSend(chatId, response)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      await safeSend(chatId, `Something went wrong: ${message}\n\nPlease try again.`)
    }
  })

  console.log('[Telegram] Bot started and polling for messages.')
}

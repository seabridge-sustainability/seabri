import * as readline from 'readline'
import { AGENTS } from '../config.js'
import { getAgentName } from '../agents/agents.js'
import { routeMessage } from '../agents/router.js'
import {
  buildAdditionalContext,
  handleSlashCommand,
  type ChannelState,
} from './shared_commands.js'
import { extractActionCard, isApproval, isDenial, logConsent } from '../seabri/approval.js'

async function checkSeaBridgeConnection(): Promise<boolean> {
  return false
}

function printWelcome(agentId: string, connected: boolean): void {
  const agentName = getAgentName(agentId)
  const agentEntry = AGENTS.find((a) => a.id === agentId)
  const icon = agentEntry?.icon ?? '🌍'
  const connectionStatus = connected
    ? '\x1b[32m💚 SeaBridgeAI connected\x1b[0m'
    : '\x1b[90m⚪ Standalone mode\x1b[0m'

  console.log('\n\x1b[1m\x1b[32m─────────────────────────────────────\x1b[0m')
  console.log(`\x1b[1m ${icon} ${agentName}\x1b[0m`)
  console.log('\x1b[1m\x1b[32m─────────────────────────────────────\x1b[0m')
  console.log(` ${connectionStatus}`)
  console.log(' Commands: /help · /switch <id> · /memory · /compact · /think · /persona · /new · /quit')
  console.log('\x1b[1m\x1b[32m─────────────────────────────────────\x1b[0m\n')
}

export async function startCliChannel(agentId?: string): Promise<void> {
  const state: ChannelState = {
    agentId: agentId || 'general',
    history: [],
    personalityId: null,
    thinkMode: false,
  }

  const connected = await checkSeaBridgeConnection()
  printWelcome(state.agentId, connected)

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
    prompt: '\x1b[36mYou › \x1b[0m',
  })

  rl.prompt()

  rl.on('line', async (line: string) => {
    const input = line.trim()

    if (!input) {
      rl.prompt()
      return
    }

    // --- Approval intercept ---
    if (state.pendingApproval) {
      if (Date.now() > state.pendingApproval.expiresAt) {
        state.pendingApproval = undefined
        console.log('\n⏱ The pending action expired. Please ask again if you still want to proceed.\n')
        rl.prompt()
      } else if (isApproval(input)) {
        const { card } = state.pendingApproval
        state.pendingApproval = undefined
        await logConsent('cli-user', card, true)
        console.log('\n✅ Got it — proceeding with the action.\n')
        state.history.push({ role: 'user', content: 'YES — I approve the action.' })
        state.history.push({ role: 'assistant', content: '✅ Action confirmed and logged.' })
        rl.prompt()
        return
      } else if (isDenial(input)) {
        const { card } = state.pendingApproval
        state.pendingApproval = undefined
        await logConsent('cli-user', card, false)
        console.log('\n🚫 Action cancelled. What else can I help you with?\n')
        state.history.push({ role: 'user', content: 'NO — cancel the action.' })
        state.history.push({ role: 'assistant', content: '🚫 Action cancelled.' })
        rl.prompt()
        return
      } else {
        state.pendingApproval = undefined
      }
    }

    if (input.startsWith('/')) {
      const result = await handleSlashCommand(state, input)
      if (result.handled) {
        if (result.reply) console.log(`\n${result.reply}\n`)
        if (result.exit) {
          rl.close()
          process.exit(0)
        }
        rl.prompt()
        return
      }
    }

    // Pause prompt while waiting for response
    process.stdout.write('\x1b[90m▷ Thinking…\x1b[0m\n')

    try {
      const additional = await buildAdditionalContext(state)
      const response = await routeMessage(state.agentId, input, state.history, additional)

      if (state.thinkMode) state.thinkMode = false

      const actionCard = extractActionCard(response)
      if (actionCard) state.pendingApproval = { card: actionCard, expiresAt: Date.now() + 300000, kind: 'general' }

      // Add to history after successful response
      state.history.push({ role: 'user', content: input })
      state.history.push({ role: 'assistant', content: response })

      // Keep history bounded to last 20 exchanges (40 messages)
      if (state.history.length > 40) {
        state.history.splice(0, state.history.length - 40)
      }

      process.stdout.write(`\x1b[32m▶\x1b[0m ${response}\n\n`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.log(`\x1b[31mError: ${message}\x1b[0m\n`)
    }

    rl.prompt()
  })

  rl.on('close', () => {
    console.log('\n\x1b[32mSession ended.\x1b[0m\n')
    process.exit(0)
  })

  rl.on('SIGINT', () => {
    console.log('\n\x1b[32mGoodbye.\x1b[0m\n')
    process.exit(0)
  })
}

import * as readline from 'readline'
import { AGENTS, SEABRIDGE_API_URL, SEABRIDGE_API_KEY } from '../config.js'
import { getAgentName } from '../agents/agents.js'
import { routeMessage } from '../agents/router.js'
import {
  buildAdditionalContext,
  handleSlashCommand,
  type ChannelState,
} from './shared_commands.js'

async function checkSeaBridgeConnection(): Promise<boolean> {
  if (!SEABRIDGE_API_URL) return false
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    const headers: Record<string, string> = {}
    if (SEABRIDGE_API_KEY) {
      headers['Authorization'] = `Bearer ${SEABRIDGE_API_KEY}`
    }
    const response = await fetch(`${SEABRIDGE_API_URL}/health`, {
      signal: controller.signal,
      headers,
    })
    clearTimeout(timeout)
    return response.ok
  } catch {
    return false
  }
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

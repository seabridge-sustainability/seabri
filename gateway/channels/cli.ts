import * as readline from 'readline'
import { AGENTS, SEABRIDGE_API_URL, SEABRIDGE_API_KEY } from '../config.js'
import { getAgentName } from '../agents/agents.js'
import { routeMessage } from '../agents/router.js'
import { readMemory } from '../memory/memory.js'

interface Message {
  role: string
  content: string
}

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
  console.log(' Commands: /switch <agent-id> · /memory · /agents · /quit')
  console.log('\x1b[1m\x1b[32m─────────────────────────────────────\x1b[0m\n')
}

function printAgentList(): void {
  console.log('\n\x1b[1mAvailable agents:\x1b[0m')
  for (const agent of AGENTS) {
    console.log(`  ${agent.icon}  \x1b[36m${agent.id}\x1b[0m  —  ${agent.name}`)
  }
  console.log()
}

async function printMemory(): Promise<void> {
  try {
    const memory = await readMemory()
    if (!memory || memory.trim() === '') {
      console.log('\n\x1b[90m(No memory yet — have a conversation to build context.)\x1b[0m\n')
    } else {
      console.log('\n\x1b[1mCurrent memory:\x1b[0m\n')
      console.log(memory)
    }
  } catch {
    console.log('\x1b[33mCould not read memory file.\x1b[0m\n')
  }
}

export async function startCliChannel(agentId?: string): Promise<void> {
  let currentAgentId = agentId || 'general'
  const history: Message[] = []

  const connected = await checkSeaBridgeConnection()
  printWelcome(currentAgentId, connected)

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

    // Handle special commands
    if (input.startsWith('/switch ')) {
      const newAgent = input.slice('/switch '.length).trim()
      const found = AGENTS.find((a) => a.id === newAgent)
      if (!found) {
        console.log(`\x1b[33mUnknown agent: ${newAgent}\x1b[0m`)
        printAgentList()
      } else {
        currentAgentId = newAgent
        history.length = 0 // Clear history on switch — new agent, fresh context
        const icon = found.icon
        console.log(`\n\x1b[32mSwitched to ${icon} ${found.name}\x1b[0m\n`)
      }
      rl.prompt()
      return
    }

    if (input === '/memory') {
      await printMemory()
      rl.prompt()
      return
    }

    if (input === '/agents') {
      printAgentList()
      rl.prompt()
      return
    }

    if (input === '/quit' || input === '/exit') {
      console.log('\n\x1b[32mGoodbye.\x1b[0m\n')
      rl.close()
      process.exit(0)
    }

    if (input.startsWith('/')) {
      console.log(`\x1b[33mUnknown command: ${input}\x1b[0m`)
      console.log('Commands: /switch <agent-id> · /memory · /agents · /quit\n')
      rl.prompt()
      return
    }

    // Pause prompt while waiting for response
    process.stdout.write('\x1b[90m▷ Thinking…\x1b[0m\n')

    try {
      const response = await routeMessage(currentAgentId, input, history)

      // Add to history after successful response
      history.push({ role: 'user', content: input })
      history.push({ role: 'assistant', content: response })

      // Keep history bounded to last 20 exchanges (40 messages)
      if (history.length > 40) {
        history.splice(0, history.length - 40)
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

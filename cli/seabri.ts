#!/usr/bin/env node
import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { homedir } from 'os'
import { mkdir, writeFile, readFile, access } from 'fs/promises'

import { config as dotenvConfig } from 'dotenv'

dotenvConfig({ path: resolve(process.cwd(), '.env') })

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''
const SEABRIDGE_API_URL = process.env.SEABRIDGE_API_URL || 'http://localhost:8000'
const SEABRIDGE_API_KEY = process.env.SEABRIDGE_API_KEY || ''
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || ''
const GATEWAY_PORT = parseInt(process.env.GATEWAY_PORT || '18790', 10)
const WORKSPACE_DIR =
  process.env.OPENSEABRI_WORKSPACE || resolve(homedir(), '.openseabri', 'workspace')

// Paths derived from this file's location: cli/ → openseabri/
const OPENSEABRI_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const RESEARCH_DIR = resolve(OPENSEABRI_ROOT, 'research')

const AGENTS = [
  { id: 'climate-risk', name: 'Climate Risk', icon: '🌊' },
  { id: 'nature-biodiversity', name: 'Nature & Biodiversity', icon: '🌿' },
  { id: 'sustainability-reporting', name: 'Sustainability Reporting', icon: '📋' },
  { id: 'investment-screening', name: 'Investment Risk Screening', icon: '🔍' },
  { id: 'home-community', name: 'Home & Community', icon: '🏠' },
  { id: 'net-zero', name: 'Net Zero & Decarbonization', icon: '🎯' },
  { id: 'natural-capital', name: 'Natural Capital & Land', icon: '🌾' },
  { id: 'general', name: 'General Sustainability', icon: '🌍' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function safeReadFile(path: string): Promise<string> {
  try {
    return await readFile(path, 'utf-8')
  } catch {
    return ''
  }
}

async function checkAnthropicConnection(): Promise<boolean> {
  if (!ANTHROPIC_API_KEY) return false
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const response = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      signal: controller.signal,
    })
    clearTimeout(timeout)
    return response.ok
  } catch {
    return false
  }
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

async function checkGatewayRunning(): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 1000)
    await fetch(`http://localhost:${GATEWAY_PORT}`, { signal: controller.signal })
    clearTimeout(timeout)
    return true
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('ECONNREFUSED')) return false
    return true
  }
}

// ─── Commands ─────────────────────────────────────────────────────────────────

async function cmdChat(options: { agent?: string; session?: string }): Promise<void> {
  const agentId = options.agent || 'general'
  const found = AGENTS.find((a) => a.id === agentId)
  if (!found) {
    console.error(chalk.red(`Unknown agent: ${agentId}`))
    console.log('Run ' + chalk.cyan('seabri agents') + ' to see available agents.')
    process.exit(1)
  }

  try {
    const { startCliChannel } = await import('../gateway/channels/cli.js')
    await startCliChannel(agentId)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(chalk.red(`Could not start chat: ${message}`))
    console.log('Run ' + chalk.cyan('seabri doctor') + ' for a health check.')
    process.exit(1)
  }
}

async function cmdOnboard(options: { installDaemon?: boolean }): Promise<void> {
  let inquirer: typeof import('inquirer')
  try {
    inquirer = await import('inquirer')
  } catch {
    console.error(chalk.red('inquirer package not found. Run: npm install inquirer'))
    process.exit(1)
  }

  console.log(chalk.bold.green('\n🌱 OpenSeaBri Setup\n'))
  console.log('This will configure your personal sustainability intelligence assistant.\n')

  // Step 1: Anthropic API key
  let apiKey = ANTHROPIC_API_KEY
  if (!apiKey) {
    console.log(chalk.yellow('ANTHROPIC_API_KEY is not set.\n'))
    const { keyAnswer } = await inquirer.default.prompt([
      {
        type: 'password',
        name: 'keyAnswer',
        message: 'Enter your Anthropic API key (get one at https://console.anthropic.com):',
        mask: '*',
      },
    ])
    apiKey = keyAnswer.trim()

    if (apiKey) {
      const { saveKey } = await inquirer.default.prompt([
        {
          type: 'confirm',
          name: 'saveKey',
          message: 'Save to .env file in current directory?',
          default: true,
        },
      ])
      if (saveKey) {
        try {
          const envPath = resolve(process.cwd(), '.env')
          const existing = await safeReadFile(envPath)
          const updated = existing
            ? existing.trimEnd() + `\nANTHROPIC_API_KEY=${apiKey}\n`
            : `ANTHROPIC_API_KEY=${apiKey}\n`
          await writeFile(envPath, updated, 'utf-8')
          console.log(chalk.green('API key saved to .env\n'))
        } catch {
          console.log(chalk.yellow('Could not write .env — set ANTHROPIC_API_KEY manually.\n'))
        }
      }
    }
  } else {
    console.log(chalk.green('✅ Anthropic API key found.\n'))
  }

  // Step 2: Role
  const { role } = await inquirer.default.prompt([
    {
      type: 'list',
      name: 'role',
      message: 'What best describes you?',
      choices: [
        'Homeowner / renter',
        'Farmer / land manager',
        'Small business owner',
        'Investor / asset manager',
        'Large company (sustainability team)',
        'Community organization',
        'Student / researcher',
        'Sustainability consultant',
        'Other',
      ],
    },
  ])

  // Step 3: Main question
  const { mainQuestion } = await inquirer.default.prompt([
    {
      type: 'input',
      name: 'mainQuestion',
      message: "What's your biggest sustainability question right now?",
    },
  ])

  // Step 4: Telegram
  const { wantsTelegram } = await inquirer.default.prompt([
    {
      type: 'confirm',
      name: 'wantsTelegram',
      message: 'Do you want to connect a Telegram bot for mobile access?',
      default: false,
    },
  ])

  if (wantsTelegram) {
    console.log(chalk.cyan('\nTo connect Telegram:'))
    console.log('  1. Message @BotFather on Telegram')
    console.log('  2. Create a new bot with /newbot')
    console.log('  3. Add TELEGRAM_TOKEN=<your-token> to your .env file')
    console.log('  4. Run: seabri gateway\n')
  }

  // Initialize workspace
  const spinner = ora('Initializing workspace...').start()
  try {
    const { initWorkspace, updateUser, appendMemory } = await import('../gateway/memory/memory.js')
    await initWorkspace()

    await updateUser('Your Role', role)
    if (mainQuestion.trim()) {
      await updateUser('What You Are Working On', mainQuestion.trim())
    }
    if (mainQuestion.trim()) {
      await appendMemory(`User's initial question: ${mainQuestion.trim()}`)
    }

    spinner.succeed('Workspace ready.')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    spinner.warn(`Workspace setup issue: ${message}`)
  }

  // Step 5: Daemon installation (if flag passed or user confirms)
  let installDaemon = options.installDaemon ?? false
  if (!installDaemon) {
    const { wantsDaemon } = await inquirer.default.prompt([
      {
        type: 'confirm',
        name: 'wantsDaemon',
        message: 'Install as a background service so the gateway starts automatically?',
        default: false,
      },
    ])
    installDaemon = wantsDaemon
  }

  if (installDaemon) {
    await cmdDaemonInstall()
  }

  console.log(chalk.bold.green('\n✅ Setup complete!\n'))
  console.log(chalk.bold('Next steps:'))
  console.log(`  ${chalk.cyan('seabri')}               — start a conversation`)
  console.log(`  ${chalk.cyan('seabri status')}        — check connection status`)
  console.log(`  ${chalk.cyan('seabri agents')}        — see all available agents`)
  console.log(`  ${chalk.cyan('seabri gateway')}       — start the WebSocket + Telegram gateway`)
  console.log(`  ${chalk.cyan('seabri research --overnight')}  — run overnight research`)
  console.log()
}

async function cmdGateway(options: { port?: string; verbose?: boolean }): Promise<void> {
  if (options.port) {
    process.env.GATEWAY_PORT = options.port
  }

  try {
    await import('../gateway/index.js')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(chalk.red(`Failed to start gateway: ${message}`))
    process.exit(1)
  }
}

async function cmdStatus(): Promise<void> {
  const spinner = ora('Checking status...').start()

  const [anthropicOk, seaBridgeOk, gatewayRunning] = await Promise.all([
    checkAnthropicConnection(),
    checkSeaBridgeConnection(),
    checkGatewayRunning(),
  ])

  // Count sessions
  let sessionCount = 0
  try {
    const { listSessions } = await import('../gateway/sessions/store.js')
    const sessions = await listSessions()
    sessionCount = sessions.length
  } catch { /* optional */ }

  spinner.stop()

  const yes = chalk.green('✅ Connected')
  const no = (msg: string) => chalk.gray(`⚪ ${msg}`)
  const apiStatus = anthropicOk ? yes : ANTHROPIC_API_KEY ? chalk.yellow('⚠️  Key set but unreachable') : no('Not configured')
  const seaStatus = seaBridgeOk ? chalk.green(`✅ Connected at ${SEABRIDGE_API_URL}`) : no('Not connected')
  const gatewayStatus = gatewayRunning ? chalk.green(`✅ Running on port ${GATEWAY_PORT}`) : no('Not running')
  const telegramStatus = TELEGRAM_TOKEN ? chalk.green('✅ Token configured') : no('Not configured')
  const sessionsStatus = sessionCount > 0 ? chalk.green(`✅ ${sessionCount} session(s)`) : chalk.gray('⚪ No sessions')

  console.log(chalk.bold('\nOpenSeaBri Status'))
  console.log(chalk.gray('━'.repeat(45)))
  console.log(`Anthropic API:    ${apiStatus}`)
  console.log(`SeaBridgeAI:      ${seaStatus}`)
  console.log(`Gateway:          ${gatewayStatus}`)
  console.log(`Telegram:         ${telegramStatus}`)
  console.log(`Sessions:         ${sessionsStatus}`)
  console.log(chalk.gray('━'.repeat(45)))

  if (!ANTHROPIC_API_KEY) {
    console.log(chalk.yellow("\nRun 'seabri onboard' to get started."))
  }
  console.log()
}

async function cmdDoctor(): Promise<void> {
  console.log(chalk.bold('\nOpenSeaBri Health Check\n'))

  // 1. ANTHROPIC_API_KEY
  process.stdout.write('Anthropic API key present...   ')
  if (ANTHROPIC_API_KEY) {
    console.log(chalk.green('PASS'))
  } else {
    console.log(chalk.red('FAIL  — set ANTHROPIC_API_KEY in .env'))
  }

  // 2. API key valid
  if (ANTHROPIC_API_KEY) {
    process.stdout.write('Anthropic API reachable...     ')
    const spinner = ora({ text: '', isSilent: true }).start()
    const ok = await checkAnthropicConnection()
    spinner.stop()
    if (ok) {
      console.log(chalk.green('PASS'))
    } else {
      console.log(chalk.yellow('WARN  — API key may be invalid or network unreachable'))
    }
  }

  // 3. Workspace writable
  process.stdout.write('Workspace directory writable... ')
  try {
    await mkdir(WORKSPACE_DIR, { recursive: true })
    const testFile = resolve(WORKSPACE_DIR, '.healthcheck')
    await writeFile(testFile, 'ok', 'utf-8')
    console.log(chalk.green('PASS'))
  } catch {
    console.log(chalk.red(`FAIL  — Cannot write to ${WORKSPACE_DIR}`))
  }

  // 4. Memory files exist
  process.stdout.write('Memory files initialized...    ')
  const memoryFile = resolve(WORKSPACE_DIR, 'MEMORY.md')
  const userFile = resolve(WORKSPACE_DIR, 'USER.md')
  const skillsFile = resolve(WORKSPACE_DIR, 'SKILLS.md')
  const allExist = await Promise.all([fileExists(memoryFile), fileExists(userFile), fileExists(skillsFile)])
  if (allExist.every(Boolean)) {
    console.log(chalk.green('PASS'))
  } else {
    console.log(chalk.yellow("WARN  — Run 'seabri onboard' to initialize memory files"))
  }

  // 5. SeaBridgeAI backend (optional)
  if (SEABRIDGE_API_URL) {
    process.stdout.write('SeaBridgeAI backend reachable. ')
    const ok = await checkSeaBridgeConnection()
    if (ok) {
      console.log(chalk.green('PASS'))
    } else {
      console.log(chalk.gray(`WARN  — ${SEABRIDGE_API_URL} not reachable (optional)`))
    }
  }

  // 6. Session search index
  process.stdout.write('Session search backend...      ')
  try {
    const { activeBackend } = await import('../gateway/memory/search.js')
    const backend = await activeBackend()
    if (backend === 'fts5') {
      console.log(chalk.green(`PASS  — FTS5 (better-sqlite3)`))
    } else {
      console.log(chalk.gray('INFO  — JSON fallback (install better-sqlite3 for FTS5)'))
    }
  } catch (err: unknown) {
    console.log(chalk.yellow(`WARN  — ${(err as Error).message}`))
  }

  // 7. Cron jobs configured
  process.stdout.write('Cron jobs...                   ')
  const cronFile = resolve(WORKSPACE_DIR, 'crons.json')
  if (await fileExists(cronFile)) {
    const raw = await safeReadFile(cronFile)
    try {
      const crons = JSON.parse(raw) as unknown[]
      console.log(chalk.green(`PASS  — ${crons.length} job(s) configured`))
    } catch {
      console.log(chalk.gray('INFO  — No cron jobs'))
    }
  } else {
    console.log(chalk.gray('INFO  — No cron jobs configured'))
  }

  // 8. Pairing security (Telegram approval list)
  process.stdout.write('Pairing security...            ')
  const pairingFile = resolve(WORKSPACE_DIR, 'approved-senders.json')
  if (TELEGRAM_TOKEN) {
    if (await fileExists(pairingFile)) {
      console.log(chalk.green('PASS  — Pairing list exists'))
    } else {
      console.log(chalk.yellow('WARN  — Telegram token set but no approved senders yet'))
    }
  } else {
    console.log(chalk.gray('INFO  — Telegram not configured (optional)'))
  }

  // 9. Research program
  process.stdout.write('Research program...            ')
  const programFile = resolve(RESEARCH_DIR, 'program.md')
  if (await fileExists(programFile)) {
    console.log(chalk.green('PASS'))
  } else {
    console.log(chalk.gray(`INFO  — No program.md yet (create at ${programFile})`))
  }

  // 10. DM policy schema
  process.stdout.write('DM policy schema...            ')
  try {
    const { loadPolicy } = await import('../gateway/security/policy.js')
    const policy = await loadPolicy(true)
    const issues: string[] = []
    if (typeof policy.defaultAgent !== 'string' || !policy.defaultAgent) {
      issues.push('defaultAgent missing')
    }
    if (!AGENTS.find((a) => a.id === policy.defaultAgent)) {
      issues.push(`defaultAgent '${policy.defaultAgent}' not in agent list`)
    }
    if (typeof policy.perSender !== 'object' || policy.perSender === null) {
      issues.push('perSender must be an object')
    }
    if (typeof policy.channels !== 'object' || policy.channels === null) {
      issues.push('channels must be an object')
    }
    for (const [channel, cfg] of Object.entries(policy.channels || {})) {
      if (cfg.requirePairing !== undefined && typeof cfg.requirePairing !== 'boolean') {
        issues.push(`channels.${channel}.requirePairing must be boolean`)
      }
      if (cfg.allowedAgents !== undefined) {
        if (!Array.isArray(cfg.allowedAgents)) {
          issues.push(`channels.${channel}.allowedAgents must be array`)
        } else {
          for (const id of cfg.allowedAgents) {
            if (!AGENTS.find((a) => a.id === id)) {
              issues.push(`channels.${channel}.allowedAgents: unknown agent '${id}'`)
            }
          }
        }
      }
    }
    if (issues.length === 0) {
      console.log(chalk.green('PASS'))
    } else {
      console.log(chalk.yellow(`WARN  — ${issues[0]}${issues.length > 1 ? ` (+${issues.length - 1} more)` : ''}`))
    }
  } catch (err: unknown) {
    console.log(chalk.yellow(`WARN  — ${(err as Error).message}`))
  }

  // 11. Per-sender agent references
  process.stdout.write('Per-sender agent refs...       ')
  try {
    const { loadPolicy } = await import('../gateway/security/policy.js')
    const policy = await loadPolicy()
    const unknown: string[] = []
    for (const [sender, cfg] of Object.entries(policy.perSender || {})) {
      if (cfg.agent && !AGENTS.find((a) => a.id === cfg.agent)) {
        unknown.push(`${sender}→${cfg.agent}`)
      }
    }
    if (unknown.length === 0) {
      console.log(chalk.green('PASS'))
    } else {
      console.log(chalk.yellow(`WARN  — unknown agent: ${unknown.slice(0, 3).join(', ')}`))
    }
  } catch {
    console.log(chalk.gray('INFO  — no per-sender overrides'))
  }

  // 12. SEABRIDGE_API_URL well-formed
  process.stdout.write('Config URLs well-formed...     ')
  const urlIssues: string[] = []
  if (SEABRIDGE_API_URL) {
    try {
      const u = new URL(SEABRIDGE_API_URL)
      if (!['http:', 'https:'].includes(u.protocol)) {
        urlIssues.push(`SEABRIDGE_API_URL protocol '${u.protocol}' invalid`)
      }
    } catch {
      urlIssues.push(`SEABRIDGE_API_URL '${SEABRIDGE_API_URL}' is not a valid URL`)
    }
  }
  if (urlIssues.length === 0) {
    console.log(chalk.green('PASS'))
  } else {
    console.log(chalk.yellow(`WARN  — ${urlIssues[0]}`))
  }

  // 13. Optional dependencies summary
  process.stdout.write('Optional deps...               ')
  const optionals: Array<{ name: string; pkg: string }> = [
    { name: 'FTS5 search', pkg: 'better-sqlite3' },
    { name: 'Telegram', pkg: 'node-telegram-bot-api' },
    { name: 'Windows daemon', pkg: 'node-windows' },
  ]
  const present: string[] = []
  const missing: string[] = []
  for (const opt of optionals) {
    try {
      const pkgSpec = opt.pkg
      await import(pkgSpec)
      present.push(opt.name)
    } catch {
      missing.push(opt.name)
    }
  }
  if (missing.length === 0) {
    console.log(chalk.green(`PASS  — all ${present.length} optional deps available`))
  } else {
    console.log(chalk.gray(`INFO  — ${present.length} present, missing: ${missing.join(', ')}`))
  }

  console.log()
}

async function cmdMemory(): Promise<void> {
  try {
    const { readMemory } = await import('../gateway/memory/memory.js')
    const memory = await readMemory()
    if (!memory || memory.trim() === '') {
      console.log(chalk.gray('\n(No memory yet — start a conversation to build context.)\n'))
    } else {
      console.log('\n' + memory)
    }
  } catch {
    const memFile = resolve(WORKSPACE_DIR, 'MEMORY.md')
    const content = await safeReadFile(memFile)
    if (content) {
      console.log('\n' + content)
    } else {
      console.log(chalk.gray('\n(No memory yet. Run seabri onboard to initialize.)\n'))
    }
  }
}

function cmdAgents(): void {
  console.log(chalk.bold('\nAvailable Agents\n'))
  for (const agent of AGENTS) {
    console.log(`  ${agent.icon}  ${chalk.cyan(agent.id.padEnd(24))}${agent.name}`)
  }
  console.log()
  console.log('Use: ' + chalk.cyan('seabri chat --agent <id>') + ' to start with a specific agent.')
  console.log('Or type ' + chalk.cyan('/switch <id>') + ' during a chat session.\n')
}

// ─── Search ───────────────────────────────────────────────────────────────────

async function cmdSearch(query: string, opts: { rebuild?: boolean } = {}): Promise<void> {
  if (opts.rebuild) {
    const rebuildSpinner = ora('Rebuilding search index...').start()
    try {
      const { rebuildSearchIndex } = await import('../gateway/memory/search.js')
      const { backend, indexed } = await rebuildSearchIndex()
      rebuildSpinner.succeed(
        `Rebuilt ${chalk.cyan(backend.toUpperCase())} index (${indexed} session${indexed === 1 ? '' : 's'}).`,
      )
    } catch (err: unknown) {
      rebuildSpinner.fail()
      const message = err instanceof Error ? err.message : String(err)
      console.error(chalk.red(`Rebuild failed: ${message}`))
      return
    }
  }

  if (!query.trim()) {
    if (opts.rebuild) return
    console.error(chalk.red('Query cannot be empty.'))
    process.exit(1)
  }

  const spinner = ora(`Searching sessions for "${query}"...`).start()
  try {
    const { searchSessions, activeBackend } = await import('../gateway/memory/search.js')
    const backend = await activeBackend()
    const results = await searchSessions(query)
    spinner.stop()
    console.log(chalk.gray(`(backend: ${backend})`))

    if (results.length === 0) {
      console.log(chalk.gray('\nNo sessions found matching that query.\n'))
      return
    }

    console.log(chalk.bold(`\nFound ${results.length} session(s):\n`))
    for (const r of results) {
      console.log(
        `  ${chalk.cyan(r.sessionName.padEnd(30))} ` +
        `${chalk.gray(r.agentId.padEnd(20))} ` +
        `${chalk.gray(r.date)}  ` +
        `${chalk.yellow(`score: ${r.score.toFixed(2)}`)}`
      )
      if (r.excerpt) {
        console.log(`    ${chalk.gray(r.excerpt.slice(0, 120))}`)
      }
      console.log()
    }
  } catch (err: unknown) {
    spinner.fail()
    const message = err instanceof Error ? err.message : String(err)
    console.error(chalk.red(`Search failed: ${message}`))
  }
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

async function cmdSessionsList(): Promise<void> {
  try {
    const { listSessions } = await import('../gateway/sessions/store.js')
    const sessions = await listSessions()
    if (sessions.length === 0) {
      console.log(chalk.gray('\nNo sessions yet. Start a conversation with: seabri\n'))
      return
    }
    console.log(chalk.bold(`\nSessions (${sessions.length})\n`))
    for (const s of sessions) {
      const date = new Date(s.lastActiveAt).toLocaleDateString()
      const turns = Math.floor((s.history?.length ?? 0) / 2)
      console.log(
        `  ${chalk.cyan(s.id.slice(0, 8))}  ` +
        `${chalk.white(s.name.padEnd(30))} ` +
        `${chalk.gray(s.agentId.padEnd(20))} ` +
        `${chalk.gray(`${turns} turn(s)`.padEnd(12))} ` +
        `${chalk.gray(date)}`
      )
    }
    console.log()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(chalk.red(`Could not list sessions: ${message}`))
  }
}

// ─── Skills ───────────────────────────────────────────────────────────────────

async function cmdSkillsList(): Promise<void> {
  try {
    const { listSkillsFormatted } = await import('../gateway/skills/index.js')
    const output = await listSkillsFormatted()
    console.log('\n' + output + '\n')
  } catch {
    // Fallback to SKILLS.md
    const skillsFile = resolve(WORKSPACE_DIR, 'SKILLS.md')
    const content = await safeReadFile(skillsFile)
    if (content && content.trim()) {
      console.log('\n' + content)
    } else {
      console.log(chalk.gray('\n(No learned skills yet. Skills are created during complex tasks.)\n'))
    }
  }
}

async function cmdSkillsShow(id: string): Promise<void> {
  try {
    const { showSkill } = await import('../gateway/skills/index.js')
    const content = await showSkill(id)
    if (!content) {
      console.log(chalk.yellow(`\nSkill "${id}" not found.\n`))
      console.log('Run ' + chalk.cyan('seabri skills list') + ' to see available skills.')
    } else {
      console.log(chalk.bold(`\n=== ${id} ===\n`))
      console.log(content)
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(chalk.red(`Could not load skill: ${message}`))
  }
}

async function cmdSkillsCreate(name: string): Promise<void> {
  if (!name.trim()) {
    console.error(chalk.red('Skill name cannot be empty.'))
    process.exit(1)
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const skillDir = resolve(OPENSEABRI_ROOT, 'skills', slug)
  const skillFile = resolve(skillDir, 'SKILL.md')

  if (await fileExists(skillFile)) {
    console.log(chalk.yellow(`Skill "${slug}" already exists at ${skillFile}`))
    return
  }

  try {
    await mkdir(skillDir, { recursive: true })
    const template = `# ${name}

## Purpose
<!-- What this skill is for -->

## When to Use
<!-- Situations where this skill applies -->

## Steps
<!-- Step-by-step methodology -->

## Example Output
<!-- What a good result looks like -->

## Quality Indicators
<!-- How to know this skill worked well -->
`
    await writeFile(skillFile, template, 'utf-8')
    console.log(chalk.green(`\n✅ Created skill: ${skillFile}\n`))
    console.log('Edit the file to fill in the methodology, then it will be auto-loaded.')
    console.log(`Run ${chalk.cyan(`seabri skills show ${slug}`)} to verify.\n`)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(chalk.red(`Could not create skill: ${message}`))
  }
}

// ─── Cron ─────────────────────────────────────────────────────────────────────

async function cmdCronAdd(schedule: string): Promise<void> {
  if (!schedule.trim()) {
    console.error(chalk.red('Schedule description cannot be empty.'))
    console.log('Example: ' + chalk.cyan('"send me a water stress report every Monday at 8am"'))
    process.exit(1)
  }

  if (!ANTHROPIC_API_KEY) {
    console.error(chalk.red('ANTHROPIC_API_KEY required to parse natural language schedules.'))
    process.exit(1)
  }

  const spinner = ora('Parsing schedule...').start()
  try {
    const { addCronJob } = await import('../gateway/cron/index.js')
    const job = await addCronJob(schedule)
    spinner.stop()

    if (!job) {
      console.log(chalk.red('\nCould not parse that schedule. Try rephrasing, e.g.:'))
      console.log('  "every day at 8am"')
      console.log('  "every Monday at 9am"')
      console.log('  "every weekday at 7:30am"\n')
      return
    }

    console.log(chalk.green(`\n✅ Cron job added\n`))
    console.log(`  ID:           ${chalk.cyan(job.id)}`)
    console.log(`  Description:  ${job.description}`)
    console.log(`  Schedule:     ${chalk.yellow(job.expression)}`)
    console.log(`  Channel:      ${job.channel}`)
    console.log()
    console.log('The gateway will run this task automatically when it is running.')
    console.log(`Remove with: ${chalk.cyan(`seabri cron remove ${job.id}`)}\n`)
  } catch (err: unknown) {
    spinner.fail()
    const message = err instanceof Error ? err.message : String(err)
    console.error(chalk.red(`Could not add cron job: ${message}`))
  }
}

async function cmdCronList(): Promise<void> {
  try {
    const { listCronJobs } = await import('../gateway/cron/index.js')
    const jobs = await listCronJobs()

    if (jobs.length === 0) {
      console.log(chalk.gray('\nNo scheduled tasks. Add one with:'))
      console.log(chalk.cyan('  seabri cron add "send me a briefing every morning at 8am"\n'))
      return
    }

    console.log(chalk.bold(`\nScheduled Tasks (${jobs.length})\n`))
    for (const job of jobs) {
      const statusColor = job.enabled ? chalk.green : chalk.gray
      const statusIcon = job.enabled ? '▶' : '⏸'
      const lastRun = job.lastRun
        ? `last run ${new Date(job.lastRun).toLocaleString()}`
        : 'never run'
      console.log(`  ${statusColor(statusIcon)} ${chalk.cyan(job.id.padEnd(10))} ${job.expression.padEnd(30)} ${chalk.gray(lastRun)}`)
      console.log(`    ${chalk.gray(job.description.slice(0, 80))}`)
      console.log()
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(chalk.red(`Could not list cron jobs: ${message}`))
  }
}

async function cmdCronRemove(id: string): Promise<void> {
  try {
    const { removeCronJob } = await import('../gateway/cron/index.js')
    const removed = await removeCronJob(id)
    if (removed) {
      console.log(chalk.green(`\n✅ Cron job ${id} removed.\n`))
    } else {
      console.log(chalk.yellow(`\nCron job "${id}" not found.\n`))
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(chalk.red(`Could not remove cron job: ${message}`))
  }
}

async function cmdCronPause(id: string): Promise<void> {
  try {
    const { pauseCronJob } = await import('../gateway/cron/index.js')
    const ok = await pauseCronJob(id)
    if (ok) {
      console.log(chalk.green(`\n✅ Cron job ${id} paused.\n`))
    } else {
      console.log(chalk.yellow(`\nCron job "${id}" not found.\n`))
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(chalk.red(`Could not pause cron job: ${message}`))
  }
}

async function cmdCronResume(id: string): Promise<void> {
  try {
    const { resumeCronJob } = await import('../gateway/cron/index.js')
    const ok = await resumeCronJob(id)
    if (ok) {
      console.log(chalk.green(`\n✅ Cron job ${id} resumed.\n`))
    } else {
      console.log(chalk.yellow(`\nCron job "${id}" not found.\n`))
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(chalk.red(`Could not resume cron job: ${message}`))
  }
}

// ─── Research ─────────────────────────────────────────────────────────────────

async function cmdResearch(options: {
  overnight?: boolean
  report?: boolean
  parallel?: string
  mutate?: boolean
}): Promise<void> {
  if (options.report) {
    await cmdResearchReport()
    return
  }

  if (options.overnight) {
    await cmdResearchOvernight(
      options.parallel ? parseInt(options.parallel, 10) : 1,
      { noMutate: options.mutate === false }
    )
    return
  }

  // Default: show research status and help
  console.log(chalk.bold('\n🔬 Research\n'))
  const programFile = resolve(RESEARCH_DIR, 'program.md')
  const findingsDir = resolve(RESEARCH_DIR, 'findings')
  const programExists = await fileExists(programFile)
  const findingsExist = await fileExists(findingsDir)

  console.log(`Program file:  ${programExists ? chalk.green(programFile) : chalk.gray('not found — create it to define topics')}`)
  console.log(`Findings:      ${findingsExist ? chalk.green(findingsDir) : chalk.gray('empty')}`)
  console.log()
  console.log('Commands:')
  console.log(`  ${chalk.cyan('seabri research --overnight')}     Run full overnight research session`)
  console.log(`  ${chalk.cyan('seabri research --report')}        Show last night\'s findings`)
  console.log(`  ${chalk.cyan('seabri research --parallel <N>')}  Run N topics in parallel (overnight)`)
  console.log()
  if (!programExists) {
    console.log(chalk.yellow('Tip: Create research/program.md with topics you want researched.'))
    console.log(`     Template is at ${programFile}\n`)
  }
}

async function cmdResearchOvernight(
  parallel: number = 1,
  opts: { noMutate?: boolean } = {}
): Promise<void> {
  if (!ANTHROPIC_API_KEY) {
    console.error(chalk.red('ANTHROPIC_API_KEY is required for research.'))
    process.exit(1)
  }

  const programFile = resolve(RESEARCH_DIR, 'program.md')
  if (!(await fileExists(programFile))) {
    console.error(chalk.red(`Research program not found at ${programFile}`))
    console.log('Create it with topics you want researched. See research/program.md for the format.')
    process.exit(1)
  }

  console.log(chalk.bold('\n🔬 Overnight Research\n'))
  console.log(chalk.gray('Reading research program...'))

  const spinner = ora('Starting overnight research session (up to 8 hours)...').start()
  spinner.stop()

  console.log(chalk.yellow('⚠️  Overnight research will run for up to 8 hours and use API credits.'))
  console.log('Press Ctrl+C at any time to stop. A partial report will be generated.\n')

  try {
    const { runOvernightResearch } = await import('../research/overnight.js')
    const report = await runOvernightResearch(
      ANTHROPIC_API_KEY,
      process.env.OPENSEABRI_MODEL || 'claude-haiku-4-5-20251001',
      (progress: string) => console.log(chalk.gray(`  ${progress}`)),
      { noMutate: !!opts.noMutate }
    )

    console.log(chalk.bold.green('\n✅ Research complete!\n'))
    console.log(`  Experiments:  ${report.totalExperiments}`)
    console.log(`  Kept:         ${chalk.green(String(report.kept))}`)
    console.log(`  Discarded:    ${chalk.gray(String(report.discarded))}`)
    console.log(`  Avg quality:  ${chalk.yellow(report.avgQuality.toFixed(1))}/10`)
    if (report.topFindings.length > 0) {
      console.log(chalk.bold('\nTop findings:'))
      for (const f of report.topFindings.slice(0, 3)) {
        console.log(`  • ${f.topic}: ${f.excerpt.slice(0, 80)}`)
      }
    }
    console.log(`\nFull report: ${chalk.cyan('seabri research --report')}\n`)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(chalk.red(`\nResearch failed: ${message}`))
    console.log('Partial findings may have been saved. Run: ' + chalk.cyan('seabri research --report'))
  }
}

async function cmdResearchReport(): Promise<void> {
  try {
    const { getLastReport } = await import('../research/overnight.js')
    const report = await getLastReport()
    if (!report) {
      console.log(chalk.gray('\nNo research report available yet. Run: seabri research --overnight\n'))
    } else {
      console.log(chalk.bold('\n🔬 Last Research Report\n'))
      console.log(report)
      console.log()
    }
  } catch {
    // Fallback: list findings files directly
    const findingsDir = resolve(RESEARCH_DIR, 'findings')
    if (!(await fileExists(findingsDir))) {
      console.log(chalk.gray('\nNo findings yet. Run: seabri research --overnight\n'))
      return
    }
    const { readdir } = await import('fs/promises')
    const files = await readdir(findingsDir).catch(() => [] as string[])
    if (files.length === 0) {
      console.log(chalk.gray('\nNo findings yet. Run: seabri research --overnight\n'))
      return
    }
    console.log(chalk.bold(`\n🔬 Research Findings (${files.length} file(s))\n`))
    for (const f of files.slice(-5)) {
      console.log(`  ${chalk.cyan(f)}`)
    }
    console.log(`\nLocation: ${findingsDir}\n`)
  }
}

// ─── Pairing ──────────────────────────────────────────────────────────────────

async function cmdPairingApprove(senderId: string, code: string): Promise<void> {
  if (!senderId || !code) {
    console.error(chalk.red('Usage: seabri pairing approve <senderId> <code>'))
    process.exit(1)
  }

  try {
    const { verifyPairingCode, approveSender } = await import('../gateway/security/pairing.js')
    const valid = await verifyPairingCode(senderId, code)
    if (!valid) {
      console.log(chalk.red('\n❌ Invalid or expired pairing code.\n'))
      console.log('The code may have expired (10 min limit) or already been used.')
      console.log('Ask the user to try messaging the bot again to generate a fresh code.\n')
      return
    }
    await approveSender(senderId)
    console.log(chalk.green(`\n✅ Sender ${senderId} approved. They can now use OpenSeaBri via Telegram.\n`))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(chalk.red(`Pairing failed: ${message}`))
  }
}

async function cmdPairingRevoke(senderId: string): Promise<void> {
  if (!senderId) {
    console.error(chalk.red('Usage: seabri pairing revoke <senderId>'))
    process.exit(1)
  }

  try {
    const { revokeSender } = await import('../gateway/security/pairing.js')
    await revokeSender(senderId)
    console.log(chalk.green(`\n✅ Sender ${senderId} revoked. They will need to re-pair.\n`))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(chalk.red(`Could not revoke sender: ${message}`))
  }
}

async function cmdPairingList(): Promise<void> {
  try {
    const { listApproved } = await import('../gateway/security/pairing.js')
    const senders = await listApproved()
    if (senders.length === 0) {
      console.log(chalk.gray('\nNo approved Telegram senders yet.\n'))
      console.log('When someone messages your bot, they get a pairing code.')
      console.log('Approve them with: ' + chalk.cyan('seabri pairing approve <senderId> <code>') + '\n')
      return
    }
    console.log(chalk.bold(`\nApproved Telegram Senders (${senders.length})\n`))
    for (const s of senders) {
      console.log(`  ${chalk.cyan(s)}`)
    }
    console.log()
    console.log(`Revoke with: ${chalk.cyan('seabri pairing revoke <senderId>')}\n`)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(chalk.red(`Could not list approved senders: ${message}`))
  }
}

// ─── Policy ───────────────────────────────────────────────────────────────────

async function cmdPolicySetAgent(senderId: string, agentId: string): Promise<void> {
  if (!senderId || !agentId) {
    console.error(chalk.red('Usage: seabri policy set-agent <senderId> <agentId>'))
    process.exit(1)
  }
  try {
    const { setPreferredAgent } = await import('../gateway/security/policy.js')
    await setPreferredAgent(senderId, agentId)
    console.log(chalk.green(`\n✅ Sender ${senderId} will now route to agent: ${agentId}\n`))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(chalk.red(`Could not set preferred agent: ${message}`))
  }
}

async function cmdPolicySetAllow(senderId: string, allowRaw: string): Promise<void> {
  if (!senderId || !allowRaw) {
    console.error(chalk.red('Usage: seabri policy set-allow <senderId> <true|false>'))
    process.exit(1)
  }
  const normalized = allowRaw.toLowerCase()
  if (normalized !== 'true' && normalized !== 'false') {
    console.error(chalk.red('Value must be "true" or "false".'))
    process.exit(1)
  }
  const allow = normalized === 'true'
  try {
    const { setSenderAllow } = await import('../gateway/security/policy.js')
    await setSenderAllow(senderId, allow)
    const verb = allow ? 'allowed' : 'denied'
    console.log(chalk.green(`\n✅ Sender ${senderId} is now ${verb}.\n`))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(chalk.red(`Could not update allow flag: ${message}`))
  }
}

async function cmdPolicyClear(senderId: string): Promise<void> {
  if (!senderId) {
    console.error(chalk.red('Usage: seabri policy clear <senderId>'))
    process.exit(1)
  }
  try {
    const { clearSenderPolicy } = await import('../gateway/security/policy.js')
    await clearSenderPolicy(senderId)
    console.log(chalk.green(`\n✅ Policy entry for ${senderId} cleared.\n`))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(chalk.red(`Could not clear policy: ${message}`))
  }
}

async function cmdPolicyShow(): Promise<void> {
  try {
    const { loadPolicy, policyPath } = await import('../gateway/security/policy.js')
    const policy = await loadPolicy(true)
    const path = await policyPath()
    console.log(chalk.bold('\nOpenSeaBri Policy\n'))
    console.log(`Source: ${chalk.cyan(path.active)}${path.usingDefaults ? chalk.gray(' (defaults)') : ''}`)
    console.log(`Default agent: ${chalk.cyan(policy.defaultAgent)}`)

    const senderIds = Object.keys(policy.perSender)
    if (senderIds.length === 0) {
      console.log(chalk.gray('\nNo per-sender overrides.'))
    } else {
      console.log(chalk.bold(`\nPer-sender (${senderIds.length})`))
      for (const id of senderIds) {
        const entry = policy.perSender[id]
        const parts: string[] = []
        if (entry.agent) parts.push(`agent=${entry.agent}`)
        if (entry.allow === false) parts.push(chalk.red('allow=false'))
        if (entry.allow === true) parts.push('allow=true')
        if (entry.note) parts.push(`note="${entry.note}"`)
        console.log(`  ${chalk.cyan(id)} — ${parts.join(' · ') || chalk.gray('(empty)')}`)
      }
    }

    const channels = Object.keys(policy.channels)
    if (channels.length > 0) {
      console.log(chalk.bold('\nChannels'))
      for (const ch of channels) {
        const cp = policy.channels[ch]
        const parts: string[] = []
        if (cp.requirePairing !== undefined) parts.push(`requirePairing=${cp.requirePairing}`)
        if (cp.allowedAgents?.length) parts.push(`allowedAgents=[${cp.allowedAgents.join(', ')}]`)
        console.log(`  ${chalk.cyan(ch)} — ${parts.join(' · ') || chalk.gray('(defaults)')}`)
      }
    }
    console.log()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(chalk.red(`Could not show policy: ${message}`))
  }
}

async function cmdPolicyPath(): Promise<void> {
  try {
    const { policyPath } = await import('../gateway/security/policy.js')
    const path = await policyPath()
    console.log(`\n${chalk.cyan(path.active)}${path.usingDefaults ? chalk.gray(' (built-in defaults)') : ''}\n`)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(chalk.red(`Could not resolve policy path: ${message}`))
  }
}

// ─── Daemon ───────────────────────────────────────────────────────────────────

async function cmdDaemonInstall(): Promise<void> {
  try {
    const { installDaemon } = await import('../daemon/install.js')
    await installDaemon()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('not supported')) {
      console.log(chalk.yellow(`\n${message}\n`))
    } else {
      console.error(chalk.red(`Daemon install failed: ${message}`))
    }
  }
}

async function cmdDaemonUninstall(): Promise<void> {
  try {
    const { uninstallDaemon } = await import('../daemon/install.js')
    await uninstallDaemon()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(chalk.red(`Daemon uninstall failed: ${message}`))
  }
}

async function cmdDaemonStatus(): Promise<void> {
  try {
    const { getDaemonStatus } = await import('../daemon/install.js')
    const status = await getDaemonStatus()
    console.log(chalk.bold('\nDaemon Status\n'))
    const supported = status.method !== 'none'
    console.log(`  Platform:  ${status.platform}`)
    console.log(`  Supported: ${supported ? chalk.green('Yes') : chalk.gray('No')}`)
    if (supported) {
      console.log(`  Installed: ${status.installed ? chalk.green('Yes') : chalk.gray('No')}`)
      if (status.configPath) {
        console.log(`  Config:    ${chalk.cyan(status.configPath)}`)
      }
    }
    console.log()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(chalk.red(`Could not get daemon status: ${message}`))
  }
}

async function cmdBriefing(): Promise<void> {
  const spinner = ora('Generating sustainability briefing...').start()
  try {
    const { routeMessage } = await import('../gateway/agents/router.js')
    const { initWorkspace } = await import('../gateway/memory/memory.js')
    await initWorkspace()

    const response = await routeMessage(
      'general',
      'Give me a concise sustainability briefing: what are the most important sustainability developments this week that I should know about, and what should I be thinking about for the next month? Keep it practical and relevant.',
      []
    )
    spinner.stop()
    console.log(chalk.bold('\n🌍 Your Sustainability Briefing\n'))
    console.log(response)
    console.log()
  } catch (err: unknown) {
    spinner.fail()
    const message = err instanceof Error ? err.message : String(err)
    console.error(chalk.red(`Briefing failed: ${message}`))
    console.log('Run ' + chalk.cyan('seabri doctor') + ' to check your configuration.')
  }
}

function cmdUpdate(): void {
  console.log(chalk.bold('\nUpdate OpenSeaBri\n'))
  console.log('To update to the latest version:')
  console.log()
  console.log(chalk.cyan('  # If installed from npm:'))
  console.log('  npm install -g openseabri@latest')
  console.log()
  console.log(chalk.cyan('  # If running from source:'))
  console.log('  git pull')
  console.log('  npm install')
  console.log()
  console.log('Current version: ' + chalk.green('0.1.0'))
  console.log()
}

// ─── CLI definition ───────────────────────────────────────────────────────────

const program = new Command()

program
  .name('seabri')
  .description('OpenSeaBri — personal sustainability intelligence')
  .version('0.1.0')

// Default command (no subcommand) — start chat with general agent
program
  .action(() => {
    cmdChat({}).catch((err: unknown) => {
      console.error(chalk.red(String(err)))
      process.exit(1)
    })
  })

program
  .command('chat')
  .description('Start interactive sustainability chat')
  .option('--agent <id>', 'Agent to use (default: general)')
  .option('--session <id>', 'Resume a specific session by ID')
  .action((options: { agent?: string; session?: string }) => {
    cmdChat(options).catch((err: unknown) => {
      console.error(chalk.red(String(err)))
      process.exit(1)
    })
  })

program
  .command('onboard')
  .description('Interactive setup wizard')
  .option('--install-daemon', 'Install as a system service after setup')
  .action((options: { installDaemon?: boolean }) => {
    cmdOnboard(options).catch((err: unknown) => {
      console.error(chalk.red(String(err)))
      process.exit(1)
    })
  })

program
  .command('gateway')
  .description('Start the WebSocket + Telegram gateway')
  .option('--port <number>', 'Port to listen on (default: 18790)')
  .option('--verbose', 'Enable verbose logging')
  .action((options: { port?: string; verbose?: boolean }) => {
    cmdGateway(options).catch((err: unknown) => {
      console.error(chalk.red(String(err)))
      process.exit(1)
    })
  })

program
  .command('status')
  .description('Show connection and service status')
  .action(() => {
    cmdStatus().catch((err: unknown) => {
      console.error(chalk.red(String(err)))
      process.exit(1)
    })
  })

program
  .command('doctor')
  .description('Run health checks')
  .action(() => {
    cmdDoctor().catch((err: unknown) => {
      console.error(chalk.red(String(err)))
      process.exit(1)
    })
  })

program
  .command('memory')
  .description('Show current memory')
  .action(() => {
    cmdMemory().catch((err: unknown) => {
      console.error(chalk.red(String(err)))
      process.exit(1)
    })
  })

program
  .command('agents')
  .description('List all available agents')
  .action(cmdAgents)

// ── Search ────────────────────────────────────────────────────────────────────

program
  .command('search [query]')
  .description('Search past conversations by keyword')
  .option('--rebuild', 'Rebuild the search index before searching')
  .action((query: string | undefined, opts: { rebuild?: boolean }) => {
    cmdSearch(query ?? '', opts).catch((err: unknown) => {
      console.error(chalk.red(String(err)))
      process.exit(1)
    })
  })

// ── Sessions ──────────────────────────────────────────────────────────────────

const sessionsCmd = program
  .command('sessions')
  .description('Manage conversation sessions')

sessionsCmd
  .command('list')
  .description('List all saved sessions')
  .action(() => {
    cmdSessionsList().catch((err: unknown) => {
      console.error(chalk.red(String(err)))
      process.exit(1)
    })
  })

// Default sessions action — list
sessionsCmd.action(() => {
  cmdSessionsList().catch((err: unknown) => {
    console.error(chalk.red(String(err)))
    process.exit(1)
  })
})

// ── Skills ────────────────────────────────────────────────────────────────────

const skillsCmd = program
  .command('skills')
  .description('Manage learned skills')

skillsCmd
  .command('list')
  .description('List all skills')
  .action(() => {
    cmdSkillsList().catch((err: unknown) => {
      console.error(chalk.red(String(err)))
      process.exit(1)
    })
  })

skillsCmd
  .command('show <id>')
  .description('Show a specific skill')
  .action((id: string) => {
    cmdSkillsShow(id).catch((err: unknown) => {
      console.error(chalk.red(String(err)))
      process.exit(1)
    })
  })

skillsCmd
  .command('create <name>')
  .description('Create a new skill template')
  .action((name: string) => {
    cmdSkillsCreate(name).catch((err: unknown) => {
      console.error(chalk.red(String(err)))
      process.exit(1)
    })
  })

// Default skills action — list
skillsCmd.action(() => {
  cmdSkillsList().catch((err: unknown) => {
    console.error(chalk.red(String(err)))
    process.exit(1)
  })
})

// ── Cron ──────────────────────────────────────────────────────────────────────

const cronCmd = program
  .command('cron')
  .description('Manage scheduled tasks')

cronCmd
  .command('add <schedule>')
  .description('Add a scheduled task (natural language schedule)')
  .action((schedule: string) => {
    cmdCronAdd(schedule).catch((err: unknown) => {
      console.error(chalk.red(String(err)))
      process.exit(1)
    })
  })

cronCmd
  .command('list')
  .description('List all scheduled tasks')
  .action(() => {
    cmdCronList().catch((err: unknown) => {
      console.error(chalk.red(String(err)))
      process.exit(1)
    })
  })

cronCmd
  .command('remove <id>')
  .description('Remove a scheduled task')
  .action((id: string) => {
    cmdCronRemove(id).catch((err: unknown) => {
      console.error(chalk.red(String(err)))
      process.exit(1)
    })
  })

cronCmd
  .command('pause <id>')
  .description('Pause a scheduled task')
  .action((id: string) => {
    cmdCronPause(id).catch((err: unknown) => {
      console.error(chalk.red(String(err)))
      process.exit(1)
    })
  })

cronCmd
  .command('resume <id>')
  .description('Resume a paused scheduled task')
  .action((id: string) => {
    cmdCronResume(id).catch((err: unknown) => {
      console.error(chalk.red(String(err)))
      process.exit(1)
    })
  })

// Default cron action — list
cronCmd.action(() => {
  cmdCronList().catch((err: unknown) => {
    console.error(chalk.red(String(err)))
    process.exit(1)
  })
})

// ── Research ──────────────────────────────────────────────────────────────────

program
  .command('research')
  .description('Run research sessions and view findings')
  .option('--overnight', 'Run a full overnight research session (up to 8 hours)')
  .option('--report', 'Show the last research report')
  .option('--parallel <n>', 'Number of parallel research tracks (overnight only)')
  .option('--no-mutate', 'Do not self-modify research/program.md')
  .action((options: { overnight?: boolean; report?: boolean; parallel?: string; mutate?: boolean }) => {
    cmdResearch(options).catch((err: unknown) => {
      console.error(chalk.red(String(err)))
      process.exit(1)
    })
  })

// ── Pairing ───────────────────────────────────────────────────────────────────

const pairingCmd = program
  .command('pairing')
  .description('Manage Telegram pairing security')

pairingCmd
  .command('approve <senderId> <code>')
  .description('Approve a Telegram sender using their pairing code')
  .action((senderId: string, code: string) => {
    cmdPairingApprove(senderId, code).catch((err: unknown) => {
      console.error(chalk.red(String(err)))
      process.exit(1)
    })
  })

pairingCmd
  .command('revoke <senderId>')
  .description('Revoke a Telegram sender\'s access')
  .action((senderId: string) => {
    cmdPairingRevoke(senderId).catch((err: unknown) => {
      console.error(chalk.red(String(err)))
      process.exit(1)
    })
  })

pairingCmd
  .command('list')
  .description('List all approved Telegram senders')
  .action(() => {
    cmdPairingList().catch((err: unknown) => {
      console.error(chalk.red(String(err)))
      process.exit(1)
    })
  })

// Default pairing action — list
pairingCmd.action(() => {
  cmdPairingList().catch((err: unknown) => {
    console.error(chalk.red(String(err)))
    process.exit(1)
  })
})

// ── Policy ────────────────────────────────────────────────────────────────────

const policyCmd = program
  .command('policy')
  .description('Inspect and configure DM / channel routing policy')

policyCmd
  .command('set-agent <senderId> <agentId>')
  .description('Route a sender to a specific agent')
  .action((senderId: string, agentId: string) => {
    cmdPolicySetAgent(senderId, agentId).catch((err: unknown) => {
      console.error(chalk.red(String(err)))
      process.exit(1)
    })
  })

policyCmd
  .command('set-allow <senderId> <value>')
  .description('Allow (true) or deny (false) a sender explicitly')
  .action((senderId: string, value: string) => {
    cmdPolicySetAllow(senderId, value).catch((err: unknown) => {
      console.error(chalk.red(String(err)))
      process.exit(1)
    })
  })

policyCmd
  .command('clear <senderId>')
  .description('Remove the per-sender policy entry')
  .action((senderId: string) => {
    cmdPolicyClear(senderId).catch((err: unknown) => {
      console.error(chalk.red(String(err)))
      process.exit(1)
    })
  })

policyCmd
  .command('show')
  .description('Show active policy')
  .action(() => {
    cmdPolicyShow().catch((err: unknown) => {
      console.error(chalk.red(String(err)))
      process.exit(1)
    })
  })

policyCmd
  .command('path')
  .description('Show which policy file is currently active')
  .action(() => {
    cmdPolicyPath().catch((err: unknown) => {
      console.error(chalk.red(String(err)))
      process.exit(1)
    })
  })

// Default policy action — show
policyCmd.action(() => {
  cmdPolicyShow().catch((err: unknown) => {
    console.error(chalk.red(String(err)))
    process.exit(1)
  })
})

// ── Daemon ────────────────────────────────────────────────────────────────────

const daemonCmd = program
  .command('daemon')
  .description('Manage the gateway background service')

daemonCmd
  .command('install')
  .description('Install the gateway as a system service')
  .action(() => {
    cmdDaemonInstall().catch((err: unknown) => {
      console.error(chalk.red(String(err)))
      process.exit(1)
    })
  })

daemonCmd
  .command('uninstall')
  .description('Remove the gateway system service')
  .action(() => {
    cmdDaemonUninstall().catch((err: unknown) => {
      console.error(chalk.red(String(err)))
      process.exit(1)
    })
  })

daemonCmd
  .command('status')
  .description('Show daemon installation status')
  .action(() => {
    cmdDaemonStatus().catch((err: unknown) => {
      console.error(chalk.red(String(err)))
      process.exit(1)
    })
  })

// Default daemon action — status
daemonCmd.action(() => {
  cmdDaemonStatus().catch((err: unknown) => {
    console.error(chalk.red(String(err)))
    process.exit(1)
  })
})

// ── Briefing + Update ─────────────────────────────────────────────────────────

program
  .command('briefing')
  .description('Generate a sustainability briefing now')
  .action(() => {
    cmdBriefing().catch((err: unknown) => {
      console.error(chalk.red(String(err)))
      process.exit(1)
    })
  })

program
  .command('update')
  .description('Show update instructions')
  .action(cmdUpdate)

// ── MCP server ────────────────────────────────────────────────────────────────

program
  .command('mcp-serve')
  .description('Run OpenSeaBri as an MCP stdio server (for Claude Desktop and other MCP clients)')
  .action(async () => {
    try {
      const { serveStdio } = await import('../gateway/mcp/server.js')
      await serveStdio()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      process.stderr.write(`[mcp] fatal: ${message}\n`)
      process.exit(1)
    }
  })

// ── Ask (panel / subagent spawning) ───────────────────────────────────────────

program
  .command('ask <question...>')
  .description('Ask a question — optionally fan it out to a panel of specialists in parallel')
  .option('--panel [agents]', 'Consult multiple specialists in parallel (comma-separated ids, or "all")')
  .option('--lead <id>', 'Lead agent used to synthesize the panel (default: general)')
  .option('--agent <id>', 'Single agent id (when not using --panel)')
  .option('--no-synthesize', 'Skip synthesis; show individual responses')
  .option('--timeout <ms>', 'Per-specialist timeout in milliseconds (default: 90000)')
  .action(async (
    questionParts: string[],
    opts: { panel?: string | boolean; lead?: string; agent?: string; synthesize?: boolean; timeout?: string }
  ) => {
    try {
      const question = questionParts.join(' ').trim()
      if (!question) {
        console.error(chalk.red('Please provide a question.'))
        process.exit(1)
      }

      if (opts.panel !== undefined) {
        const { consultPanel } = await import('../gateway/agents/subagent.js')
        const { AGENTS } = await import('../gateway/config.js')
        const panelArg = typeof opts.panel === 'string' ? opts.panel : 'all'
        const agentIds =
          panelArg === 'all' || panelArg === 'true'
            ? AGENTS.map((a) => a.id)
            : panelArg.split(',').map((s) => s.trim()).filter(Boolean)

        const result = await consultPanel(question, {
          agentIds,
          leadAgentId: opts.lead ?? 'general',
          synthesize: opts.synthesize !== false,
          timeoutMs: opts.timeout ? Number(opts.timeout) : undefined,
          onProgress: (msg: string) => console.error(chalk.dim(`[panel] ${msg}`)),
        })
        console.log(result.synthesis)
        console.error(
          chalk.dim(
            `\n— ${result.responses.filter((r) => !r.error).length}/${result.responses.length} specialists responded in ${Math.round(result.totalDurationMs / 1000)}s`
          )
        )
      } else {
        const { routeMessage } = await import('../gateway/agents/router.js')
        const answer = await routeMessage(opts.agent ?? 'general', question, [])
        console.log(answer)
      }
    } catch (err: unknown) {
      console.error(chalk.red(err instanceof Error ? err.message : String(err)))
      process.exit(1)
    }
  })

// ── Company context ───────────────────────────────────────────────────────────

program
  .command('company [subcommand] [value...]')
  .description('Manage company context used by bridge data (companyId, sector, assetId)')
  .addHelpText('after', `
Subcommands:
  show                   Show current company context (default)
  set <companyId>        Set the company ID
  sector <name>          Set the sector name
  asset <assetId>        Set the asset ID
  clear                  Clear all company context fields

Examples:
  seabri company show
  seabri company set acme-corp-001
  seabri company sector "Real Estate"
  seabri company asset warehouse-miami-001
  seabri company clear`)
  .action(async (subcommand: string | undefined, valueArr: string[]) => {
    try {
      const { loadUserConfig, setUserConfigField } = await import('../gateway/user_config.js')
      const sub = (subcommand ?? 'show').toLowerCase()
      const val = valueArr.join(' ').trim()

      if (sub === 'show' || !sub) {
        const cfg = await loadUserConfig()
        console.log(chalk.bold('Company context:'))
        console.log(`  companyId: ${cfg.companyId ? chalk.green(cfg.companyId) : chalk.dim('(not set)')}`)
        console.log(`  assetId:   ${cfg.assetId ? chalk.green(cfg.assetId) : chalk.dim('(not set)')}`)
        console.log(`  sector:    ${cfg.sector ? chalk.green(cfg.sector) : chalk.dim('(not set)')}`)
        console.log()
        console.log(chalk.dim('Use `seabri company set <id>` to configure company-specific bridge data.'))
        return
      }

      if (sub === 'set') {
        if (!val) { console.error(chalk.red('Usage: seabri company set <companyId>')); process.exit(1) }
        await setUserConfigField('companyId', val)
        console.log(chalk.green(`✓ Company ID set to "${val}".`))
        return
      }

      if (sub === 'sector') {
        if (!val) { console.error(chalk.red('Usage: seabri company sector <sector-name>')); process.exit(1) }
        await setUserConfigField('sector', val)
        console.log(chalk.green(`✓ Sector set to "${val}".`))
        return
      }

      if (sub === 'asset') {
        if (!val) { console.error(chalk.red('Usage: seabri company asset <assetId>')); process.exit(1) }
        await setUserConfigField('assetId', val)
        console.log(chalk.green(`✓ Asset ID set to "${val}".`))
        return
      }

      if (sub === 'clear') {
        await setUserConfigField('companyId', undefined)
        await setUserConfigField('assetId', undefined)
        await setUserConfigField('sector', undefined)
        console.log(chalk.green('✓ Company context cleared.'))
        return
      }

      console.error(chalk.red(`Unknown subcommand: ${sub}`))
      console.error(chalk.dim('Run `seabri company --help` for usage.'))
      process.exit(1)
    } catch (err: unknown) {
      console.error(chalk.red(String(err)))
      process.exit(1)
    }
  })

// ── Migrate ───────────────────────────────────────────────────────────────────

program
  .command('migrate')
  .description('Import workspace data from OpenClaw, Hermes, or another OpenSeaBri install')
  .requiredOption('--from <path>', 'Source workspace directory (e.g. ~/.openclaw or ~/.hermes)')
  .option('--merge', 'Merge into existing workspace (default)')
  .option('--replace', 'Overwrite destination files instead of merging')
  .option('--dry-run', 'Report what would be copied without writing')
  .action(async (opts: { from: string; merge?: boolean; replace?: boolean; dryRun?: boolean }) => {
    try {
      const { runMigration, printMigrationReport } = await import('./migrate.js')
      const report = await runMigration(opts)
      printMigrationReport(report, opts)
    } catch (err: unknown) {
      console.error(chalk.red(String(err)))
      process.exit(1)
    }
  })

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(chalk.red(String(err)))
  process.exit(1)
})

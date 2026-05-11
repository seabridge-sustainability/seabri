import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { handleSlashCommand, buildAdditionalContext } from './shared_commands.js'
import type { ChannelState } from './shared_commands.js'

vi.mock('../memory/memory.js', () => ({
  readMemory: vi.fn().mockResolvedValue('test memory content'),
}))
vi.mock('../memory/compress.js', () => ({
  compressHistory: vi.fn().mockResolvedValue({
    compressed: false,
    history: [],
    summary: '',
  }),
}))
vi.mock('../personalities/loader.js', () => ({
  listPersonalities: vi.fn().mockResolvedValue([]),
  loadPersonality: vi.fn().mockResolvedValue(null),
}))
vi.mock('../agents/subagent.js', () => ({
  consultPanel: vi.fn(),
}))
vi.mock('../user_config.js', () => ({
  loadUserConfig: vi.fn().mockResolvedValue({}),
  setUserConfigField: vi.fn(),
}))
vi.mock('../seabri/user-profile.js', () => ({
  getProfile: vi.fn(),
  upsertProfile: vi.fn(),
  deleteProfile: vi.fn(),
  formatProfileDisplay: vi.fn().mockReturnValue('profile display'),
  formatProfileContext: vi.fn().mockReturnValue('profile context'),
  isProfileComplete: vi.fn().mockReturnValue(false),
}))

function makeState(overrides: Partial<ChannelState> = {}): ChannelState {
  return {
    agentId: 'seabri-orchestrator',
    history: [],
    ...overrides,
  }
}

describe('handleSlashCommand', () => {
  it('returns handled: false for non-slash input', async () => {
    const result = await handleSlashCommand(makeState(), 'hello world')
    expect(result.handled).toBe(false)
  })

  it('handles /quit', async () => {
    const result = await handleSlashCommand(makeState(), '/quit')
    expect(result.handled).toBe(true)
    expect(result.exit).toBe(true)
    expect(result.reply).toContain('Goodbye')
  })

  it('handles /exit', async () => {
    const result = await handleSlashCommand(makeState(), '/exit')
    expect(result.handled).toBe(true)
    expect(result.exit).toBe(true)
  })

  it('handles /agents', async () => {
    const result = await handleSlashCommand(makeState(), '/agents')
    expect(result.handled).toBe(true)
    expect(result.reply).toContain('seabri-orchestrator')
    expect(result.reply).toContain('climate-risk')
  })

  it('handles /switch with valid agent', async () => {
    const state = makeState()
    const result = await handleSlashCommand(state, '/switch climate-risk')
    expect(result.handled).toBe(true)
    expect(state.agentId).toBe('climate-risk')
    expect(result.reply).toContain('Climate Risk')
  })

  it('handles /switch with unknown agent', async () => {
    const state = makeState()
    const result = await handleSlashCommand(state, '/switch nonexistent')
    expect(result.handled).toBe(true)
    expect(result.reply).toContain('Unknown agent')
    expect(state.agentId).toBe('seabri-orchestrator')
  })

  it('handles /switch without argument shows agent list', async () => {
    const result = await handleSlashCommand(makeState(), '/switch')
    expect(result.handled).toBe(true)
    expect(result.reply).toContain('Available agents')
  })

  it('handles /new resets history', async () => {
    const state = makeState({
      history: [{ role: 'user', content: 'hi' }],
      thinkMode: true,
    })
    const result = await handleSlashCommand(state, '/new')
    expect(result.handled).toBe(true)
    expect(state.history).toHaveLength(0)
    expect(state.thinkMode).toBe(false)
    expect(result.reply).toContain('fresh')
  })

  it('handles /reset same as /new', async () => {
    const state = makeState({ history: [{ role: 'user', content: 'hi' }] })
    const result = await handleSlashCommand(state, '/reset')
    expect(result.handled).toBe(true)
    expect(state.history).toHaveLength(0)
  })

  it('handles /status', async () => {
    const result = await handleSlashCommand(makeState(), '/status')
    expect(result.handled).toBe(true)
    expect(result.reply).toContain('Status')
    expect(result.reply).toContain('SeaBri')
  })

  it('handles /think', async () => {
    const state = makeState()
    const result = await handleSlashCommand(state, '/think')
    expect(result.handled).toBe(true)
    expect(state.thinkMode).toBe(true)
    expect(result.reply).toContain('thinking')
  })

  it('handles /memory', async () => {
    const result = await handleSlashCommand(makeState(), '/memory')
    expect(result.handled).toBe(true)
    expect(result.reply).toContain('memory')
  })

  it('handles /help', async () => {
    const result = await handleSlashCommand(makeState(), '/help')
    expect(result.handled).toBe(true)
    expect(result.reply).toContain('Commands')
    expect(result.reply).toContain('/agents')
    expect(result.reply).toContain('/switch')
    expect(result.reply).toContain('/quit')
  })

  it('handles /lang without arg shows current', async () => {
    const result = await handleSlashCommand(makeState(), '/lang')
    expect(result.handled).toBe(true)
    expect(result.reply).toContain('en')
    expect(result.reply).toContain('Supported')
  })

  it('handles /lang with valid locale', async () => {
    const state = makeState()
    const result = await handleSlashCommand(state, '/lang es')
    expect(result.handled).toBe(true)
    expect(state.locale).toBe('es')
  })

  it('handles /lang with invalid locale', async () => {
    const result = await handleSlashCommand(makeState(), '/lang xx')
    expect(result.handled).toBe(true)
    expect(result.reply).toContain('Unsupported')
  })

  it('handles /lang off resets to english', async () => {
    const state = makeState({ locale: 'es' })
    const result = await handleSlashCommand(state, '/lang off')
    expect(result.handled).toBe(true)
    expect(state.locale).toBe('en')
  })

  it('handles /privacy', async () => {
    const result = await handleSlashCommand(makeState(), '/privacy')
    expect(result.handled).toBe(true)
    expect(result.reply).toContain('Privacy')
  })

  it('handles /skip', async () => {
    const result = await handleSlashCommand(makeState(), '/skip')
    expect(result.handled).toBe(true)
    expect(result.reply).toContain('profile')
  })

  it('handles unknown command', async () => {
    const result = await handleSlashCommand(makeState(), '/unknown')
    expect(result.handled).toBe(true)
    expect(result.reply).toContain('Unknown command')
    expect(result.reply).toContain('/help')
  })

  it('is case-insensitive for commands', async () => {
    const result = await handleSlashCommand(makeState(), '/HELP')
    expect(result.handled).toBe(true)
    expect(result.reply).toContain('Commands')
  })
})

describe('buildAdditionalContext', () => {
  it('returns empty string for default state', async () => {
    const result = await buildAdditionalContext(makeState())
    expect(result).toBe('')
  })

  it('includes think mode context', async () => {
    const result = await buildAdditionalContext(makeState({ thinkMode: true }))
    expect(result).toContain('Extended thinking')
  })

  it('includes locale context for non-english', async () => {
    const result = await buildAdditionalContext(makeState({ locale: 'es' }))
    expect(result).toContain('es')
  })

  it('does not include locale context for english', async () => {
    const result = await buildAdditionalContext(makeState({ locale: 'en' }))
    expect(result).not.toContain('Language preference')
  })
})

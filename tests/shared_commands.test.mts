import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const tmpWorkspace = mkdtempSync(join(tmpdir(), 'openseabri-shared-cmd-test-'))
process.env.OPENSEABRI_WORKSPACE = tmpWorkspace

import type { ChannelState } from '../gateway/channels/shared_commands.ts'
const shared = await import('../gateway/channels/shared_commands.ts')

function makeState(overrides: Partial<ChannelState> = {}): ChannelState {
  return {
    agentId: 'general',
    history: [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
    ],
    personalityId: null,
    thinkMode: false,
    ...overrides,
  }
}

after(() => {
  rmSync(tmpWorkspace, { recursive: true, force: true })
})

test('non-slash input returns handled=false', async () => {
  const state = makeState()
  const result = await shared.handleSlashCommand(state, 'just a message')
  assert.equal(result.handled, false)
})

test('/switch to valid agent resets history and updates agentId', async () => {
  const state = makeState({ agentId: 'general' })
  assert.equal(state.history.length, 2)
  const result = await shared.handleSlashCommand(state, '/switch climate-risk')
  assert.equal(result.handled, true)
  assert.equal(state.agentId, 'climate-risk')
  assert.equal(state.history.length, 0)
  assert.match(result.reply ?? '', /Climate Risk/)
})

test('/switch with no arg lists agents and leaves state untouched', async () => {
  const state = makeState({ agentId: 'general' })
  const result = await shared.handleSlashCommand(state, '/switch')
  assert.equal(result.handled, true)
  assert.equal(state.agentId, 'general')
  assert.equal(state.history.length, 2)
  assert.match(result.reply ?? '', /Available agents/)
})

test('/switch with unknown id returns error and leaves state untouched', async () => {
  const state = makeState({ agentId: 'general' })
  const result = await shared.handleSlashCommand(state, '/switch not-an-agent')
  assert.equal(result.handled, true)
  assert.equal(state.agentId, 'general')
  assert.equal(state.history.length, 2)
  assert.match(result.reply ?? '', /Unknown agent/)
})

test('/new resets history and thinkMode', async () => {
  const state = makeState({ thinkMode: true })
  const result = await shared.handleSlashCommand(state, '/new')
  assert.equal(result.handled, true)
  assert.equal(state.history.length, 0)
  assert.equal(state.thinkMode, false)
})

test('/reset resets history and thinkMode', async () => {
  const state = makeState({ thinkMode: true })
  const result = await shared.handleSlashCommand(state, '/reset')
  assert.equal(result.handled, true)
  assert.equal(state.history.length, 0)
  assert.equal(state.thinkMode, false)
})

test('/think arms thinkMode flag', async () => {
  const state = makeState({ thinkMode: false })
  const result = await shared.handleSlashCommand(state, '/think')
  assert.equal(result.handled, true)
  assert.equal(state.thinkMode, true)
})

test('/persona off clears personalityId', async () => {
  const state = makeState({ personalityId: 'analyst' })
  const result = await shared.handleSlashCommand(state, '/persona off')
  assert.equal(result.handled, true)
  assert.equal(state.personalityId, null)
})

test('/persona clear also clears personalityId', async () => {
  const state = makeState({ personalityId: 'analyst' })
  const result = await shared.handleSlashCommand(state, '/persona clear')
  assert.equal(result.handled, true)
  assert.equal(state.personalityId, null)
})

test('/help returns help text', async () => {
  const state = makeState()
  const result = await shared.handleSlashCommand(state, '/help')
  assert.equal(result.handled, true)
  assert.match(result.reply ?? '', /\/agents/)
  assert.match(result.reply ?? '', /\/switch/)
})

test('/agents returns agent list', async () => {
  const state = makeState()
  const result = await shared.handleSlashCommand(state, '/agents')
  assert.equal(result.handled, true)
  assert.match(result.reply ?? '', /Available agents/)
})

test('/status returns current state summary', async () => {
  const state = makeState({ agentId: 'climate-risk', personalityId: 'analyst', thinkMode: true })
  const result = await shared.handleSlashCommand(state, '/status')
  assert.equal(result.handled, true)
  assert.match(result.reply ?? '', /Climate Risk/)
  assert.match(result.reply ?? '', /analyst/)
  assert.match(result.reply ?? '', /on/)
})

test('/quit returns exit flag', async () => {
  const state = makeState()
  const result = await shared.handleSlashCommand(state, '/quit')
  assert.equal(result.handled, true)
  assert.equal(result.exit, true)
})

test('/exit returns exit flag', async () => {
  const state = makeState()
  const result = await shared.handleSlashCommand(state, '/exit')
  assert.equal(result.handled, true)
  assert.equal(result.exit, true)
})

test('unknown slash command returns guidance text', async () => {
  const state = makeState()
  const result = await shared.handleSlashCommand(state, '/bogus')
  assert.equal(result.handled, true)
  assert.match(result.reply ?? '', /Unknown command/)
  assert.match(result.reply ?? '', /\/help/)
})

test('/compact on empty history returns nothing-to-compact', async () => {
  const state = makeState({ history: [] })
  const result = await shared.handleSlashCommand(state, '/compact')
  assert.equal(result.handled, true)
  assert.match(result.reply ?? '', /Nothing to compact/)
})

test('buildAdditionalContext returns empty string for default state', async () => {
  const state = makeState()
  const ctx = await shared.buildAdditionalContext(state)
  assert.equal(ctx, '')
})

test('buildAdditionalContext includes thinking marker when thinkMode=true', async () => {
  const state = makeState({ thinkMode: true })
  const ctx = await shared.buildAdditionalContext(state)
  assert.match(ctx, /Extended thinking requested/)
})

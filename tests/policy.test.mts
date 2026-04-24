import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const tmpWorkspace = mkdtempSync(join(tmpdir(), 'openseabri-policy-test-'))
process.env.OPENSEABRI_WORKSPACE = tmpWorkspace

const policy = await import('../gateway/security/policy.ts')

before(() => {
  mkdirSync(tmpWorkspace, { recursive: true })
})

after(() => {
  rmSync(tmpWorkspace, { recursive: true, force: true })
})

test('loadPolicy returns defaults when no workspace or repo file overrides exist', async () => {
  const p = await policy.loadPolicy(true)
  assert.equal(typeof p.defaultAgent, 'string')
  assert.ok(p.channels)
})

test('requiresPairing defaults to true for unknown channel', async () => {
  const required = await policy.requiresPairing('nonexistent-channel-xyz')
  assert.equal(required, true)
})

test('requiresPairing respects channel.requirePairing=false override', async () => {
  writeFileSync(
    join(tmpWorkspace, 'policy.json'),
    JSON.stringify({
      defaultAgent: 'general',
      perSender: {},
      channels: { cli: { requirePairing: false } },
    }),
    'utf-8',
  )
  await policy.loadPolicy(true)
  const required = await policy.requiresPairing('cli')
  assert.equal(required, false)
})

test('isAllowed returns false when sender.allow === false', async () => {
  writeFileSync(
    join(tmpWorkspace, 'policy.json'),
    JSON.stringify({
      defaultAgent: 'general',
      perSender: { blocked_user: { allow: false } },
      channels: {},
    }),
    'utf-8',
  )
  const allowed = await policy.loadPolicy(true)
  assert.equal(allowed.perSender.blocked_user?.allow, false)
  const ok = await policy.isAllowed('blocked_user', 'telegram')
  assert.equal(ok, false)
})

test('isAllowed returns true for unknown senders by default', async () => {
  writeFileSync(
    join(tmpWorkspace, 'policy.json'),
    JSON.stringify({
      defaultAgent: 'general',
      perSender: {},
      channels: {},
    }),
    'utf-8',
  )
  await policy.loadPolicy(true)
  const ok = await policy.isAllowed('unknown_sender', 'telegram')
  assert.equal(ok, true)
})

test('isAllowed enforces channel.allowedAgents when sender.agent is set', async () => {
  writeFileSync(
    join(tmpWorkspace, 'policy.json'),
    JSON.stringify({
      defaultAgent: 'general',
      perSender: { user_a: { agent: 'climate' } },
      channels: { telegram: { allowedAgents: ['general', 'nature'] } },
    }),
    'utf-8',
  )
  await policy.loadPolicy(true)
  const ok = await policy.isAllowed('user_a', 'telegram')
  assert.equal(ok, false)
})

test('getPreferredAgent falls back to defaultAgent when sender has no preference', async () => {
  writeFileSync(
    join(tmpWorkspace, 'policy.json'),
    JSON.stringify({
      defaultAgent: 'nature',
      perSender: {},
      channels: {},
    }),
    'utf-8',
  )
  await policy.loadPolicy(true)
  const agent = await policy.getPreferredAgent('no_such_sender')
  assert.equal(agent, 'nature')
})

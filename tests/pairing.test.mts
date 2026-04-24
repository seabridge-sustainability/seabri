import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const tmpWorkspace = mkdtempSync(join(tmpdir(), 'openseabri-pairing-test-'))
process.env.OPENSEABRI_WORKSPACE = tmpWorkspace

const pairing = await import('../gateway/security/pairing.ts')

const APPROVED_FILE = join(tmpWorkspace, 'approved-senders.json')

before(() => {
  if (existsSync(APPROVED_FILE)) rmSync(APPROVED_FILE, { force: true })
})

after(() => {
  rmSync(tmpWorkspace, { recursive: true, force: true })
})

test('createPairingCode returns a 6-digit numeric code', async () => {
  const code = await pairing.createPairingCode('sender1')
  assert.match(code, /^\d{6}$/)
})

test('createPairingCode reuses unexpired pending code for same sender', async () => {
  const first = await pairing.createPairingCode('sender_reuse')
  const second = await pairing.createPairingCode('sender_reuse')
  assert.equal(first, second)
})

test('verifyPairingCode accepts correct code', async () => {
  const code = await pairing.createPairingCode('sender_verify')
  const ok = await pairing.verifyPairingCode('sender_verify', code)
  assert.equal(ok, true)
})

test('verifyPairingCode rejects wrong code', async () => {
  await pairing.createPairingCode('sender_wrong')
  const ok = await pairing.verifyPairingCode('sender_wrong', '000000')
  assert.equal(ok, false)
})

test('approveSender + isApproved round-trip', async () => {
  await pairing.approveSender('approved_user')
  const approved = await pairing.isApproved('approved_user')
  assert.equal(approved, true)
})

test('isApproved returns false for unknown sender', async () => {
  const approved = await pairing.isApproved('never_seen_sender')
  assert.equal(approved, false)
})

test('verifyPairingCode rejects expired code', async () => {
  const code = await pairing.createPairingCode('sender_expire')
  // Manually rewrite the approved file to set createdAt to 11 minutes ago.
  const raw = readFileSync(APPROVED_FILE, 'utf-8')
  const data = JSON.parse(raw)
  const entry = data.pending?.sender_expire
  assert.ok(entry, 'pending entry should exist')
  entry.createdAt = Date.now() - 11 * 60 * 1000
  writeFileSync(APPROVED_FILE, JSON.stringify(data), 'utf-8')
  const ok = await pairing.verifyPairingCode('sender_expire', code)
  assert.equal(ok, false)
})

test('revokeSender removes approval', async () => {
  await pairing.approveSender('revoke_user')
  assert.equal(await pairing.isApproved('revoke_user'), true)
  await pairing.revokeSender('revoke_user')
  assert.equal(await pairing.isApproved('revoke_user'), false)
})

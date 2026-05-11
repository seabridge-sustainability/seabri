import { mkdtemp, readFile, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { describe, it, expect, afterEach } from 'vitest'
import {
  FileTelemetryStore,
  InMemoryTelemetryStore,
  sanitizeTelemetryEvent,
  setTelemetryStoreForTesting,
  recordTelemetryEvent,
} from './store.js'

let tempDir: string | null = null

afterEach(async () => {
  setTelemetryStoreForTesting(null)
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true })
    tempDir = null
  }
})

describe('telemetry store', () => {
  it('redacts secrets before serialization', () => {
    const event = sanitizeTelemetryEvent({
      type: 'provider_error',
      data: {
        apiKey: 'sk-secret',
        nested: { webhookSecret: 'hook-secret', ok: true },
      },
    })
    const text = JSON.stringify(event)
    expect(text).not.toContain('sk-secret')
    expect(text).not.toContain('hook-secret')
    expect(text).toContain('[redacted]')
  })

  it('redacts profile contact fields before serialization', () => {
    const event = sanitizeTelemetryEvent({
      type: 'action_prepared',
      data: {
        profile: { name: 'Pilot User', address: '123 Water St', phone: '+13055550100', zip: '33101' },
        safe: 'action card prepared',
      },
    })
    const text = JSON.stringify(event)
    expect(text).not.toContain('123 Water St')
    expect(text).not.toContain('+13055550100')
    expect(text).not.toContain('33101')
    expect(text).toContain('action card prepared')
  })

  it('writes append-only JSONL events', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'openseabri-telemetry-'))
    const file = join(tempDir, 'events.jsonl')
    const store = new FileTelemetryStore(file)
    await store.append({ type: 'registry_snapshot_generated', data: { hash: 'abc' } })
    await store.append({ type: 'provider_readiness_checked', data: { token: 'secret-token' } })

    const lines = (await readFile(file, 'utf8')).trim().split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain('registry_snapshot_generated')
    expect(lines[1]).not.toContain('secret-token')
  })

  it('recordTelemetryEvent uses the active store without leaking raw tokens', async () => {
    const store = new InMemoryTelemetryStore()
    setTelemetryStoreForTesting(store)
    await recordTelemetryEvent({
      type: 'provider_readiness_checked',
      data: { provider: 'telegram', authToken: 'secret-token' },
    })
    expect(store.events).toHaveLength(1)
    expect(JSON.stringify(store.events[0])).not.toContain('secret-token')
  })
})

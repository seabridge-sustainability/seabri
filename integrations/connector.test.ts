import { describe, it, expect, vi } from 'vitest'
import {
  createConnectorRegistry,
  validateConnector,
  type ConnectorDefinition,
  type ConnectorContext,
} from './connector.js'

const makeConnector = (overrides: Partial<ConnectorDefinition> = {}): ConnectorDefinition => ({
  id: 'test-connector',
  name: 'Test Connector',
  version: '1.0.0',
  auth: { type: 'none' },
  operations: {
    fetch: {
      description: 'Fetch data',
      inputSchema: { type: 'object', properties: { url: { type: 'string' } } },
      execute: async (input: unknown) => ({ data: (input as any).url }),
    },
  },
  ...overrides,
})

describe('validateConnector', () => {
  it('accepts a valid connector', () => {
    expect(() => validateConnector(makeConnector())).not.toThrow()
  })

  it('rejects a connector with missing id', () => {
    expect(() => validateConnector(makeConnector({ id: '' }))).toThrow()
  })

  it('rejects a connector with missing name', () => {
    expect(() => validateConnector(makeConnector({ name: '' }))).toThrow()
  })

  it('rejects a connector with no operations', () => {
    expect(() => validateConnector(makeConnector({ operations: {} }))).toThrow()
  })

  it('accepts api-key auth type', () => {
    const c = makeConnector({ auth: { type: 'api-key', headerName: 'X-API-Key' } })
    expect(() => validateConnector(c)).not.toThrow()
  })

  it('accepts bearer auth type', () => {
    const c = makeConnector({ auth: { type: 'bearer' } })
    expect(() => validateConnector(c)).not.toThrow()
  })

  it('rejects unknown auth type', () => {
    const c = makeConnector({ auth: { type: 'magic' as any } })
    expect(() => validateConnector(c)).toThrow()
  })
})

describe('createConnectorRegistry', () => {
  it('starts empty', () => {
    const reg = createConnectorRegistry()
    expect(reg.list()).toHaveLength(0)
  })

  it('registers and retrieves a connector', () => {
    const reg = createConnectorRegistry()
    reg.register(makeConnector())
    expect(reg.get('test-connector')).toBeDefined()
  })

  it('throws when registering duplicate id', () => {
    const reg = createConnectorRegistry()
    reg.register(makeConnector())
    expect(() => reg.register(makeConnector())).toThrow()
  })

  it('unregisters a connector', () => {
    const reg = createConnectorRegistry()
    reg.register(makeConnector())
    reg.unregister('test-connector')
    expect(reg.list()).toHaveLength(0)
  })

  it('throws when unregistering non-existent connector', () => {
    const reg = createConnectorRegistry()
    expect(() => reg.unregister('ghost')).toThrow()
  })

  it('executes an operation on a registered connector', async () => {
    const reg = createConnectorRegistry()
    reg.register(makeConnector())
    const result = await reg.execute('test-connector', 'fetch', { url: 'https://example.com' })
    expect((result as any).data).toBe('https://example.com')
  })

  it('throws when executing on unknown connector', async () => {
    const reg = createConnectorRegistry()
    await expect(reg.execute('ghost', 'fetch', {})).rejects.toThrow()
  })

  it('throws when executing unknown operation', async () => {
    const reg = createConnectorRegistry()
    reg.register(makeConnector())
    await expect(reg.execute('test-connector', 'nonexistent', {})).rejects.toThrow()
  })

  it('passes context to operation execute', async () => {
    const executeSpy = vi.fn().mockResolvedValue({ ok: true })
    const connector = makeConnector({
      operations: {
        ping: {
          description: 'Ping',
          inputSchema: {},
          execute: executeSpy,
        },
      },
    })
    const reg = createConnectorRegistry()
    reg.register(connector)
    const ctx: ConnectorContext = { credentials: { apiKey: 'secret' } }
    await reg.execute('test-connector', 'ping', { foo: 'bar' }, ctx)
    expect(executeSpy).toHaveBeenCalledWith({ foo: 'bar' }, ctx)
  })

  it('lists connectors by auth type', () => {
    const reg = createConnectorRegistry()
    reg.register(makeConnector({ id: 'c1', auth: { type: 'none' } }))
    reg.register(makeConnector({ id: 'c2', auth: { type: 'api-key', headerName: 'X-Key' } }))
    expect(reg.listByAuthType('none')).toHaveLength(1)
    expect(reg.listByAuthType('api-key')).toHaveLength(1)
    expect(reg.listByAuthType('bearer')).toHaveLength(0)
  })
})

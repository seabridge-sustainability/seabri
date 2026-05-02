export type AuthType = 'none' | 'api-key' | 'bearer' | 'oauth2'

export interface AuthConfig {
  type: AuthType
  headerName?: string
  tokenUrl?: string
}

export interface OperationDefinition {
  description: string
  inputSchema: Record<string, unknown>
  execute(input: unknown, context?: ConnectorContext): Promise<unknown>
}

export interface ConnectorDefinition {
  id: string
  name: string
  version: string
  auth: AuthConfig
  operations: Record<string, OperationDefinition>
  description?: string
}

export interface ConnectorContext {
  credentials?: Record<string, string>
  [key: string]: unknown
}

export interface ConnectorRegistry {
  register(connector: ConnectorDefinition): void
  unregister(id: string): void
  get(id: string): ConnectorDefinition | undefined
  list(): ConnectorDefinition[]
  listByAuthType(type: AuthType): ConnectorDefinition[]
  execute(connectorId: string, operation: string, input: unknown, context?: ConnectorContext): Promise<unknown>
}

const VALID_AUTH_TYPES = new Set<string>(['none', 'api-key', 'bearer', 'oauth2'])

export function validateConnector(connector: ConnectorDefinition): void {
  if (!connector.id) throw new Error('ConnectorError: "id" is required')
  if (!connector.name) throw new Error('ConnectorError: "name" is required')
  if (!VALID_AUTH_TYPES.has(connector.auth.type)) {
    throw new Error(`ConnectorError: unknown auth type "${connector.auth.type}"`)
  }
  if (!connector.operations || Object.keys(connector.operations).length === 0) {
    throw new Error('ConnectorError: at least one operation is required')
  }
}

export function createConnectorRegistry(): ConnectorRegistry {
  const store = new Map<string, ConnectorDefinition>()

  return {
    register(connector) {
      validateConnector(connector)
      if (store.has(connector.id)) {
        throw new Error(`ConnectorError: connector "${connector.id}" is already registered`)
      }
      store.set(connector.id, connector)
    },

    unregister(id) {
      if (!store.has(id)) {
        throw new Error(`ConnectorError: connector "${id}" is not registered`)
      }
      store.delete(id)
    },

    get(id) {
      return store.get(id)
    },

    list() {
      return [...store.values()]
    },

    listByAuthType(type) {
      return [...store.values()].filter((c) => c.auth.type === type)
    },

    async execute(connectorId, operation, input, context) {
      const connector = store.get(connectorId)
      if (!connector) {
        throw new Error(`ConnectorError: connector "${connectorId}" is not registered`)
      }
      const op = connector.operations[operation]
      if (!op) {
        throw new Error(`ConnectorError: operation "${operation}" not found on "${connectorId}"`)
      }
      return op.execute(input, context)
    },
  }
}

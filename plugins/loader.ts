export type PluginType = 'agent' | 'tool' | 'workflow-template' | 'dashboard-widget'

export interface PluginManifest {
  id: string
  name: string
  version: string
  type: PluginType
  capabilities: string[]
  entrypoint: string
  description?: string
}

export interface PluginRegistry {
  register(manifest: PluginManifest): void
  unregister(id: string): void
  get(id: string): PluginManifest | undefined
  list(): PluginManifest[]
  listByType(type: PluginType): PluginManifest[]
  allCapabilities(): string[]
}

const VALID_TYPES = new Set<string>(['agent', 'tool', 'workflow-template', 'dashboard-widget'])
const SEMVER_RE = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$/

export function validatePluginManifest(manifest: PluginManifest): void {
  if (!manifest.id) throw new Error('PluginError: "id" is required')
  if (!manifest.name) throw new Error('PluginError: "name" is required')
  if (!manifest.entrypoint) throw new Error('PluginError: "entrypoint" is required')
  if (!VALID_TYPES.has(manifest.type)) {
    throw new Error(`PluginError: unknown type "${manifest.type}". Valid: ${[...VALID_TYPES].join(', ')}`)
  }
  if (!SEMVER_RE.test(manifest.version)) {
    throw new Error(`PluginError: invalid semver "${manifest.version}"`)
  }
}

export function createPluginRegistry(): PluginRegistry {
  const store = new Map<string, PluginManifest>()

  return {
    register(manifest) {
      validatePluginManifest(manifest)
      if (store.has(manifest.id)) {
        throw new Error(`PluginError: plugin "${manifest.id}" is already registered`)
      }
      store.set(manifest.id, manifest)
    },

    unregister(id) {
      if (!store.has(id)) {
        throw new Error(`PluginError: plugin "${id}" is not registered`)
      }
      store.delete(id)
    },

    get(id) {
      return store.get(id)
    },

    list() {
      return [...store.values()]
    },

    listByType(type) {
      return [...store.values()].filter((m) => m.type === type)
    },

    allCapabilities() {
      const caps = new Set<string>()
      for (const m of store.values()) {
        for (const cap of m.capabilities) caps.add(cap)
      }
      return [...caps]
    },
  }
}

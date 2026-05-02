import { describe, it, expect } from 'vitest'
import {
  validatePluginManifest,
  createPluginRegistry,
  type PluginManifest,
} from './loader.js'

const agentPlugin: PluginManifest = {
  id: 'my-agent-plugin',
  name: 'My Agent Plugin',
  version: '1.0.0',
  type: 'agent',
  capabilities: ['climate-analysis'],
  entrypoint: './my-agent.js',
}

const toolPlugin: PluginManifest = {
  id: 'my-tool-plugin',
  name: 'My Tool Plugin',
  version: '0.2.1',
  type: 'tool',
  capabilities: ['data-fetch'],
  entrypoint: './my-tool.js',
}

describe('validatePluginManifest', () => {
  it('accepts a valid agent plugin', () => {
    expect(() => validatePluginManifest(agentPlugin)).not.toThrow()
  })

  it('accepts a valid tool plugin', () => {
    expect(() => validatePluginManifest(toolPlugin)).not.toThrow()
  })

  it('rejects a plugin with missing id', () => {
    const invalid = { ...agentPlugin, id: '' }
    expect(() => validatePluginManifest(invalid)).toThrow()
  })

  it('rejects a plugin with missing name', () => {
    const invalid = { ...agentPlugin, name: '' }
    expect(() => validatePluginManifest(invalid)).toThrow()
  })

  it('rejects a plugin with invalid type', () => {
    const invalid = { ...agentPlugin, type: 'unknown-type' as any }
    expect(() => validatePluginManifest(invalid)).toThrow()
  })

  it('rejects a plugin with missing entrypoint', () => {
    const invalid = { ...agentPlugin, entrypoint: '' }
    expect(() => validatePluginManifest(invalid)).toThrow()
  })

  it('rejects a plugin with invalid semver version', () => {
    const invalid = { ...agentPlugin, version: 'not-a-version' }
    expect(() => validatePluginManifest(invalid)).toThrow()
  })

  it('accepts a workflow-template plugin type', () => {
    const wf: PluginManifest = { ...agentPlugin, type: 'workflow-template' }
    expect(() => validatePluginManifest(wf)).not.toThrow()
  })
})

describe('createPluginRegistry', () => {
  it('starts empty', () => {
    const registry = createPluginRegistry()
    expect(registry.list()).toHaveLength(0)
  })

  it('registers a valid plugin', () => {
    const registry = createPluginRegistry()
    registry.register(agentPlugin)
    expect(registry.list()).toHaveLength(1)
  })

  it('retrieves a registered plugin by id', () => {
    const registry = createPluginRegistry()
    registry.register(agentPlugin)
    const found = registry.get('my-agent-plugin')
    expect(found).toBeDefined()
    expect(found!.name).toBe('My Agent Plugin')
  })

  it('returns undefined for unknown id', () => {
    const registry = createPluginRegistry()
    expect(registry.get('nonexistent')).toBeUndefined()
  })

  it('throws when registering a duplicate id', () => {
    const registry = createPluginRegistry()
    registry.register(agentPlugin)
    expect(() => registry.register(agentPlugin)).toThrow()
  })

  it('filters plugins by type', () => {
    const registry = createPluginRegistry()
    registry.register(agentPlugin)
    registry.register(toolPlugin)
    expect(registry.listByType('agent')).toHaveLength(1)
    expect(registry.listByType('tool')).toHaveLength(1)
    expect(registry.listByType('workflow-template')).toHaveLength(0)
  })

  it('unregisters a plugin', () => {
    const registry = createPluginRegistry()
    registry.register(agentPlugin)
    registry.unregister('my-agent-plugin')
    expect(registry.list()).toHaveLength(0)
  })

  it('throws when unregistering a non-existent plugin', () => {
    const registry = createPluginRegistry()
    expect(() => registry.unregister('ghost')).toThrow()
  })

  it('reports capabilities provided by all registered plugins', () => {
    const registry = createPluginRegistry()
    registry.register(agentPlugin)
    registry.register(toolPlugin)
    const caps = registry.allCapabilities()
    expect(caps).toContain('climate-analysis')
    expect(caps).toContain('data-fetch')
  })
})

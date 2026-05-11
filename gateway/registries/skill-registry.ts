import type { SkillMeta } from '../skills/loader.js'
import type { ComplianceTag, CostTier } from '../skills/schema.js'

export interface SkillRegistration extends SkillMeta {
  version?: string
  author?: string
  source: 'builtin' | 'community' | 'user'
  enabled: boolean
}

export interface SkillSearchOptions {
  query?: string
  complianceTag?: ComplianceTag
  costTier?: CostTier
  source?: SkillRegistration['source']
  enabledOnly?: boolean
}

export class SkillRegistry {
  private readonly store = new Map<string, SkillRegistration>()

  register(skill: SkillRegistration): void {
    if (!skill.id) throw new Error('SkillRegistryError: "id" is required')
    if (this.store.has(skill.id)) {
      throw new Error(`SkillRegistryError: skill "${skill.id}" already registered`)
    }
    this.store.set(skill.id, skill)
  }

  update(id: string, updates: Partial<Omit<SkillRegistration, 'id'>>): SkillRegistration {
    const existing = this.store.get(id)
    if (!existing) throw new Error(`SkillRegistryError: skill "${id}" not found`)
    const updated: SkillRegistration = { ...existing, ...updates }
    this.store.set(id, updated)
    return updated
  }

  get(id: string): SkillRegistration | undefined {
    return this.store.get(id)
  }

  has(id: string): boolean {
    return this.store.has(id)
  }

  list(): SkillRegistration[] {
    return [...this.store.values()]
  }

  search(options: SkillSearchOptions): SkillRegistration[] {
    let results = [...this.store.values()]

    if (options.enabledOnly) {
      results = results.filter((s) => s.enabled)
    }
    if (options.source) {
      results = results.filter((s) => s.source === options.source)
    }
    if (options.complianceTag) {
      results = results.filter((s) => s.complianceTags.includes(options.complianceTag!))
    }
    if (options.costTier) {
      results = results.filter((s) => s.costTier === options.costTier)
    }
    if (options.query) {
      const q = options.query.toLowerCase()
      results = results.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          (s.description?.toLowerCase().includes(q) ?? false)
      )
    }

    return results
  }

  unregister(id: string): boolean {
    return this.store.delete(id)
  }

  enable(id: string): void {
    this.update(id, { enabled: true })
  }

  disable(id: string): void {
    this.update(id, { enabled: false })
  }

  stats(): { total: number; enabled: number; bySource: Record<string, number> } {
    const all = this.list()
    const bySource: Record<string, number> = {}
    for (const s of all) {
      bySource[s.source] = (bySource[s.source] ?? 0) + 1
    }
    return {
      total: all.length,
      enabled: all.filter((s) => s.enabled).length,
      bySource,
    }
  }
}

export const skillRegistry = new SkillRegistry()

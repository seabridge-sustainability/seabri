import { describe, expect, it } from 'vitest'
import { InMemoryTelemetryStore, setTelemetryStoreForTesting } from '../telemetry/store.js'
import { optimizeSustainableCompute } from './sustainable-compute.js'

const base = {
  workflow_name: 'daily triage',
  task_type: 'classification',
  current_model: 'claude-opus-4-6',
  estimated_tokens: 8000,
  latency_priority: 'medium',
  cost_priority: 'high',
  privacy_priority: 'medium',
  sustainability_priority: 'high',
  repeated_task: true,
  cacheable: true,
  batchable: false,
} as const

describe('sustainable compute optimizer', () => {
  it('recommends smaller model and caching for simple repeated tasks', async () => {
    const store = new InMemoryTelemetryStore()
    setTelemetryStoreForTesting(store)

    const result = await optimizeSustainableCompute(base)

    expect(result.recommended_model_strategy).toContain('Downshift')
    expect(result.smaller_model_option).toContain('small')
    expect(result.caching_recommendation).toContain('Cache')
    expect(result.telemetry_id).toMatch(/^sco_/)
    expect(store.events.some((event) => event.type === 'sustainability_scored')).toBe(true)
    setTelemetryStoreForTesting(null)
  })

  it('recommends batching when batchable', async () => {
    const result = await optimizeSustainableCompute({ ...base, batchable: true })

    expect(result.batching_recommendation).toContain('Batch')
  })

  it('keeps stronger model for high-complexity reporting', async () => {
    const result = await optimizeSustainableCompute({
      ...base,
      task_type: 'reporting',
      estimated_tokens: 120_000,
      cacheable: false,
      repeated_task: false,
      batchable: false,
    })

    expect(result.recommended_model_strategy).toContain('Hybrid')
    expect(result.smaller_model_option).toContain('pre-filtering')
    expect(result.assumptions.length).toBeGreaterThan(1)
  })
})

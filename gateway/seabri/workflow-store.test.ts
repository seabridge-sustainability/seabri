import { describe, it, expect, beforeEach } from 'vitest'
import {
  registerWorkflow,
  getWorkflow,
  listWorkflows,
  clearWorkflows,
} from './workflow-store.js'

const MINIMAL_WORKFLOW = {
  version: 1 as const,
  name: 'test-workflow',
  description: 'A test workflow',
  steps: [
    {
      id: 'step-1',
      type: 'agent' as const,
      name: 'Ask climate agent',
      agentId: 'climate-risk',
      prompt: 'What is {{input.topic}}?',
    },
  ],
}

beforeEach(() => {
  clearWorkflows()
})

describe('registerWorkflow', () => {
  it('parses and stores a valid workflow definition', () => {
    const def = registerWorkflow(MINIMAL_WORKFLOW)
    expect(def.name).toBe('test-workflow')
    expect(def.steps).toHaveLength(1)
  })

  it('throws on invalid workflow (missing name)', () => {
    expect(() =>
      registerWorkflow({ version: 1, steps: [{ id: 's1', type: 'agent', name: 'x', agentId: 'climate-risk', prompt: 'p' }] }),
    ).toThrow()
  })

  it('overwrites a workflow with the same name', () => {
    registerWorkflow(MINIMAL_WORKFLOW)
    registerWorkflow({ ...MINIMAL_WORKFLOW, description: 'Updated' })
    expect(getWorkflow('test-workflow')?.description).toBe('Updated')
  })
})

describe('listWorkflows', () => {
  it('returns empty array initially', () => {
    expect(listWorkflows()).toEqual([])
  })

  it('returns all registered workflows', () => {
    registerWorkflow(MINIMAL_WORKFLOW)
    registerWorkflow({ ...MINIMAL_WORKFLOW, name: 'second-workflow' })
    expect(listWorkflows()).toHaveLength(2)
  })
})

describe('getWorkflow', () => {
  it('returns undefined for unknown name', () => {
    expect(getWorkflow('nope')).toBeUndefined()
  })

  it('returns the registered definition', () => {
    registerWorkflow(MINIMAL_WORKFLOW)
    expect(getWorkflow('test-workflow')?.name).toBe('test-workflow')
  })
})

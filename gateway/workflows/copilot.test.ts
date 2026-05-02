import { describe, it, expect, vi } from 'vitest'
import { WorkflowCopilot, CopilotError } from './copilot.js'
import type { LlmCaller } from './copilot.js'
import type { WorkflowDefinition } from './schema.js'

const makeValidWorkflow = (overrides: Partial<WorkflowDefinition> = {}): WorkflowDefinition => ({
  version: 1,
  name: 'Test Workflow',
  steps: [
    {
      id: 'step-1',
      type: 'agent',
      name: 'Check Risk',
      agentId: 'climate-risk',
      prompt: 'Check flood risk',
    },
  ],
  ...overrides,
})

describe('WorkflowCopilot', () => {
  describe('generate', () => {
    it('returns a valid WorkflowDefinition from natural language', async () => {
      const workflow = makeValidWorkflow()
      const mockLlm: LlmCaller = vi.fn().mockResolvedValue(JSON.stringify(workflow))

      const copilot = new WorkflowCopilot({ llm: mockLlm })
      const result = await copilot.generate('Check flood risk weekly')

      expect(result.version).toBe(1)
      expect(result.name).toBe('Test Workflow')
      expect(result.steps).toHaveLength(1)
      expect(result.steps[0].type).toBe('agent')
    })

    it('calls the LLM with the natural language input in the prompt', async () => {
      const workflow = makeValidWorkflow()
      const mockLlm: LlmCaller = vi.fn().mockResolvedValue(JSON.stringify(workflow))

      const copilot = new WorkflowCopilot({ llm: mockLlm })
      await copilot.generate('Create a weekly flood risk check')

      expect(mockLlm).toHaveBeenCalledOnce()
      const [prompt] = vi.mocked(mockLlm).mock.calls[0]
      expect(prompt).toContain('Create a weekly flood risk check')
    })

    it('includes WorkflowDefinition and JSON in the prompt', async () => {
      const workflow = makeValidWorkflow()
      const mockLlm: LlmCaller = vi.fn().mockResolvedValue(JSON.stringify(workflow))

      const copilot = new WorkflowCopilot({ llm: mockLlm })
      await copilot.generate('some task')

      const [prompt] = vi.mocked(mockLlm).mock.calls[0]
      expect(prompt).toContain('WorkflowDefinition')
      expect(prompt).toContain('JSON')
    })

    it('strips markdown json code fences from LLM response', async () => {
      const workflow = makeValidWorkflow()
      const fencedJson = `\`\`\`json\n${JSON.stringify(workflow)}\n\`\`\``
      const mockLlm: LlmCaller = vi.fn().mockResolvedValue(fencedJson)

      const copilot = new WorkflowCopilot({ llm: mockLlm })
      const result = await copilot.generate('some task')

      expect(result.version).toBe(1)
    })

    it('strips plain code fences from LLM response', async () => {
      const workflow = makeValidWorkflow()
      const fencedJson = `\`\`\`\n${JSON.stringify(workflow)}\n\`\`\``
      const mockLlm: LlmCaller = vi.fn().mockResolvedValue(fencedJson)

      const copilot = new WorkflowCopilot({ llm: mockLlm })
      const result = await copilot.generate('some task')

      expect(result.version).toBe(1)
    })

    it('throws CopilotError when LLM returns invalid JSON', async () => {
      const mockLlm: LlmCaller = vi.fn().mockResolvedValue('not valid json at all')

      const copilot = new WorkflowCopilot({ llm: mockLlm })
      await expect(copilot.generate('some task')).rejects.toBeInstanceOf(CopilotError)
    })

    it('throws CopilotError when workflow fails schema validation', async () => {
      const invalidWorkflow = { version: 1, name: 'Bad', steps: [] }
      const mockLlm: LlmCaller = vi.fn().mockResolvedValue(JSON.stringify(invalidWorkflow))

      const copilot = new WorkflowCopilot({ llm: mockLlm })
      await expect(copilot.generate('some task')).rejects.toBeInstanceOf(CopilotError)
    })

    it('throws CopilotError when LLM call rejects', async () => {
      const mockLlm: LlmCaller = vi.fn().mockRejectedValue(new Error('LLM timeout'))

      const copilot = new WorkflowCopilot({ llm: mockLlm })
      await expect(copilot.generate('some task')).rejects.toBeInstanceOf(CopilotError)
    })

    it('preserves trigger config in generated workflow', async () => {
      const workflow = makeValidWorkflow({
        trigger: { type: 'cron', expression: '0 9 * * 1' },
      })
      const mockLlm: LlmCaller = vi.fn().mockResolvedValue(JSON.stringify(workflow))

      const copilot = new WorkflowCopilot({ llm: mockLlm })
      const result = await copilot.generate('Check flood risk every Monday at 9am')

      expect(result.trigger).toEqual({ type: 'cron', expression: '0 9 * * 1' })
    })

    it('handles multi-step workflows', async () => {
      const workflow = makeValidWorkflow({
        steps: [
          { id: 's1', type: 'agent', name: 'Fetch', agentId: 'general', prompt: 'Fetch data' },
          { id: 's2', type: 'tool', name: 'Alert', toolName: 'email-tool', input: { to: 'user@example.com' } },
        ],
      })
      const mockLlm: LlmCaller = vi.fn().mockResolvedValue(JSON.stringify(workflow))

      const copilot = new WorkflowCopilot({ llm: mockLlm })
      const result = await copilot.generate('Fetch data and send email alert')

      expect(result.steps).toHaveLength(2)
      expect(result.steps[0].type).toBe('agent')
      expect(result.steps[1].type).toBe('tool')
    })

    it('uses default no-op LLM when none provided and throws CopilotError', async () => {
      const copilot = new WorkflowCopilot()
      await expect(copilot.generate('some task')).rejects.toBeInstanceOf(CopilotError)
    })
  })

  describe('buildPrompt', () => {
    it('returns a string containing the user request', () => {
      const copilot = new WorkflowCopilot()
      const prompt = copilot.buildPrompt('weekly flood check')
      expect(typeof prompt).toBe('string')
      expect(prompt).toContain('weekly flood check')
    })
  })
})

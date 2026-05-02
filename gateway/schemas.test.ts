import { describe, it, expect } from 'vitest'
import {
  AgentIdSchema,
  InitMessageSchema,
  ChatMessageSchema,
  IncomingMessageSchema,
  ToolDefinitionSchema,
  MetricRecordSchema,
  FeedbackSchema,
  WorkflowDefinitionSchema,
  parseIncomingMessage,
  AGENT_IDS,
} from './schemas.js'

describe('AgentIdSchema', () => {
  it('accepts valid agent IDs', () => {
    for (const id of AGENT_IDS) {
      expect(AgentIdSchema.parse(id)).toBe(id)
    }
  })

  it('rejects invalid agent ID', () => {
    expect(() => AgentIdSchema.parse('invalid-agent')).toThrow()
  })
})

describe('InitMessageSchema', () => {
  it('parses valid init message', () => {
    const msg = { type: 'init', agentId: 'climate-risk' }
    expect(InitMessageSchema.parse(msg)).toEqual(msg)
  })

  it('accepts optional sessionId', () => {
    const msg = { type: 'init', agentId: 'general', sessionId: 'abc-123' }
    const result = InitMessageSchema.parse(msg)
    expect(result.sessionId).toBe('abc-123')
  })

  it('rejects missing agentId', () => {
    expect(() => InitMessageSchema.parse({ type: 'init' })).toThrow()
  })
})

describe('ChatMessageSchema', () => {
  it('parses valid chat message', () => {
    const msg = { type: 'chat', content: 'Hello' }
    expect(ChatMessageSchema.parse(msg)).toEqual(msg)
  })

  it('rejects empty content', () => {
    expect(() => ChatMessageSchema.parse({ type: 'chat', content: '' })).toThrow()
  })
})

describe('IncomingMessageSchema', () => {
  it('discriminates init vs chat', () => {
    const init = IncomingMessageSchema.parse({ type: 'init', agentId: 'general' })
    expect(init.type).toBe('init')

    const chat = IncomingMessageSchema.parse({ type: 'chat', content: 'test' })
    expect(chat.type).toBe('chat')
  })

  it('rejects unknown type', () => {
    expect(() => IncomingMessageSchema.parse({ type: 'unknown' })).toThrow()
  })
})

describe('parseIncomingMessage', () => {
  it('parses JSON string to validated message', () => {
    const result = parseIncomingMessage('{"type":"chat","content":"hi"}')
    expect(result.type).toBe('chat')
  })

  it('throws on invalid JSON', () => {
    expect(() => parseIncomingMessage('not json')).toThrow()
  })

  it('throws on invalid schema', () => {
    expect(() => parseIncomingMessage('{"type":"chat"}')).toThrow()
  })
})

describe('ToolDefinitionSchema', () => {
  it('validates a complete tool definition', () => {
    const tool = {
      name: 'web_search',
      description: 'Search the web',
      input_schema: {
        type: 'object' as const,
        properties: {
          query: { type: 'string', description: 'Search query' },
        },
        required: ['query'],
      },
    }
    expect(ToolDefinitionSchema.parse(tool)).toEqual(tool)
  })

  it('rejects tool without name', () => {
    expect(() =>
      ToolDefinitionSchema.parse({
        description: 'test',
        input_schema: { type: 'object', properties: {}, required: [] },
      }),
    ).toThrow()
  })
})

describe('MetricRecordSchema', () => {
  it('parses valid metric', () => {
    const metric = {
      model: 'claude-sonnet-4-6',
      inputTokens: 100,
      outputTokens: 200,
      costUsd: 0.003,
      latencyMs: 1500,
      toolCalls: 2,
    }
    expect(MetricRecordSchema.parse(metric)).toMatchObject(metric)
  })

  it('defaults toolCalls to 0', () => {
    const metric = {
      model: 'claude-haiku-4-5',
      inputTokens: 50,
      outputTokens: 100,
      costUsd: 0.001,
      latencyMs: 500,
    }
    expect(MetricRecordSchema.parse(metric).toolCalls).toBe(0)
  })
})

describe('FeedbackSchema', () => {
  it('accepts valid feedback', () => {
    const fb = { rating: 1, signal: 'thumbs_up' as const }
    expect(FeedbackSchema.parse(fb)).toMatchObject(fb)
  })

  it('rejects rating out of range', () => {
    expect(() => FeedbackSchema.parse({ rating: 5 })).toThrow()
  })
})

describe('WorkflowDefinitionSchema', () => {
  it('validates a simple workflow', () => {
    const wf = {
      version: 1 as const,
      steps: [
        {
          id: 'step1',
          type: 'agent' as const,
          name: 'Analyze',
          agentId: 'climate-risk' as const,
        },
      ],
    }
    expect(WorkflowDefinitionSchema.parse(wf)).toMatchObject(wf)
  })

  it('rejects empty steps', () => {
    expect(() =>
      WorkflowDefinitionSchema.parse({ version: 1, steps: [] }),
    ).toThrow()
  })
})

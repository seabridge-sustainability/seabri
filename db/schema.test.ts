import { describe, it, expect } from 'vitest'
import { users, sessions, messages, workflows, workflowRuns, metrics, skills, feedback } from './schema.js'

describe('Database Schema', () => {
  it('exports all expected tables', () => {
    expect(users).toBeDefined()
    expect(sessions).toBeDefined()
    expect(messages).toBeDefined()
    expect(workflows).toBeDefined()
    expect(workflowRuns).toBeDefined()
    expect(metrics).toBeDefined()
    expect(skills).toBeDefined()
    expect(feedback).toBeDefined()
  })

  it('users table has expected columns', () => {
    const cols = Object.keys(users)
    expect(cols).toContain('id')
    expect(cols).toContain('email')
    expect(cols).toContain('name')
    expect(cols).toContain('passwordHash')
    expect(cols).toContain('createdAt')
    expect(cols).toContain('updatedAt')
  })

  it('sessions table has expected columns', () => {
    const cols = Object.keys(sessions)
    expect(cols).toContain('id')
    expect(cols).toContain('userId')
    expect(cols).toContain('agentId')
    expect(cols).toContain('name')
    expect(cols).toContain('turnCount')
    expect(cols).toContain('compressed')
  })

  it('messages table has expected columns', () => {
    const cols = Object.keys(messages)
    expect(cols).toContain('id')
    expect(cols).toContain('sessionId')
    expect(cols).toContain('role')
    expect(cols).toContain('content')
    expect(cols).toContain('toolName')
    expect(cols).toContain('model')
    expect(cols).toContain('inputTokens')
    expect(cols).toContain('outputTokens')
  })

  it('metrics table has expected columns', () => {
    const cols = Object.keys(metrics)
    expect(cols).toContain('model')
    expect(cols).toContain('inputTokens')
    expect(cols).toContain('outputTokens')
    expect(cols).toContain('costUsd')
    expect(cols).toContain('latencyMs')
    expect(cols).toContain('carbonGrams')
    expect(cols).toContain('toolCalls')
  })

  it('workflows table has definition and trigger columns', () => {
    const cols = Object.keys(workflows)
    expect(cols).toContain('definition')
    expect(cols).toContain('triggerType')
    expect(cols).toContain('triggerConfig')
    expect(cols).toContain('enabled')
  })

  it('skills table has versioning columns', () => {
    const cols = Object.keys(skills)
    expect(cols).toContain('name')
    expect(cols).toContain('version')
    expect(cols).toContain('usageCount')
    expect(cols).toContain('avgRating')
  })

  it('feedback table has signal column', () => {
    const cols = Object.keys(feedback)
    expect(cols).toContain('rating')
    expect(cols).toContain('signal')
    expect(cols).toContain('comment')
  })
})

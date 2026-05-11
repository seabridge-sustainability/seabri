import { describe, it, expect } from 'vitest'
import { needsCompression } from './compress.js'
import type { Message } from './compress.js'

function makeMessages(count: number): Message[] {
  return Array.from({ length: count }, (_, i) => ({
    role: i % 2 === 0 ? 'user' : 'assistant',
    content: `Message ${i + 1}`,
  }))
}

describe('needsCompression', () => {
  it('returns false for empty history', () => {
    expect(needsCompression([])).toBe(false)
  })

  it('returns false for history under threshold', () => {
    expect(needsCompression(makeMessages(10))).toBe(false)
  })

  it('returns false for history at threshold', () => {
    expect(needsCompression(makeMessages(20))).toBe(false)
  })

  it('returns true for history above threshold', () => {
    expect(needsCompression(makeMessages(21))).toBe(true)
  })

  it('returns true for large history', () => {
    expect(needsCompression(makeMessages(100))).toBe(true)
  })
})

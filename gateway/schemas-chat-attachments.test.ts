import { describe, expect, it } from 'vitest'
import { parseIncomingMessage } from './schemas.js'

describe('WebSocket chat attachment schema', () => {
  it('accepts bounded image attachments for visible incident workflow', () => {
    const parsed = parseIncomingMessage(JSON.stringify({
      type: 'chat',
      content: "it's flooding",
      attachments: [{ kind: 'image', mime: 'image/jpeg', name: 'bathroom.jpg', data: 'abcd1234abcd1234' }],
    }))

    expect(parsed.type).toBe('chat')
    if (parsed.type !== 'chat') throw new Error('expected chat message')
    expect(parsed.attachments?.[0].name).toBe('bathroom.jpg')
  })
})

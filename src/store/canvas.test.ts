import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCanvasStore } from './canvas'
import type { CanvasBlock, CanvasEvent } from '../types/canvas'

type MockSocket = {
  onopen?: () => void
  onclose?: () => void
  onerror?: () => void
  onmessage?: (ev: { data: string }) => void
  close: () => void
  readyState: number
}

let lastSocket: MockSocket | null = null

class FakeWebSocket implements MockSocket {
  onopen?: () => void
  onclose?: () => void
  onerror?: () => void
  onmessage?: (ev: { data: string }) => void
  readyState = 0
  constructor(public url: string) {
    lastSocket = this
  }
  close() {
    this.readyState = 3
    this.onclose?.()
  }
}

beforeEach(() => {
  lastSocket = null
  vi.stubGlobal('WebSocket', FakeWebSocket)
  useCanvasStore.setState({
    open: false,
    connected: false,
    status: 'idle',
    blocks: [],
    socket: null,
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const textBlock: CanvasBlock = {
  kind: 'text',
  id: 't1',
  title: 'Hello',
  body: 'World',
}

describe('useCanvasStore', () => {
  it('toggle flips the open flag', () => {
    expect(useCanvasStore.getState().open).toBe(false)
    useCanvasStore.getState().toggle()
    expect(useCanvasStore.getState().open).toBe(true)
  })

  it('append adds blocks in order', () => {
    useCanvasStore.getState().append(textBlock)
    useCanvasStore.getState().append({ ...textBlock, id: 't2' })
    expect(useCanvasStore.getState().blocks.map((b) => b.id)).toEqual(['t1', 't2'])
  })

  it('clear resets blocks and marks status', () => {
    useCanvasStore.getState().append(textBlock)
    useCanvasStore.getState().clear()
    expect(useCanvasStore.getState().blocks).toEqual([])
    expect(useCanvasStore.getState().status).toBe('cleared')
  })

  it('connect wires onopen, onmessage(block), onmessage(clear), onclose', () => {
    useCanvasStore.getState().connect('ws://localhost:18791')
    expect(lastSocket).not.toBeNull()
    lastSocket!.onopen?.()
    expect(useCanvasStore.getState().connected).toBe(true)
    expect(useCanvasStore.getState().status).toBe('live')

    const blockEvent: CanvasEvent = { type: 'block', block: textBlock }
    lastSocket!.onmessage?.({ data: JSON.stringify(blockEvent) })
    expect(useCanvasStore.getState().blocks).toHaveLength(1)

    lastSocket!.onmessage?.({ data: JSON.stringify({ type: 'clear' } satisfies CanvasEvent) })
    expect(useCanvasStore.getState().blocks).toEqual([])

    lastSocket!.onmessage?.({ data: JSON.stringify({ type: 'status', status: 'thinking' } satisfies CanvasEvent) })
    expect(useCanvasStore.getState().status).toBe('thinking')

    lastSocket!.onclose?.()
    expect(useCanvasStore.getState().connected).toBe(false)
    expect(useCanvasStore.getState().socket).toBeNull()
  })

  it('connect is a no-op when already connected or url empty', () => {
    useCanvasStore.getState().connect('')
    expect(lastSocket).toBeNull()

    useCanvasStore.getState().connect('ws://x')
    const first = lastSocket
    useCanvasStore.getState().connect('ws://y')
    expect(lastSocket).toBe(first)
  })

  it('onmessage silently ignores non-JSON payloads', () => {
    useCanvasStore.getState().connect('ws://localhost:18791')
    lastSocket!.onmessage?.({ data: 'not-json' })
    expect(useCanvasStore.getState().blocks).toEqual([])
  })

  it('disconnect closes the socket', () => {
    useCanvasStore.getState().connect('ws://localhost:18791')
    useCanvasStore.getState().disconnect()
    expect(useCanvasStore.getState().socket).toBeNull()
    expect(useCanvasStore.getState().connected).toBe(false)
  })
})

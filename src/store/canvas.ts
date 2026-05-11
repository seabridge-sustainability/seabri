import { create } from 'zustand'
import type { CanvasBlock, CanvasEvent } from '../types/canvas'

interface CanvasState {
  open: boolean
  connected: boolean
  status: string
  blocks: CanvasBlock[]
  socket: WebSocket | null

  toggle: () => void
  setOpen: (open: boolean) => void
  clear: () => void
  append: (block: CanvasBlock) => void
  connect: (url: string) => void
  disconnect: () => void
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  open: false,
  connected: false,
  status: 'idle',
  blocks: [],
  socket: null,

  toggle: () => set((s) => ({ open: !s.open })),
  setOpen: (open) => set({ open }),
  clear: () => set({ blocks: [], status: 'cleared' }),
  append: (block) => set((s) => ({ blocks: [...s.blocks, block] })),

  connect: (url) => {
    if (get().socket || !url) return
    let ws: WebSocket
    try {
      ws = new WebSocket(url)
    } catch {
      set({ connected: false, status: 'unreachable' })
      return
    }
    ws.onopen = () => {
      if (get().socket === ws) set({ connected: true, status: 'live' })
    }
    ws.onclose = () => {
      if (get().socket === ws) set({ connected: false, socket: null, status: 'closed' })
    }
    ws.onerror = () => {
      if (get().socket === ws) set({ status: 'error' })
    }
    ws.onmessage = (ev) => {
      try {
        const payload = JSON.parse(String(ev.data)) as CanvasEvent
        if (payload.type === 'clear') set({ blocks: [] })
        else if (payload.type === 'block' && payload.block) {
          set((s) => ({ blocks: [...s.blocks, payload.block!] }))
        } else if (payload.type === 'status' && payload.status) {
          set({ status: payload.status })
        }
      } catch {
        // non-JSON frames are ignored
      }
    }
    set({ socket: ws })
  },

  disconnect: () => {
    const ws = get().socket
    if (ws) ws.close()
    set({ socket: null, connected: false })
  },
}))

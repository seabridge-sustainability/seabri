import { create } from 'zustand'
import type { Agent, Message, Session } from '../types/openseabri'
import { streamAnthropicMessage } from '../lib/anthropic'
import { DEFAULT_AGENT_ID, getAgent } from '../lib/agents'
import { uid } from '../lib/id'

const STORAGE_KEY = 'openseabri.sessions.v1'

interface Persisted {
  sessions: Session[]
  activeSessionId: string | null
}

function loadPersisted(): Persisted {
  if (typeof localStorage === 'undefined') return { sessions: [], activeSessionId: null }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { sessions: [], activeSessionId: null }
    const parsed = JSON.parse(raw) as Persisted
    return {
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      activeSessionId: parsed.activeSessionId ?? null,
    }
  } catch {
    return { sessions: [], activeSessionId: null }
  }
}

function savePersisted(state: Persisted): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // quota or serialization failures are non-fatal
  }
}

interface ChatState {
  sessions: Session[]
  activeSessionId: string | null
  isStreaming: boolean
  apiError: string | null
  streamController: AbortController | null

  getActiveSession: () => Session | null
  getActiveAgent: () => Agent
  startSession: (agent: Agent) => string
  selectSession: (id: string) => void
  clearActiveSession: () => void
  deleteSession: (id: string) => void
  clearError: () => void
  sendMessage: (text: string, apiKey: string) => Promise<void>
  abort: () => void
}

function sessionTitle(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ')
  return t.length > 42 ? t.slice(0, 42) + '…' : t || 'New chat'
}

export const useChatStore = create<ChatState>((set, get) => {
  const initial = loadPersisted()

  const persist = (): void => {
    const { sessions, activeSessionId } = get()
    savePersisted({ sessions, activeSessionId })
  }

  return {
    sessions: initial.sessions,
    activeSessionId: initial.activeSessionId,
    isStreaming: false,
    apiError: null,
    streamController: null,

    getActiveSession: () => {
      const { sessions, activeSessionId } = get()
      return sessions.find((s) => s.id === activeSessionId) ?? null
    },

    getActiveAgent: () => {
      const active = get().getActiveSession()
      const agentId = active?.agentId ?? DEFAULT_AGENT_ID
      return getAgent(agentId) ?? getAgent(DEFAULT_AGENT_ID)!
    },

    startSession: (agent) => {
      const now = Date.now()
      const id = uid('s')
      const session: Session = {
        id,
        title: 'New chat',
        agentId: agent.id,
        createdAt: now,
        updatedAt: now,
        messages: [],
      }
      set((state) => ({
        sessions: [session, ...state.sessions],
        activeSessionId: id,
        apiError: null,
      }))
      persist()
      return id
    },

    selectSession: (id) => {
      set({ activeSessionId: id, apiError: null })
      persist()
    },

    clearActiveSession: () => {
      set({ activeSessionId: null, apiError: null })
      persist()
    },

    deleteSession: (id) => {
      set((state) => {
        const sessions = state.sessions.filter((s) => s.id !== id)
        const activeSessionId =
          state.activeSessionId === id ? (sessions[0]?.id ?? null) : state.activeSessionId
        return { sessions, activeSessionId }
      })
      persist()
    },

    clearError: () => set({ apiError: null }),

    abort: () => {
      const c = get().streamController
      if (c) c.abort()
    },

    sendMessage: async (text, apiKey) => {
      const userText = text.trim()
      if (!userText || get().isStreaming) return

      if (!apiKey) {
        set({ apiError: 'missing_key' })
        return
      }

      let { activeSessionId } = get()
      const agent = get().getActiveAgent()

      if (!activeSessionId) {
        activeSessionId = get().startSession(agent)
      }

      const now = Date.now()
      const userMsg: Message = {
        id: uid('m'),
        role: 'user',
        content: userText,
        createdAt: now,
        agentId: agent.id,
      }
      const assistantMsg: Message = {
        id: uid('m'),
        role: 'assistant',
        content: '',
        createdAt: now + 1,
        agentId: agent.id,
      }

      set((state) => ({
        apiError: null,
        isStreaming: true,
        sessions: state.sessions.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                messages: [...s.messages, userMsg, assistantMsg],
                title: s.messages.length === 0 ? sessionTitle(userText) : s.title,
                updatedAt: now,
              }
            : s
        ),
      }))
      persist()

      const controller = new AbortController()
      set({ streamController: controller })

      const history: Pick<Message, 'role' | 'content'>[] = (get().getActiveSession()?.messages ?? [])
        .filter((m) => m.id !== assistantMsg.id)
        .map(({ role, content }) => ({ role, content }))

      let accumulated = ''
      const patchAssistant = (patch: Partial<Message>): void => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === activeSessionId
              ? {
                  ...s,
                  messages: s.messages.map((m) => (m.id === assistantMsg.id ? { ...m, ...patch } : m)),
                  updatedAt: Date.now(),
                }
              : s
          ),
        }))
      }

      try {
        await streamAnthropicMessage({
          apiKey,
          systemPrompt: agent.systemPrompt,
          history,
          signal: controller.signal,
          onDelta: (delta) => {
            accumulated += delta
            patchAssistant({ content: accumulated })
          },
        })
      } catch (err) {
        const e = err as Error
        if (e.name === 'AbortError') {
          patchAssistant({ content: accumulated || '(cancelled)' })
        } else {
          patchAssistant({ content: `Error: ${e.message}`, error: e.message })
          set({ apiError: e.message })
        }
      } finally {
        set({ isStreaming: false, streamController: null })
        persist()
      }
    },
  }
})

import { create } from 'zustand'
import type { Agent, Message, Session } from '../types/openseabri'
import { streamAnthropicMessage, type RawAttachment } from '../lib/anthropic'
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

const WS_TOKEN = import.meta.env.VITE_WS_TOKEN as string | undefined

function httpToWs(url: string): string {
  const base = url.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:').replace(/\/$/, '')
  if (WS_TOKEN) {
    const sep = base.includes('?') ? '&' : '?'
    return `${base}${sep}token=${encodeURIComponent(WS_TOKEN)}`
  }
  return base
}

export interface ActionCard {
  id: string
  kind: string
  card: string
}

function streamViaGateway(
  gatewayUrl: string,
  agentId: string,
  content: string,
  sessionId: string | null,
  attachments: RawAttachment[] | undefined,
  onToken: (t: string) => void,
  onSessionId: (id: string) => void,
  onActionCard: (card: ActionCard) => void,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(httpToWs(gatewayUrl))
    let ready = false
    let done = false

    const cleanup = (): void => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close()
      }
    }

    signal.addEventListener('abort', () => {
      cleanup()
      reject(Object.assign(new Error('AbortError'), { name: 'AbortError' }))
    })

    ws.onopen = () => {
      const initMsg: Record<string, string> = { type: 'init', agentId }
      if (sessionId) initMsg.sessionId = sessionId
      ws.send(JSON.stringify(initMsg))
    }

    ws.onmessage = (ev: MessageEvent) => {
      let msg: { type: string; content?: string; message?: string; sessionId?: string; id?: string; kind?: string; card?: string }
      try {
        msg = JSON.parse(ev.data as string) as typeof msg
      } catch {
        return
      }

      if (msg.type === 'ready' && !ready) {
        ready = true
        if (msg.sessionId) onSessionId(msg.sessionId)
        ws.send(JSON.stringify({ type: 'chat', content, attachments }))
        return
      }

      if (msg.type === 'token' && msg.content) {
        onToken(msg.content)
        return
      }

      if (msg.type === 'action_card' && msg.id && msg.kind && msg.card) {
        onActionCard({ id: msg.id, kind: msg.kind, card: msg.card })
        return
      }

      if (msg.type === 'done') {
        done = true
        cleanup()
        resolve()
        return
      }

      if (msg.type === 'error') {
        cleanup()
        reject(new Error(msg.message ?? 'Gateway error'))
      }
    }

    ws.onerror = () => {
      if (!done) reject(new Error('Gateway WebSocket error'))
    }

    ws.onclose = () => {
      if (!done) reject(new Error('Gateway WebSocket closed unexpectedly'))
    }
  })
}

function approveViaGateway(
  gatewayUrl: string,
  agentId: string,
  sessionId: string,
  approvalId: string,
  approved: boolean,
  onToken: (t: string) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(httpToWs(gatewayUrl))
    let ready = false
    let done = false

    const cleanup = (): void => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close()
      }
    }

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'init', agentId, sessionId }))
    }

    ws.onmessage = (ev: MessageEvent) => {
      let msg: { type: string; content?: string; message?: string; ok?: boolean }
      try {
        msg = JSON.parse(ev.data as string) as typeof msg
      } catch {
        return
      }

      if (msg.type === 'ready' && !ready) {
        ready = true
        ws.send(JSON.stringify({ type: approved ? 'approve' : 'deny', id: approvalId }))
        return
      }

      if (msg.type === 'token' && msg.content) {
        onToken(msg.content)
        return
      }

      if (msg.type === 'approval_result') {
        // result received; wait for done
        return
      }

      if (msg.type === 'done') {
        done = true
        cleanup()
        resolve()
        return
      }

      if (msg.type === 'error') {
        cleanup()
        reject(new Error(msg.message ?? 'Gateway error'))
      }
    }

    ws.onerror = () => {
      if (!done) reject(new Error('Gateway WebSocket error'))
    }

    ws.onclose = () => {
      if (!done) {
        // Gateway closes after sending done — treat as resolved
        resolve()
      }
    }
  })
}

interface ChatState {
  sessions: Session[]
  activeSessionId: string | null
  isStreaming: boolean
  apiError: string | null
  streamController: AbortController | null
  pendingApprovals: ActionCard[]
  gatewaySessionId: string | null

  getActiveSession: () => Session | null
  getActiveAgent: () => Agent
  startSession: (agent: Agent) => string
  selectSession: (id: string) => void
  clearActiveSession: () => void
  deleteSession: (id: string) => void
  clearError: () => void
  sendMessage: (text: string, apiKey: string, gatewayUrl?: string, attachments?: RawAttachment[]) => Promise<void>
  resolveApproval: (id: string, approved: boolean, gatewayUrl: string) => Promise<void>
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
    pendingApprovals: [],
    gatewaySessionId: null,

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

    resolveApproval: async (id, approved, gatewayUrl) => {
      // Optimistically remove from pending list
      set((state) => ({ pendingApprovals: state.pendingApprovals.filter((a) => a.id !== id) }))

      const { gatewaySessionId, getActiveAgent } = get()
      if (!gatewaySessionId) return

      const agent = getActiveAgent()
      const activeSessionId = get().activeSessionId

      const assistantMsg: Message = {
        id: uid('m'),
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
        agentId: agent.id,
      }

      if (activeSessionId) {
        set((state) => ({
          isStreaming: true,
          sessions: state.sessions.map((s) =>
            s.id === activeSessionId
              ? { ...s, messages: [...s.messages, assistantMsg], updatedAt: Date.now() }
              : s
          ),
        }))
      }

      let accumulated = ''
      const patchApprovalMsg = (patch: Partial<Message>): void => {
        if (!activeSessionId) return
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === activeSessionId
              ? { ...s, messages: s.messages.map((m) => (m.id === assistantMsg.id ? { ...m, ...patch } : m)), updatedAt: Date.now() }
              : s
          ),
        }))
      }

      try {
        await approveViaGateway(
          gatewayUrl,
          agent.id,
          gatewaySessionId,
          id,
          approved,
          (token) => {
            accumulated += token
            patchApprovalMsg({ content: accumulated })
          },
        )
      } catch {
        if (accumulated) {
          patchApprovalMsg({ content: accumulated })
        } else if (activeSessionId) {
          set((state) => ({
            sessions: state.sessions.map((s) =>
              s.id === activeSessionId
                ? { ...s, messages: s.messages.filter((m) => m.id !== assistantMsg.id) }
                : s
            ),
          }))
        }
      } finally {
        set({ isStreaming: false })
        persist()
      }
    },

    sendMessage: async (text, apiKey, gatewayUrl, attachments) => {
      const userText = text.trim()
      if (!userText || get().isStreaming) return

      const useGateway = Boolean(gatewayUrl)
      if (!useGateway && !apiKey) {
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
        if (useGateway) {
          await streamViaGateway(
            gatewayUrl!,
            agent.id,
            userText,
            get().gatewaySessionId,
            attachments,
            (token) => {
              accumulated += token
              patchAssistant({ content: accumulated })
            },
            (sid) => set({ gatewaySessionId: sid }),
            (card) => set((state) => ({ pendingApprovals: [...state.pendingApprovals, card] })),
            controller.signal,
          )
        } else {
          await streamAnthropicMessage({
            apiKey,
            systemPrompt: agent.systemPrompt,
            history,
            attachments,
            signal: controller.signal,
            onDelta: (delta) => {
              accumulated += delta
              patchAssistant({ content: accumulated })
            },
          })
        }
      } catch (err) {
        const e = err as Error
        if (e.name === 'AbortError') {
          patchAssistant({ content: accumulated || '(cancelled)' })
        } else {
          // Remove empty placeholder; surface error in banner only
          if (!accumulated) {
            set((state) => ({
              sessions: state.sessions.map((s) =>
                s.id === activeSessionId
                  ? { ...s, messages: s.messages.filter((m) => m.id !== assistantMsg.id) }
                  : s
              ),
              apiError: e.message,
            }))
          } else {
            patchAssistant({ content: accumulated, error: e.message })
            set({ apiError: e.message })
          }
        }
      } finally {
        set({ isStreaming: false, streamController: null })
        persist()
      }
    },
  }
})

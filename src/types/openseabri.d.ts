export interface Agent {
  id: string
  name: string
  tagline: string
  color: string
  icon: string
  description: string
  systemPrompt: string
  starterQuestions: string[]
}

export type MessageRole = 'user' | 'assistant' | 'system'

export interface Attachment {
  id: string
  kind: 'image' | 'audio' | 'video' | 'file'
  mime: string
  name: string
  sha256: string
  sizeBytes: number
  url?: string
}

export interface Message {
  id: string
  role: MessageRole
  content: string
  createdAt: number
  agentId?: string
  attachments?: Attachment[]
  error?: string
}

export interface Session {
  id: string
  title: string
  agentId: string
  createdAt: number
  updatedAt: number
  messages: Message[]
}

export interface ConnectionState {
  seabridge: 'connected' | 'standalone' | 'checking'
  gateway: 'connected' | 'disconnected' | 'unknown'
}

declare global {
  interface ImportMetaEnv {
    readonly MODE: string
    readonly DEV: boolean
    readonly PROD: boolean
    readonly SSR: boolean
    readonly BASE_URL: string
    readonly VITE_ANTHROPIC_API_KEY?: string
    readonly VITE_ANTHROPIC_MODEL?: string
    readonly VITE_SEABRIDGE_API_URL?: string
    readonly VITE_GATEWAY_URL?: string
    readonly VITE_CANVAS_WS_URL?: string
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}

export {}

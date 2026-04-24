/**
 * MCP (Model Context Protocol) stdio server for OpenSeaBri.
 *
 * Exposes each of OpenSeaBri's 8 sustainability specialists as an MCP tool,
 * so Claude Desktop (or any MCP client) can call them directly:
 *
 *   client → stdin (JSON-RPC 2.0) → this process → routeMessage(agentId, …)
 *                                                  ↓
 *                                             Anthropic API
 *                                                  ↓
 *   client ← stdout (JSON-RPC 2.0) ← tool result
 *
 * Zero external deps — we speak JSON-RPC 2.0 + MCP framing directly over
 * stdio using length-prefixed line-delimited messages. This keeps the
 * gateway install weightless and degrades gracefully when the MCP SDK is
 * unavailable.
 *
 * Wire format (MCP stdio transport): each message is a single line of
 * UTF-8 JSON, terminated by '\n'. No Content-Length headers — stdio
 * transport uses newline-delimited JSON per the spec.
 */

import { routeMessage } from '../agents/router.js'
import { getAgentName } from '../agents/agents.js'
import { AGENTS } from '../config.js'
import { loadSession } from '../sessions/store.js'

type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue }

interface JsonRpcRequest {
  jsonrpc: '2.0'
  id?: string | number | null
  method: string
  params?: Record<string, unknown>
}

interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: string | number | null
  result?: JsonValue
  error?: { code: number; message: string; data?: JsonValue }
}

const PROTOCOL_VERSION = '2024-11-05'
const SERVER_NAME = 'openseabri'
const SERVER_VERSION = '1.0.0'

function write(msg: JsonRpcResponse): void {
  process.stdout.write(JSON.stringify(msg) + '\n')
}

function log(msg: string): void {
  // stderr is safe — stdout is reserved for JSON-RPC frames
  process.stderr.write(`[mcp] ${msg}\n`)
}

function toolsForAgents(): JsonValue {
  return AGENTS.map((agent) => ({
    name: agent.id,
    description: `Ask the ${getAgentName(agent.id)} specialist a sustainability question. ` +
      `Returns a grounded, cited answer from the ${getAgentName(agent.id)} agent.`,
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The question or task to send to this specialist.',
        },
        sessionId: {
          type: 'string',
          description:
            'Optional session id. When provided, prior history for the session is loaded and included.',
        },
      },
      required: ['prompt'],
    },
  }))
}

async function handleInitialize(): Promise<JsonValue> {
  return {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: {
      tools: {},
    },
    serverInfo: {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
  }
}

async function handleToolsList(): Promise<JsonValue> {
  return { tools: toolsForAgents() }
}

async function handleToolCall(params: Record<string, unknown>): Promise<JsonValue> {
  const name = typeof params.name === 'string' ? params.name : ''
  const args = (params.arguments as Record<string, unknown> | undefined) ?? {}
  const prompt = typeof args.prompt === 'string' ? args.prompt : ''
  const sessionId = typeof args.sessionId === 'string' ? args.sessionId : undefined

  if (!name) throw new Error('missing tool name')
  if (!prompt) throw new Error('missing prompt argument')

  let history: Array<{ role: string; content: string }> = []
  if (sessionId) {
    try {
      const session = await loadSession(sessionId)
      if (session) history = session.history
    } catch {
      // History load is best-effort; empty history is fine
    }
  }

  const answer = await routeMessage(name, prompt, history)

  return {
    content: [
      {
        type: 'text',
        text: answer,
      },
    ],
  }
}

async function dispatch(req: JsonRpcRequest): Promise<JsonRpcResponse | null> {
  const id = req.id ?? null

  try {
    switch (req.method) {
      case 'initialize':
        return { jsonrpc: '2.0', id, result: await handleInitialize() }
      case 'initialized':
      case 'notifications/initialized':
        // Notification — no response
        return null
      case 'tools/list':
        return { jsonrpc: '2.0', id, result: await handleToolsList() }
      case 'tools/call':
        return { jsonrpc: '2.0', id, result: await handleToolCall(req.params ?? {}) }
      case 'ping':
        return { jsonrpc: '2.0', id, result: {} }
      default:
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `method not found: ${req.method}` },
        }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32603, message },
    }
  }
}

export async function serveStdio(): Promise<void> {
  log(`OpenSeaBri MCP server starting (protocol ${PROTOCOL_VERSION})`)
  log(`Exposing ${AGENTS.length} sustainability specialists as MCP tools`)

  let buffer = ''
  process.stdin.setEncoding('utf-8')

  process.stdin.on('data', (chunk: string) => {
    buffer += chunk
    let idx: number
    while ((idx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, idx).trim()
      buffer = buffer.slice(idx + 1)
      if (!line) continue

      let req: JsonRpcRequest
      try {
        req = JSON.parse(line) as JsonRpcRequest
      } catch {
        log(`skipping non-JSON line`)
        continue
      }

      dispatch(req)
        .then((res) => {
          if (res) write(res)
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err)
          log(`dispatch error: ${message}`)
        })
    }
  })

  process.stdin.on('end', () => {
    log('stdin closed — shutting down')
    process.exit(0)
  })

  // Keep the event loop alive
  await new Promise<void>(() => { /* never resolves */ })
}

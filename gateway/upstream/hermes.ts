import { spawn } from 'child_process'
import { isAbsolute } from 'path'
import { HERMES_ALLOWED_AGENT_DIRS } from '../config.js'
import type {
  UpstreamAdapter,
  UpstreamContext,
  UpstreamResponse,
  UpstreamHealth,
  UpstreamStatus,
} from './types.js'

export interface HermesConfig {
  pythonPath?: string
  agentDir?: string
  timeout?: number
}

interface HermesJsonRpcRequest {
  jsonrpc: '2.0'
  id: number
  method: string
  params: Record<string, unknown>
}

interface HermesJsonRpcResponse {
  jsonrpc: '2.0'
  id: number
  result?: {
    content?: string
    tool_calls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }>
    finish_reason?: string
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
  }
  error?: { code: number; message: string }
}

const ALLOWED_PYTHON_RE = /^(python3?|python3?\.\d+)$/
const MAX_STDOUT_BYTES = 10 * 1024 * 1024

export class HermesAdapter implements UpstreamAdapter {
  readonly id = 'hermes'
  readonly name = 'Hermes Agent'
  readonly type = 'agent' as const

  private pythonPath: string
  private agentDir: string
  private timeout: number

  constructor(config: HermesConfig = {}) {
    const pythonPath = config.pythonPath ?? process.env.HERMES_PYTHON_PATH ?? 'python'
    if (!ALLOWED_PYTHON_RE.test(pythonPath) && !isAbsolute(pythonPath)) {
      throw new Error(`Disallowed pythonPath: ${pythonPath}`)
    }
    const agentDir = config.agentDir ?? process.env.HERMES_AGENT_DIR ?? ''
    if (agentDir && !isAbsolute(agentDir)) {
      throw new Error('agentDir must be an absolute path')
    }
    if (agentDir && HERMES_ALLOWED_AGENT_DIRS !== null && !HERMES_ALLOWED_AGENT_DIRS.includes(agentDir)) {
      throw new Error(`agentDir not in HERMES_ALLOWED_AGENT_DIRS allowlist: ${agentDir}`)
    }

    this.pythonPath = pythonPath
    this.agentDir = agentDir
    this.timeout = config.timeout ?? 30_000
  }

  async isAvailable(): Promise<boolean> {
    if (!this.agentDir) return false
    try {
      const result = await this.execAcp('ping', {})
      return result !== null
    } catch {
      return false
    }
  }

  async routeMessage(prompt: string, context?: UpstreamContext): Promise<UpstreamResponse> {
    const params: Record<string, unknown> = {
      prompt,
      session_id: context?.sessionId,
      agent_id: context?.agentId,
    }
    if (context?.history) {
      params.history = context.history
    }

    const result = await this.execAcp('run', params)
    if (!result) {
      throw new Error('Hermes returned no result')
    }

    return {
      content: result.content ?? '',
      source: 'hermes',
      toolCalls: result.tool_calls?.map((tc) => ({
        id: tc.id,
        name: tc.name,
        arguments: tc.arguments,
      })),
      usage: result.usage
        ? {
            promptTokens: result.usage.prompt_tokens,
            completionTokens: result.usage.completion_tokens,
            totalTokens: result.usage.total_tokens,
          }
        : undefined,
    }
  }

  async healthCheck(): Promise<UpstreamHealth> {
    let status: UpstreamStatus = 'unavailable'
    let error: string | undefined
    try {
      const available = await this.isAvailable()
      status = available ? 'available' : 'unavailable'
    } catch (err) {
      status = 'error'
      error = err instanceof Error ? err.message : String(err)
    }
    return { id: this.id, name: this.name, status, error, checkedAt: Date.now() }
  }

  private execAcp(
    method: string,
    params: Record<string, unknown>
  ): Promise<HermesJsonRpcResponse['result'] | null> {
    return new Promise((resolve, reject) => {
      const request: HermesJsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }

      const proc = spawn(this.pythonPath, ['-m', 'acp_adapter.entry'], {
        cwd: this.agentDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: this.timeout,
      })

      let stdout = ''
      let stderr = ''
      let killed = false

      proc.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString()
        if (stdout.length > MAX_STDOUT_BYTES) {
          killed = true
          proc.kill()
        }
      })
      proc.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString()
        if (stderr.length > MAX_STDOUT_BYTES) {
          stderr = stderr.slice(0, 4096)
        }
      })

      proc.on('error', (err) => reject(err))
      proc.on('close', (code, signal) => {
        if (killed) {
          reject(new Error('Hermes response exceeded size limit'))
          return
        }
        if (signal) {
          reject(new Error(`Hermes killed by signal ${signal} (timeout or resource limit)`))
          return
        }
        if (code !== 0) {
          const safeStderr = stderr.slice(0, 1024)
          reject(new Error(`Hermes exited with code ${code}: ${safeStderr}`))
          return
        }
        try {
          const lines = stdout.trim().split('\n')
          const lastLine = lines[lines.length - 1]
          const response: HermesJsonRpcResponse = JSON.parse(lastLine)
          if (response.error) {
            reject(new Error(`Hermes RPC error: ${response.error.message}`))
            return
          }
          resolve(response.result ?? null)
        } catch {
          reject(new Error('Failed to parse Hermes JSON-RPC response'))
        }
      })

      proc.stdin.write(JSON.stringify(request) + '\n')
      proc.stdin.end()
    })
  }
}

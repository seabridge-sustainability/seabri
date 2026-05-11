import { spawn, type ChildProcess } from 'child_process'

export interface McpServerConfig {
  id: string
  /** Executable to run, e.g. "python", "npx", "bun" */
  command: string
  /** Arguments passed to the command */
  args: string[]
  /** Extra env vars merged into the child process environment */
  envVars?: Record<string, string>
  /** Tool names this server exposes (for routing / discovery) */
  tools: string[]
}

const baseMcpServers: McpServerConfig[] = [
  {
    id: 'nanobot',
    command: 'python',
    args: ['-m', 'nanobot.mcp_server'],
    tools: ['langdetect', 'skill_creator', 'classify_intent'],
  },
]

const gbrainMcpServer: McpServerConfig = {
    id: 'gbrain',
    command: 'powershell',
    args: [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      process.env.OPENSEABRI_GBRAIN_PS1_PATH || 'scripts/gbrain.ps1',
      'serve',
    ],
    tools: ['query', 'search', 'get', 'put', 'code-def', 'code-refs', 'code-callers'],
}

export const MCP_SERVERS: McpServerConfig[] =
  process.env.OPENSEABRI_GBRAIN_MCP_ENABLED === '1'
    ? [...baseMcpServers, gbrainMcpServer]
    : baseMcpServers

interface Pending {
  resolve: (v: unknown) => void
  reject: (e: Error) => void
}

/**
 * Thin JSON-RPC 2.0 client over a stdio child process.
 * The child process is spawned lazily on the first callTool() invocation.
 */
export class McpClient {
  private readonly config: McpServerConfig
  private proc: ChildProcess | null = null
  private nextId = 1
  private readonly pending = new Map<number, Pending>()
  private buffer = ''

  constructor(config: McpServerConfig) {
    this.config = config
  }

  isRunning(): boolean {
    return this.proc !== null && !this.proc.killed
  }

  private ensureRunning(): void {
    if (this.isRunning()) return

    this.proc = spawn(this.config.command, this.config.args, {
      env: { ...process.env, ...this.config.envVars },
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    this.proc.stdout?.setEncoding('utf-8')
    this.proc.stdout?.on('data', (chunk: string) => {
      this.buffer += chunk
      let idx: number
      while ((idx = this.buffer.indexOf('\n')) !== -1) {
        const line = this.buffer.slice(0, idx).trim()
        this.buffer = this.buffer.slice(idx + 1)
        if (!line) continue
        try {
          const msg = JSON.parse(line) as {
            id?: number
            result?: unknown
            error?: { message: string }
          }
          if (msg.id !== undefined) {
            const p = this.pending.get(msg.id as number)
            if (p) {
              this.pending.delete(msg.id as number)
              if (msg.error) {
                p.reject(new Error(msg.error.message))
              } else {
                p.resolve(msg.result)
              }
            }
          }
        } catch {
          // ignore non-JSON lines (server log output)
        }
      }
    })

    this.proc.on('exit', () => {
      this.proc = null
      for (const p of this.pending.values()) {
        p.reject(new Error('MCP server exited unexpectedly'))
      }
      this.pending.clear()
    })
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    this.ensureRunning()
    const id = this.nextId++
    const frame = JSON.stringify({
      jsonrpc: '2.0',
      id,
      method: 'tools/call',
      params: { name, arguments: args },
    })

    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`MCP tool call timed out after 30s: ${name}`))
      }, 30_000)
      this.pending.set(id, {
        resolve: (v) => { clearTimeout(timer); resolve(v) },
        reject: (e) => { clearTimeout(timer); reject(e) },
      })
      try {
        this.proc!.stdin!.write(frame + '\n')
      } catch (err: unknown) {
        clearTimeout(timer)
        this.pending.delete(id)
        reject(err instanceof Error ? err : new Error(String(err)))
      }
    })
  }

  close(): void {
    if (this.proc && !this.proc.killed) {
      this.proc.kill()
      this.proc = null
    }
  }
}

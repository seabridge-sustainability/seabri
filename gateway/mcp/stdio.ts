/**
 * MCP stdio entrypoint.
 *
 * Run directly (e.g. from a Claude Desktop `mcpServers` config):
 *   tsx gateway/mcp/stdio.ts
 *
 * Or via the CLI:
 *   seabri mcp-serve
 */

import { serveStdio } from './server.js'

serveStdio().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  process.stderr.write(`[mcp] fatal: ${message}\n`)
  process.exit(1)
})

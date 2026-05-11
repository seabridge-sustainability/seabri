# SeaBridge Tool Layer Integration

## Purpose

OpenSeaBri exposes a reusable tool layer that SeaBridgeAI backend, frontend, and other repos can consume. This document describes each integration surface and how to connect.

## Integration Surfaces

### 1. MCP Server (Primary Machine Interface)

The MCP server (`gateway/mcp/server.ts`) exposes OpenSeaBri capabilities via JSON-RPC 2.0 over stdio.

**Protocol**: JSON-RPC 2.0 (one JSON object per line on stdin/stdout)

**Start**:
```bash
npx tsx gateway/mcp/server.ts
```

**Available Methods**:

| Method | Description |
|--------|-------------|
| `tools/list` | List all agent tools |
| `tools/call` | Invoke an agent (params: `name`, `arguments.prompt`) |
| `resources/list` | List all skill resources |
| `resources/read` | Read a skill's content (params: `uri`) |

**Example — Call an agent**:
```json
{"jsonrpc":"2.0","method":"tools/call","params":{"name":"climate-risk","arguments":{"prompt":"What are the physical risks for Miami?"}},"id":1}
```

**Example — Read a skill**:
```json
{"jsonrpc":"2.0","method":"resources/read","params":{"uri":"openseabri://skills/flood-risk-screening"},"id":2}
```

**MCP Config (`.mcp.json`)**:
```json
{
  "mcpServers": {
    "openseabri": {
      "command": "npx",
      "args": ["tsx", "gateway/mcp/server.ts"],
      "cwd": "/path/to/openseabri"
    }
  }
}
```

### 2. WebSocket Gateway (Primary UI Interface)

**URL**: `ws://localhost:18790` by default (configurable via `GATEWAY_PORT`)
**Auth**: `?token=<SEABRI_WS_TOKEN>` query parameter

**Protocol**:
```
Client → {"type":"init","sessionId":"...","agentId":"general"}
Server → {"type":"ready"}
Client → {"type":"chat","content":"user message"}
Server → {"type":"token","content":"..."} (repeated)
Server → {"type":"done"}
```

**Action cards** (approval flow):
```
Server → {"type":"action_card","id":"...","kind":"claim","card":"..."}
Client → {"type":"approve","id":"...","approved":true}
Server → {"type":"approval_result","id":"...","approved":true,"ok":true}
```

### 3. HTTP API

**Base**: `http://localhost:18790`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/seabri/agents` | GET | List all agents with metadata |
| `/api/seabri/agents/:id` | GET | Single agent details |
| `/api/seabri/capabilities` | GET | Sanitized capability registry |
| `/api/seabri/skills` | GET | Skill-loader and runtime skill registry visibility |
| `/api/seabri/mcp` | GET | Sanitized MCP registry status |
| `/api/seabri/tools` | GET | Tool registry with invocation surfaces and schemas |
| `/api/seabri/feedback` | POST | Submit user feedback |
| `/api/seabri/telemetry` | GET | Telemetry snapshot |
| `/api/seabri/telemetry/history` | GET | Daily bucketed history |
| `/api/seabri/research/findings` | GET | List finding dates or fetch one with `?date=YYYY-MM-DD` |
| `/api/claim/*` | Various | Insurance claim API |
| `/attachments/:id` | GET | Retrieve stored attachments |

### 4. Direct TypeScript Import

For in-process integration (same Node.js runtime):

```typescript
import { agentRegistry } from 'openseabri/gateway/seabri'
import { skillRegistry } from 'openseabri/gateway/seabri'
import { routeTask } from 'openseabri/gateway/seabri'
import { emitTaskTelemetry } from 'openseabri/gateway/seabri'
import { submitFeedback } from 'openseabri/gateway/seabri'
import { upstreamRegistry } from 'openseabri/gateway/upstream'
```

**Barrel export** (`gateway/seabri/index.ts`):
- `AgentRegistry` / `agentRegistry` — agent registration and lookup
- `ModelRegistry` / `modelRegistry` — model tier management
- `routeTask` — task routing with agent selection
- `scoreSustainability` / `aggregateSustainabilityScores` — sustainability scoring
- `emitTaskTelemetry` / `getTelemetrySnapshot` / `getTelemetryHistory` — telemetry
- `submitFeedback` / `getFeedbackSummary` — user feedback
- `registerWorkflow` / `listWorkflows` / `runWorkflow` — workflow engine
- `pluginRegistry` — plugin management
- `readFindings` / `listFindingsDates` — research reader
- `skillRegistry` — skill registration and search

### 5. Upstream Adapters (Bi-directional Bridge)

OpenSeaBri can consume external agent systems via adapters:

```typescript
import { upstreamRegistry, HermesAdapter, MiroFishAdapter, OpenClawAdapter } from 'openseabri/gateway/upstream'

// Register a Hermes (Python) agent
upstreamRegistry.register(new HermesAdapter({
  id: 'hermes-esg',
  name: 'Hermes ESG Agent',
  command: 'python',
  args: ['-m', 'hermes_agent'],
  capabilities: ['esg-analysis', 'report-generation'],
}))

// Route a query
const result = await upstreamRegistry.routeToFirst({
  capability: 'esg-analysis',
  prompt: 'Analyze transition risk for energy sector',
})
```

## Integration with SeaBridgeAI Repos

### manageesg-backend

The backend can consume OpenSeaBri via MCP or direct import:

```python
# Option A: MCP over stdio (recommended — process isolation)
import subprocess, json

proc = subprocess.Popen(
    ["npx", "tsx", "gateway/mcp/server.ts"],
    stdin=subprocess.PIPE, stdout=subprocess.PIPE,
    cwd="/path/to/openseabri"
)
request = {"jsonrpc": "2.0", "method": "tools/call",
           "params": {"name": "climate-risk", "arguments": {"prompt": "..."}}, "id": 1}
proc.stdin.write(json.dumps(request).encode() + b"\n")
proc.stdin.flush()
response = json.loads(proc.stdout.readline())
```

### manageesg-frontend

The frontend connects via WebSocket for real-time streaming:

```typescript
const ws = new WebSocket(`ws://localhost:18790?token=${WS_TOKEN}`)
ws.onopen = () => ws.send(JSON.stringify({ type: 'init', sessionId: 'fe-1', agentId: 'general' }))
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data)
  if (msg.type === 'token') appendToUI(msg.content)
  if (msg.type === 'done') markComplete()
}
```

### everything-claude-code (ECC)

ECC can reference OpenSeaBri skills and agents in its repo-integrations:

```markdown
<!-- everything-claude-code/repo-integrations/openseabri.md -->
MCP server: npx tsx gateway/mcp/server.ts
Skills: 15 registered (see skills/ directory)
Agents: 15 configured (see gateway/config.ts)
```

## Security Considerations

- **WebSocket auth**: Always set `SEABRI_WS_TOKEN` in production; tokenless gateway connections are rejected.
- **MCP**: Runs over stdio — inherits process-level access control
- **HTTP API**: `/api/seabri/*` requires `OPENSEABRI_API_KEY` and the `x-openseabri-key` request header
- **Canvas auth**: If `OPENSEABRI_CANVAS_WS_PORT` is enabled, set `OPENSEABRI_CANVAS_WS_TOKEN`; production rejects canvas clients when the token is missing.
- **CORS**: Set `OPENSEABRI_CORS_ORIGIN` to the deployed frontend origin.
- **Rate limits**: Set `OPENSEABRI_RATE_LIMIT` per environment; default is 120 requests/minute per IP.
- **Live channels**: Telegram, WhatsApp, SMS, Voice, Slack, and Discord are disabled unless explicitly configured with provider credentials and should remain approval-gated for outbound actions.
- **Upstream adapters**: Each adapter manages its own auth (API keys, process isolation)
- **Pairing system**: Device pairing via 6-digit codes with timing-safe validation (`gateway/security/pairing.ts`)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for LLM calls |
| `SEABRI_WS_TOKEN` | Production | WebSocket authentication token |
| `GATEWAY_PORT` | No (18790) | HTTP/WS server port |
| `GATEWAY_HOST` | No (127.0.0.1) | Server bind address |
| `OPENSEABRI_API_KEY` | Production | Required API key for `/api/seabri/*` via `x-openseabri-key` |
| `OPENSEABRI_CORS_ORIGIN` | Production | Allowed browser origin |
| `OPENSEABRI_RATE_LIMIT` | Production | Per-IP request budget per minute |
| `TAVILY_API_KEY` | No | Web search tool |
| `TELEGRAM_TOKEN` | No | Telegram bot channel |
| `WHATSAPP_PROVIDER` | No | WhatsApp channel |
| `OPENSEABRI_CANVAS_WS_PORT` | No | Enable canvas WebSocket on the selected port |
| `OPENSEABRI_CANVAS_WS_TOKEN` | Production if canvas enabled | Canvas WebSocket token |

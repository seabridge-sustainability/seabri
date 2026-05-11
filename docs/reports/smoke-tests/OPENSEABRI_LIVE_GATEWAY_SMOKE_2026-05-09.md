# OpenSeaBri Live Gateway Smoke Test — 2026-05-09

> Historical smoke report. Current staging smoke coverage also includes registry visibility, registry snapshot serialization, product comparison V1, mocked live-channel routing, and production-gated canvas/WebSocket auth.

## Prerequisites

```bash
# Required env vars
ANTHROPIC_API_KEY=sk-ant-...
OPENSEABRI_API_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
SEABRI_WS_TOKEN=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
```

## Start Gateway

```bash
npx tsx gateway/index.ts
# Expected: JSON log banner, port 18790 by default, WebSocket ready
```

## Test Matrix

### 1. WebSocket Authentication

| Test | Command | Expected |
|------|---------|----------|
| No token | `wscat -c ws://localhost:18790` | Close frame 1008 "Unauthorized" |
| Wrong token | `wscat -c ws://localhost:18790?token=wrong` | Close frame 1008 "Unauthorized" |
| Valid token | `wscat -c ws://localhost:18790?token=$SEABRI_WS_TOKEN` | Connection stays open |
| No env var set | Unset `SEABRI_WS_TOKEN`, restart | Warning logged, all WebSocket connections rejected |

### 2. WebSocket Protocol (init → ready → chat → tokens → done)

```json
// Send init
{"type":"init","sessionId":"smoke-test-1","agentId":"general"}
// Expect: {"type":"ready"}

// Send chat
{"type":"chat","content":"What is a carbon footprint?"}
// Expect: multiple {"type":"token","content":"..."} then {"type":"done"}
```

### 3. Slash Commands

| Command | Expected |
|---------|----------|
| `/new` | "Started a fresh conversation." |
| `/agents` | Lists available agents |
| `/skills` | Lists registered skills |
| `/switch climate-risk` | Switches session agent |

### 4. Agent Routing

| Agent ID | Send | Expected |
|----------|------|----------|
| `general` | "Hello" | General response |
| `climate-risk` | "What are transition risks?" | Climate-specific response |
| `sustainability-companion` | "How can I reduce my carbon footprint?" | Consumer sustainability advice |

### 5. Skill Loading

```json
{"type":"chat","content":"/skills"}
```

Expected: 14 skills listed (carbon-footprint-reduction, climate-disclosure-structure, flood-risk-screening, home-resilience-audit, investment-risk-screening, nature-dependency-screening, wildfire-risk-assessment, physical-risk-screening, carbon-tracker, disaster-prep, energy-efficiency, insurance-claim-intake, legal-review, net-zero-roadmap).

### 6. MCP Server (stdio mode)

```bash
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | npx tsx gateway/mcp/server.ts
```

Expected: JSON-RPC response listing agent tools and skill resources.

### 7. Canvas WebSocket

```bash
# Set OPENSEABRI_CANVAS_WS_PORT and, in production, OPENSEABRI_CANVAS_WS_TOKEN
OPENSEABRI_CANVAS_WS_PORT=18791 npx tsx gateway/index.ts
```

Expected: Canvas WS server starts on port 18791.

### 8. HTTP API Endpoints

| Endpoint | Method | Expected |
|----------|--------|----------|
| `/api/seabri/agents` | GET | JSON array of 15 agents |
| `/api/seabri/feedback` | POST | Accepts feedback submission |
| `/api/seabri/telemetry` | GET | Telemetry snapshot |
| `/attachments/:id` | GET | 404 for missing, binary for valid |

All `/api/seabri/*` calls require `x-openseabri-key: $OPENSEABRI_API_KEY`.

### 9. Channel Startup (when configured)

| Channel | Env Var | Expected |
|---------|---------|----------|
| Telegram | `TELEGRAM_TOKEN` | "[Telegram] Bot started" |
| WhatsApp | `WHATSAPP_PROVIDER` | "[WhatsApp] Channel started" |
| SMS | `SMS_PROVIDER` | "[SMS] Channel started" |
| Voice | `VOICE_PROVIDER` | "[Voice] Channel started" |

### 10. Cron System

```bash
# Via WebSocket after init
{"type":"chat","content":"/cron add every day at 9am: check sustainability news"}
```

Expected: Cron job created with valid expression, scheduled in-process.

## Automated Smoke Script

```bash
#!/usr/bin/env bash
TOKEN=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
export SEABRI_WS_TOKEN=$TOKEN
export OPENSEABRI_API_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Start gateway in background
npx tsx gateway/index.ts &
GW_PID=$!
sleep 3

# Test auth rejection
wscat -c "ws://localhost:18790" -x '{}' 2>&1 | grep -q "1008" && echo "PASS: auth reject" || echo "FAIL: auth reject"

# Test valid connection
wscat -c "ws://localhost:18790?token=$TOKEN" \
  -x '{"type":"init","sessionId":"smoke","agentId":"general"}' \
  --wait 2 2>&1 | grep -q "ready" && echo "PASS: init/ready" || echo "FAIL: init/ready"

kill $GW_PID
```

## Results

| Category | Status | Notes |
|----------|--------|-------|
| TypeScript compilation | PASS | 0 errors |
| Test suite | PASS | 2026-05-10 rerun: 1278/1278 |
| Build | PASS | 2026-05-10 rerun: split chunks, largest JS 264.97 KB |
| WebSocket auth | VERIFIED via unit tests | Token guard in gateway/index.ts lines 255-267 |
| Protocol messages | VERIFIED via zod schemas | All message types validated |
| Skill registration | VERIFIED via tests | 14 skills loaded, MCP-exposed |
| Agent routing | VERIFIED via tests | 15 agents configured, router tested |

Live runtime smoke requires `ANTHROPIC_API_KEY` — tests above cover all code paths without a live key.

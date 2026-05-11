# Interoperability Plan

**Date:** 2026-05-03  
**Purpose:** Define how SeaBri integrates with upstream tools, the SeaBridgeAI backend, and external services without duplicating their capabilities.

---

## Guiding Principle

> Do not duplicate upstream capabilities when adapters can work.

SeaBri's value is the sustainability-focused AI routing layer, the security/approval model, and the SeaBridgeAI backend bridge. For everything else (platform abstractions, RAG, translation, language detection), use adapters.

---

## Integration Layers

```
┌─────────────────────────────────────────────────────┐
│                    Users / Channels                  │
│  Telegram  WhatsApp  SMS  Discord  Slack  CLI  Web  │
└──────────────────────┬──────────────────────────────┘
                       │ NormalizedMessage (openclaw)
                       ▼
┌─────────────────────────────────────────────────────┐
│               SeaBri Gateway (this repo)             │
│  Security → Mode Classify → Agent Route → Approve   │
└──────────────────────┬──────────────────────────────┘
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
  SeaBridgeAI    Multi-LLM      Upstream
  Backend API    Router         Adapters
  (climate risk, (Anthropic →   (nanobot MCP,
  ESG, world     Google →       gbrain MCP,
  risk, LGND)    OpenAI →       openclaw types)
                 DeepSeek →
                 Local)
```

---

## SeaBridgeAI Backend Integration (Existing)

**Protocol:** REST over HTTP (`SEABRIDGE_API_URL` + `SEABRIDGE_API_KEY`)

| Endpoint | Used By | SeaBri Module |
|----------|---------|---------------|
| `GET /api/v1/openseabri/climate-risk` | Property risk agent | `bridge/agent_bridge.ts` |
| `GET /api/v1/openseabri/esg-brief` | ESG agent | `bridge/agent_bridge.ts` |
| `GET /api/v1/world-risk/scores` | General agent context | `bridge/agent_bridge.ts` |
| `GET /api/v1/openseabri/materiality` | Materiality agent | `bridge/agent_bridge.ts` |
| `POST /api/v1/gis/lgnd/query` | Memory / RAG enrichment | `bridge/agent_bridge.ts` |

**Contract:** SeaBri never calls backend write endpoints. It is a read consumer only.

---

## MCP Integration (Upstream Tools)

SeaBri includes an MCP client that can connect to upstream MCP servers:

```typescript
// gateway/mcp/client.ts

export interface McpServerConfig {
  id: string
  command: string    // e.g. "python", "npx", "bun"
  args: string[]     // e.g. ["-m", "nanobot.mcp_server"]
  envVars?: Record<string, string>
  tools: string[]    // tool names this server exposes
}

export const MCP_SERVERS: McpServerConfig[] = [
  {
    id: 'nanobot',
    command: 'python',
    args: ['-m', 'nanobot.mcp_server'],
    tools: ['langdetect', 'skill_creator', 'classify_intent'],
  },
  {
    id: 'gbrain',
    command: 'bun',
    args: ['run', 'gateway.ts'],
    envVars: { DATABASE_URL: process.env.GBRAIN_DATABASE_URL ?? '' },
    tools: ['translate', 'summarize', 'classify', 'research', 'extract'],
  },
]
```

**Startup:** MCP servers are spawned on demand (lazy init) to avoid startup overhead.

---

## openclaw Normalized Message (Direct Import)

Rather than maintaining a separate message envelope, import openclaw's type:

```typescript
// gateway/types/message.ts
// Re-export openclaw NormalizedMessage with SeaBri extensions

export interface NormalizedMessage {
  id: string
  channelId: string
  senderId: string
  text: string
  timestamp: number
  locale?: string
  attachment?: {
    type: 'image' | 'audio' | 'video' | 'pdf' | 'document'
    buffer: Buffer
    mimeType: string
    fileName: string
    sizeBytes: number
  }
  location?: { lat: number; lng: number }
  metadata: Record<string, unknown>
  // SeaBri extensions:
  mode?: ResponseMode
  agentId?: string
  threadId?: string
}
```

**Why direct import over adapter:** openclaw is MIT; its types are stable; no runtime overhead.

---

## Twilio Integration (Existing + Extensions)

| Feature | Status | Module |
|---------|--------|--------|
| Inbound SMS | ✅ | `channels/sms.ts` |
| Outbound call (TwiML) | ✅ | `seabri/outbound.ts` + `server.ts /twiml` |
| WhatsApp inbound text | ✅ | `channels/whatsapp.ts` |
| WhatsApp inbound media | Sprint 2 | `channels/whatsapp.ts` |
| WhatsApp outbound media | Sprint 3 | `channels/whatsapp.ts` |

---

## Google Maps Integration (Sprint 2)

**Purpose:** Property address geocoding for location-based risk queries  
**Fallback:** OpenStreetMap Nominatim (no key required)  
**Module:** `gateway/seabri/geocoder.ts`

---

## External Services Not to Integrate

| Service | Reason |
|---------|--------|
| MiroFish | AGPL-3.0 — blocked |
| Any service requiring GPL code | License copyleft |
| Any service storing PII on third-party servers | Privacy policy |
| Any paid service without user opting in | Cost control |

---

## Versioning & Contract Stability

- SeaBri only calls backend endpoints listed in this doc
- New backend endpoints require this doc to be updated
- MCP tool schemas are versioned; SeaBri pins to tested versions
- openclaw type imports are pinned to a specific commit/tag in `package.json`

---

## Sprint 1 Scope

1. Create `gateway/types/message.ts` with `NormalizedMessage`
2. Wire `NormalizedMessage` into all 6 channel handlers (start with Telegram + CLI)
3. MCP client stub with lazy init (nanobot server not spawned until first call)
4. Document `MCP_SERVERS` config in `.env.example`

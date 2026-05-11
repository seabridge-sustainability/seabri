# OpenSeaBri Agent Harness Guide

## Overview

OpenSeaBri functions as both a consumer sustainability product (COMPANION) and a reusable agent infrastructure harness (HARNESS). This guide covers the harness: how agents are defined, routed, equipped with tools and skills, delivered across channels, and extended via upstream adapters.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Channels                          │
│  WebSocket │ Telegram │ WhatsApp │ SMS │ Voice │ CLI│
│  Discord   │ Slack                                  │
└──────────────────────┬──────────────────────────────┘
                       │
              ┌────────▼────────┐
              │  Gateway Server  │  gateway/index.ts
              │  (HTTP + WS)     │  Port 18790
              └────────┬────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
   ┌─────▼─────┐ ┌────▼────┐ ┌─────▼─────┐
   │ Classifier │ │ Router  │ │ Orchestr. │
   │ (intent)   │ │ (agent) │ │ (model)   │
   └────────────┘ └────┬────┘ └───────────┘
                       │
              ┌────────▼────────┐
              │   Agent Layer    │
              │  15 agents       │
              │  + tool loop     │
              │  + skill context │
              └────────┬────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
   ┌─────▼─────┐ ┌────▼────┐ ┌─────▼─────┐
   │  Tools     │ │ Skills  │ │ Upstream  │
   │  Registry  │ │ 14 YAML │ │ Adapters  │
   └───────────┘ └─────────┘ └───────────┘
```

## Agents

### Configuration

Agents are defined in `gateway/config.ts` as the `AGENTS` record. Each agent has:

- `id` — typed as `AgentId` (union of 15 literal strings in `gateway/schemas.ts`)
- `name` — human-readable display name
- `systemPrompt` — full prompt text built in `gateway/agents/agents.ts`

### Agent IDs

| ID | Purpose | Product |
|----|---------|---------|
| `seabri-orchestrator` | Meta-routing orchestrator | HARNESS |
| `emergency-resilience` | Active disaster response | COMPANION |
| `insurance-navigator` | Policy analysis, claims | COMPANION |
| `property-climate-risk` | Address-level risk scoring | COMPANION |
| `damage-documentation` | Photo-based damage assessment | COMPANION |
| `contractor-coordination` | Contractor search and vetting | COMPANION |
| `sustainability-companion` | Consumer sustainability advice | COMPANION |
| `climate-risk` | Climate risk analysis | BOTH |
| `nature-biodiversity` | Nature/biodiversity screening | BOTH |
| `sustainability-reporting` | ESG/CSRD reporting guidance | HARNESS |
| `investment-screening` | ESG investment screening | BOTH |
| `home-community` | Home efficiency, community resilience | COMPANION |
| `net-zero` | Net-zero transition planning | BOTH |
| `natural-capital` | Natural capital assessment | BOTH |
| `general` | Fallback / general queries | BOTH |

### Auto-Classification

When the session agent is `general`, the classifier (`gateway/orchestrator/classifier.ts`) analyzes user intent and routes to a specialist agent if confidence > 0.5. This is transparent to the user.

### Routing

`routeMessage(agentId, userMessage, history)` in `gateway/agents/router.ts`:

1. Builds system prompt from agent definition + personality layer
2. Augments with sustainability/risk/regulation context from SeaBridge bridge
3. Injects skill context via RAG-based skill loader
4. Calls Anthropic API with tool definitions
5. Executes up to 8 rounds of tool use (tool_use → tool_result loop)
6. Returns final text response

### Model Selection

`gateway/orchestrator/model-router.ts` provides:

- `selectModel(tier)` — picks model by tier (fast/balanced/deep)
- `getFailoverModels()` — ordered fallback list for 429 rate limits

## Tools

### Built-in Tools

Defined in `gateway/agents/tools.ts`:

| Tool | Description |
|------|-------------|
| `web_search` | Tavily-powered web search for sustainability data |
| `geocode_address` | US Census geocoder for address → lat/lng |
| `lookup_flood_zone` | FEMA NFHL flood zone lookup |
| `calculate_carbon_footprint` | CO2 estimation from activity data |
| Peril tools | Wildfire, hurricane, earthquake risk scoring |
| MCP bridge tools | Forwarded from SeaBridge backend MCP |

### Tool Use Loop

The router supports multi-round tool use:

```
User message → LLM → tool_use block → executeTool() → tool_result → LLM → ...
```

Up to `MAX_TOOL_ROUNDS = 8` iterations. Each round collects tool results and re-submits to the API.

### Custom Tool Registration

`gateway/tools/register-builtin.ts` registers tools into the tool registry. To add a new tool:

1. Define the `AnthropicTool` schema (name, description, input_schema)
2. Implement the execution function
3. Register via `getToolsForAgent(agentId)` or the tool registry

## Skills

### Structure

Skills are YAML+Markdown files in `skills/*/SKILL.md`:

```yaml
---
id: carbon-footprint-reduction
name: Carbon Footprint Reduction
version: "1.0"
domain: sustainability
agents: [sustainability-companion, net-zero]
---

# Skill content (prompt instructions, procedures, data)
```

### Registered Skills (14)

carbon-footprint-reduction, climate-disclosure-structure, flood-risk-screening, home-resilience-audit, investment-risk-screening, nature-dependency-screening, wildfire-risk-assessment, physical-risk-screening, carbon-tracker, disaster-prep, energy-efficiency, insurance-claim-intake, legal-review, net-zero-roadmap

### Skill Loading

`gateway/skills/loader.ts`:

- `buildSkillsContext(agentId)` — loads all skills matching an agent's domain
- `buildRagSkillsContext(agentId, query)` — RAG-based: selects most relevant skills for a query
- Skills are injected into the system prompt before the LLM call

### Skill Registry

`gateway/registries/skill-registry.ts` — singleton `skillRegistry`:

- `register(skill)` / `unregister(id)` / `get(id)`
- `search({ query, domain, agents })` — filtered search
- `stats()` — counts by domain and status
- Exported from `gateway/seabri/index.ts` barrel

### MCP Exposure

Skills are exposed as MCP resources via `gateway/mcp/server.ts`:

- URI: `openseabri://skills/{id}`
- Method: `resources/read` returns the skill markdown content
- `resources/list` enumerates all registered skills

## Upstream Adapters

### Interface

`gateway/upstream/types.ts` defines `UpstreamAdapter`:

```typescript
interface UpstreamAdapter {
  id: string
  name: string
  healthCheck(): Promise<boolean>
  query(input: UpstreamQuery): Promise<UpstreamResult>
  capabilities: string[]
}
```

### Available Adapters

| Adapter | Transport | Source |
|---------|-----------|--------|
| `HermesAdapter` | Python ACP/stdio | `_upstream/hermes-agent` |
| `MiroFishAdapter` | HTTP/REST | `_upstream/mirofish` |
| `OpenClawAdapter` | In-process TS plugin | `_upstream/openclaw` |

### Registry

`UpstreamRegistry` (`gateway/upstream/index.ts`):

- `register(adapter)` / `unregister(id)`
- `healthCheckAll()` — parallel health checks
- `routeToFirst(query)` — routes to first adapter whose capabilities match
- `createDefaultRegistry(config)` — factory with env-driven adapter creation

## Communication Channels

### WebSocket (Primary)

Protocol: `init → ready → chat → token(s) → [action_card] → done`

Authentication: `SEABRI_WS_TOKEN` env var, passed as `?token=` query parameter.

### Multi-Channel Delivery

Each channel adapter in `gateway/channels/`:

| Channel | File | Transport |
|---------|------|-----------|
| Telegram | `telegram.ts` | Telegram Bot API |
| WhatsApp | `whatsapp.ts` | Twilio / direct |
| SMS | `sms.ts` | Twilio |
| Voice | `voice.ts` | Twilio |
| Discord | `discord.ts` | Discord.js |
| Slack | `slack.ts` | Slack Bolt |
| CLI | `cli.ts` | stdin/stdout |

All channels share commands via `gateway/channels/shared_commands.ts`.

## Workflow Engine

### Definition

Workflows are defined as JSON conforming to `WorkflowDefinitionSchema` (`gateway/workflows/schema.ts`):

- **Step types**: agent, tool, condition, parallel, loop
- **Features**: retry with backoff, timeout enforcement, template interpolation
- **Triggers**: cron, webhook, manual, data-change

### Executor

`WorkflowExecutor` (`gateway/workflows/executor.ts`):

- Runs steps sequentially, respects `AbortSignal` for cancellation
- Enforces per-step `timeout` via `Promise.race`
- Supports retry with configurable backoff
- Parallel branches run via `Promise.allSettled` with context merge

### Visual Canvas

`src/components/workflow-canvas/WorkflowCanvas.tsx` renders workflows as ReactFlow graphs with live execution status overlay.

## Approval System

For high-stakes actions (insurance claims, contractor engagement):

1. Agent response contains an action card (detected by `extractActionCard`)
2. Gateway sends `action_card` WebSocket event to frontend
3. User approves/denies via `approve` WebSocket message
4. Gateway executes or discards the action
5. Result sent as `approval_result` event

## Telemetry

`gateway/seabri/telemetry.ts`:

- `emitTaskTelemetry(event)` — records agent invocations
- `getTelemetrySnapshot()` — current period stats
- `getTelemetryHistory()` — daily bucketed history

## Extending the Harness

### Add a New Agent

1. Add ID to `AGENT_IDS` array in `gateway/schemas.ts`
2. Add config entry in `gateway/config.ts`
3. Add system prompt section in `gateway/agents/agents.ts`
4. Add tool mapping in `gateway/agents/tools.ts` if agent-specific tools needed

### Add a New Skill

1. Create `skills/<skill-id>/SKILL.md` with YAML frontmatter
2. Skill auto-registers on gateway startup via `gateway/skills/loader.ts`
3. Automatically exposed via MCP `resources/read`

### Add a New Upstream Adapter

1. Implement `UpstreamAdapter` interface
2. Register in `createDefaultRegistry()` or manually via `upstreamRegistry.register()`
3. Add health check endpoint if remote

### Add a New Channel

1. Create `gateway/channels/<name>.ts`
2. Implement start function and message handler
3. Wire into `gateway/index.ts` startup sequence
4. Add shared command support via `shared_commands.ts`

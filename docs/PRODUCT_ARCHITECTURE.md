# OpenSeaBri Product Architecture

Two differentiated products. One shared sustainability core.

---

## Deliverable 1: Product Architecture Diagram

```
                        OpenSeaBri Platform
 ===================================================================

 PRODUCT 1: Living Companion              PRODUCT 2: Agent Harness
 (Consumer-facing)                         (Infrastructure-facing)
 ─────────────────────                     ─────────────────────────
 Target: Individuals, households,          Target: Developers, agent
 communities, NGOs, farmers                systems, CI/CD pipelines

 ┌─────────────────────────┐               ┌─────────────────────────┐
 │   CHANNELS               │               │   INTERFACES             │
 │ ┌─────────┐ ┌──────────┐│               │ ┌──────────┐ ┌─────────┐│
 │ │WhatsApp │ │ Telegram ││               │ │ MCP      │ │  CLI    ││
 │ └─────────┘ └──────────┘│               │ │ Server   │ │ seabri  ││
 │ ┌─────────┐ ┌──────────┐│               │ └──────────┘ └─────────┘│
 │ │  SMS    │ │ Discord  ││               │ ┌──────────┐ ┌─────────┐│
 │ └─────────┘ └──────────┘│               │ │ HTTP API │ │WebSocket││
 │ ┌─────────┐ ┌──────────┐│               │ │ /api/    │ │ Canvas  ││
 │ │  Web UI │ │  Slack   ││               │ └──────────┘ └─────────┘│
 │ └─────────┘ └──────────┘│               └─────────────────────────┘
 └─────────────────────────┘                         │
           │                                         │
           │    ┌────────────────────────────┐        │
           └───>│     CHANNEL REGISTRY       │<───────┘
                │  gateway/channels/         │
                │  registry.ts + base.ts     │
                └────────────┬───────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
    ┌─────────┴─────────┐       ┌───────────┴──────────┐
    │  CONSUMER AGENTS   │       │  INFRA REGISTRIES     │
    │  src/lib/agents.ts │       │  gateway/registries/  │
    │  7 specialist      │       │  - agent-registry     │
    │  profiles with     │       │  - model-registry     │
    │  system prompts    │       │  - skill-registry     │
    │  + starter Qs      │       │  - capability-registry│
    └─────────┬──────────┘       └───────────┬──────────┘
              │                              │
              └──────────────┬───────────────┘
                             │
         ════════════════════╪════════════════════
                    SHARED CORE
         ════════════════════╪════════════════════
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
 ┌───────┴────────┐ ┌───────┴────────┐ ┌────────┴───────┐
 │  ORCHESTRATOR   │ │  SKILL ENGINE  │ │  SUSTAINABILITY│
 │                 │ │                │ │  ENGINE        │
 │ model-router    │ │ loader.ts      │ │                │
 │ classifier.ts   │ │ schema.ts      │ │ scoring.ts     │
 │ planner.ts      │ │ improver.ts    │ │ telemetry.ts   │
 │ graph.ts        │ │ 14 SKILL.md    │ │ metrics.ts     │
 │ metrics.ts      │ │ files          │ │ carbon budgets │
 └────────┬────────┘ └───────┬────────┘ └────────┬───────┘
          │                  │                   │
 ┌────────┴────────┐ ┌───────┴────────┐ ┌────────┴───────┐
 │  AGENT RUNTIME   │ │  TOOL RUNTIME  │ │  WORKFLOW      │
 │                  │ │                │ │  ENGINE        │
 │ agents.ts        │ │ registry.ts    │ │                │
 │ router.ts        │ │ register-      │ │ executor.ts    │
 │ subagent.ts      │ │ builtin.ts     │ │ triggers.ts    │
 │ perils.ts        │ │                │ │ copilot.ts     │
 └────────┬─────────┘ └───────┬────────┘ └────────┬───────┘
          │                   │                   │
 ┌────────┴────────┐ ┌───────┴────────┐ ┌────────┴───────┐
 │  PERSISTENCE     │ │  SECURITY      │ │  BRIDGE        │
 │                  │ │                │ │                │
 │ sessions/store   │ │ pairing.ts     │ │ seabridge_     │
 │ memory/memory    │ │ policy.ts      │ │ client.ts      │
 │ memory/compress  │ │ hmac.ts        │ │ agent_bridge   │
 │ memory/rag       │ │                │ │ data_bridge    │
 │ memory/search    │ │                │ │                │
 └──────────────────┘ └────────────────┘ └────────────────┘
         ════════════════════════════════════════
                    EXTERNAL SERVICES
         ════════════════════════════════════════

         ┌──────────────────────────────────────┐
         │  Anthropic API  |  MCP Servers       │
         │  (Claude 3.5/4) |  (nanobot, gbrain) │
         │─────────────────┼────────────────────│
         │  SeaBridgeAI    |  Twilio            │
         │  Backend API    |  (SMS, WhatsApp,   │
         │  /api/v1/       |   Voice)           │
         │  openseabri/*   |                    │
         └──────────────────────────────────────┘
```

---

## Deliverable 2: Clear Module Boundaries

### Product 1 — Living Companion (Consumer-Facing)

These modules serve end users directly. They define UX, personality, and channel delivery.

| File | Purpose | Why Consumer-Only |
|------|---------|-------------------|
| `src/lib/agents.ts` | 7 specialist agent profiles with system prompts, taglines, starter questions, colors, icons | Consumer UX — personality and onboarding prompts |
| `src/store/chat.ts` | Zustand chat state, WebSocket streaming, message persistence | Web UI chat experience |
| `src/store/canvas.ts` | Canvas workflow state for visual editor | Web UI workflow builder |
| `src/store/claim.ts` | Insurance claim state management | Consumer claim intake flow |
| `src/App.tsx` | React SPA entry point | Web UI shell |
| `src/components/sustainability-dashboard/*` | Dashboard panels, stat cards, SeaBriOS panel | Consumer sustainability dashboard |
| `src/components/workflow-canvas/*` | Visual workflow editor and canvas adapter | Consumer workflow creation |
| `src/components/ConnectionBadge.tsx` | Gateway connection status indicator | Web UI component |
| `src/components/canvas/CanvasPane.tsx` | Canvas rendering pane | Web UI component |
| `src/hooks/useLiveTelemetry.ts` | Real-time telemetry hook for dashboard | Consumer telemetry display |
| `src/types/openseabri.d.ts` | Frontend type definitions (Agent, Message, Session) | Consumer type contracts |
| `src/types/canvas.ts` | Canvas type definitions | Consumer workflow types |
| `src/index.css` / `src/styles/tokens.css` | Design tokens and styling | Consumer visual identity |
| `index.html` | SPA HTML entry | Consumer web shell |
| `gateway/channels/telegram.ts` | Telegram bot channel adapter | Consumer messaging channel |
| `gateway/channels/whatsapp.ts` | WhatsApp Cloud API adapter | Consumer messaging channel |
| `gateway/channels/sms.ts` | SMS/Twilio adapter with voice | Consumer messaging channel |
| `gateway/channels/discord.ts` | Discord bot adapter | Consumer messaging channel |
| `gateway/channels/slack.ts` | Slack workspace adapter | Consumer messaging channel |
| `gateway/claim/*` | Insurance claim workflow, policies, schemas, session, API | Consumer claim processing |
| `gateway/personalities/loader.ts` | Persona customization per session | Consumer personality layer |

### Product 2 — Agent Harness (Infrastructure-Facing)

These modules serve developers, agent systems, and CI/CD pipelines.

| File | Purpose | Why Infra-Only |
|------|---------|----------------|
| `gateway/mcp/server.ts` | MCP stdio server exposing agents as JSON-RPC tools | Machine-to-machine protocol |
| `gateway/mcp/stdio.ts` | MCP entry point for Claude Desktop / MCP clients | Machine integration |
| `gateway/mcp/client.ts` | MCP client for connecting to external MCP servers (nanobot, gbrain) | Infra — outbound MCP connections |
| `gateway/mcp/index.ts` | MCP module exports | Infra module boundary |
| `cli/seabri.ts` | 25+ CLI subcommands (agents, skills, cron, research, pairing, doctor) | Developer/operator interface |
| `cli/migrate.ts` | Data migration utilities | Operator tooling |
| `gateway/registries/model-registry.ts` | Model instance registration and lookup | Infra — model management |
| `gateway/registries/capability-registry.ts` | Agent capability registration and discovery | Infra — capability management |
| `gateway/registries/skill-registry.ts` | Skill metadata registration | Infra — skill management |
| `gateway/seabri/api-handler.ts` | HTTP API endpoint routing for `/api/seabri/*` | Programmatic API access |
| `gateway/seabri/plugin-registry-singleton.ts` | Singleton plugin registry for discovery | Infra — plugin system |
| `gateway/cron/index.ts` | Cron job management and scheduler | Infra — scheduled automation |
| `gateway/cron/presets.ts` | Built-in cron job presets | Infra — automation templates |
| `gateway/cron/approval.ts` | Approval token factory for time-limited actions | Infra — action gating |
| `gateway/cron/parser.ts` | Natural language cron expression parser | Infra — scheduling DSL |
| `gateway/canvas/server.ts` | Canvas/workflow WebSocket server | Infra — workflow runtime |
| `gateway/workflows/copilot.ts` | Copilot workflow generation | Infra — workflow authoring |

### Shared Core

These modules are used by both products. Changes here affect both surfaces.

| File | Purpose | Why Shared |
|------|---------|------------|
| `gateway/config.ts` | Env config: API keys, ports, model selection, feature flags | Both products need config |
| `gateway/index.ts` | Main gateway WebSocket + HTTP server, session routing | Both products connect through it |
| `gateway/auth.ts` | JWT auth, password hashing, credential verification | Both products authenticate |
| `gateway/schemas.ts` | Zod schemas: AGENT_IDS, InitMessage, ChatMessage | Both products validate messages |
| `gateway/agents/agents.ts` | Agent definitions, system prompts, response modes | Both products invoke agents |
| `gateway/agents/router.ts` | Message routing to agents, model selection, tool loops | Core routing for both |
| `gateway/agents/subagent.ts` | Parallel specialist consultation framework | Both products use multi-agent |
| `gateway/agents/perils.ts` | Climate peril classification and assessment | Both products assess risk |
| `gateway/agents/tools.ts` | Tool execution framework | Both products call tools |
| `gateway/orchestrator/model-router.ts` | Model tier selection (haiku/sonnet/opus) with cost estimation | Both products route to models |
| `gateway/orchestrator/classifier.ts` | Intent classification for task routing | Both products classify |
| `gateway/orchestrator/planner.ts` | Execution plan generation | Both products build plans |
| `gateway/orchestrator/metrics.ts` | Metric recording: tokens, latency, cost, carbon | Both products track metrics |
| `gateway/orchestrator/graph.ts` | Agentic graph execution (state machine) | Both products run graphs |
| `gateway/skills/loader.ts` | SKILL.md parsing, compliance filtering, TF-IDF ranking | Both products load skills |
| `gateway/skills/schema.ts` | Frontmatter validation, 15 compliance tags, cost tiers | Both products validate skills |
| `gateway/skills/improver.ts` | Auto-skill improvement from long responses | Both products improve skills |
| `gateway/tools/registry.ts` | Tool definition registration, per-agent filtering | Both products register tools |
| `gateway/tools/register-builtin.ts` | Built-in tool registration (risk assessment, emissions calc) | Both products use built-in tools |
| `gateway/sessions/index.ts` | Session CRUD with UUID generation | Both products manage sessions |
| `gateway/sessions/store.ts` | Session persistence, compression, turn counter | Both products persist sessions |
| `gateway/memory/memory.ts` | MEMORY.md/USER.md/SKILLS.md management | Both products manage memory |
| `gateway/memory/compress.ts` | Context compression for long histories | Both products compress |
| `gateway/memory/rag.ts` | TF-IDF skill relevance ranking | Both products rank skills |
| `gateway/memory/search.ts` | Session full-text search | Both products search sessions |
| `gateway/memory/search_sqlite.ts` | SQLite FTS5 search backend | Both products use FTS |
| `gateway/security/pairing.ts` | OTP-based sender pairing | Both products gate access |
| `gateway/security/policy.ts` | Compliance filtering, channel restrictions | Both products enforce policy |
| `gateway/security/hmac.ts` | HMAC webhook verification | Both products verify webhooks |
| `gateway/seabri/task-router.ts` | Task classification + model routing + sustainability scoring | Both products route tasks |
| `gateway/seabri/sustainability-scoring.ts` | 0-100 composite scoring (cost + carbon efficiency) | Both products score sustainability |
| `gateway/seabri/telemetry.ts` | Task telemetry events with carbon tracking | Both products emit telemetry |
| `gateway/seabri/agent-registry.ts` | Agent availability registration | Both products register agents |
| `gateway/seabri/model-registry.ts` | Model version tracking | Both products track models |
| `gateway/seabri/workflow-store.ts` | Workflow registration and execution | Both products run workflows |
| `gateway/seabri/lang.ts` | Language/locale detection | Both products detect language |
| `gateway/seabri/address-extractor.ts` | Address extraction from messages | Both products extract addresses |
| `gateway/seabri/geocoder.ts` | Geocoding services | Both products geocode |
| `gateway/seabri/gap-detector.ts` | Sustainability disclosure gap analysis | Both products detect gaps |
| `gateway/seabri/property-risk-card.ts` | Physical risk card generation | Both products generate risk cards |
| `gateway/seabri/research-reader.ts` | Research finding persistence | Both products read research |
| `gateway/seabri/feedback.ts` | User feedback collection | Both products collect feedback |
| `gateway/seabri/modes.ts` | Response mode detection (INCIDENT/EXPERT/EDUCATOR) | Both products switch modes |
| `gateway/seabri/approval.ts` | Action approval card logging | Both products handle approvals |
| `gateway/seabri/action-executor.ts` | Approved action execution | Both products execute actions |
| `gateway/workflows/executor.ts` | Workflow step execution (agent/tool/condition/parallel/loop) | Both products execute workflows |
| `gateway/workflows/schema.ts` | WorkflowDefinition type definitions | Both products define workflows |
| `gateway/workflows/types.ts` | WorkflowContext, StepResult types | Both products use workflow types |
| `gateway/workflows/triggers.ts` | Workflow trigger conditions | Both products use triggers |
| `gateway/attachments/store.ts` | Attachment persistence | Both products store attachments |
| `gateway/attachments/http.ts` | Attachment download/upload | Both products handle attachments |
| `gateway/channels/base.ts` | BaseChannel interface | Both products implement channels |
| `gateway/channels/registry.ts` | Channel registry/factory | Both products discover channels |
| `gateway/channels/shared_commands.ts` | Cross-channel command handlers | Both products handle commands |
| `gateway/channels/cli.ts` | CLI interactive channel | Shared — used by both CLI and consumer terminal |
| `bridge/seabridge_client.ts` | SeaBridge backend SDK (18 functions) | Both products call backend |
| `bridge/agent_bridge.ts` | Agent context augmentation (sustainability, risk, MCP) | Both products augment context |
| `bridge/data_bridge.ts` | Data exchange bridge | Both products exchange data |
| `skills/*/SKILL.md` (15 skills) | Skill content with compliance frontmatter | Both products load and invoke skills |

### Boundary Rule

> **Living Companion** modules NEVER import from `gateway/mcp/server.ts`, `gateway/registries/`, or `cli/`.
> **Agent Harness** modules NEVER import from `src/components/`, `src/store/`, or `gateway/claim/`.
> **Shared Core** modules NEVER import from either product-specific layer.
> Both products consume Shared Core — Shared Core does not know which product is calling it.

---

## Deliverable 3: Shared Services List

### 1. Agent Runtime (`gateway/agents/`)
- **router.ts** — Routes messages to the correct agent, manages model selection, executes tool loops
- **agents.ts** — 15 agent definitions with system prompts and response modes
- **subagent.ts** — Parallel specialist consultation (fans query to N agents, synthesizes)
- **perils.ts** — Climate peril classification (flood, wildfire, heat, drought, hurricane)
- **tools.ts** — Tool execution framework for agent-callable functions

### 2. Orchestrator (`gateway/orchestrator/`)
- **model-router.ts** — 3-tier model selection (haiku/sonnet/opus) with complexity scoring, cost estimation, and failover
- **classifier.ts** — LLM-based intent classification mapping user messages to agent IDs
- **planner.ts** — Execution plan builder generating step-by-step action sequences
- **metrics.ts** — Metric recording (tokens, latency, cost, carbon) with daily bucketing and aggregation
- **graph.ts** — Agentic graph execution (LangChain-style state machine with tool/agent nodes)

### 3. Skill Engine (`gateway/skills/`)
- **loader.ts** — SKILL.md file parsing, compliance tag filtering, TF-IDF relevance ranking (60s cache)
- **schema.ts** — 15 compliance tags, 4 cost tiers, frontmatter validation, SkillValidationError
- **improver.ts** — Auto-skill improvement: if response >800 chars, checks for skill enhancement opportunity

### 4. Sustainability Engine (`gateway/seabri/`)
- **sustainability-scoring.ts** — 0-100 composite scoring per inference call (cost efficiency + carbon efficiency), tier budgets (haiku: 0.01g CO2e, sonnet: 0.05g, opus: 0.20g)
- **telemetry.ts** — Task telemetry event recording with carbon tracking, snapshot aggregation
- **task-router.ts** — Unified routing: classify intent -> select agent -> select model -> estimate cost/carbon -> return RoutingDecision
- **gap-detector.ts** — Sustainability disclosure gap analysis against compliance frameworks

### 5. Memory & Persistence (`gateway/memory/`, `gateway/sessions/`)
- **memory.ts** — Workspace memory management (MEMORY.md, USER.md, SKILLS.md), user model nudging every 10 turns
- **compress.ts** — Context compression for long conversation histories
- **rag.ts** — TF-IDF relevance scoring for skill retrieval
- **search.ts** / **search_sqlite.ts** — Full-text session search with SQLite FTS5 backend
- **sessions/store.ts** — JSON session persistence, compression tracking, turn counter

### 6. Security (`gateway/security/`)
- **pairing.ts** — OTP-based sender pairing (10-minute expiry), approval/revocation tracking
- **policy.ts** — Compliance tag enforcement, channel restrictions, sender routing
- **hmac.ts** — HMAC signature verification for webhook authenticity

### 7. Tool Registry (`gateway/tools/`)
- **registry.ts** — Tool definition registration with per-agent filtering (registerTool, getToolsForAgent)
- **register-builtin.ts** — Built-in tools: physical risk assessment, emissions calculator, policy lookup

### 8. Workflow Engine (`gateway/workflows/`)
- **executor.ts** — 5 step types: agent, tool, condition, parallel, loop with template interpolation
- **triggers.ts** — Event-based workflow triggering
- **schema.ts** / **types.ts** — WorkflowDefinition, WorkflowContext, StepResult type definitions

### 9. Bridge Layer (`bridge/`)
- **seabridge_client.ts** — 18 SDK functions for SeaBridgeAI backend API (`/api/v1/openseabri/*`)
- **agent_bridge.ts** — Context augmentation: sustainability, world risk, climate risk, nature risk, transition risk, materiality, regulation, MCP tools
- **data_bridge.ts** — Data exchange between frontend and gateway

### 10. Channel Infrastructure (`gateway/channels/`)
- **base.ts** — BaseChannel interface: isEnabled(), start(), stop()
- **registry.ts** — Dynamic channel initialization factory
- **shared_commands.ts** — Cross-channel command handlers (help, status, etc.)

---

## Deliverable 4: User Journeys

### Product 1 — Living Companion User Journeys

#### Journey A: Homeowner Flood Risk Assessment (WhatsApp)

```
User sends WhatsApp message: "Is my house at 123 Oak St at risk of flooding?"
  │
  ├─ whatsapp.ts receives webhook → hmac.ts verifies signature
  ├─ policy.ts checks sender is approved
  ├─ shared_commands.ts checks for /help, /status (not a command)
  ├─ classifier.ts classifies intent → "climate-risk" agent, confidence 0.92
  ├─ model-router.ts selects sonnet (standard complexity)
  ├─ address-extractor.ts extracts "123 Oak St"
  ├─ geocoder.ts geocodes to lat/lon
  ├─ loader.ts ranks skills → physical-risk-screening (TF-IDF match)
  ├─ agent_bridge.ts augments context with climate risk data
  ├─ router.ts sends to climate-risk agent with skill context
  ├─ Anthropic API returns grounded flood risk answer
  ├─ telemetry.ts records: tokens, cost, carbon, sustainability score
  ├─ sessions/store.ts persists conversation
  └─ WhatsApp reply: "Your property at 123 Oak St is in FEMA Zone AE..."

Total modules touched: 14 (all Shared Core except whatsapp.ts)
```

#### Journey B: Insurance Claim After Hurricane (Telegram)

```
User sends Telegram message: "A tree fell on my roof during the hurricane"
  │
  ├─ telegram.ts receives update → pairing.ts verifies sender
  ├─ classifier.ts → "emergency-resilience" agent (INCIDENT mode)
  ├─ model-router.ts selects sonnet
  ├─ modes.ts detects INCIDENT mode → urgent response framing
  ├─ claim/workflow.ts initiates hurricane claim workflow
  ├─ claim/policies.ts evaluates coverage (wind damage = covered)
  ├─ claim/schemas.ts structures claim packet
  ├─ loader.ts → insurance-claim-intake skill
  ├─ router.ts routes to emergency-resilience agent
  ├─ Anthropic API returns step-by-step claim guidance
  ├─ approval.ts generates approval card for contractor contact
  └─ Telegram reply: "I'm sorry about the damage. Here's what to do right now..."

Total modules touched: 12 (Shared Core + Consumer claim modules)
```

#### Journey C: Home Energy Audit (Web UI)

```
User opens web app → selects "Home & Community" agent
  │
  ├─ src/lib/agents.ts provides agent profile, starter questions
  ├─ src/store/chat.ts creates new session
  ├─ User clicks "What government money is available for home energy upgrades?"
  ├─ WebSocket → gateway/index.ts → classifier.ts → "home-community" agent
  ├─ loader.ts ranks skills → energy-efficiency (ISSB, ESRS, CDP, GRI, GENERAL)
  ├─ model-router.ts selects haiku (straightforward Q&A)
  ├─ router.ts routes with energy-efficiency skill context
  ├─ Anthropic API returns IRA tax credit details
  ├─ sustainability-scoring.ts scores: composite 95 (haiku = excellent)
  ├─ src/hooks/useLiveTelemetry.ts updates dashboard
  └─ Web UI renders answer with inline links

Total modules touched: 10
```

#### Journey D: Farmer Nature-Based Income (SMS)

```
Farmer texts: "Can I earn money from carbon credits on my 200 acre farm?"
  │
  ├─ sms.ts (Twilio) receives webhook
  ├─ classifier.ts → "natural-capital" agent, confidence 0.88
  ├─ model-router.ts selects sonnet (nuanced financial advice)
  ├─ loader.ts ranks skills → carbon-tracker + net-zero-roadmap
  ├─ router.ts routes to natural-capital agent
  ├─ Anthropic API returns carbon credit market analysis
  ├─ telemetry.ts records event
  └─ SMS reply (split into 160-char segments)

Total modules touched: 7
```

### Product 2 — Agent Harness User Journeys

#### Journey E: Claude Desktop Uses OpenSeaBri as MCP Tool

```
Claude Desktop sends MCP initialize request via stdio
  │
  ├─ mcp/stdio.ts reads stdin
  ├─ mcp/server.ts handles initialize → returns capabilities
  ├─ Claude Desktop calls tools/list → returns 15 agent tools
  ├─ Claude Desktop calls tools/call with:
  │   { name: "climate-risk", arguments: { prompt: "Flood risk for Miami Beach" } }
  ├─ server.ts validates agent ID against VALID_AGENT_IDS set
  ├─ router.ts routes to climate-risk agent
  ├─ loader.ts provides physical-risk-screening + flood-risk-screening skills
  ├─ Anthropic API returns assessment
  ├─ server.ts wraps in MCP content block: { type: "text", text: "..." }
  └─ stdout JSON-RPC response to Claude Desktop

Total modules touched: 5 (MCP layer + Shared Core)
No consumer UI, no channel adapters, no claim processing
```

#### Journey F: Developer Creates Cron-Triggered Research

```
Developer runs: seabri cron add "Every Monday at 9am, research new TCFD guidance"
  │
  ├─ cli/seabri.ts parses "cron add" subcommand
  ├─ cron/parser.ts converts natural language → "0 9 * * 1"
  ├─ cron/index.ts registers job with scheduler
  │
  [Monday 9:00 AM]
  ├─ cron/index.ts fires job
  ├─ classifier.ts → "sustainability-reporting" agent
  ├─ loader.ts → climate-disclosure-structure skill (CSRD, TCFD, ISSB, SEC)
  ├─ router.ts routes research query
  ├─ research-reader.ts persists findings
  ├─ telemetry.ts records carbon cost
  │
  Developer runs: seabri research report
  └─ cli/seabri.ts displays formatted findings

Total modules touched: 8 (CLI + Cron + Shared Core)
No consumer channels, no web UI
```

#### Journey G: CI Pipeline Runs Sustainability Compliance Check

```
CI script calls HTTP API: POST /api/seabri/route
  { task: "Check if our annual report covers TCFD requirements",
    agentId: "sustainability-reporting" }
  │
  ├─ api-handler.ts receives HTTP request
  ├─ task-router.ts routes task:
  │   - classifies intent → sustainability-reporting
  │   - selects model → sonnet (report analysis)
  │   - estimates cost → $0.003, carbon → 0.04g CO2e
  ├─ loader.ts → climate-disclosure-structure + legal-review skills
  ├─ gap-detector.ts identifies missing TCFD disclosures
  ├─ router.ts routes to sustainability-reporting agent
  ├─ Anthropic API returns gap analysis
  ├─ sustainability-scoring.ts scores the call
  ├─ telemetry.ts records metrics
  └─ HTTP 200 with RoutingDecision + agent response + gaps

Total modules touched: 8 (API + Shared Core)
```

#### Journey H: Agent System Registers Custom Skills

```
Developer runs: seabri skills create "water-quality-testing"
  │
  ├─ cli/seabri.ts creates skills/water-quality-testing/SKILL.md template
  ├─ Developer edits SKILL.md with frontmatter:
  │   id: water-quality-testing
  │   complianceTags: [GENERAL, GRI]
  │   costTier: low
  ├─ schema.ts validates frontmatter on next load
  ├─ loader.ts picks up new skill (60s cache TTL)
  ├─ skill-registry.ts registers metadata
  ├─ mcp/server.ts automatically includes in tool context
  └─ New skill available to all agents across both products

Total modules touched: 5 (CLI + Skill Engine)
```

---

## Deliverable 5: Skill Interaction Matrix

Each skill must be: (1) Registered, (2) Invokable, (3) Tested, (4) Usable from product surfaces.

### Registration Chain

```
skills/{id}/SKILL.md
  → schema.ts parseFrontmatter() validates id, name, complianceTags, costTier
  → loader.ts loadSkills() reads all SKILL.md files, caches 60s
  → rag.ts rankSkills() scores by TF-IDF relevance to user message
  → router.ts injects top-ranked skills into agent system prompt
```

### Invocation Chain

```
User message arrives at any surface (WhatsApp, MCP, CLI, Web, API)
  → classifier.ts classifies intent → selects agent
  → loader.ts loads all skills matching agent's domain
  → rag.ts ranks by relevance to message content
  → router.ts injects ranked skill content into system prompt
  → Agent uses skill knowledge to ground its response
```

### Matrix

| # | Skill ID | Compliance Tags | Registered | Invokable Via | Tested | Living Companion Surfaces | Agent Harness Surfaces |
|---|----------|----------------|------------|---------------|--------|--------------------------|----------------------|
| 1 | `physical-risk-screening` | TCFD, ISSB, GENERAL | schema.ts validates frontmatter, loader.ts loads from `skills/physical-risk-screening/SKILL.md` | router.ts injects when climate-risk or property-climate-risk agent handles flood/wildfire/heat queries | schema.test.ts validates tags; sustainability-compliance.test.ts confirms tag coverage; loader tests confirm loading | WhatsApp, Telegram, SMS, Discord, Slack, Web UI (via climate-risk and home-community agents) | MCP (climate-risk tool), CLI (seabri chat climate-risk), HTTP API (/api/seabri/route) |
| 2 | `flood-risk-screening` | TNFD, TCFD | schema.ts validates, loader.ts loads | router.ts injects for flood-specific queries to climate-risk agent | schema.test.ts, loader tests | All consumer channels (flood queries) | MCP, CLI, API |
| 3 | `wildfire-risk-assessment` | TCFD, TNFD | schema.ts validates, loader.ts loads | router.ts injects for wildfire queries to climate-risk agent | schema.test.ts, loader tests | All consumer channels (wildfire queries) | MCP, CLI, API |
| 4 | `carbon-footprint-reduction` | GHG_PROTOCOL, GENERAL | schema.ts validates, loader.ts loads | router.ts injects for emissions/footprint queries to home-community or net-zero agents | schema.test.ts, loader tests | All consumer channels (carbon footprint queries) | MCP, CLI, API |
| 5 | `carbon-tracker` | GHG_PROTOCOL, CDP, TCFD, GENERAL | schema.ts validates, loader.ts loads | router.ts injects for Scope 1/2/3 tracking queries to net-zero agent | schema.test.ts, loader tests | All consumer channels (emissions tracking) | MCP (net-zero tool), CLI, API |
| 6 | `climate-disclosure-structure` | CSRD, TCFD, ISSB, SEC | schema.ts validates, loader.ts loads | router.ts injects for reporting/disclosure queries to sustainability-reporting agent | schema.test.ts, loader tests | All consumer channels (reporting queries) | MCP (sustainability-reporting tool), CLI, API |
| 7 | `net-zero-roadmap` | SBTi, GHG_PROTOCOL, SCIENCE_BASED | schema.ts validates, loader.ts loads | router.ts injects for decarbonization/target-setting queries to net-zero agent | schema.test.ts, loader tests | All consumer channels (net-zero planning) | MCP, CLI, API |
| 8 | `nature-dependency-screening` | TNFD | schema.ts validates, loader.ts loads | router.ts injects for nature/biodiversity queries to nature-biodiversity agent | schema.test.ts, loader tests | All consumer channels (nature risk) | MCP, CLI, API |
| 9 | `investment-risk-screening` | TCFD, SFDR | schema.ts validates, loader.ts loads | router.ts injects for investment/portfolio queries to investment-screening agent | schema.test.ts, loader tests | All consumer channels (investment queries) | MCP, CLI, API |
| 10 | `home-resilience-audit` | GENERAL | schema.ts validates, loader.ts loads | router.ts injects for home hardening/resilience queries to home-community agent | schema.test.ts, loader tests | All consumer channels (home resilience) | MCP, CLI, API |
| 11 | `energy-efficiency` | ISSB, ESRS, CDP, GRI, GENERAL | schema.ts validates, loader.ts loads | router.ts injects for energy/efficiency queries to home-community agent | schema.test.ts, loader tests | All consumer channels (energy queries) | MCP, CLI, API |
| 12 | `disaster-prep` | TCFD, ISSB, TNFD, GENERAL | schema.ts validates, loader.ts loads | router.ts injects for disaster/emergency prep queries to emergency-resilience agent | schema.test.ts, loader tests | All consumer channels (disaster prep) | MCP, CLI, API |
| 13 | `insurance-claim-intake` | GENERAL | schema.ts validates, loader.ts loads | router.ts injects for claim/insurance queries to insurance-navigator agent; claim/workflow.ts uses for structured intake | schema.test.ts, loader tests | All consumer channels (insurance claims) | MCP, CLI, API |
| 14 | `legal-review` | TCFD, ISSB, GRESB, TNFD, CSDDD | schema.ts validates, loader.ts loads | router.ts injects for legal/compliance review queries to sustainability-reporting agent | schema.test.ts, loader tests | All consumer channels (legal review) | MCP, CLI, API |

### Compliance Tag Coverage Proof

All 15 compliance tags are represented across the current 15 skills:

| Tag | Skills Using It | Count |
|-----|----------------|-------|
| TCFD | physical-risk-screening, flood-risk-screening, wildfire-risk-assessment, carbon-tracker, climate-disclosure-structure, disaster-prep, investment-risk-screening, legal-review | 8 |
| ISSB | physical-risk-screening, climate-disclosure-structure, energy-efficiency, disaster-prep, legal-review | 5 |
| TNFD | flood-risk-screening, wildfire-risk-assessment, nature-dependency-screening, disaster-prep, legal-review | 5 |
| GHG_PROTOCOL | carbon-footprint-reduction, carbon-tracker, net-zero-roadmap | 3 |
| GENERAL | physical-risk-screening, carbon-footprint-reduction, carbon-tracker, home-resilience-audit, energy-efficiency, disaster-prep, insurance-claim-intake | 7 |
| CDP | carbon-tracker, energy-efficiency | 2 |
| CSRD | climate-disclosure-structure | 1 |
| SEC | climate-disclosure-structure | 1 |
| SFDR | investment-risk-screening | 1 |
| GRI | energy-efficiency | 1 |
| SBTi | net-zero-roadmap | 1 |
| SCIENCE_BASED | net-zero-roadmap | 1 |
| GRESB | legal-review | 1 |
| CSDDD | legal-review | 1 |
| ESRS | energy-efficiency | 1 |

### Test Coverage Proving Invokability

| Test File | What It Proves |
|-----------|---------------|
| `gateway/skills/schema.test.ts` | parseFrontmatter extracts id, name, complianceTags; validateFrontmatter enforces required fields; case-insensitive tag normalization; all 15 tags accepted; SkillValidationError thrown for invalid input |
| `gateway/seabri/sustainability-compliance.test.ts` | All 15 compliance tags represented across skill catalogue; every skill has valid frontmatter; no orphaned or unused tags |
| `gateway/mcp/server.test.ts` | MCP server exposes agents as tools; tools/list returns all 15 agents; tools/call dispatches to correct agent; unknown agent returns error |
| `gateway/mcp/client.test.ts` | MCP client spawns lazily; callTool resolves; close is safe on unstarted client; gbrain feature-flagged correctly |
| `gateway/orchestrator/classifier.test.ts` | Intent classification routes to correct agent IDs |
| `gateway/orchestrator/model-router.test.ts` | Model tier selection based on complexity signals |
| `gateway/seabri/task-router.test.ts` | Task routing integrates classification + model selection + sustainability scoring |
| `gateway/agents/tools.test.ts` | Tool execution framework works end-to-end |
| `gateway/tools/registry.test.ts` | Tool registration and per-agent filtering |

---

## Deliverable 6: Sustainable Computing Plan

### Current Infrastructure (Already Implemented)

OpenSeaBri already has sustainability-aware computing foundations:

#### A. Model Efficiency (gateway/orchestrator/model-router.ts)

**Current state:** 3-tier model routing is live.

| Tier | Model | Cost/1K Input | Cost/1K Output | Carbon Budget/Request |
|------|-------|---------------|----------------|----------------------|
| FAST | claude-haiku-4-5 | $0.001 | $0.005 | 0.01g CO2e |
| STANDARD | claude-sonnet-4-6 | $0.003 | $0.015 | 0.05g CO2e |
| REASONING | claude-opus-4-6 | $0.015 | $0.075 | 0.20g CO2e |

**Complexity scoring** already routes simple queries to haiku (85% cost reduction vs sonnet). Signals: message length, question count, comparison requests, multi-step requests, data analysis, report generation, conversation depth.

**Improvement plan:**
1. Add model usage telemetry dashboard showing tier distribution over time
2. Implement automatic downgrade suggestions when haiku handles 90%+ of a user's queries
3. Add batch mode for non-urgent tasks (lower priority = lower carbon)

#### B. Task Optimization (gateway/seabri/task-router.ts)

**Current state:** RoutingDecision includes estimatedCostUsd and estimatedCarbonGrams before execution.

**Improvement plan:**
1. Pre-execution cost approval: if estimated cost > $0.05 or carbon > 0.2g, ask user
2. Skill caching: cache skill ranking results for identical query patterns (beyond current 60s loader cache)
3. Response length budgets: set max_tokens based on task complexity to avoid over-generation

#### C. Carbon Tracking (gateway/seabri/sustainability-scoring.ts + telemetry.ts)

**Current state:** Every inference call is scored 0-100 on sustainability:
- **costEfficiency**: 0-100, lower cost = higher score, relative to tier budget
- **carbonEfficiency**: 0-100, lower carbon = higher score, relative to tier budget
- **composite**: average of both, with tier penalty (haiku: 0, sonnet: -5, opus: -10)
- **SustainabilityTier**: excellent (80-100), good (60-79), fair (40-59), poor (0-39)

**Improvement plan:**
1. Add weekly carbon report (seabri carbon-report) showing total gCO2e, trend, per-agent breakdown
2. Implement carbon budget per user/session with soft alerts at 80% and hard cap at 100%
3. Add carbon offset integration (display equivalent: "This session = 0.3g CO2e = driving 1 meter")

#### D. Infrastructure Efficiency

**Current state:**
- Session compression (memory/compress.ts) reduces context window usage
- 60-second skill cache (loader.ts) avoids re-parsing SKILL.md files
- SQLite FTS5 for search instead of in-memory scanning
- JSON-RPC 2.0 over stdio (MCP) — minimal protocol overhead

**Improvement plan:**
1. Add connection pooling metrics for Anthropic API calls
2. Implement response streaming cancellation when user disconnects mid-response
3. Add circuit breaker for MCP server failures (nanobot, gbrain)
4. Implement skill preloading at gateway startup (eliminate first-request penalty)

#### E. Telemetry & Reporting

**Current state:** metrics.ts records per-call: sessionId, agentId, model, tier, inputTokens, outputTokens, latencyMs, toolCalls, costUsd, carbonGrams, timestamp. getTelemetrySnapshot() returns aggregated view.

**Improvement plan:**
1. Add Prometheus-compatible metrics endpoint (/metrics) for monitoring
2. Add daily sustainability email digest (opt-in, via sendgrid)
3. Build telemetry dashboard component for web UI (src/hooks/useLiveTelemetry.ts exists but needs dashboard)
4. Add per-agent carbon leaderboard showing which agents are most/least efficient

### Sustainable Computing Targets

| Metric | Current | Sprint 2 Target | Sprint 3 Target |
|--------|---------|-----------------|-----------------|
| Haiku usage rate | Not tracked | 40% of queries | 60% of queries |
| Avg sustainability score | Not tracked | 70+ composite | 80+ composite |
| Carbon per session | Not tracked | < 0.5g CO2e | < 0.3g CO2e |
| Model downgrade suggestions | Not implemented | Implemented | Auto-downgrade |
| Carbon budget alerts | Not implemented | Soft alerts | Hard caps |
| Weekly carbon report | Not implemented | CLI report | CLI + email |

---

## Deliverable 7: File-by-File Implementation Plan

### Phase 1: Boundary Enforcement (Sprint 1, Week 3)

| File | Action | Product | Effort |
|------|--------|---------|--------|
| `gateway/product.ts` | **CREATE** — Product enum (COMPANION, HARNESS), isCompanionSurface(), isHarnessSurface() helpers | Shared Core | S |
| `gateway/channels/base.ts` | **MODIFY** — Add `product: Product` field to BaseChannel interface | Shared Core | XS |
| `gateway/channels/telegram.ts` | **MODIFY** — Set `product: COMPANION` | Living Companion | XS |
| `gateway/channels/whatsapp.ts` | **MODIFY** — Set `product: COMPANION` | Living Companion | XS |
| `gateway/channels/sms.ts` | **MODIFY** — Set `product: COMPANION` | Living Companion | XS |
| `gateway/channels/discord.ts` | **MODIFY** — Set `product: COMPANION` | Living Companion | XS |
| `gateway/channels/slack.ts` | **MODIFY** — Set `product: COMPANION` | Living Companion | XS |
| `gateway/mcp/server.ts` | **MODIFY** — Set `product: HARNESS` context on MCP calls | Agent Harness | S |
| `cli/seabri.ts` | **MODIFY** — Set `product: HARNESS` context on CLI calls | Agent Harness | S |
| `gateway/seabri/api-handler.ts` | **MODIFY** — Set `product: HARNESS` context on API calls | Agent Harness | S |
| `gateway/product.test.ts` | **CREATE** — Test product boundary helpers | Shared Core | S |

### Phase 2: Sustainable Computing Dashboard (Sprint 2, Week 1)

| File | Action | Product | Effort |
|------|--------|---------|--------|
| `gateway/seabri/carbon-report.ts` | **CREATE** — Weekly/daily carbon report generation from telemetry data | Shared Core | M |
| `gateway/seabri/carbon-budget.ts` | **CREATE** — Per-user/session carbon budgets with soft/hard alerts | Shared Core | M |
| `cli/seabri.ts` | **MODIFY** — Add `seabri carbon-report` subcommand | Agent Harness | S |
| `src/components/sustainability-dashboard/CarbonReport.tsx` | **CREATE** — Carbon report component for web UI | Living Companion | M |
| `gateway/seabri/carbon-report.test.ts` | **CREATE** — Carbon report tests | Shared Core | S |
| `gateway/seabri/carbon-budget.test.ts` | **CREATE** — Carbon budget tests | Shared Core | S |

### Phase 3: Channel Completion (Sprint 2, Week 2)

| File | Action | Product | Effort |
|------|--------|---------|--------|
| `gateway/channels/sms.ts` | **MODIFY** — Add inbound SMS webhook handler | Living Companion | M |
| `gateway/channels/voice.ts` | **CREATE** — Voice channel adapter (Twilio Voice with TwiML) | Living Companion | L |
| `src/components/VoicePanel.tsx` | **CREATE** — Voice interaction UI (optional web-based) | Living Companion | M |

### Phase 4: MCP & Harness Expansion (Sprint 2, Week 2)

| File | Action | Product | Effort |
|------|--------|---------|--------|
| `gateway/mcp/server.ts` | **MODIFY** — Add resources/list support (skill catalogue as MCP resources) | Agent Harness | M |
| `gateway/mcp/client.ts` | **MODIFY** — Add GBrain MCP adapter integration | Agent Harness | M |
| `gateway/registries/mcp-registry.ts` | **CREATE** — MCP server discovery and health tracking | Agent Harness | M |
| `gateway/registries/mcp-registry.test.ts` | **CREATE** — MCP registry tests | Agent Harness | S |

### Phase 5: Skill Authoring & Import/Export (Sprint 3)

| File | Action | Product | Effort |
|------|--------|---------|--------|
| `gateway/skills/validator.ts` | **CREATE** — Deep skill validation (body quality, evidence source check, framework coverage) | Shared Core | M |
| `gateway/skills/marketplace.ts` | **CREATE** — Skill import/export, version tracking, dependency resolution; not a public marketplace | Agent Harness | L |
| `cli/seabri.ts` | **MODIFY** — Add `seabri skills import`, `seabri skills export`, `seabri skills validate` | Agent Harness | M |
| `gateway/skills/validator.test.ts` | **CREATE** — Validator tests | Shared Core | S |

### Phase 6: Upstream Compatibility (Sprint 3)

| File | Action | Product | Effort |
|------|--------|---------|--------|
| `gateway/upstream/hermes.ts` | **CREATE** — Hermes agent adapter (upstream compatibility layer) | Shared Core | M |
| `gateway/upstream/mirofish.ts` | **CREATE** — MiroFish adapter | Shared Core | M |
| `gateway/upstream/openclaw.ts` | **CREATE** — OpenClaw adapter | Shared Core | M |
| `gateway/upstream/index.ts` | **CREATE** — Upstream registry and health checks | Shared Core | S |
| `gateway/upstream/hermes.test.ts` | **CREATE** — Hermes adapter tests | Shared Core | S |

### Effort Legend

| Size | Meaning | Approximate Time |
|------|---------|-------------------|
| XS | Trivial change, <10 lines | < 15 min |
| S | Small change, 10-50 lines | 15-45 min |
| M | Medium change, 50-200 lines | 1-3 hours |
| L | Large change, 200+ lines | 3-8 hours |

---

## Deliverable 8: Sprint Priorities

### Sprint 1, Week 3 (Current — Immediate)

**Theme: Boundary Enforcement + Foundation Hardening**

| Priority | Task | Product | Effort | Dependencies |
|----------|------|---------|--------|--------------|
| P0 | Create `gateway/product.ts` with Product enum and boundary helpers | Shared Core | S | None |
| P0 | Tag all channels with product affinity (COMPANION/HARNESS) | Both | S | product.ts |
| P0 | Run full test suite — confirm 1156 tests still green | Both | XS | None |
| P1 | Add GBrain MCP adapter (connect gbrain when feature-flagged) | Agent Harness | M | None |
| P1 | Add SMS inbound webhook handler | Living Companion | M | None |
| P1 | CI workflow: vitest + type-check on push | Both | S | None |
| P2 | Upstream skill map documentation | Both | S | None |
| P2 | DeepSeek model integration in model-router.ts | Shared Core | M | None |

### Sprint 2, Week 1

**Theme: Sustainable Computing + Carbon Visibility**

| Priority | Task | Product | Effort | Dependencies |
|----------|------|---------|--------|--------------|
| P0 | Carbon report generation (carbon-report.ts) | Shared Core | M | telemetry.ts |
| P0 | Carbon budget with alerts (carbon-budget.ts) | Shared Core | M | telemetry.ts |
| P0 | `seabri carbon-report` CLI command | Agent Harness | S | carbon-report.ts |
| P1 | Web dashboard carbon report component | Living Companion | M | carbon-report.ts |
| P1 | Model tier distribution tracking (% haiku/sonnet/opus) | Shared Core | S | metrics.ts |
| P2 | Auto-downgrade suggestions for simple queries | Shared Core | M | model-router.ts |

### Sprint 2, Week 2

**Theme: Channel & MCP Expansion**

| Priority | Task | Product | Effort | Dependencies |
|----------|------|---------|--------|--------------|
| P0 | MCP resources/list support (skills as resources) | Agent Harness | M | None |
| P0 | MCP registry for server discovery | Agent Harness | M | None |
| P1 | Voice channel adapter (Twilio Voice) | Living Companion | L | None |
| P1 | Multilingual response support (lang.ts enhancement) | Shared Core | M | None |
| P2 | Response streaming cancellation on disconnect | Shared Core | S | None |

### Sprint 3

**Theme: Skill Marketplace + Upstream**

| Priority | Task | Product | Effort | Dependencies |
|----------|------|---------|--------|--------------|
| P0 | Deep skill validator | Shared Core | M | None |
| P0 | Skill import/export/version tracking | Agent Harness | L | validator.ts |
| P1 | Hermes upstream adapter | Shared Core | M | None |
| P1 | MiroFish upstream adapter | Shared Core | M | None |
| P1 | OpenClaw upstream adapter | Shared Core | M | None |
| P2 | Prometheus metrics endpoint | Agent Harness | M | None |
| P2 | Daily sustainability email digest | Living Companion | M | carbon-report.ts |

### Sprint Priority Definitions

| Level | Meaning |
|-------|---------|
| P0 | Must complete this sprint — blocks other work or user-facing commitment |
| P1 | Should complete this sprint — important but can slip 1 week |
| P2 | Nice to have this sprint — complete if time allows |

---

## Summary

OpenSeaBri is **two products sharing one sustainability-first core**:

- **Living Companion**: 6 consumer channels (WhatsApp, Telegram, SMS, Discord, Slack, Web) delivering 7 specialist agents to individuals, households, farmers, and communities. Personality-driven, multilingual, incident-aware.

- **Agent Harness**: MCP server, CLI, HTTP API delivering the same 15 agents as programmable tools for developers, CI pipelines, and agent systems. Registry-driven, telemetry-rich, composable.

- **Shared Core**: 14 validated skills across 15 compliance frameworks, 3-tier model routing with carbon budgeting, sustainability scoring on every inference call, workflow engine with 5 step types, session persistence with compression, and full-text search.

Every skill is registered (schema.ts), invokable (router.ts + loader.ts + rag.ts), tested (1156 tests across 83 files), and usable from both product surfaces (consumer channels + MCP/CLI/API).

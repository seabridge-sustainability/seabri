# SeaBri — System Architecture & Build Plan

**Date:** 2026-05-02
**Status:** AWAITING CONFIRMATION
**Scope:** Transform OpenSeaBri into SeaBri — a production-grade, open, self-improving AI operating system for sustainability optimization.

---

## 1. Executive Summary

SeaBri already has strong foundations: 8 domain agents, multi-channel delivery (Web/CLI/Telegram/Slack/Discord/WhatsApp), autonomous research loops, self-generating skills, and a bridge to 24 enterprise agents in manageesg-backend. The gap is not capability — it's **orchestration, persistence, and composability**.

The plan adds four layers to the existing system:

1. **Meta-Orchestrator** — central intelligence that routes tasks, selects models, and tracks cost/latency/sustainability
2. **Workflow Engine** — composable multi-agent pipelines (visual + programmatic)
3. **Sustainability Intelligence Engine** — carbon-proxy scoring on every system action
4. **Self-Improvement Loop** — closed feedback from usage → agent refinement → better outcomes

The build reuses existing upstream references (hermes-agent, space-agent, openclaw) and patterns from Sim where they're superior, rather than starting from scratch.

---

## 2. Current State Assessment

### What SeaBri Already Has (Strengths)

| Capability | Implementation | Maturity |
|---|---|---|
| 8 domain agents | gateway/agents/agents.ts | Production |
| Multi-channel delivery | Web, CLI, Telegram, Slack, Discord, WhatsApp | Production |
| Autonomous research loop | research/overnight.ts, 8hr cycles, parallel execution | Beta |
| Skill auto-generation | SKILL.md files written by agents after complex tasks | Beta |
| Session persistence | JSON files + SQLite FTS5 search | Production |
| Backend bridge | 24 LangGraph agents via /api/v1/openseabri/* | Production |
| CLI + daemon service | Commander.js, launchd/systemd/Task Scheduler | Production |
| Natural language cron | `seabri cron add "daily flood risk briefing at 8am"` | Beta |
| Live data tools | 9 tools (FEMA, NOAA, USGS, NASA FIRMS, Tavily, etc.) | Production |
| Graceful degradation | Bridge, integrations, tools all degrade without error | Production |

### What SeaBri Lacks (Gaps)

| Gap | Impact | Priority |
|---|---|---|
| No central orchestrator — agents are peer-level, manually selected | Users must know which agent to use | CRITICAL |
| No workflow engine — single-turn agent calls only | Can't compose multi-step pipelines | CRITICAL |
| No relational database — JSON files don't scale | No querying, no analytics, no multi-user | HIGH |
| No model routing — hardcoded to claude-sonnet-4-6 | Overspend on simple tasks | HIGH |
| No cost/latency/sustainability tracking | Can't optimize what you don't measure | HIGH |
| No plugin/extension system | Community can't add agents or tools | MEDIUM |
| No visual workflow builder | Power users can't design custom flows | MEDIUM |
| No user accounts or multi-tenancy | Single-user only | MEDIUM |
| No evaluation/benchmark framework | Can't measure agent quality over time | MEDIUM |

---

## 3. Benchmark Comparison

### Sim (simstudioai/sim)

**Architecture:** Next.js monorepo, PostgreSQL + Drizzle ORM, ReactFlow visual editor, Trigger.dev background jobs, E2B + isolated-vm sandboxed execution, Socket.io realtime, Bun runtime.

| Sim Strength | SeaBri Position | Action |
|---|---|---|
| Visual workflow builder (ReactFlow) | No visual editor | Adopt ReactFlow for workflow canvas |
| 1000+ integrations via typed connectors | 9 live data tools + backend bridge | Build typed connector interface, start with existing tools |
| Background job orchestration (Trigger.dev) | Research loop + daemon (custom) | Keep custom daemon; evaluate Trigger.dev for scheduled workflows |
| Isolated code execution (E2B + isolated-vm) | No sandboxing | Add isolated-vm for user-submitted code in workflows |
| Copilot for workflow generation | No equivalent | Build workflow copilot using existing agent system |
| PostgreSQL + Drizzle ORM | SQLite FTS5 + JSON files | Migrate to PostgreSQL for multi-user persistence |
| Zod schema validation | TypeScript interfaces only | Add Zod at API boundaries |
| Better Auth | No auth | Adopt Better Auth for user management |

**Sim Weakness vs SeaBri:**
- Sim has no domain specialization — it's a generic agent builder
- Sim has no sustainability intelligence, scoring, or environmental accounting
- Sim has no autonomous research capability
- Sim has no multi-channel delivery (Web only)

### Hermes (hermes-agent, _upstream)

**Architecture:** CLI-first conversation framework, centralized `CommandDef` registry, TUI interface (Ink React), multi-instance profiles, tool auto-discovery.

| Hermes Strength | SeaBri Position | Action |
|---|---|---|
| Centralized command registry with auto-discovery | Slash commands in gateway/commands.ts | Formalize into extensible registry |
| Multi-profile support | Single user | Add profile system for multi-user |
| Tool registry with typed schemas | Inline tool definitions | Extract to typed registry |
| Ink-based TUI | Commander.js + Inquirer | Keep current CLI; Ink adds complexity without value |

**Already adopted:** SeaBri's conversation orchestration layer was built on hermes-agent patterns. The gap is formalization, not functionality.

### OpenClaw (openclaw, _upstream)

**Architecture:** Personal multi-channel AI assistant, analytics and aggregation utilities.

| OpenClaw Strength | SeaBri Position | Action |
|---|---|---|
| Multi-channel integration patterns | Already implemented in SeaBri | No action — SeaBri already has this |
| Analytics/aggregation utilities | Bridge to backend analytics | Integrate deeper with backend analytics pipeline |

**Already adopted:** SeaBri's multi-channel architecture and aggregation patterns come from OpenClaw. Migration path documented in README.

### Space Agents (space-agent, _upstream)

**Architecture:** Browser-first AI agent runtime, visual workflow reshaping, modular SKILL.md text files, Git-backed time travel.

| Space Agent Strength | SeaBri Position | Action |
|---|---|---|
| Visual workflow reshaping (drag-and-drop) | No visual editor | Inform ReactFlow workflow design |
| Git-backed time travel for sessions | JSON file snapshots | Add Git-backed session versioning |
| SKILL.md auto-generation | Already implemented | SeaBri already has this |
| Modular skill composition | Skills are standalone, not composable | Add skill chaining in workflows |

---

## 4. Architecture Design

### System Architecture (Textual Diagram)

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACES                          │
│  Web UI (React/Vite)  │  CLI  │  Telegram  │  Slack  │  API    │
└───────────────────────────┬─────────────────────────────────────┘
                            │ WebSocket / HTTP
┌───────────────────────────▼─────────────────────────────────────┐
│                     GATEWAY LAYER                                │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ Auth (Better │  │ Rate Limiter │  │ Channel Router         │ │
│  │ Auth)        │  │              │  │ (Web/CLI/Telegram/...) │ │
│  └──────────────┘  └──────────────┘  └────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                   META-ORCHESTRATOR                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Task Router  │  │ Model Router │  │ Sustainability       │  │
│  │ (intent →    │  │ (smallest    │  │ Scorer (carbon       │  │
│  │  agent(s))   │  │  viable      │  │ proxy per action)    │  │
│  │              │  │  model)      │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Execution    │  │ Cost/Latency │  │ Feedback Collector   │  │
│  │ Planner      │  │ Tracker      │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                     AGENT LAYER                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ SYSTEM AGENTS          │ DOMAIN AGENTS                      │ │
│  │ • Orchestrator         │ • Climate Risk                     │ │
│  │ • Efficiency Optimizer │ • Nature & Biodiversity            │ │
│  │ • Sustainability Score │ • Sustainability Reporting         │ │
│  │ • Self-Improvement     │ • Investment Risk                  │ │
│  │ • Data Ingestion       │ • Home & Community                 │ │
│  │                        │ • Net Zero & Decarbonization       │ │
│  │                        │ • Natural Capital & Land           │ │
│  │                        │ • General Sustainability           │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ AGENT CAPABILITIES (shared)                                 │ │
│  │ • Tool use (typed registry)  • Memory (short + long-term)  │ │
│  │ • Inter-agent messaging      • Skill execution             │ │
│  │ • Workflow participation     • Backend bridge calls        │ │
│  └─────────────────────────────────────────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                    WORKFLOW ENGINE                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Programmatic │  │ Visual       │  │ Event-Driven         │  │
│  │ Pipelines    │  │ Canvas       │  │ Triggers             │  │
│  │ (TypeScript) │  │ (ReactFlow)  │  │ (cron, webhook,      │  │
│  │              │  │              │  │  data change)        │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│  Supports: parallel, conditional, loop, fan-out/fan-in          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                       DATA LAYER                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ PostgreSQL   │  │ SQLite FTS5  │  │ File Storage         │  │
│  │ (users,      │  │ (session     │  │ (skills, research    │  │
│  │  workflows,  │  │  search,     │  │  outputs, uploads)   │  │
│  │  metrics)    │  │  local index)│  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Backend Bridge: manageesg-backend /api/v1/openseabri/*   │   │
│  │ (MongoDB, Vector DB, 24 LangGraph agents, GIS toolkit)   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

**Decision 1: Build custom orchestration, not extend Sim.**
Sim's workflow engine is tightly coupled to its Next.js monorepo and PostgreSQL schema. Extracting it would be harder than building a focused orchestrator for SeaBri's specific needs. However, adopt Sim's patterns: ReactFlow for visualization, Zod for validation, typed connector interface for tools.

**Decision 2: Keep Node.js/TypeScript, add PostgreSQL.**
SeaBri's stack (Vite + React + WebSocket gateway + CLI) is well-suited. The gap is persistence — add PostgreSQL (via Drizzle ORM, matching Sim's pattern) for structured data while keeping SQLite FTS5 for local session search. JSON file sessions remain as a fallback for offline/standalone use.

**Decision 3: Keep the backend bridge, don't merge codebases.**
SeaBri serves consumers; manageesg-backend serves institutions. The bridge pattern (graceful degradation, optional enhancement) is correct. Strengthen the bridge with more endpoints, but don't merge the systems.

**Decision 4: Model routing via tiered escalation, not RL.**
Start with deterministic rules (haiku for simple Q&A, sonnet for analysis, opus for complex reasoning). Track cost/latency metrics. Reinforcement learning optimization is Phase 5+ — premature now.

---

## 5. Detailed Build Plan

### Phase 1: Core Stabilization (Weeks 1–3)

**Goal:** Solid foundation for everything that follows. Done = all existing tests pass, new persistence layer works, auth exists.

#### Task 1.1: PostgreSQL + Drizzle ORM Setup
- **Files:** `db/schema.ts`, `db/migrate.ts`, `db/client.ts`
- **Schema:** users, sessions, agents, workflows, metrics, skills
- **Keep:** SQLite FTS5 for local search (existing), JSON file sessions as offline fallback
- **Dependency:** None
- **Test:** `vitest` — CRUD operations on all tables, migration up/down
- **Estimate:** 4–6 hours

#### Task 1.2: Authentication (Better Auth)
- **Files:** `gateway/auth.ts`, `src/lib/auth.ts`
- **Pattern:** Better Auth with email/password + OAuth (GitHub, Google)
- **Keep:** Unauthenticated mode for local/CLI use (standalone)
- **Dependency:** 1.1 (PostgreSQL)
- **Test:** Login flow, session persistence, token refresh, unauthenticated fallback
- **Estimate:** 3–4 hours

#### Task 1.3: Zod Schema Validation at Boundaries
- **Files:** `types/schemas.ts` (new), update gateway message handlers
- **Scope:** WebSocket messages, REST endpoints, tool inputs/outputs
- **Dependency:** None
- **Test:** Invalid message rejection, type narrowing in handlers
- **Estimate:** 2–3 hours

#### Task 1.4: Typed Tool Registry
- **Files:** `gateway/tools/registry.ts` (new), migrate inline tool definitions
- **Pattern:** Centralized registry with JSON Schema per tool, auto-discovery
- **Source pattern:** hermes-agent CommandDef registry
- **Dependency:** 1.3 (Zod)
- **Test:** Tool registration, schema validation, discovery API
- **Estimate:** 3–4 hours

**Phase 1 verification:** All existing tests pass + new tests for auth, DB, schemas, tool registry.

---

### Phase 2: Meta-Orchestrator (Weeks 4–6)

**Goal:** Central intelligence layer that routes tasks to agents, selects models, and tracks execution metrics. Done = user sends a message, orchestrator picks the right agent(s) without user specifying.

#### Task 2.1: Intent Classifier + Task Router
- **Files:** `orchestrator/router.ts`, `orchestrator/classifier.ts`
- **Logic:** Classify user intent → map to one or more agents → execute
- **Approach:** LLM-based classification (haiku for speed) with deterministic fallbacks
- **Handles:** Single-agent routing, multi-agent fan-out, follow-up context
- **Dependency:** 1.4 (Tool Registry)
- **Test:** 50+ intent → agent mapping cases, multi-agent routing, ambiguity handling
- **Estimate:** 6–8 hours

#### Task 2.2: Model Router
- **Files:** `orchestrator/model-router.ts`
- **Tiers:**
  - **Tier 1 (haiku):** Simple Q&A, classification, extraction — latency < 2s, cost ~$0.001/call
  - **Tier 2 (sonnet):** Analysis, recommendations, report generation — latency < 10s
  - **Tier 3 (opus):** Complex reasoning, multi-step planning — latency < 30s
- **Escalation:** Start at Tier 1, escalate on confidence threshold or task complexity signal
- **Dependency:** None
- **Test:** Model selection for 30+ task types, cost tracking accuracy
- **Estimate:** 4–5 hours

#### Task 2.3: Execution Planner
- **Files:** `orchestrator/planner.ts`
- **Logic:** Decompose complex requests into execution steps (sequential, parallel, conditional)
- **Output:** Execution plan with agent assignments, model selections, dependency graph
- **Dependency:** 2.1, 2.2
- **Test:** Multi-step task decomposition, parallel vs sequential decision
- **Estimate:** 5–6 hours

#### Task 2.4: Cost / Latency / Sustainability Tracker
- **Files:** `orchestrator/metrics.ts`, `db/schema.ts` (add metrics table)
- **Tracks per request:**
  - Input/output tokens, model used, cost (USD)
  - Latency (ms)
  - Carbon proxy: estimated gCO2e per request (based on model, data center, tokens)
- **Carbon proxy model:** Use published LLM energy estimates (Luccioni et al. 2023) × grid intensity
- **Dependency:** 1.1 (PostgreSQL), 2.2 (Model Router)
- **Test:** Metric recording accuracy, aggregation queries, carbon calculation
- **Estimate:** 4–5 hours

**Phase 2 verification:** Send 20 diverse user messages → correct agent routing, appropriate model selection, metrics recorded.

---

### Phase 3: Workflow Engine (Weeks 7–10)

**Goal:** Composable multi-agent pipelines that users can build programmatically and visually. Done = a user can create a "weekly climate risk briefing" workflow that chains 3 agents and runs on schedule.

#### Task 3.1: Workflow Definition Schema
- **Files:** `workflows/schema.ts`, `workflows/types.ts`
- **Schema (Zod):** Workflow → Steps → (Agent | Tool | Condition | ParallelGroup)
- **Supports:** Sequential, parallel, conditional branching, loops, fan-out/fan-in
- **Persistence:** PostgreSQL (workflows table) + JSON export
- **Dependency:** 1.1, 1.3
- **Test:** Schema validation for 10+ workflow patterns
- **Estimate:** 3–4 hours

#### Task 3.2: Workflow Runtime Engine
- **Files:** `workflows/runtime.ts`, `workflows/executor.ts`
- **Logic:** Execute workflow definition step-by-step with state passing between steps
- **Features:** Retry on failure, timeout per step, intermediate result streaming
- **Concurrency:** Promise.all for parallel steps, sequential for dependent steps
- **Dependency:** 3.1, 2.1 (Task Router)
- **Test:** Execute 5 reference workflows end-to-end, failure recovery
- **Estimate:** 8–10 hours

#### Task 3.3: Event-Driven Triggers
- **Files:** `workflows/triggers.ts`
- **Trigger types:**
  - Cron (upgrade existing node-cron to workflow-aware)
  - Webhook (HTTP POST → workflow execution)
  - Data change (new session, metric threshold)
  - Manual (user-initiated)
- **Dependency:** 3.2, existing cron system
- **Test:** Each trigger type fires workflow correctly
- **Estimate:** 4–5 hours

#### Task 3.4: Visual Workflow Canvas
- **Files:** `src/components/workflow-canvas/` (new)
- **Tech:** ReactFlow (same as Sim)
- **Features:**
  - Drag-and-drop agent nodes, tool nodes, condition nodes
  - Connection validation (type-safe edges)
  - Real-time execution visualization
  - Export to programmatic definition
- **Dependency:** 3.1, 3.2
- **Test:** Create workflow via canvas → execute → verify same result as programmatic
- **Estimate:** 12–16 hours

#### Task 3.5: Workflow Copilot
- **Files:** `workflows/copilot.ts`
- **Logic:** Natural language → workflow definition via LLM
- **Example:** "Create a workflow that checks flood risk weekly and alerts me if score > 7"
- **Dependency:** 3.1, 2.1
- **Test:** 10 natural language descriptions → valid workflow definitions
- **Estimate:** 4–5 hours

**Phase 3 verification:** Create and execute 3 workflows: (1) programmatic, (2) visual canvas, (3) copilot-generated. All produce correct results.

---

### Phase 4: Sustainability Intelligence Engine (Weeks 11–13)

**Goal:** Every action in SeaBri gets a sustainability score. Done = dashboard shows cumulative carbon footprint, cost savings, and sustainability recommendations.

#### Task 4.1: Carbon Proxy Model
- **Files:** `sustainability/carbon-model.ts`
- **Calculates:** gCO2e per LLM call based on:
  - Model (haiku=0.1x, sonnet=1x, opus=3x relative energy)
  - Token count (input + output)
  - Provider data center location (if available) × grid carbon intensity
  - Tool calls (API requests, external compute)
- **Data sources:** IEA electricity maps, published LLM energy benchmarks
- **Dependency:** 2.4 (Metrics Tracker)
- **Test:** Carbon calculation accuracy against published benchmarks
- **Estimate:** 4–5 hours

#### Task 4.2: Decision Scoring Engine
- **Files:** `sustainability/scorer.ts`
- **Scores user decisions on:**
  - Carbon impact (from 4.1)
  - Resource efficiency (compute used vs minimum viable)
  - Recommendation quality (did the user follow the more sustainable option?)
- **Integration points:** Agent outputs, workflow results, user actions
- **Dependency:** 4.1, 2.4
- **Test:** Score 20 real-world decision scenarios
- **Estimate:** 5–6 hours

#### Task 4.3: Sustainability Dashboard
- **Files:** `src/components/sustainability-dashboard/` (new)
- **Displays:**
  - Cumulative carbon footprint (daily, weekly, monthly)
  - Cost savings from model routing (vs always-opus baseline)
  - Sustainability score trend
  - Actionable recommendations ("Switch to X to reduce carbon by Y%")
- **Dependency:** 4.1, 4.2, 1.1
- **Test:** Dashboard renders with real metric data, recommendations are actionable
- **Estimate:** 6–8 hours

**Phase 4 verification:** Run 50 agent interactions → dashboard shows accurate carbon tracking, cost savings, and relevant recommendations.

---

### Phase 5: Self-Improvement System (Weeks 14–16)

**Goal:** SeaBri gets better over time without manual intervention. Done = system identifies underperforming agents/skills and improves them automatically.

#### Task 5.1: Feedback Collection
- **Files:** `improvement/feedback.ts`
- **Collects:**
  - Explicit: user ratings (thumbs up/down), corrections, complaints
  - Implicit: follow-up questions (agent didn't answer fully), session abandonment, re-routing
- **Storage:** PostgreSQL feedback table linked to session, agent, workflow
- **Dependency:** 1.1, 2.4
- **Test:** Feedback capture for all signal types
- **Estimate:** 3–4 hours

#### Task 5.2: Performance Monitoring + Evaluation Pipeline
- **Files:** `improvement/evaluator.ts`
- **Evaluates per agent:**
  - Task success rate (based on feedback signals)
  - Average latency
  - Cost per successful task
  - User satisfaction score
- **Runs:** Nightly evaluation job (upgrade existing research daemon)
- **Dependency:** 5.1, 2.4
- **Test:** Evaluation pipeline produces accurate agent scorecards
- **Estimate:** 4–5 hours

#### Task 5.3: Automatic Prompt/Skill Refinement
- **Files:** `improvement/refiner.ts`
- **Logic:**
  - Identify lowest-performing agent (by 5.2 metrics)
  - Analyze failure patterns (common user complaints, low-rated responses)
  - Generate improved system prompt or skill update via LLM
  - A/B test improved version against baseline
- **Safety:** All changes are staged, never auto-deployed without performance improvement proof
- **Pattern:** Extends existing skill auto-generation (skills/ directory)
- **Dependency:** 5.2, existing skill system
- **Test:** Simulated agent degradation → system detects and proposes improvement
- **Estimate:** 6–8 hours

#### Task 5.4: Workflow Optimization
- **Files:** `improvement/workflow-optimizer.ts`
- **Logic:**
  - Identify slow/expensive workflow steps
  - Suggest model downgrades for steps that don't need high capability
  - Suggest parallelization for independent sequential steps
  - Suggest caching for repeated tool calls
- **Dependency:** 5.2, 3.2
- **Test:** Optimize 3 reference workflows → measurable cost/latency reduction
- **Estimate:** 4–5 hours

**Phase 5 verification:** Run system for 1 week → self-improvement system identifies at least one underperforming component and proposes a measurable improvement.

---

### Phase 6: Open Ecosystem (Weeks 17–20)

**Goal:** External developers can add agents, tools, and integrations to SeaBri. Done = publish SDK, 3 community-contributed plugins work correctly.

#### Task 6.1: Plugin System
- **Files:** `plugins/loader.ts`, `plugins/types.ts`, `plugins/sandbox.ts`
- **Plugin types:** Agent plugin, Tool plugin, Workflow template, Dashboard widget
- **Interface:** Each plugin exports a manifest (name, version, type, capabilities)
- **Sandbox:** Plugins run in isolated-vm (from Sim's pattern) — no filesystem or network access by default
- **Dependency:** 1.4 (Tool Registry), 2.1 (Task Router)
- **Test:** Load plugin, register capabilities, execute in sandbox
- **Estimate:** 8–10 hours

#### Task 6.2: REST API Layer
- **Files:** `api/routes/` (new)
- **Endpoints:**
  - `POST /api/v1/chat` — send message, get response
  - `GET/POST /api/v1/workflows` — CRUD workflows
  - `POST /api/v1/workflows/:id/run` — execute workflow
  - `GET /api/v1/agents` — list available agents
  - `GET /api/v1/metrics` — usage metrics
  - `GET /api/v1/sustainability` — carbon/sustainability data
- **Auth:** Bearer token (Better Auth)
- **Docs:** OpenAPI/Swagger auto-generated from Zod schemas
- **Dependency:** 1.2 (Auth), 1.3 (Zod)
- **Test:** API contract tests for all endpoints
- **Estimate:** 6–8 hours

#### Task 6.3: Developer SDK
- **Files:** `sdk/` (new npm package: `@seabri/sdk`)
- **Contents:**
  - TypeScript client for REST API
  - Plugin development helpers
  - Workflow definition helpers
  - Type definitions for all interfaces
- **Dependency:** 6.2
- **Test:** SDK client performs all API operations correctly
- **Estimate:** 4–6 hours

#### Task 6.4: External Integration Framework
- **Files:** `integrations/connector.ts` (upgrade existing pattern)
- **Typed connector interface:**
  ```typescript
  interface Connector {
    id: string
    name: string
    auth: AuthConfig
    actions: Action[]
    triggers: Trigger[]
  }
  ```
- **Initial connectors:** Upgrade existing 9 tools + ManageESG bridge to connector interface
- **Dependency:** 1.4, 6.1
- **Test:** All existing tools work through new connector interface
- **Estimate:** 5–6 hours

**Phase 6 verification:** Create a sample plugin (custom agent + tool), install via SDK, execute through API, verify isolation.

---

## 6. Gap Analysis Summary

### SeaBri vs Competitors — Ranked Gaps

| # | Gap | vs. Which System | Priority | Phase |
|---|---|---|---|---|
| 1 | No central orchestrator / task routing | Sim, Hermes | CRITICAL | 2 |
| 2 | No workflow engine / multi-step pipelines | Sim, Space Agents | CRITICAL | 3 |
| 3 | No relational database for multi-user | Sim | HIGH | 1 |
| 4 | No model routing / cost optimization | Sim (via integration count) | HIGH | 2 |
| 5 | No sustainability scoring on system actions | Unique differentiator | HIGH | 4 |
| 6 | No authentication / multi-tenancy | Sim (Better Auth) | HIGH | 1 |
| 7 | No visual workflow builder | Sim (ReactFlow), Space Agents | MEDIUM | 3 |
| 8 | No plugin/extension ecosystem | Sim | MEDIUM | 6 |
| 9 | No REST API (WebSocket only) | Sim, Hermes | MEDIUM | 6 |
| 10 | No evaluation framework | Internal need | MEDIUM | 5 |

### SeaBri Advantages Over All Competitors

| Advantage | Description |
|---|---|
| **Domain depth** | 8 specialized sustainability agents (no competitor has this) |
| **Multi-channel** | Web + CLI + Telegram + Slack + Discord + WhatsApp (Sim is web-only) |
| **Autonomous research** | 8-hour overnight research cycles with parallel execution (unique) |
| **Self-generating skills** | Agents write SKILL.md files after complex tasks (unique) |
| **Enterprise bridge** | Optional connection to 24 LangGraph agents + GIS toolkit (unique) |
| **Sustainability-first** | Every architectural decision optimizes for environmental impact |
| **MIT open source** | Consumer product, not enterprise-gated |

---

## 7. Risks & Tradeoffs

| Risk | Impact | Mitigation |
|---|---|---|
| PostgreSQL adds deployment complexity | Users accustomed to zero-config (npm start) | Keep SQLite as default for standalone; PostgreSQL opt-in for multi-user |
| ReactFlow bundle size (~200KB) | Increases frontend load | Lazy-load workflow canvas; only import when user navigates to workflows |
| Model routing adds latency (classification step) | Extra ~500ms per request | Cache classifications for similar inputs; bypass for explicit agent selection |
| Self-improvement could degrade agents | Auto-refined prompts may be worse | A/B testing gate; no auto-deploy without performance improvement proof |
| Plugin sandboxing limits capability | isolated-vm restricts what plugins can do | Allow capability escalation with explicit user approval |
| Scope creep across 6 phases | 20 weeks is ambitious | Each phase is independently valuable — can ship after any phase |

---

## 8. Immediate Next Steps (If Approved)

1. **Create branch** `feat/seabri-orchestrator` from current openseabri main
2. **Phase 1, Task 1.1** — Add PostgreSQL + Drizzle ORM with migration system
3. **Phase 1, Task 1.3** — Add Zod schemas for existing WebSocket messages (can parallel with 1.1)
4. Validate Phase 1 end-to-end before starting Phase 2

---

## 9. Validation & Metrics

### Performance Benchmarks
- **Intent classification latency:** < 1s (haiku classifier)
- **End-to-end response time:** < 5s for Tier 1, < 15s for Tier 2, < 45s for Tier 3
- **Workflow execution overhead:** < 500ms per step routing
- **API response time:** p95 < 200ms for read endpoints

### Cost Efficiency Metrics
- **Model routing savings:** Track $ saved vs always-sonnet baseline
- **Carbon reduction:** Track gCO2e saved via model routing + caching
- **Cost per successful task:** Track and trend downward over time

### Sustainability Impact Metrics
- **Carbon per user session:** gCO2e
- **Recommendation follow-through rate:** % of sustainability recommendations acted on
- **Decision quality improvement:** User satisfaction trend over time

### Test Coverage Requirements
- **Unit tests:** 80%+ coverage on all new modules
- **Integration tests:** All API endpoints, all workflow patterns
- **E2E tests:** 3 critical user flows (chat → agent, create workflow → execute, sustainability dashboard)

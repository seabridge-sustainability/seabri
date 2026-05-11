# OpenSeaBri Full Technical, Product, Architecture & Implementation Review

> Historical report. This review captured the 2026-05-08 state and is superseded for deployment/security decisions by `docs/deployment/OPENSEABRI_PRODUCTION_DEPLOYMENT.md`, `docs/security/OPENSEABRI_SECRET_ROTATION_AND_PROVIDER_VALIDATION.md`, and the current readiness reports. Counts and gaps in this file may reflect the earlier 14-skill/1278-test state.

**Date:** 2026-05-08
**Scope:** C:\Users\adelm\SeaBridgeAI\openseabri + C:\Users\adelm\SeaBridgeAI\_upstream
**Status:** Internal review — not pushed to GitHub

---

## 1. Executive Summary

OpenSeaBri is significantly more mature than a typical early-stage project. The gateway is a real agent runtime with SSE streaming, multi-turn tool use, prompt caching, 5 messaging channels, workflow execution, content-addressable storage, model routing, skill loading with TF-IDF RAG, and comprehensive approval gates. The frontend is a production-grade React 18 application with dual streaming paths, 8 domain-expert agents, a design system with 298 CSS custom properties, multimodal support, and a workflow canvas.

The upstream directory contains 6 MIT-compatible projects with strong reuse potential (hermes-agent, nanobot, gbrain, CopilotKit, multica, space-agent) and 1 AGPL-incompatible project (MiroFish) that must not be used.

**What's strong:** Agent runtime, messaging channels, approval gates, frontend UI, design system, sustainability domain coverage, security model.

**What's weak:** Test coverage (30%), telemetry (0%), CI/CD (60%), no structured logging, no formal skill/MCP registry beyond in-memory, no product comparison or carbon tracking tools yet, no SMS channel (Twilio integration exists but no dedicated SMS-only inbound channel).

**Recommendation:** Sprint 1 should formalize the capability/skill/model registries, fill test gaps on critical paths, add observability, and create the first 5 open sustainability skills. Do not rewrite what works. Build adapters to upstream where safe.

---

## 2. Current OpenSeaBri Capability Audit

### Production-Ready (80-100% complete)

| Module | Path | Status | Notes |
|--------|------|--------|-------|
| Agent router | gateway/agents/router.ts | 100% | SSE streaming, multi-turn tool use (8 rounds max), prompt caching, complexity-based model selection, failover |
| Agent definitions | gateway/agents/agents.ts | 100% | 15 agents with 163-line shared PERSONALITY contract, detailed system prompts |
| Agent tools | gateway/agents/tools.ts | 100% | 8 tools: web_search (Tavily), geocode (Census), flood zone (FEMA NFHL), openkb (4 MCP proxies) |
| Agent registry | gateway/seabri/agent-registry.ts | 100% | 14 agent capabilities, builtin vs external registration, full CRUD |
| Model router | gateway/orchestrator/model-router.ts | 100% | Complexity scoring (haiku/sonnet/opus), cost calculation, agent floor enforcement, failover lists |
| Intent classifier | gateway/orchestrator/classifier.ts | 100% | LLM-based + pattern classification |
| Execution planner | gateway/orchestrator/planner.ts | 100% | Step planning with type discrimination |
| Metrics | gateway/orchestrator/metrics.ts | 100% | In-memory metric recording, carbon estimation, aggregation |
| LangGraph runner | gateway/orchestrator/graph.ts | 100% | Graph-based agent execution |
| Workflow executor | gateway/workflows/executor.ts | 100% | Interpolation, conditions (&&, ||, comparisons), agent retry, tool steps, parallel branches, loops (max 10) |
| Schemas | gateway/schemas.ts | 100% | Zod schemas for all message types, 14-agent enum, tool definitions, workflow steps, feedback, carbon tracking |
| Config | gateway/config.ts | 100% | 14 agent definitions, all env vars, Twilio/SendGrid/SMTP, approval TTL |
| Auth | gateway/auth.ts | 100% | JWT (jose), timing-safe password comparison, 7-day expiry |
| Security pairing | gateway/security/pairing.ts | 100% | 6-digit codes, 10-min expiry, timing-safe comparison, approved-senders.json |
| Security policy | gateway/security/policy.ts | 100% | Per-channel policy, pairing requirements, preferred agent |
| Sessions | gateway/sessions/store.ts | 100% | CRUD, UUID generation, turn tracking, compression support, store.js backend |
| Memory | gateway/memory/compress.ts | 100% | Persistent MEMORY.md/USER.md/SKILLS.md, user model nudging every 10 turns via Haiku |
| Skill loader | gateway/skills/loader.ts | 100% | YAML frontmatter, 60s cache TTL, TF-IDF RAG retrieval (K=3), compliance tag filtering |
| Attachment store | gateway/attachments/store.ts | 100% | SHA-256 content-addressable, 256-way fan-out, deduplication, in-process mutex, JSON index |
| Attachment HTTP | gateway/attachments/http.ts | 100% | HTTP handler for blob upload/download |
| MCP server | gateway/mcp/server.ts | 100% | JSON-RPC 2.0, newline-delimited UTF-8, 14 tools exposed, zero external deps |
| Cron | gateway/cron/index.ts | 100% | node-cron, presets with compliance tags, HMAC-SHA256 approval tokens |
| Canvas server | gateway/canvas/server.ts | 100% | WebSocket, broadcast, tested with mocks |
| Telegram channel | gateway/channels/telegram.ts | 95% | Full implementation: pairing, approval flows, image/document/voice/audio/video/location handling, LRU state (10k users), slash commands, onboarding, user profiles |
| WhatsApp channel | gateway/channels/whatsapp.ts | 90% | Two providers (Cloud API + Baileys scaffold), webhook verification, HMAC signature validation, approval flows with double-confirmation, image attachments, geocode from location |
| Discord channel | gateway/channels/discord.ts | 90% | Full bot implementation with slash commands |
| Slack channel | gateway/channels/slack.ts | 90% | Socket mode + slash commands |
| CLI channel | gateway/channels/cli.ts | 100% | Interactive REPL with agent selection |
| API handler | gateway/seabri/api-handler.ts | 100% | REST endpoints for telemetry, sessions, agents, skills |
| Feedback | gateway/seabri/feedback.ts | 100% | User feedback capture and storage |
| Research reader | gateway/seabri/research-reader.ts | 100% | Research document parsing |
| Frontend App | src/App.tsx | 95% | Landing page, chat shell, dashboard, workflow canvas, claims cockpit, action card approvals |
| Chat store | src/store/chat.ts | 100% | Zustand + localStorage, dual streaming (Anthropic direct + gateway WS), approval resolution |
| Canvas store | src/store/canvas.ts | 100% | A2UI block streaming via WebSocket |
| Agent definitions (FE) | src/lib/agents.ts | 100% | 8 domain experts with system prompts, starter questions, color assignments |
| Anthropic client | src/lib/anthropic.ts | 100% | Streaming SSE, multimodal (images, PDFs), abort signals |
| Design system | src/styles/tokens.css | 100% | 298 CSS custom properties: colors, typography (Recoleta/IBM Plex), spacing, radius, shadow, motion |
| Voice input | src/components/VoiceButton.tsx | 100% | Web Speech API, recording state, mic icon |
| Canvas pane | src/components/canvas/CanvasPane.tsx | 100% | A2UI blocks: Text, Chart, Table, Citations with compliance tags |
| Sustainability dashboard | src/components/sustainability-dashboard/ | 100% | Metrics cards, daily breakdown, recommendations |
| Workflow canvas | src/components/workflow-canvas/WorkflowCanvas.tsx | 100% | ReactFlow, custom nodes, execution status overlay |
| Docker deployment | Dockerfile + docker-compose.yml | 80% | Multi-stage build, node:20-alpine, dual service, health check |
| CI/CD | .github/workflows/ci.yml | 60% | 3 OS × 2 Node versions, typecheck + test + build |

### Partially Built / Scaffolded

| Module | Path | Status | Notes |
|--------|------|--------|-------|
| WhatsApp Baileys | gateway/channels/whatsapp.ts | 20% | QR-based self-hosted mode is scaffold only; Cloud API mode is complete |
| SeaBriOS panel | src/components/sustainability-dashboard/SeaBriOSPanel.tsx | ~70% | Referenced and mounted but implementation depth unclear |
| Claim cockpit panels | src/components/ (ClaimPacket, Operator) | ~60% | Referenced in App.tsx, basic structure present |
| Physical risk tools | gateway/agents/perils.ts | 90% | Full implementations for 5 perils (flood, wildfire, heat, drought, coastal) but some API keys optional |
| Research overnight | research/overnight.ts | 80% | Autonomous research loop with agenda parsing, topic selection, findings output |
| Bridge client | bridge/seabridge_client.ts | 80% | ManageESG backend bridge, McpClient, error handling |
| CLI commands | cli/seabri.ts | 80% | chat, search, cron, doctor, onboard, memory — functional but needs polish |
| ManageESG integration | integrations/manageesg/client.ts | 70% | API client for enterprise backend |

### Missing / Not Yet Built

| Capability | Status | Priority |
|------------|--------|----------|
| SMS-only inbound channel | Not built (Twilio outbound exists) | HIGH |
| Email inbound channel | Not built (SendGrid outbound exists) | MEDIUM |
| Formal capability registry API | In-memory only, no persistence | HIGH |
| Formal MCP registry | .mcp.json only, no runtime discovery | MEDIUM |
| Formal skill marketplace/catalog | Skills loaded from filesystem | LOW (Sprint 2) |
| Product comparison tools | Not built | MEDIUM |
| Carbon footprint tracking (personal) | Not built (agent-level carbon estimation exists) | HIGH |
| Structured logging | Not built | HIGH |
| Observability/telemetry stack | Not built (in-memory metrics only) | HIGH |
| Test coverage >80% | Currently ~30% | HIGH |
| ESLint/Prettier | Not configured | MEDIUM |
| Pre-commit hooks | Not configured | MEDIUM |
| Coverage thresholds | Not configured in vitest | MEDIUM |
| Horizontal scaling | Single-container, in-memory state | LOW |
| Audit logging for approvals | Not built | MEDIUM |
| Rate limiting | Not built | MEDIUM |
| Multilingual support | Not built (en-US only) | MEDIUM |
| Outbound call TwiML handler | Referenced but implementation unclear | MEDIUM |

### Broken / Needs Fix

| Issue | Location | Severity |
|-------|----------|----------|
| awesome-deepseek-agent license unresolved | LICENSES/ | MEDIUM — must resolve before any reuse |
| Build allows failure in CI | ci.yml continue-on-error on build step | LOW — intentional but should be tightened |
| GBrain MCP hardcoded Windows path | .mcp.json | LOW — works locally, breaks in Docker/CI |
| No database container in docker-compose | docker-compose.yml | MEDIUM — assumes external PostgreSQL |

---

## 3. Upstream Directory Audit

**Location:** C:\Users\adelm\SeaBridgeAI\_upstream

### Projects Found (13 directories + docs)

| Project | License | Runtime | Status | Reusable? |
|---------|---------|---------|--------|-----------|
| hermes-agent | MIT | Node.js >=20 | Production-ready | YES — direct |
| nanobot | MIT | Python >=3.11 | Production-ready (v0.1.5.post3) | YES — direct |
| gbrain | MIT | Bun/Node.js | Production-ready | YES — direct |
| CopilotKit | MIT | React/Node.js | Production-ready SDK | YES — pattern |
| multica | MIT | Next.js/Go/PostgreSQL | Production-ready | YES — direct |
| space-agent | MIT | Node.js/Bun | Production-ready | YES — pattern |
| openclaw | MIT | Node.js | Production-ready | YES — already upstream source |
| MiroFish | **AGPL-3.0** | Node.js/Python | Production-ready | **NO — license incompatible** |
| docuseal | **AGPL-3.0** | Ruby | Production-ready | **NO — license incompatible** |
| awesome-deepseek-agent | NOASSERTION | Reference | Guide/collection | VERIFY LICENSE |
| rowboat | Unknown | Unknown | Not audited | AUDIT NEEDED |
| openwork | Unknown | Unknown | Not audited | AUDIT NEEDED |
| PageIndex | Unknown | Unknown | Not audited | AUDIT NEEDED |
| text-to-cad | Unknown | Unknown | Not audited | AUDIT NEEDED |
| space-agent-customware | Unknown | Unknown | Not audited | AUDIT NEEDED |
| space-agent-run | Unknown | Unknown | Not audited | AUDIT NEEDED |

---

## 4. Upstream Skill Map

### hermes-agent (MIT)
| Capability | Quality | OpenSeaBri Gap Filled |
|------------|---------|----------------------|
| 200+ model support (OpenRouter, NVIDIA NIM, HF, OpenAI) | Production | Multi-model routing |
| Self-improving learning loop | Production | Self-improvement |
| Skill auto-creation | Production | Skill ecosystem |
| 5 messaging platforms (Telegram, Discord, Slack, WhatsApp, Signal) | Production | Channel coverage |
| 40+ tools | Production | Tool breadth |
| FTS5 session search | Production | Memory search |
| Terminal backends (local/Docker/SSH/Daytona) | Production | Execution environments |
| MCP integration | Production | MCP interop |
| Voice transcription | Production | Audio processing |
| Cron scheduling | Production | Automation |

### nanobot (MIT)
| Capability | Quality | OpenSeaBri Gap Filled |
|------------|---------|----------------------|
| 14 messaging platforms | Production | Channel coverage (WeChat, QQ, DingTalk, Matrix, Teams, Signal, Lark) |
| 19+ model providers | Production | Multi-model breadth |
| Token-based memory + Dream system | Production | Memory efficiency |
| MCP with custom auth headers | Production | Secure MCP |
| Cron scheduling | Production | Automation |
| Video/image/document attachments | Production | Multimodal |
| Workspace isolation | Production | Security |
| Jinja2 prompt templates | Production | Prompt management |
| Skills discovery | Production | Skill loading |

### gbrain (MIT)
| Capability | Quality | OpenSeaBri Gap Filled |
|------------|---------|----------------------|
| 29 curated skills | Production | Skill breadth |
| Hybrid search (vector+keyword+RRF) | Production | Search quality |
| Knowledge graph (typed links) | Production | Entity relationships |
| Timeline memory (compiled truth + evidence) | Production | Temporal knowledge |
| Minions job queue (durable background work) | Production | Async execution |
| MCP server (30+ tools) | Production | Tool surface |
| Voice (Twilio + Realtime) | Production | Voice integration |
| Entity enrichment (tiered) | Production | Auto-enrichment |
| Skillify automation | Production | Skill generation |
| SOUL audit | Production | Self-assessment |

### CopilotKit (MIT)
| Capability | Quality | OpenSeaBri Gap Filled |
|------------|---------|----------------------|
| AG-UI Protocol (Google, LangChain, AWS, Microsoft adopted) | Standard | Agent↔UI communication |
| Generative UI (agents reshape frontend) | Production | Dynamic UI |
| Shared state (real-time agent↔UI sync) | Production | State coordination |
| Human-in-the-loop execution pausing | Production | Approval pattern |

### multica (MIT)
| Capability | Quality | OpenSeaBri Gap Filled |
|------------|---------|----------------------|
| Multi-agent team management | Production | Agent orchestration |
| Task lifecycle (real-time WebSocket progress) | Production | Task tracking |
| Reusable skill compilation | Production | Skill reuse |
| RBAC + multi-workspace | Production | Access control |
| 11 agent runtime integrations | Production | Runtime coverage |

### space-agent (MIT)
| Capability | Quality | OpenSeaBri Gap Filled |
|------------|---------|----------------------|
| SKILL.md extensibility | Pattern | Skill format |
| AI-autonomous development | Pattern | Self-improvement |
| Git-backed history (time travel) | Pattern | Versioning |
| Hierarchical AGENTS.md instructions | Pattern | Agent governance |

---

## 5. Reuse vs Build Decision Matrix

| Capability | Source | Decision | License | Risk | Difficulty | Priority |
|------------|--------|----------|---------|------|------------|----------|
| Multi-model routing (200+ models) | hermes-agent | **Adapter** — wrap hermes model selection behind OpenSeaBri's ModelRouter interface | MIT | Low | 2/5 | P1 |
| Skill auto-creation | hermes-agent | **Pattern** — adopt the learning loop pattern, implement natively | MIT | Low | 3/5 | P2 |
| 14-channel messaging | nanobot | **Adapter** — Python bridge for channels OpenSeaBri doesn't cover (WeChat, Matrix, Teams) | MIT | Low | 3/5 | P2 |
| Knowledge graph memory | gbrain | **Direct** — deploy gbrain as memory brain via MCP | MIT | Low | 2/5 | P1 |
| Hybrid search | gbrain | **Direct** — use gbrain's search via MCP tools | MIT | Low | 2/5 | P1 |
| AG-UI Protocol | CopilotKit | **Pattern** — adopt protocol spec for agent↔UI communication | MIT | Low | 3/5 | P3 |
| Agent team management | multica | **Defer** — evaluate after core registry is solid | MIT | Low | 4/5 | P3 |
| SKILL.md format | space-agent | **Pattern** — already partially adopted in OpenSeaBri skill loader | MIT | Low | 1/5 | P1 |
| Self-improving loop | hermes-agent + space-agent | **Pattern** — combine approaches, implement natively | MIT | Low | 4/5 | P3 |
| MiroFish simulation | MiroFish | **Do not use** — AGPL-3.0 incompatible | AGPL | HIGH | N/A | N/A |
| Document signing | docuseal | **Do not use** — AGPL-3.0, out of scope | AGPL | HIGH | N/A | N/A |
| DeepSeek integration guide | awesome-deepseek-agent | **Defer** — resolve license first | NOASSERTION | MEDIUM | 1/5 | P2 |
| Dream memory system | nanobot | **Pattern** — token-based memory approach for long conversations | MIT | Low | 2/5 | P2 |
| Timeline memory | gbrain | **Direct** — compiled truth + append-only evidence via MCP | MIT | Low | 2/5 | P2 |
| Minions job queue | gbrain | **Adapter** — wrap as OpenSeaBri background task runner | MIT | Low | 3/5 | P2 |
| Voice (Twilio + Realtime) | gbrain | **Pattern** — OpenSeaBri already has Twilio; adopt realtime pattern | MIT | Low | 2/5 | P2 |

---

## 6. Missing Capability List

### Critical (must have for open sustainability harness)

1. **Formal capability registry** — persistent, queryable, not just in-memory
2. **Formal skill registry** — discoverable catalog with metadata, not just filesystem scan
3. **Test coverage >80%** — currently 30%, critical paths untested
4. **Structured logging** — no logging framework at all
5. **Personal carbon footprint tracking** — core sustainability feature
6. **Product sustainability comparison** — core consumer feature
7. **SMS inbound channel** — Twilio outbound exists, inbound missing
8. **Observability** — no metrics collection, no tracing, no error tracking

### Important (should have for v1)

9. Multilingual support (at minimum Spanish, French, Portuguese, Mandarin)
10. Email inbound processing
11. Certification/compliance checklist engine (LEED, BREEAM, ENERGY STAR)
12. Community resilience mapping tools
13. Grant/funding opportunity matching
14. Rate limiting on all endpoints
15. Approval audit logging
16. Coverage thresholds in vitest config
17. ESLint/Prettier + pre-commit hooks

### Nice to Have (v2+)

18. Horizontal scaling (distributed WebSocket, external session store)
19. Generative UI (agents modify frontend)
20. Video processing pipeline
21. Outbound voice call TwiML handler
22. Full WCAG 2.1 AA accessibility audit
23. Skill marketplace with community contributions
24. Multi-agent simulation (without MiroFish)

---

## 7. OpenCo/OpenCode Coding Skill Transfer Plan

OpenSeaBri can use coding skills to improve itself. The following capabilities should be available as self-applicable skills:

| Coding Skill | Source | Transfer Method | Status in OpenSeaBri |
|--------------|--------|-----------------|---------------------|
| Repository understanding | hermes-agent + ECC | Already present via graphify + gitnexus MCP | Working |
| Code editing | ECC skills | Already present via Claude Code session | Working |
| Test generation | ECC tdd-workflow | Already present as skill | Working but not self-applied |
| Debugging | ECC investigate | Already present as skill | Working |
| Refactoring | ECC refactor-cleaner | Already present as skill | Working |
| Documentation updates | ECC doc-updater | Already present as skill | Working |
| MCP usage | gateway/mcp/server.ts | Native MCP server running | Working |
| Skill loading | gateway/skills/loader.ts | YAML frontmatter + TF-IDF RAG | Working |
| Safe execution policies | gateway/security/policy.ts | Per-channel policy, pairing | Working |
| Multi-model workflows | gateway/orchestrator/model-router.ts | Complexity scoring, failover | Working |
| Self-improving repair loops | hermes-agent pattern | **Not yet implemented** — adopt learning loop | Gap |
| Regression testing | vitest + playwright | Configured but sparse coverage | Partial |

**Transfer actions for Sprint 1:**
1. Wire the overnight research loop (`research/overnight.ts`) to also run self-improvement checks (lint, test coverage gaps, dead code)
2. Add a `sea-self-improve` skill that runs regression tests before and after any self-modification
3. Implement a "skill compilation" step: when an agent solves a novel problem, extract the solution pattern as a reusable skill file

---

## 8. Sustainability / Green Software Alignment Review

### Already Aligned

| Practice | Implementation | Evidence |
|----------|---------------|----------|
| Model routing by complexity | gateway/orchestrator/model-router.ts | Uses haiku for simple tasks, opus only for complex — reduces compute 3-5x |
| Carbon estimation per request | gateway/orchestrator/metrics.ts | estimateCarbon() calculates gCO2 per API call |
| Token-efficient prompts | gateway/agents/agents.ts | Shared PERSONALITY contract reduces per-agent prompt duplication |
| Prompt caching | gateway/agents/router.ts | cache_control: { type: 'ephemeral' } on system messages |
| Compact memory | gateway/memory/compress.ts | User model nudging via haiku (cheapest model) |
| Local-first processing | Physical risk tools | Geocoding, flood zone lookup use public APIs, not LLM |
| Approval gates prevent waste | gateway/security/ | No outbound actions without human consent |
| Content-addressable storage | gateway/attachments/store.ts | SHA-256 dedup prevents duplicate file storage |

### Gaps to Fix

| Gap | Impact | Fix |
|-----|--------|-----|
| No request-level carbon reporting to user | Users can't see their sustainability impact | Expose carbon metrics in chat responses |
| No aggregate carbon dashboard | No visibility into total platform footprint | Add to sustainability dashboard |
| No model cost comparison visibility | Users can't make informed model choices | Show cost/carbon tradeoff in UI |
| No green coding linter | Code changes may increase compute waste | Add token/compute efficiency checks to CI |
| No carbon-aware scheduling | Cron jobs run regardless of grid carbon intensity | Integrate electricity maps API for scheduling |
| No sustainability score per skill | Skills can't be ranked by efficiency | Add compute_cost and carbon_estimate to skill metadata |

### Green Software Principles Scorecard

| Principle | Score | Notes |
|-----------|-------|-------|
| Energy efficiency | 7/10 | Model routing helps; no request batching or caching layer |
| Carbon awareness | 4/10 | Estimation exists but not exposed or acted upon |
| Hardware efficiency | 6/10 | Alpine Docker image; no GPU optimization |
| Measurement | 5/10 | Per-request metrics exist but no aggregation/reporting pipeline |
| Optimization | 7/10 | Prompt caching, complexity routing, compact memory |
| Demand shifting | 2/10 | No carbon-aware scheduling, no off-peak routing |
| Software carbon intensity | 3/10 | Not calculated at platform level |

---

## 9. Multi-Model Framework Review

### Current State

| Component | Implementation | Models |
|-----------|---------------|--------|
| Primary LLM | Anthropic SDK v0.95.0 | claude-haiku-4-5, claude-sonnet-4-6, claude-opus-4-5 |
| Routing | Complexity scoring | Score < 30 → haiku, 30-70 → sonnet, 70+ → opus |
| Agent floors | model-router.ts | investment-screening → sonnet min, sustainability-reporting → sonnet min |
| Failover | Per-tier lists | opus → [sonnet, haiku], sonnet → [haiku], haiku → [] |
| Transcription | OpenAI SDK v6.35.0 | Whisper (audio/video → text) |
| Self-hosted | vLLM (experimental) | OpenAI-compatible endpoint, disabled by default |
| LangChain | @langchain/anthropic + langgraph | Graph-based agent execution |

### Target Model Registry

```
ModelRegistry {
  providers: [
    { id: 'anthropic', models: ['haiku-4.5', 'sonnet-4.6', 'opus-4.5'], priority: 1 },
    { id: 'openai', models: ['gpt-4o-mini', 'gpt-4o', 'whisper-1'], priority: 2 },
    { id: 'deepseek', models: ['deepseek-chat', 'deepseek-reasoner'], priority: 3 },
    { id: 'local', models: ['gemma-4-27b', 'llama-3.1-8b'], priority: 4 },
    { id: 'openrouter', models: ['*'], priority: 5 },  // fallback
  ],
  routing_policies: {
    'cost-optimized': prefer cheapest model that meets capability threshold,
    'quality-optimized': prefer strongest model within budget,
    'sustainability-optimized': prefer lowest-carbon option,
    'privacy-optimized': prefer local models for sensitive data,
    'latency-optimized': prefer fastest response time,
  },
  capability_requirements: {
    'vision': ['sonnet-4.6', 'opus-4.5', 'gpt-4o'],
    'tool-use': ['sonnet-4.6', 'opus-4.5', 'gpt-4o', 'deepseek-chat'],
    'coding': ['sonnet-4.6', 'opus-4.5', 'deepseek-reasoner'],
    'multilingual': ['sonnet-4.6', 'gpt-4o'],
    'transcription': ['whisper-1'],
    'embedding': ['text-embedding-3-small'],
  }
}
```

### Target Model Router

```
ModelRouter {
  select(task) {
    1. Identify required capabilities (vision, tool-use, multilingual, etc.)
    2. Filter models by capability
    3. Apply routing policy (cost/quality/sustainability/privacy/latency)
    4. Check agent floor requirements
    5. Apply budget constraints
    6. Select model, return with fallback chain
    7. Record selection for telemetry
  }
}
```

### Recommendations

1. **Immediate:** Add DeepSeek as coding/reasoning fallback (very low cost, strong reasoning)
2. **Immediate:** Add local model support via liteLLM proxy (already configured in ECC)
3. **Sprint 2:** Add OpenRouter as universal fallback for 200+ models
4. **Sprint 2:** Implement privacy-aware routing (local models for PII-containing requests)
5. **Sprint 3:** Carbon-aware routing (prefer lower-carbon providers when quality is equivalent)

---

## 10. Target Agent Harness Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     OpenSeaBri Agent Harness                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Capability   │  │    Skill     │  │    Model     │          │
│  │  Registry     │  │  Registry    │  │  Registry    │          │
│  │              │  │              │  │              │          │
│  │ 14 agent     │  │ YAML+RAG    │  │ Multi-provider│          │
│  │ capabilities │  │ loading     │  │ routing      │          │
│  │ dynamic reg  │  │ TF-IDF match│  │ cost/carbon  │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                   │
│  ┌──────┴──────────────────┴──────────────────┴───────┐         │
│  │              Orchestrator Layer                      │         │
│  │  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐ │         │
│  │  │Classifier│ │ Planner  │ │ Router │ │ Metrics  │ │         │
│  │  └─────────┘ └──────────┘ └────────┘ └──────────┘ │         │
│  └────────────────────────┬────────────────────────────┘         │
│                            │                                      │
│  ┌─────────────────────────┴─────────────────────────────┐      │
│  │              Agent Runtime                              │      │
│  │  ┌─────┐ ┌───────┐ ┌────────┐ ┌────────┐ ┌─────────┐ │      │
│  │  │ SSE │ │ Tools │ │ Memory │ │ Skills │ │Workflows│ │      │
│  │  │Stream│ │ 8+40  │ │Compress│ │TF-IDF  │ │Executor │ │      │
│  │  └─────┘ └───────┘ └────────┘ └────────┘ └─────────┘ │      │
│  └────────────────────────┬────────────────────────────────┘      │
│                            │                                      │
│  ┌─────────────────────────┴─────────────────────────────┐      │
│  │              Channel Layer                              │      │
│  │  ┌────┐ ┌────┐ ┌─────┐ ┌──────┐ ┌───┐ ┌─────┐ ┌───┐ │      │
│  │  │ Web│ │Tele│ │WhApp│ │ Discord│ │Slk│ │ CLI │ │API│ │      │
│  │  │Chat│ │gram│ │     │ │       │ │   │ │     │ │   │ │      │
│  │  └────┘ └────┘ └─────┘ └──────┘ └───┘ └─────┘ └───┘ │      │
│  └────────────────────────┬────────────────────────────────┘      │
│                            │                                      │
│  ┌─────────────────────────┴─────────────────────────────┐      │
│  │              Safety & Governance                        │      │
│  │  ┌────────┐ ┌────────┐ ┌─────────┐ ┌───────────────┐ │      │
│  │  │Approval│ │Pairing │ │ Policy  │ │ Sustainability│ │      │
│  │  │ Gates  │ │ Codes  │ │ Engine  │ │   Scoring     │ │      │
│  │  └────────┘ └────────┘ └─────────┘ └───────────────┘ │      │
│  └────────────────────────┬────────────────────────────────┘      │
│                            │                                      │
│  ┌─────────────────────────┴─────────────────────────────┐      │
│  │              Upstream Adapter Layer                      │      │
│  │  ┌───────┐ ┌───────┐ ┌──────┐ ┌──────────┐ ┌───────┐ │      │
│  │  │hermes │ │nanobot│ │gbrain│ │ multica  │ │openclaw│ │      │
│  │  │adapter│ │bridge │ │ MCP  │ │ adapter  │ │ source │ │      │
│  │  └───────┘ └───────┘ └──────┘ └──────────┘ └───────┘ │      │
│  └──────────────────────────────────────────────────────────┘      │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │    MCP        │  │    Tool      │  │  Workflow    │          │
│  │  Registry     │  │  Registry    │  │  Registry    │          │
│  │              │  │              │  │              │          │
│  │ JSON-RPC 2.0 │  │ 8 built-in  │  │ YAML/JSON   │          │
│  │ 14+ tools    │  │ + upstream   │  │ definitions  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Cross-Cutting: Telemetry · Logging · Self-Improvement      │ │
│  │  Multimodal Ingestion · Multilingual · Carbon Tracking       │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Key Architecture Principles

1. **Registry-first:** Every capability, skill, model, tool, workflow, and MCP is registered and discoverable
2. **Adapter pattern:** Upstream capabilities wrapped behind OpenSeaBri interfaces, not forked
3. **Safety by default:** All external actions require approval; all channels require pairing
4. **Sustainability-scored:** Every operation records carbon estimate and cost
5. **Self-improving:** Agents can create new skills, but only with regression tests passing
6. **Channel-agnostic:** Same agent logic works across all messaging platforms
7. **Model-agnostic:** Any provider can be used; routing policy selects the best fit

---

## 11. Open Sustainability Skill Catalog

### A. Home & Personal Sustainability

| Skill | Purpose | User Type | Input | Output | Models | APIs | Priority |
|-------|---------|-----------|-------|--------|--------|------|----------|
| energy-efficiency-advisor | Analyze energy usage, recommend improvements | Homeowner | Utility bills (PDF/image), home profile | Action plan with savings estimates | haiku/sonnet | EIA, utility rate APIs | P1 |
| water-conservation-guide | Water usage assessment, reduction tips | Homeowner | Water bill, location, household size | Conservation plan, leak detection tips | haiku | EPA WaterSense | P2 |
| home-resilience-planner | Disaster preparedness for specific hazards | Homeowner | Address, hazard type | Checklist, supply list, evacuation plan | sonnet | FEMA, NWS, FIRMS | P1 |
| appliance-efficiency-compare | Compare appliances by energy rating | Consumer | Product names/models | Comparison table with lifetime cost, energy use | haiku | ENERGY STAR API | P1 |
| flood-fire-heat-prep | Location-specific hazard preparedness | Homeowner | Address | Risk score, prep checklist, insurance guidance | sonnet | FEMA NFHL, FIRMS, NWS | P1 — already partially built |
| solar-suitability-estimator | Estimate solar potential for address | Homeowner | Address, roof details | kWh estimate, payback period, incentives | sonnet | NREL Solar API, DSIRE | P2 |
| recycling-disposal-guide | Local recycling rules and facilities | Resident | Location, item type | Disposal instructions, nearest facility | haiku | Earth911, local APIs | P2 |
| sustainable-shopping-advisor | Product sustainability recommendations | Consumer | Product category, preferences | Ranked alternatives with scores | sonnet | Open Food Facts, B Corp | P2 |
| food-waste-reduction | Meal planning, storage tips, composting | Household | Household size, diet preferences | Weekly plan, storage guide, waste tracking | haiku | USDA FoodData | P3 |
| ev-charging-guide | EV selection and charging infrastructure | Consumer | Location, driving pattern | EV recommendations, charger map, cost comparison | sonnet | AFDC, PlugShare | P3 |

### B. Product Comparison Tools

| Skill | Purpose | User Type | Input | Output | Priority |
|-------|---------|-----------|-------|--------|----------|
| product-sustainability-score | Compare products by environmental impact | Consumer | Product names or barcodes | Sustainability scorecard (carbon, water, waste, ethics) | P1 |
| packaging-comparison | Evaluate packaging sustainability | Consumer | Product images or descriptions | Packaging score, recyclability, alternatives | P2 |
| lifecycle-impact-compare | Cradle-to-grave environmental comparison | Consumer/Business | Two products/materials | LCA comparison (carbon, water, energy, waste) | P2 |
| eco-label-recognizer | Identify and explain eco-certifications | Consumer | Product image or label name | Certification explanation, credibility rating | P2 |
| local-vs-imported | Compare local vs imported product impact | Consumer | Product + location | Transport emissions, freshness, local economy impact | P3 |

### C. Carbon & Emissions Tools

| Skill | Purpose | User Type | Input | Output | Priority |
|-------|---------|-----------|-------|--------|----------|
| personal-carbon-tracker | Track individual carbon footprint | Individual | Transport, diet, energy, purchases | Monthly footprint, trend, reduction tips | P1 |
| household-emissions-estimator | Estimate household GHG emissions | Household | Energy bills, vehicles, diet | Annual emissions, breakdown by category | P1 |
| community-emissions-dashboard | Aggregate community-level data | Community leader | Zip code or city | Per-capita emissions, comparison to peers, reduction targets | P2 |
| small-business-emissions | Track SMB Scope 1/2/3 | Small business | Energy, travel, procurement data | Emissions report, reduction roadmap | P2 |
| carbon-offset-analyzer | Evaluate carbon offset quality | Individual/Business | Offset program name or URL | Quality score (additionality, permanence, verification) | P2 |
| commute-emissions-calc | Calculate commute/travel footprint | Individual | Route, mode, frequency | Annual emissions, alternative mode comparison | P2 |
| low-carbon-action-prioritizer | Rank actions by impact and effort | Individual | Current lifestyle profile | Prioritized action list with CO2 reduction estimates | P1 |

### D. Certifications & Compliance

| Skill | Purpose | User Type | Input | Output | Priority |
|-------|---------|-----------|-------|--------|----------|
| leed-checklist-assistant | LEED certification guidance | Building manager | Building type, current features | LEED credit checklist, gap analysis | P2 |
| energy-star-advisor | ENERGY STAR certification prep | Facility manager | Building data, energy usage | Score estimate, improvement recommendations | P2 |
| esg-checklist-assistant | ESG reporting guidance | SMB/NGO | Organization type, existing practices | ESG checklist, reporting template | P2 |
| grant-funding-matcher | Match sustainability grants | NGO/Community | Organization profile, project description | Matching grants, deadlines, eligibility | P1 |
| local-regulation-summary | Summarize local sustainability rules | Business/Resident | Location, business type | Applicable regulations, compliance checklist | P2 |

### E. Community & NGO Tools

| Skill | Purpose | User Type | Input | Output | Priority |
|-------|---------|-----------|-------|--------|----------|
| disaster-prep-workflow | Community emergency preparedness | Community org | Location, population, hazards | Emergency plan, resource inventory, contact directory | P1 |
| community-resilience-mapper | Map community assets and vulnerabilities | Community leader | Location, community profile | Asset map, vulnerability assessment, priority actions | P2 |
| volunteer-coordinator | Organize sustainability volunteers | NGO | Event details, volunteer pool | Schedule, assignments, communication templates | P3 |
| grant-writing-assistant | Help write sustainability grants | NGO | Grant requirements, project details | Draft narrative, budget template, logic model | P2 |
| climate-adaptation-planner | Local climate adaptation strategies | Local government | Location, climate projections | Adaptation options, cost-benefit, implementation timeline | P2 |
| environmental-justice-screener | Identify EJ concerns | Community/Government | Location | EJ indices (EJScreen), demographics, cumulative impacts | P2 |
| multilingual-outreach | Translate sustainability messaging | NGO/Government | Source text, target languages | Translated content, cultural adaptation notes | P2 |

### F. Sustainable AI / Green Software

| Skill | Purpose | User Type | Input | Output | Priority |
|-------|---------|-----------|-------|--------|----------|
| model-efficiency-advisor | Recommend most efficient model for task | Developer | Task description, requirements | Model recommendation with cost/carbon estimate | P1 |
| green-coding-assistant | Review code for compute efficiency | Developer | Code file or diff | Efficiency suggestions, estimated savings | P2 |
| token-cost-optimizer | Reduce token usage in prompts/responses | Developer | Prompt + response samples | Optimized versions, token savings estimate | P1 — RTK/caveman partially cover this |
| carbon-aware-scheduler | Schedule jobs during low-carbon periods | Developer/Ops | Job definition, flexibility window | Optimal execution times based on grid carbon | P3 |

---

## 12. MCP Catalog

### Currently Configured

| MCP | Server | Status |
|-----|--------|--------|
| FalkorDB | @falkordb/mcpserver | Configured, needs graph population |
| GitNexus | gitnexus@latest | Working — code structure queries |
| DesignLang | designlang mcp | Working — design token server |
| GBrain | gbrain.ps1 serve | Working — knowledge indexing |
| OpenSeaBri native | gateway/mcp/server.ts | Working — 14 tools via JSON-RPC |

### Recommended New MCPs

| MCP | Purpose | Source | Priority |
|-----|---------|--------|----------|
| sustainability-data | EPA, EIA, FEMA, NWS data access | Build natively | P1 |
| carbon-calculator | Personal/household/business carbon estimation | Build natively | P1 |
| product-sustainability | Product comparison data (Open Food Facts, B Corp) | Build natively | P2 |
| grant-finder | Foundation/government grant databases | Build natively | P2 |
| climate-risk | Physical risk assessment tools (already partially built) | Formalize existing tools | P1 |
| gbrain-memory | Knowledge graph + timeline via gbrain | Adapter from upstream | P1 |
| hermes-models | 200+ model access via hermes-agent | Adapter from upstream | P2 |
| electricity-maps | Grid carbon intensity for scheduling | Build natively | P3 |

---

## 13. Community/NGO Workflow Catalog

| Workflow | Steps | Trigger | Channel |
|----------|-------|---------|---------|
| Emergency response | Detect hazard → assess risk → generate checklist → notify contacts → track actions | User report or FEMA alert | WhatsApp, Telegram, SMS |
| Grant application | Identify grants → check eligibility → draft narrative → review → submit | User request or deadline alert | Web, API |
| Community resilience audit | Survey assets → map vulnerabilities → score resilience → recommend actions | Scheduled quarterly | Web, API |
| Sustainability event planning | Define goal → recruit volunteers → coordinate logistics → run event → report impact | User request | Telegram, WhatsApp, Web |
| Climate adaptation planning | Assess projections → identify risks → evaluate options → draft plan → review | Municipal request | Web, API |
| Volunteer mobilization | Post opportunity → match skills → schedule → confirm → follow up | Event trigger | WhatsApp, Telegram |
| Impact reporting | Collect data → calculate metrics → generate report → distribute | Monthly/quarterly cron | Web, Email |

---

## 14. Product Comparison Framework

### Data Model

```typescript
interface ProductSustainabilityProfile {
  name: string
  category: string
  scores: {
    carbon: number        // gCO2e per unit (lifecycle)
    water: number         // liters per unit
    waste: number         // grams packaging waste
    energy: number        // kWh manufacturing energy
    ethics: number        // 0-100 labor/supply chain score
    durability: number    // expected lifespan in years
    repairability: number // 0-10 iFixit-style score
    recyclability: number // % recyclable by weight
  }
  certifications: string[]  // ['B Corp', 'Fair Trade', 'ENERGY STAR', ...]
  origin: { country: string, distance_km: number }
  overall_score: number     // weighted composite 0-100
}
```

### Data Sources (free/open)

| Source | Data | Access |
|--------|------|--------|
| Open Food Facts | Food products, Eco-Score, NOVA | API (free) |
| EU Product Environmental Footprint | Lifecycle impact data | Public datasets |
| iFixit | Repairability scores | Web scraping (CC-BY-SA) |
| ENERGY STAR | Appliance efficiency | API (free) |
| B Corp directory | Certified businesses | Web (public) |
| Good On You | Fashion sustainability ratings | API (limited free tier) |
| EWG | Personal care product safety | Web (public) |

---

## 15. Carbon/Emissions Framework

### Personal Carbon Tracking Data Model

```typescript
interface CarbonFootprint {
  userId: string
  period: { month: number, year: number }
  categories: {
    transport: { mode: string, distance_km: number, emissions_kg: number }[]
    energy: { source: string, kwh: number, emissions_kg: number }[]
    diet: { type: string, emissions_kg: number }
    purchases: { category: string, amount_usd: number, emissions_kg: number }[]
    waste: { type: string, kg: number, emissions_kg: number }[]
  }
  total_kg: number
  comparison: { national_avg: number, global_avg: number, percentile: number }
  recommendations: { action: string, savings_kg: number, difficulty: string }[]
}
```

### Emission Factors (public sources)

| Source | Coverage | Update Frequency |
|--------|----------|-----------------|
| EPA GHG Emission Factors | US electricity, transport, waste | Annual |
| DEFRA Conversion Factors | UK/international factors | Annual |
| IEA CO2 Emissions | Country-level grid intensity | Annual |
| Electricity Maps API | Real-time grid carbon intensity | Real-time |
| USDA Food Composition | Diet emission estimates | Periodic |

---

## 16. Certification Support Framework

| Certification | Scope | Target User | Data Requirements | Automation Level |
|--------------|-------|-------------|-------------------|-----------------|
| ENERGY STAR | Buildings, products | Facility managers, consumers | Energy use data, building specs | HIGH — API available, score calculable |
| LEED | Buildings | Developers, building managers | Design docs, energy data, materials | MEDIUM — checklist automatable, verification manual |
| BREEAM | Buildings (UK/intl) | Developers | Similar to LEED | MEDIUM |
| WELL | Health + wellbeing | Building managers | Indoor environment data | MEDIUM |
| B Corp | Businesses | SMBs | Business practices questionnaire | LOW — subjective assessment |
| SBTi | Emissions targets | Businesses | Scope 1/2/3 emissions | MEDIUM — calculation automatable |
| GRI | Sustainability reporting | Organizations | Operations data | MEDIUM — template generation |
| CDP | Climate disclosure | Organizations | Emissions, risks, opportunities | MEDIUM — response drafting |

---

## 17. Companion Capability Plan

### Channel Support Matrix

| Channel | Inbound | Outbound | Multimodal | Approval Gate | Status |
|---------|---------|----------|------------|---------------|--------|
| Web chat | Text, image, PDF, voice | Text, A2UI blocks, charts | YES | YES (action cards) | PRODUCTION |
| Telegram | Text, image, document, voice, video, location | Text, markdown | YES | YES (pairing + approval) | PRODUCTION |
| WhatsApp | Text, image, location | Text | Partial | YES (pairing + double-confirm) | PRODUCTION (Cloud API) |
| Discord | Text | Text, embeds | Partial | YES | PRODUCTION |
| Slack | Text | Text, blocks | Partial | YES | PRODUCTION |
| CLI | Text | Text, formatted | NO | NO (local trust) | PRODUCTION |
| API | JSON | JSON | YES | YES (token-based) | PRODUCTION |
| SMS | **NOT BUILT (inbound)** | YES (Twilio) | NO | YES | PARTIAL |
| Email | **NOT BUILT (inbound)** | YES (SendGrid/SMTP) | NO | YES | PARTIAL |
| Voice call | **NOT BUILT** | YES (Twilio) | Audio | YES (double-confirm) | PARTIAL |

### Companion Interaction Principles

1. **Action over information** — When a tool call, checklist, upload, or workflow exists, use it instead of giving generic advice
2. **Approval before action** — All outbound messages, calls, and external actions require explicit consent
3. **Double-confirmation for emergency** — Emergency SMS/calls require confirmation code
4. **Progressive disclosure** — Start with the most relevant answer, offer depth on request
5. **Multimodal when helpful** — Accept images for damage documentation, PDFs for bills/policies, voice for hands-free
6. **Location-aware** — Use geocoding for address-specific risk, local resources, local regulations
7. **Onboarding profile** — Collect user profile progressively to personalize responses

---

## 18. File-by-File Implementation Plan

### New Files to Create

| File | Purpose | Sprint |
|------|---------|--------|
| gateway/registries/capability-registry.ts | Persistent capability registry with CRUD + query | S1 |
| gateway/registries/skill-registry.ts | Skill discovery, metadata, search | S1 |
| gateway/registries/model-registry.ts | Multi-provider model catalog with routing policies | S1 |
| gateway/registries/mcp-registry.ts | MCP server discovery and health check | S2 |
| gateway/registries/workflow-registry.ts | Workflow template storage and discovery | S2 |
| gateway/telemetry/logger.ts | Structured logging (pino) | S1 |
| gateway/telemetry/metrics-export.ts | Metrics export to dashboard | S1 |
| gateway/sustainability/carbon-tracker.ts | Personal/household carbon calculation | S1 |
| gateway/sustainability/product-compare.ts | Product sustainability comparison | S2 |
| gateway/sustainability/scoring.ts | Sustainability score per skill/action | S1 |
| gateway/channels/sms.ts | Twilio SMS inbound handler | S1 |
| skills/energy-efficiency/SKILL.md | Home energy efficiency advisor | S1 |
| skills/carbon-tracker/SKILL.md | Personal carbon footprint | S1 |
| skills/disaster-prep/SKILL.md | Emergency preparedness checklist | S1 |
| skills/product-compare/SKILL.md | Product sustainability comparison | S2 |
| skills/grant-finder/SKILL.md | Grant/funding matching | S2 |

### Files to Modify

| File | Change | Sprint |
|------|--------|--------|
| gateway/orchestrator/model-router.ts | Add multi-provider support, DeepSeek, local models | S1 |
| gateway/orchestrator/metrics.ts | Add export pipeline, carbon reporting to users | S1 |
| gateway/config.ts | Add logging config, new registry paths | S1 |
| gateway/index.ts | Wire registries, logger, SMS channel | S1 |
| vitest.config.ts | Add coverage thresholds (80%), timeout, reporters | S1 |
| package.json | Add pino, eslint, prettier, husky | S1 |
| docker-compose.yml | Add PostgreSQL service, Redis (optional) | S2 |
| .github/workflows/ci.yml | Add lint, coverage, security scan | S1 |
| src/components/sustainability-dashboard/ | Add carbon tracking UI, product comparison | S2 |

---

## 19. Tests to Add

### Critical Path Tests (Sprint 1)

| Test File | What It Tests | Lines Est. |
|-----------|---------------|------------|
| gateway/agents/router.test.ts | SSE streaming, tool rounds, model selection, failover | 200 |
| gateway/agents/tools.test.ts | Each tool (web_search, geocode, flood zone, openkb) | 150 |
| gateway/orchestrator/model-router.test.ts | Complexity scoring, tier selection, agent floors, failover | 120 |
| gateway/orchestrator/classifier.test.ts | Intent classification accuracy | 100 |
| gateway/orchestrator/metrics.test.ts | Metric recording, carbon estimation, aggregation | 80 |
| gateway/workflows/executor.test.ts | Interpolation, conditions, parallel, loops, error handling | 200 |
| gateway/security/pairing.test.ts | Code generation, verification, expiry, timing-safe | 100 |
| gateway/security/policy.test.ts | Channel policies, pairing requirements | 80 |
| gateway/sessions/store.test.ts | CRUD, turn tracking, compression | 80 |
| gateway/memory/compress.test.ts | Context building, user model nudging | 100 |
| gateway/skills/loader.test.ts | YAML parsing, cache TTL, TF-IDF retrieval | 120 |
| gateway/seabri/agent-registry.test.ts | Registration, capability query, builtin vs external | 80 (exists, extend) |
| gateway/registries/capability-registry.test.ts | CRUD, persistence, query | 100 |
| src/store/chat.test.ts | Session CRUD, streaming, approval resolution | 150 |
| gateway/auth.test.ts | JWT creation, verification, timing-safe comparison | 80 |

**Total estimated: ~1,740 lines of tests**

### Integration Tests (Sprint 2)

| Test File | What It Tests |
|-----------|---------------|
| gateway/channels/telegram.test.ts | Message handling, pairing flow, approval flow, media |
| gateway/channels/whatsapp.test.ts | Webhook verification, HMAC validation, approval |
| gateway/cron/index.test.ts | Preset scheduling, HMAC approval tokens |
| gateway/mcp/server.test.ts | JSON-RPC handling, tool dispatch |
| e2e/chat-flow.spec.ts | Full user flow: select agent → send message → receive response |
| e2e/approval-flow.spec.ts | Action card → approve/deny → outcome |

---

## 20. Sprint 1 Priorities (2-3 weeks)

### Week 1: Foundation

1. **Capability registry** — Persistent storage for agent capabilities (gateway/registries/capability-registry.ts)
2. **Skill registry draft** — Formalize skill metadata, discovery, search (gateway/registries/skill-registry.ts)
3. **Model registry** — Multi-provider model catalog with routing policies (gateway/registries/model-registry.ts)
4. **Structured logging** — Add pino, structured JSON output (gateway/telemetry/logger.ts)
5. **Vitest config** — Coverage thresholds (80%), timeout, reporters

### Week 2: Tests + Sustainability Core

6. **Critical path tests** — Agent router, model router, workflow executor, security (see section 19)
7. **Sustainability scoring** — Per-request carbon/cost reporting to users (gateway/sustainability/scoring.ts)
8. **Carbon tracker skill** — Personal carbon footprint estimation (skills/carbon-tracker/SKILL.md)
9. **Energy efficiency skill** — Home energy advisor (skills/energy-efficiency/SKILL.md)
10. **Disaster prep skill** — Location-specific emergency checklist (skills/disaster-prep/SKILL.md)

### Week 3: Upstream + CI

11. **GBrain MCP adapter** — Connect gbrain as memory/knowledge graph backend
12. **SMS inbound channel** — Twilio webhook handler (gateway/channels/sms.ts)
13. **CI enhancement** — Add lint, coverage reporting, security scanning to GitHub Actions
14. **Upstream skill map documentation** — Formalize reuse decisions
15. **DeepSeek model integration** — Add as coding/reasoning fallback in model router

### Sprint 1 Non-Goals
- Do not build a skill marketplace
- Do not rewrite the agent runtime
- Do not clone upstream repos into OpenSeaBri
- Do not build the full product comparison engine
- Do not implement multilingual support
- Do not push to GitHub

---

## 21. Sprint 2 Priorities (2-3 weeks)

### Core Features

1. Product sustainability comparison skill + UI
2. Grant/funding matcher skill
3. Community emissions dashboard skill
4. MCP registry with health checks
5. Workflow registry with templates
6. Email inbound channel

### Upstream Integration

7. Nanobot adapter for additional channels (WeChat, Matrix, Teams)
8. Hermes-agent model routing adapter (200+ models)
9. CopilotKit AG-UI Protocol adoption (pattern)

### Infrastructure

10. PostgreSQL container in docker-compose
11. Approval audit logging
12. Rate limiting on all endpoints
13. Integration tests for Telegram + WhatsApp
14. E2E test expansion

### Sustainability

15. Carbon-aware cron scheduling (Electricity Maps API)
16. Sustainability dashboard enhancement (aggregate carbon, cost trends)
17. ENERGY STAR API integration for appliance comparison
18. Eco-label recognizer skill

---

## 22. Risks and Tradeoffs

| Risk | Impact | Mitigation |
|------|--------|------------|
| awesome-deepseek-agent license unresolved | Cannot safely reference DeepSeek integration patterns | Resolve license before any reuse; treat as pattern-only if unclear |
| MiroFish AGPL contamination | Using any MiroFish code forces AGPL on OpenSeaBri | Strict quarantine; do not import, fork, or adapt any MiroFish code |
| Test coverage at 30% | Regressions in critical paths (routing, security, approvals) | Sprint 1 priority: raise to 80% on critical paths |
| No observability | Cannot diagnose production issues or measure sustainability impact | Sprint 1: add structured logging + metrics export |
| In-memory state | Server restart loses sessions, metrics, user state | Sprint 2: persistent session store (SQLite or PostgreSQL) |
| Single-container deployment | Cannot scale horizontally | Acceptable for v1; Sprint 3+ consideration |
| Twilio costs for SMS/voice | Outbound actions have real $ cost | Approval gates + test mode + whitelisting already mitigate |
| API key exposure in browser | VITE_ANTHROPIC_API_KEY visible in client bundle | Gateway mode eliminates this; document as dev-only option |
| Upstream dependency drift | Upstream projects may change APIs/behavior | Quarterly drift checks via sync-upstream.ts; pin SHA in UPSTREAM_SYNC.md |
| Scope creep on sustainability skills | 50+ skills defined but only 3 feasible in Sprint 1 | Prioritize ruthlessly; focus on carbon tracker, energy efficiency, disaster prep |

---

## 23. Commands to Run Locally

### Development Setup
```bash
cd C:\Users\adelm\SeaBridgeAI\openseabri
npm install
cp .env.example .env  # fill ANTHROPIC_API_KEY at minimum
npm run dev            # Vite dev server → http://localhost:5173
npm run gateway        # API gateway → http://localhost:18790
```

### Testing
```bash
npm test               # vitest run (unit + integration)
npm run test:watch     # vitest watch mode
npm run test:coverage  # vitest with coverage report
npm run e2e            # playwright end-to-end
npm run typecheck      # tsc --noEmit
```

### Database
```bash
npm run db:migrate     # apply pending migrations
npm run db:studio      # drizzle studio UI
npm run db:generate    # sync schema from code
```

### CLI
```bash
npm run cli            # interactive chat
npx tsx cli/seabri.ts chat --agent climate-risk
npx tsx cli/seabri.ts search "solar panel ROI"
npx tsx cli/seabri.ts cron list
```

### Research
```bash
npm run research       # overnight autonomous research loop
```

### Docker
```bash
docker compose up --build    # build + run
docker compose up -d         # detached
```

### Upstream Sync
```bash
npx tsx scripts/sync-upstream.ts          # check all upstreams for drift
npx tsx scripts/sync-upstream.ts hermes   # check specific upstream
```

### Knowledge Graph
```bash
graphify update .      # update AST-based graph (no API cost)
```

---

## 24. Final Recommendation

**OpenSeaBri is further along than expected.** The core runtime — agent routing with SSE streaming, multi-turn tool use, 5 messaging channels, workflow execution, model routing, skill loading, and approval gates — is production-grade code, not scaffolding.

**Do not rewrite.** The architecture is sound. The agent runtime, security model, and channel implementations are well-designed with proper error handling, timing-safe comparisons, and LRU-bounded state.

**Fill three gaps in Sprint 1:**
1. **Tests** (30% → 80% on critical paths) — this is the biggest risk
2. **Observability** (0% → functional logging + metrics) — can't operate what you can't see
3. **Registries** (in-memory → persistent, queryable) — foundation for the skill ecosystem

**Build three sustainability skills in Sprint 1:**
1. Personal carbon tracker — the signature feature
2. Energy efficiency advisor — highest user value
3. Emergency/disaster preparedness — highest safety value

**Integrate two upstream capabilities in Sprint 1:**
1. GBrain as memory/knowledge graph (via MCP — zero code change to agent runtime)
2. SMS inbound via Twilio (extend existing outbound infrastructure)

**Defer everything else.** No marketplace, no generative UI, no multi-agent simulation, no horizontal scaling. These are Sprint 3+ concerns.

OpenSeaBri has the foundation to become the strongest open sustainability agent harness. The path is: solidify what exists, fill critical gaps, ship the first sustainability skills, and let the ecosystem grow from a stable base.

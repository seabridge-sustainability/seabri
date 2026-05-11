# OpenSeaBri Full Implementation Plan

Status: product build-out plan after staging readiness. Live providers remain gated.

## 1. Product Vision

OpenSeaBri is two connected products:

1. Living Companion: a plain-language sustainability, home resilience, climate risk, insurance, local-help, and product-choice companion for individuals, households, communities, NGOs, schools, and small organizations.
2. Agent Harness / Sustainable Computing Layer: a developer-facing runtime for skills, MCP tools, workflow routing, sustainable model selection, telemetry, and safe upstream agent integration.

The shared rule is simple: every capability must be invokable, observable, safe, and honest about what is live, mocked, local, or unavailable.

## 2. Current Implemented Capabilities

- Gateway HTTP API: `gateway/seabri/api-handler.ts`
- WebSocket chat and approval cards: `gateway/index.ts`
- Registry visibility: `gateway/seabri/registry-views.ts`, `gateway/seabri/registry-snapshot.ts`
- Provider readiness: `gateway/seabri/provider-readiness.ts`
- Product comparison V1: `gateway/sustainability/product-comparison.ts`
- Model routing and cost/carbon telemetry: `gateway/orchestrator/model-router.ts`, `gateway/orchestrator/metrics.ts`, `gateway/seabri/telemetry.ts`
- Attachment processing: `gateway/seabri/attachments.ts`, `gateway/attachments/*`
- Profile helpers: `gateway/seabri/user-profile.ts`
- Approval-gated outbound actions: `gateway/seabri/approval.ts`, `gateway/seabri/action-executor.ts`, `gateway/seabri/outbound.ts`
- Channel adapters: `gateway/channels/{telegram,whatsapp,sms,voice}.ts`
- MCP server: `gateway/mcp/server.ts`
- Canvas/workflow UI: `src/components/workflow-canvas/*`, `src/components/canvas/*`
- Staging validation: `scripts/validate-staging.ts`, `scripts/staging-smoke.ts`

## 3. Missing Product Capabilities

- Living Companion incident workflow visible without an LLM key.
- Persistent user profiles surfaced cleanly in web chat.
- Incident state that tracks latest media/document across every channel.
- Real local resource lookup with source labels and provider freshness.
- Insurance document workflow with extracted coverage terms and insurer questions.
- Community/NGO kit: shelter list, volunteer coordination, template messages.
- Harness workflow optimizer exposed through HTTP/MCP with telemetry.
- Persistent telemetry store backed by production storage.
- Live-provider credential validation and execution evidence.

## 4. User-Facing Workflows To Build

### Flood / Insurance / Local Help

Files: `gateway/seabri/incident-workflow.ts`, `gateway/index.ts`, `gateway/seabri/api-handler.ts`, `src/lib/agents.ts`.

APIs:
- `POST /api/seabri/living-companion/incident`
- MCP tool: `living_companion_incident`
- WebSocket `chat` fallback before LLM routing

Tests:
- `gateway/seabri/incident-workflow.test.ts`
- `gateway/seabri/api-handler.test.ts`
- `gateway/mcp/server.test.ts`

Acceptance:
- Short action-first response.
- One question at a time.
- No technical leakage.
- Profile extraction.
- Media/document follow-up.
- Local-help ranking without fake contacts.
- Approval gate before executable outbound action.

Demoable:
- User sends "My bathroom is flooding." and receives a concrete action plan locally.

### Product Comparison

Files: `gateway/sustainability/product-comparison.ts`, `gateway/tools/register-builtin.ts`, `gateway/mcp/server.ts`.

APIs:
- existing comparison tool/skill
- future `POST /api/seabri/living-companion/product-comparison`

Acceptance:
- User-provided attributes only unless web data is available.
- No invented certifications.
- Transparent assumptions and confidence.
- Telemetry event saved.

Demoable:
- Compare two product options and get a concise recommendation.

### Community / NGO Response Kit

Files:
- future `gateway/seabri/community-workflows.ts`
- future `src/components/community/*`

APIs:
- future `POST /api/seabri/living-companion/community/action-plan`

Acceptance:
- Generate shelter/check-in/volunteer/resource scripts.
- Requires approval for outbound messages.
- No live sends unless gated.

Demoable:
- NGO asks for a flood-response checklist and outreach script.

## 5. Developer-Facing Workflows To Build

### Sustainable Compute Optimizer

Files:
- `gateway/orchestrator/model-router.ts`
- future `gateway/seabri/workflow-optimizer-api.ts`
- `improvement/workflow-optimizer.ts`
- `gateway/mcp/server.ts`

APIs:
- existing `POST /api/seabri/improvement/optimize-workflow`
- future MCP tool `optimize_sustainable_compute`

Acceptance:
- Estimate token, cost, latency, and carbon impact.
- Recommend smaller model, caching, batching, compression, or local execution.
- Emit telemetry.

Demoable:
- Developer submits workflow metadata and receives a green-compute plan.

### Registry Snapshot And Diff

Files:
- `gateway/seabri/registry-snapshot.ts`
- future `scripts/registry-diff.ts`

Acceptance:
- Stable hash, counts, no secrets, diff between deployments.

Demoable:
- Operator proves staging has expected agents/skills/MCP/tools.

## 6. Agent / Skill / MCP Architecture

- Agents remain in `gateway/agents/*` and `gateway/seabri/agent-registry.ts`.
- Skills remain filesystem-first under `skills/*/SKILL.md`, with extension registry metadata in `gateway/registries/skill-registry.ts`.
- MCP server exposes direct agent calls plus deterministic local tools where LLM use is not required.
- Any new capability must appear in at least one invokable surface: HTTP, WS, MCP, channel adapter, or UI.

## 7. Data And Telemetry Architecture

- Standalone mode keeps sessions/profiles local under `WORKSPACE_DIR`.
- `TelemetryStore` remains the abstraction for append-only event persistence.
- Required event classes: `incident_started`, `profile_updated`, `document_reviewed`, `local_help_ranked`, `action_prepared`, `action_approved`, `action_blocked`, `model_routed`, `sustainability_scored`.
- Production storage should add retention, tenant/user scoping, redaction, and export.

## 8. Multi-Model Routing Architecture

- Deterministic workflows run before LLM calls for urgent, high-confidence incident intents.
- Haiku tier handles simple drafts and structured extraction.
- Sonnet tier handles moderate policy/risk reasoning.
- Opus tier is reserved for complex multi-document or high-stakes synthesis.
- Routing must emit cost/carbon telemetry and explain downgrade/escalation reason.

## 9. Sustainability Scoring Architecture

- Product comparison uses transparent heuristics and unknown-data labels.
- Model routing uses cost/carbon estimates per tier.
- Workflow optimizer ranks caching, batching, context compression, smaller model, and local execution.
- No lifecycle/certification claims are invented.

## 10. Messaging / Channel Architecture

- WebSocket is the fastest demo path.
- HTTP APIs support deterministic demos and staging smoke.
- Telegram/WhatsApp/SMS/Voice normalize messages and media before orchestration.
- All outbound calls/messages require approval cards and provider gates.
- Test mode must block non-allowlisted contacts.

## 11. Live-Provider Integration Plan

- Keep providers disabled by default.
- Use `GET /api/seabri/admin/provider-readiness` before any live test.
- Require explicit env gates, allowlisted contacts, and written approval.
- Capture evidence report for every live validation.
- Roll back by disabling provider flags and rotating credentials.

## 12. Staging Deployment Plan

- Use `.env.staging.example`.
- Start gateway with `npm run gateway`.
- Run `npm run smoke:staging`, MCP smoke, channel mock smoke, and registry snapshot smoke.
- Keep live providers disabled.

## 13. Production Deployment Plan

- Select hosting and secret manager.
- Configure fixed CORS origins, rate limits, WS/canvas tokens, telemetry store, and backups.
- Add persistent DB/storage for profiles/sessions/telemetry.
- Run live-provider validations only after staging passes.

## 14. Testing And Validation Plan

- Unit: workflow modules, parsers, scoring, redaction.
- Integration: HTTP endpoints, MCP tools, WebSocket chat.
- Channel: mocked Telegram/WhatsApp/SMS/Voice with media and approval gates.
- Frontend: Playwright smoke for chat/canvas/dashboard.
- Release gate: typecheck, Vitest, Node tests, Playwright, build, audit, staging smoke.

## 15. Milestone Roadmap

### M1: Demoable Incident Workflow

Demoable after milestone:
- "My bathroom is flooding" works locally through HTTP/MCP/WebSocket without an LLM key.
- Policy/photo/local-help/action-prep follow-ups work in deterministic mode.

### M2: Product Comparison Polish

Demoable after milestone:
- Web UI comparison panel, API endpoint, telemetry, and registry visibility.

### M3: Sustainable Compute Optimizer

Demoable after milestone:
- Developer submits workflow metadata through API/MCP and receives cost/carbon/model recommendations.

### M4: Community / NGO Tools

Demoable after milestone:
- Community flood-response kit, outreach scripts, and approval-gated message drafts.

### M5: Production Persistence And Live Provider Gates

Demoable after milestone:
- Staging deployment with durable telemetry/profile/session storage and approved live-provider validation evidence.

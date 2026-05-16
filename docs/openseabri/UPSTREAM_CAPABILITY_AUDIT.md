# OpenSeaBri Upstream Capability Audit

Date: 2026-05-16

Scope: `C:\Users\adelm\SeaBridgeAI\_upstream` plus current OpenSeaBri integration points. This audit distinguishes directly reusable code from adapter-only and pattern-only references. No live provider calls were made.

## Summary

OpenSeaBri already has working native adapters for Hermes Agent, OpenClaw, and MiroFish, plus a new Space Agent instruction-loader adapter added in this pass. Upstream systems are valuable, but most should remain quarantined behind wrappers because of runtime mismatch, license mismatch, or product-scope mismatch. The highest-value production direction is to keep OpenSeaBri's TypeScript runtime as the control plane, expose upstream capabilities through registries/MCP, and avoid copying upstream code blindly.

## Upstream Systems

| System | Local path | License | Language/runtime | Core capabilities | Reusable skills/tools | Reuse mode | Adapter needed | Pattern-only | Integration risks | Sustainability relevance | Test required |
|---|---|---:|---|---|---|---|---|---|---|---|---|
| Hermes Agent | `_upstream/hermes-agent` | MIT | Python + Node patterns | Agent runtime, model routing, coding skills, tool invocation, prompt/memory patterns | Model provider routing, coding-agent skill shape, self-improvement loop ideas | Partial direct reuse through existing adapter | Yes, already wrapped by `gateway/upstream/hermes.ts` | No | Dependency/runtime drift; only allow configured local agent roots | High: energy-aware routing and skill orchestration | Adapter availability, safe routing, no unapproved process launch |
| OpenClaw / OpenCode-style agent | `_upstream/openclaw` | MIT | TypeScript/Node | Channel adapters, terminal/chat UX, extensible tools | Channel concepts, tool registry patterns | Partial direct reuse through existing adapter | Yes, already wrapped by `gateway/upstream/openclaw.ts` | No | Channel parity can be overstated if only documented | High: broad access channels for households and communities | Registry route and channel-compat tests |
| MiroFish | `_upstream/MiroFish` | AGPL-3.0 | TypeScript/Node | Desktop/local agent concepts, model/provider patterns | Pattern references only unless isolated | Gated adapter only | Yes, already wrapped by `gateway/upstream/mirofish.ts` | Mostly | AGPL contamination risk; do not copy code into MIT app | Medium: local-first agent patterns | License quarantine and adapter availability tests |
| Space Agent | `_upstream/space-agent` | MIT | TypeScript/Electron | `AGENTS.md`-style instruction loading, workspace packaging, local agent shell | Instruction discovery, nested agent guidance, pattern extraction | Adapter implemented in this pass | Yes, `gateway/upstream/space-agent.ts` | No | Electron-specific runtime is not appropriate for web/API server | High: reusable skill instruction loader for low-token operation | Adapter unit tests and registry inclusion |
| Nanobot | `_upstream/nanobot` | MIT | Python | Lightweight bot/channel wrappers, message loop patterns | Messaging wrapper ideas and compact skill invocation | Not directly reused | Yes, future bridge | Yes for now | Python runtime bridge, provider credentials, channel compliance | High: low-cost multi-channel access | Mock inbound/outbound safety tests before use |
| GBrain | `_upstream/gbrain` | MIT | Node/PGLite | Memory graph, job queue, MCP-oriented workspace helpers | Memory/job queue architecture, MCP tool conventions | Not directly reused | Yes, future bridge | Yes for now | Persistence semantics and data-retention policy must match OpenSeaBri | High: durable community memory and workflow scheduling | Storage isolation and retention tests |
| Awesome DeepSeek Agent | `_upstream/awesome-deepseek-agent` | No clear repo license found in audit | Markdown/reference | Model/tool ecosystem references | DeepSeek/coding model routing ideas | Do not reuse code | Yes, docs-only model router reference | Yes | License ambiguity and stale links | Medium: cheaper coding/model routing references | Model-router config tests only if adopted |
| CopilotKit | `_upstream/CopilotKit` | MIT | TypeScript/React | App-integrated AI actions, frontend agent UX | UI action surfacing and approval cards | Pattern reference | Yes if used | Yes | Large dependency surface, UI architecture mismatch | Medium: agent UX affordances | UI action-gate tests |
| PageIndex | `_upstream/pageindex` | MIT | TypeScript | Local document indexing/search | Document ingestion and local lookup patterns | Pattern reference | Yes if used | Yes | Index freshness and privacy | High: local resource and document support | Ingestion privacy tests |
| Rowboat | `_upstream/rowboat` | Apache-2.0 | TypeScript/Python patterns | Workflow orchestration, workflow graph ideas | Workflow step templates, eval loops | Pattern reference | Yes if used | Yes | Workflow semantics differ from OpenSeaBri router | High: community workflows and grants | Workflow snapshot/eval tests |
| Multica | `_upstream/multica` | Custom/copyrighted notice | Mixed | Multi-agent orchestration ideas | Architecture reference only | Do not reuse code | No | Yes | License incompatibility for direct reuse | Medium | Documentation-only review |
| OpenWork | `_upstream/openwork` | Custom/copyrighted notice | Mixed | Work/task orchestration concepts | Architecture reference only | Do not reuse code | No | Yes | License ambiguity | Medium | Documentation-only review |
| DocuSeal | `_upstream/docuseal` | AGPL-3.0 | Ruby/JS | Document signing and PDF workflows | PDF/document lifecycle ideas only | Do not import into MIT app | Possible isolated service only | Yes | AGPL and product-scope mismatch | Medium: insurance document support | Contract-bound isolated-service tests if ever used |
| Text-to-CAD | `_upstream/text-to-cad` | MIT | Python | CAD generation from text | Retrofit/repair visualization ideas | Pattern reference | Yes if used | Yes | Heavy runtime and non-core scope | Low/Medium | Opt-in offline workflow tests |
| Kepano / Obsidian skills | `_upstream/kepano*` if present | Varies | Markdown | Knowledge vault and skill authoring patterns | Skill formatting and notes structure | Pattern reference | No | Yes | License varies; avoid copying proprietary content | Medium: knowledge organization | Skill-loader compatibility tests |

## Integration Decision

Implemented now: Space Agent-style instruction loader. It is MIT-compatible, low risk, and improves OpenSeaBri's ability to consume upstream agent instructions without copying source code or launching external applications.

Deferred:

- Nanobot channel bridge: valuable, but should wait until channel compliance and provider gating are fully provider-tested.
- GBrain memory/job bridge: valuable, but requires explicit persistence, retention, and privacy decisions.
- DeepSeek model-router adapter: useful, but should be configuration-only and not tied to one provider without owner-approved credentials.


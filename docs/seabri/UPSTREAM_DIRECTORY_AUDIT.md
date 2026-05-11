# Upstream Directory Audit

**Date:** 2026-05-03  
**Scope:** `C:\Users\adelm\SeaBridgeAI\_upstream\`

---

## Directory Inventory

| Project | License | Runtime | Platforms | MCP | Integration Path |
|---------|---------|---------|-----------|-----|-----------------|
| hermes-agent | MIT | Node.js | 7 (Telegram, WhatsApp, Discord, Slack, Email, SMS, Web) | No | Adapter wrapper |
| nanobot | MIT | Python 3.11+ | 15 | Yes (MCP server) | Subprocess adapter |
| openclaw | MIT | Node.js 24+ | 19 | No | Direct import or adapter |
| gbrain | MIT | TypeScript/Bun | N/A (RAG engine) | Yes (MCP server) | MCP client |
| space-agent | MIT | Node.js | N/A (browser-first) | No | Reference only |
| MiroFish | **AGPL-3.0** | Node.js | Multi | No | **BLOCKED — copyleft** |
| text-to-cad | MIT | Python | N/A | No | Specialty only |
| awesome-deepseek-agent | MIT | N/A | N/A | N/A | Reference docs |
| space-agent-run | N/A | N/A | N/A | N/A | Runtime state only |
| (1 unnamed) | Unknown | Unknown | Unknown | Unknown | Requires investigation |

---

## Project Deep Dives

### hermes-agent (MIT)
- **What it is:** Production-grade Node.js multi-channel message bus; 40+ built-in tools
- **Platforms:** Telegram, WhatsApp (Business API), Discord, Slack, Email (SMTP/IMAP), SMS (Twilio), Web socket
- **Architecture:** Plugin-based tool registry; each tool is a self-contained module with JSON schema
- **Relevant to SeaBri:** Channel adapters (Telegram/WhatsApp/Discord/Slack), tool registry pattern
- **Integration path:** Wrap hermes channel adapters as SeaBri channel modules; import tool schemas into SeaBri's agent registry
- **Risk:** Node.js version compatibility; hermes may use different HTTP framework

### nanobot (MIT)
- **What it is:** Python 3.11+ multi-platform chatbot framework with MCP native support
- **Platforms:** 15 including Telegram, WhatsApp, Facebook Messenger, Instagram, Twitter/X, Discord, Slack, LINE, WeChat (stub), Viber, Skype, Kik, Teams, Signal (stub), Zulip
- **Architecture:** Skill-based; each skill is a Python module with `can_handle()` + `execute()` pattern
- **MCP:** Exposes skills as MCP tools; acts as MCP server on stdio
- **Relevant to SeaBri:** Skill creator pattern (auto-generates skill stubs from description); language detection (uses langdetect); multi-platform abstraction
- **Integration path:** Run as subprocess MCP server; SeaBri's orchestrator calls nanobot tools via MCP protocol
- **Risk:** Python subprocess latency; MCP protocol overhead for each message

### openclaw (MIT)
- **What it is:** Node.js 24+ universal channel abstraction layer; 19 platforms
- **Platforms:** All major + LINE, Viber, Teams, Instagram, WeChat (partial), Signal (partial), Zulip, Rocket.Chat, Mattermost, IRC, Matrix
- **Architecture:** Unified `Message` interface; each channel driver implements `send()`, `receive()`, `getCapabilities()`
- **Relevant to SeaBri:** Normalized message envelope (directly matches Sprint 1 goal); channel capability detection
- **Integration path:** Import openclaw `Message` type as SeaBri's `NormalizedMessage`; use openclaw channel drivers for platforms SeaBri hasn't implemented
- **Risk:** Node.js 24+ requirement (verify SeaBri runtime version)

### gbrain (MIT)
- **What it is:** TypeScript/Bun hybrid RAG + reasoning engine; 29 built-in skills; Postgres-native vector store
- **Platforms:** N/A (backend engine, not a channel)
- **Architecture:** Skill DAG — skills can call other skills; MCP server exposes skills as tools; Postgres pgvector for embeddings
- **MCP:** Full MCP server; exposes 29 skills as tools (research, summarize, classify, translate, extract, etc.)
- **Relevant to SeaBri:** `translate` skill (multilingual), `classify` skill (mode detection), memory/RAG patterns
- **Integration path:** Connect SeaBri MCP client to gbrain MCP server; use translate skill for multilingual routing
- **Risk:** Requires Bun runtime and Postgres with pgvector; adds infrastructure dependency

### space-agent (MIT)
- **What it is:** Browser-first agent with SKILL.md-based skill system; git-backed skill storage
- **Architecture:** Skills are markdown files with YAML frontmatter; runtime evaluates skills dynamically
- **Relevant to SeaBri:** SKILL.md pattern (already used in SeaBri's CLAUDE.md); git-backed skill versioning
- **Integration path:** Reference design for self-improving skill system (Output 10)
- **Risk:** Browser-first — not directly portable to Node.js gateway

### MiroFish (**AGPL-3.0 — BLOCKED**)
- **What it is:** Multi-channel AI assistant framework
- **License RISK:** AGPL-3.0 requires any network-accessible service using AGPL code to release all source under AGPL. SeaBri is not open-source — **integration is BLOCKED**.
- **Decision:** Do not integrate, import, copy, or adapt any MiroFish code.

### text-to-cad (MIT)
- **What it is:** Python pipeline: text description → 3D CAD model (OpenSCAD/FreeCAD)
- **Relevant to SeaBri:** Low priority; only relevant if property damage documentation requires CAD output
- **Integration path:** Future specialty agent; not Sprint 1

### awesome-deepseek-agent (MIT)
- **What it is:** Curated reference documentation for DeepSeek agent patterns
- **Relevant to SeaBri:** Reference for multi-LLM routing (DeepSeek as budget provider)
- **Integration path:** Read-only reference; use when implementing multi-LLM router

---

## Integration Priority Matrix

| Project | Sprint | Value | Effort | Recommendation |
|---------|--------|-------|--------|----------------|
| openclaw (normalized message) | Sprint 1 | HIGH | LOW | Import `Message` type |
| nanobot (language detection) | Sprint 1 | HIGH | MEDIUM | Subprocess MCP adapter |
| gbrain (translate skill) | Sprint 1 | MEDIUM | MEDIUM | MCP client connect |
| hermes-agent (channel adapters) | Sprint 2 | MEDIUM | HIGH | Selective port |
| openclaw (missing channels) | Sprint 3 | MEDIUM | MEDIUM | Channel drivers |
| text-to-cad | Future | LOW | HIGH | Specialty agent |
| MiroFish | **Never** | N/A | N/A | **BLOCKED AGPL** |

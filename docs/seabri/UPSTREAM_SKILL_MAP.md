# Upstream Skill Map

**Date:** 2026-05-03  
**Purpose:** Map reusable skills from upstream projects to SeaBri capability gaps.

---

## Skill Inventory by Source

### nanobot Skills (Python, MCP-exposed)

| Skill | nanobot Module | SeaBri Gap It Fills |
|-------|---------------|---------------------|
| Language detection | `skills/langdetect_skill.py` | No locale routing in SeaBri |
| Platform abstraction | `core/platform.py` | WhatsApp/Discord/Slack gaps |
| Skill creator | `tools/skill_creator.py` | Self-improving skill system |
| Media downloader | `media/downloader.py` | WhatsApp media (no download yet) |
| Message normalizer | `core/message.py` | No NormalizedMessage in SeaBri |
| Intent classifier | `skills/intent_skill.py` | Augments classifyMode() |

### gbrain Skills (TypeScript, MCP-exposed)

| Skill | gbrain Module | SeaBri Gap It Fills |
|-------|--------------|---------------------|
| translate | `skills/translate.ts` | No multilingual support |
| classify | `skills/classify.ts` | Augments classifyMode() |
| summarize | `skills/summarize.ts` | Memory compression |
| research | `skills/research.ts` | Agent bridge enrichment |
| extract | `skills/extract.ts` | Structured data from messages |
| embed + search | `skills/rag.ts` | Memory search improvement |

### hermes-agent Tools (Node.js, JSON schema)

| Tool | hermes Module | SeaBri Gap It Fills |
|------|--------------|---------------------|
| send_telegram | `tools/telegram.js` | Reference for Telegram send |
| send_whatsapp | `tools/whatsapp.js` | WhatsApp media send (missing) |
| send_discord | `tools/discord.js` | Discord channel upgrade |
| send_email | `tools/email.js` | New channel: Email |
| download_media | `tools/media.js` | WhatsApp/generic media download |
| schedule_message | `tools/schedule.js` | Action coordination TTL |

### openclaw Patterns (Node.js, importable)

| Pattern | openclaw File | SeaBri Gap It Fills |
|---------|--------------|---------------------|
| NormalizedMessage type | `types/message.ts` | No normalized envelope |
| ChannelCapabilities | `types/capabilities.ts` | No capability registry per channel |
| Channel driver interface | `core/driver.ts` | Consistent channel abstraction |
| Media attachment type | `types/attachment.ts` | Unifies AttachmentResult variants |

---

## Skill Reuse Strategy

### Direct Import (no subprocess overhead)
- **openclaw types** — TypeScript; import directly into SeaBri gateway
- **hermes tool schemas** — JSON; import tool definitions into agent registry

### MCP Subprocess Adapter
- **nanobot** — Python; run as `stdio` MCP server; SeaBri MCP client calls tools
- **gbrain** — TypeScript/Bun; run as `stdio` MCP server; connect SeaBri MCP client

### Reference Only (read, don't import)
- **space-agent** — SKILL.md patterns for self-improving skills
- **awesome-deepseek-agent** — multi-LLM routing patterns
- **text-to-cad** — future CAD specialty

### Blocked
- **MiroFish** — AGPL-3.0; no integration under any circumstances

---

## Skill Gap → Upstream Resolution Table

| SeaBri Gap | Upstream Source | Integration Type | Sprint |
|------------|----------------|-----------------|--------|
| No multilingual routing | gbrain `translate` + nanobot `langdetect` | MCP | Sprint 1 |
| No capability registry | openclaw `ChannelCapabilities` | Direct import | Sprint 1 |
| No normalized message | openclaw `NormalizedMessage` | Direct import | Sprint 1 |
| WhatsApp media download | hermes `download_media` | Adapter port | Sprint 2 |
| Discord scaffold → live | hermes `send_discord` | Adapter port | Sprint 3 |
| Slack scaffold → live | hermes `send_slack` | Adapter port | Sprint 3 |
| Audio transcription (local) | nanobot whisper wrapper | MCP adapter | Sprint 1 |
| Self-improving skills | space-agent SKILL.md pattern | Reference | Sprint 2 |
| Email channel | hermes `send_email` | Adapter port | Sprint 3 |

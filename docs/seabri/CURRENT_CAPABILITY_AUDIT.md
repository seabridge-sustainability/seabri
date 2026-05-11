# SeaBri Current Capability Audit

**Date:** 2026-05-03  
**Scope:** `C:\Users\adelm\SeaBridgeAI\openseabri\gateway\`

---

## 1. Agents (16 registered)

| ID | Name | Capabilities |
|----|------|-------------|
| general | General Sustainability | general-sustainability |
| climate-risk | Climate Risk Analyst | climate-risk-analysis |
| property-climate-risk | Property Climate Risk | climate-risk-analysis, property-risk |
| sustainability-reporting | Sustainability Reporting | reporting, esg |
| investment-screening | Investment Screening | investment, esg |
| insurance-navigator | Insurance Navigator | insurance |
| damage-documentation | Damage Documentation | photo_damage |
| contractor-coordination | Contractor Coordination | action_coordination |
| emergency-resilience | Emergency Resilience | incident |
| home-energy-advice | Home Energy Advisor | energy |
| esg-materiality | ESG Materiality | materiality, esg |
| decarbonization | Decarbonization Strategy | decarbonization |
| nature-capital | Nature & Capital | nature |
| supply-chain-esg | Supply Chain ESG | supply-chain |
| regulatory-compliance | Regulatory Compliance | regulatory |
| carbon-markets | Carbon Markets | carbon |

Source: `gateway/seabri/agent-registry.ts` (singleton with 15 built-in agents; config.ts adds 16th via `AGENTS` array).

---

## 2. Channels

| Channel | File | Status | Notes |
|---------|------|--------|-------|
| Telegram | `channels/telegram.ts` | **Live** | Full: attach, approval, pairing |
| WhatsApp | `channels/whatsapp.ts` | **Partial** | Webhook wired; no media download |
| SMS (Twilio) | `channels/sms.ts` | **Live** | Text only; no media |
| Discord | `channels/discord.ts` | **Scaffold** | Basic on('messageCreate') |
| Slack | `channels/slack.ts` | **Scaffold** | Basic event listener |
| CLI | `channels/cli.ts` | **Live** | Full: readline REPL |

---

## 3. Attachment Pipeline (`gateway/seabri/attachments.ts`)

| Input | Handler | Output |
|-------|---------|--------|
| image/* | Sharp resize → base64 | `AttachmentResult { type: 'image', content, mediaType }` |
| audio/ogg, audio/mpeg | Whisper (OPENAI_API_KEY) or fallback | `type: 'audio_fallback'` if no key |
| video/mp4, video/note | ffmpeg extract audio → Whisper | `type: 'audio_fallback'` if no ffmpeg |
| application/pdf | pdf-parse text extraction | `type: 'pdf_text'` |
| application/octet-stream | mime sniff → reroute | varies |

Fallback chain: every media type degrades gracefully to a text context block describing what was received.

---

## 4. Response Mode Classifier (`gateway/seabri/modes.ts`)

Seven modes, resolved in priority order:

```
hasAudio → audio_note
hasImage → photo_damage
agentId match → mapped mode
incidentTerms → incident      (checked BEFORE property_risk)
propertyRiskTerms → property_risk
actionTerms → action_coordination  (checked BEFORE insurance)
insuranceTerms → insurance
default → general_sustainability
```

`FORBIDDEN_PATTERNS` (8 phrases) are enforced at response delivery to strip generic hedging.

---

## 5. Human Approval Layer (`gateway/seabri/approval.ts`)

- `extractActionCard(response)` — detects `Confirm? Reply YES` pattern
- `detectActionKind(card)` — classifies `outbound_call` vs `general`
- `isApproval(text)` / `isDenial(text)` — yes/no pattern matchers
- `logConsent(userId, card, approved)` — mutex-protected JSONL append to `WORKSPACE_DIR/consent.jsonl`
- `PendingAction { card, expiresAt, kind }` — stored per-user in channel state
- TTL: `OPENSEABRI_APPROVAL_TTL_MS` (default 300 000 ms / 5 min)

---

## 6. Outbound Actions (`gateway/seabri/outbound.ts`)

- `initiateOutboundCall({ toNumber, message, userId })` — Twilio REST API POST
- Requires: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `TWILIO_VOICE_TWIML_BASE_URL`
- Guard: `OUTBOUND_CALLS_ENABLED=true` required
- Returns `{ ok: boolean, callSid?, error? }`

---

## 7. Security (`gateway/security/`)

| Module | File | Description |
|--------|------|-------------|
| Pairing | `pairing.ts` | 6-digit codes, 10-min TTL, file-based `approved.json` |
| Policy | `policy.ts` | Per-sender allow/deny, preferred agent, pairing requirement |

---

## 8. Memory System (`gateway/seabri/memory.ts`)

- `appendToMemory(userId, role, content)` — adds to SQLite + JSONL
- `searchMemory(userId, query)` — BM25-style text search
- `compressMemory(userId)` — LLM-based summarization of old turns
- `buildMemoryContext(userId)` — returns top-k relevant turns as context prefix

---

## 9. Model Routing (`gateway/orchestrator/model-router.ts`)

- `selectModel(tier, complexity)` — maps task tier to Anthropic model ID
- `getFailoverModels(primary)` — returns ordered fallover list within Anthropic family
- **Provider lock-in:** Anthropic-only; no OpenAI, Google, DeepSeek, or local model support

---

## 10. API Surface (`gateway/server.ts`)

| Route | Method | Handler |
|-------|--------|---------|
| `/api/seabri` | POST | Main message ingress |
| `/health` | GET | Liveness check |
| `/attachments/:id` | GET | Blob retrieval |
| `/webhooks/telegram` | POST | Telegram webhook (alt to polling) |
| `/webhooks/whatsapp` | POST | WhatsApp webhook |
| `/webhooks/sms` | POST | Twilio SMS inbound |
| `/twiml` | GET | TwiML voice response for outbound calls |
| `/run` | POST | Cron-authenticated scheduled briefing trigger |

---

## 11. Backend Bridge (`gateway/bridge/agent_bridge.ts`)

Augments routing context with SeaBridgeAI backend data:
- Climate risk scores (property address → risk tier)
- ESG materiality assessment
- World risk CII scores
- LGND.ai vector search results
- CLIMADA physical risk (if `CLIMADA_ENABLED=true`)

---

## 12. Gaps Identified

| Gap | Severity | Sprint |
|-----|----------|--------|
| No multilingual UI strings / locale routing | HIGH | Sprint 2 |
| Anthropic-only LLM routing | HIGH | Sprint 1 |
| WhatsApp channel incomplete (no media download) | MEDIUM | Sprint 2 |
| Discord/Slack are scaffolds only | MEDIUM | Sprint 3 |
| No capability registry (runtime-queryable) | MEDIUM | Sprint 1 |
| No normalized message envelope | MEDIUM | Sprint 1 |
| Audio pipeline requires OPENAI_API_KEY (no local fallback) | MEDIUM | Sprint 1 |
| No language detection pre-routing | MEDIUM | Sprint 1 |
| No upstream adapter integration | LOW | Sprint 1+ |

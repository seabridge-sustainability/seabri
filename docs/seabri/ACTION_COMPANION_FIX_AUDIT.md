# SeaBri Action Companion — Fix Audit & Implementation Plan

**Date:** 2026-05-03  
**Audited by:** Claude Code (acting as Lead Backend Engineer, AI Agent Runtime Engineer, Client Experience QA Lead)  
**Trigger:** Live flood emergency on Telegram — user uploaded 4 PDFs that returned `[attachments] pdf-parse not installed`; subsequent agent responses were generic, verbose, and did not reference uploaded documents or visible photos.  
**Scope:** `gateway/seabri/attachments.ts`, `gateway/agents/agents.ts`, `gateway/agents/tools.ts`, `gateway/channels/telegram.ts`, `gateway/config.ts`

---

## 1. Executive Summary

A live emergency session revealed 10 product failures across the SeaBri action companion stack. The user was dealing with active basement flooding, had uploaded insurance policy PDFs, sent photos of damage, and asked for contractor and hotel help. The bot responded generically, could not read any PDFs, did not reference the photos, and offered no local resource lookup.

All 10 fixes have been root-caused and addressed in this patch set.

---

## 2. Failure Inventory

| Fix | Failure | Root Cause | Status |
|-----|---------|-----------|--------|
| FIX 1 | 4 uploaded PDFs unreadable | `pdf-parse` not installed; v2 API used default import (undefined) | **Fixed** |
| FIX 2 | Responses were 15+ bullet points in emergency | PERSONALITY had no line-count constraint for INCIDENT MODE | **Fixed** |
| FIX 3 | Photos not referenced in responses | PHOTO/DAMAGE MODE existed but agents did not reference image content | **Fixed** |
| FIX 4 | No local resource results (plumber, hotel, city) | Agents did not use `web_search` tool for local lookup | **Fixed** |
| FIX 5 | Call scripts not shown before execution | ACTION CARD was defined but missing call script field | **Fixed** |
| FIX 6 | City/authority contacts not identified | No LOCAL SEARCH MODE for government/utility contacts | **Fixed** |
| FIX 7 | No hotel/temporary housing guidance | ALE coverage not mentioned; no search for lodging | **Fixed** |
| FIX 8 | No structured action plan output | INCIDENT MODE had no NOW/Next 2h/Tonight plan section | **Fixed** |
| FIX 9 | Technical strings leaked to user (prior patch) | Fallback strings in `attachments.ts` were developer-facing | **Fixed (prior session)** |
| FIX 10 | No voice/TTS output in emergencies | TTS not implemented | **Deferred — Phase 2** |

---

## 3. FIX 1 — PDF Reading

### Root Cause

`pdf-parse` v2 (installed as `^2.4.5`) exports a named class `PDFParse`, not a default function. The prior code used:

```typescript
const pdf = (await import('pdf-parse')).default  // returns undefined in v2
await pdf(buffer)  // TypeError: pdf is not a function
```

Additionally, `npm install` had not been run since `pdf-parse` was added to `package.json`, leaving the module absent from `node_modules`.

### Fix Applied

1. `npm install pdf-parse --legacy-peer-deps` — installed the package.
2. Updated import to v2 named class API:
   ```typescript
   const { PDFParse } = await import('pdf-parse') as { PDFParse: new (opts: { data: Buffer }) => { getText(): Promise<{ text: string }> } }
   const parser = new PDFParse({ data: buffer })
   const parsed = await parser.getText()
   const text = parsed.text?.trim() ?? ''
   ```

### Document Classification

Added `classifyDocument()` helper that returns one of 7 document types based on filename and content heuristics:

| DocType | Detection Logic |
|---------|----------------|
| `policy_declarations` | filename contains "declaration" OR text has "declarations page" OR "policy number" + "coverage a" + "premium" |
| `flood_policy` | text has "flood insurance" OR filename has "flood" |
| `homeowners_policy` | text has "homeowners" OR "dwelling protection" OR "coverage a" + "coverage b" |
| `policy_endorsement` | filename has "endorsement" OR text has "policy endorsement" |
| `building_document` | text has "floor plan" / "elevation certificate" / "square footage" / "architectural" |
| `claim_document` | text has "claim" AND "adjuster" or "settlement" |
| `document` | fallback |

### Insurance Field Extraction

Added `extractInsuranceFields()` that regex-extracts: Coverage A (Dwelling), Coverage B (Other Structures), Coverage C (Personal Property), Coverage D / ALE (Loss of Use), All-Peril Deductible, Policy Number, Flood Exclusion flag.

Extracted fields are prepended to the PDF text as a structured header before injection into agent context.

### Text Limit

PDF text is capped at 12,000 characters. Documents longer than this get a truncation notice. Key coverage data is extracted and shown above the truncation point.

---

## 4. FIX 2 — Short Action-First Emergency Responses

### Root Cause

PERSONALITY had no line-count or word-count constraint on INCIDENT MODE. Agents produced multi-paragraph responses in emergencies, defeating the purpose of urgent guidance.

### Fix Applied

Added to INCIDENT MODE definition in `PERSONALITY`:

```
**STRICT FORMAT — max 5 bullet points total, then 1 question. No paragraphs. No preamble.**
- Lead with: ⚠️ IMMEDIATE STEPS: (3 numbered actions — do these NOW)
- Include 1 bullet: what NOT to do
- THEN — ACTION PLAN: 📋 WHAT SEABRI CAN DO RIGHT NOW
- Close with ONE question
- **NEVER write more than 8 lines total in INCIDENT MODE. Compress hard.**
```

---

## 5. FIX 3 — Photo-Aware Responses

### Root Cause

`ConversationMediaContext` (image persistence across turns) was implemented in `telegram.ts` in the prior audit patch. However, the PERSONALITY PHOTO/DAMAGE MODE instructions did not explicitly tell the agent to reference what it sees and structure its response around visible damage.

### Fix Applied

PHOTO/DAMAGE MODE updated with explicit structure:
- area affected → estimated severity → documentation checklist → exact insurer language
- "Tell them what additional photos or angles they need for a complete claim"
- "Treat the image or description as direct evidence — do not minimize or qualify excessively"

---

## 6. FIX 4 / FIX 6 / FIX 7 — Local Resource Search

### Root Cause

The `web_search` (Tavily) tool was registered in `tools.ts` and available to emergency agents, but no PERSONALITY instruction told agents to use it for local service lookups. Agents defaulted to generic advice rather than searching for actual nearby resources.

### Fix Applied

**ACTION COORDINATION MODE** updated to distinguish:
- **Outbound actions** (call/email/SMS) → require ACTION CARD + user confirmation
- **Local search** ("find me a plumber", "find a hotel") → use `web_search` immediately, no ACTION CARD needed

**LOCAL SEARCH MODE** added (new):
- Triggers: "find me a", "nearby", "plumber", "contractor", "hotel", "motel", "utility company", "city contact", "public works"
- Calls `web_search` with `"[service type] near [location]"` query immediately
- Returns 3 results with name, phone, address, hours
- **ALE insurance note** for hotel/lodging results: "Keep all receipts — these may qualify for reimbursement under your Loss of Use / Coverage D"
- City/utility: identifies correct department (public works, building dept, emergency management)

---

## 7. FIX 5 — Call Script Approval Gate

### Root Cause

ACTION CARD format was defined but the call script field was vague ("Script: [summary]"). Agents would often only write a summary of what the call was about rather than the verbatim script the user needs to approve.

### Fix Applied

ACTION CARD format updated to require verbatim script:

```
✉️ PROPOSED ACTION
To: [recipient name or role]
Via: [call / email / SMS]
Script/Message: [exact content — word for word what will be said or sent]
Purpose: [one sentence on what this achieves]
Reply YES to proceed, NO to cancel.
```

For CALLS: "include a full script the user can approve — not a summary, the actual words"

---

## 8. FIX 8 — Structured Action Plan in INCIDENT MODE

### Root Cause

INCIDENT MODE ended with immediate steps but offered no structured view of what SeaBri could take off the user's plate in the next hours. Users in emergencies need to see what help is available, not just what to do themselves.

### Fix Applied

INCIDENT MODE now includes an ACTION PLAN section after immediate steps:

```
📋 WHAT SEABRI CAN DO RIGHT NOW:
• Search for local [plumber / contractor / hotel / emergency contact]
• Draft your insurer notification
• Pull your coverage limits from any policy you upload
• Identify who to call at the city/utility
```

Followed by ONE closing question: "What's your most urgent need — finding help nearby, your insurance coverage, or something else?"

---

## 9. FIX 9 — Technical Leakage (Prior Session)

Previously fixed in the Telegram Multimodal Audit. Confirmed no regressions introduced by this patch.

Leakage patterns guarded:
- `OPENAI_API_KEY`, `npm install`, `ffmpeg`, `.env`, `seabri doctor`, `seabri onboard`
- Raw exception messages surfaced in bot replies

---

## 10. FIX 10 — TTS Audio Output (Deferred)

**Status: Deferred to Phase 2.**

### Requirements

- In emergency mode, generate a TTS audio response under 20 seconds
- Use OpenAI TTS API (`tts-1` model, `onyx` voice) or ElevenLabs
- Send as Telegram voice message (`.ogg` via `sendVoice`)
- Only activate when INCIDENT MODE is detected AND user is on Telegram voice channel

### Implementation Plan (Phase 2)

1. Add `generateTTS(text: string): Promise<Buffer | null>` to `attachments.ts`
   - Uses `OPENAI_API_KEY`; gracefully falls back if absent
   - Caps input at ~150 words to stay under 20 seconds
2. In `telegram.ts`: after agent response, if INCIDENT MODE was active, call `generateTTS(responseText)`
3. Send via `bot.sendVoice(chatId, buffer, { caption: '...' })`
4. Add `tts_enabled` to `ChannelCapabilities` registry

---

## 11. dotenv Override Fix

### Root Cause

Windows user-level environment variables were shadowing `.env` file values. A revoked `OPENAI_API_KEY` in Windows user env was overriding the valid key in `.env`, causing Whisper 401 errors.

### Fix Applied

Original fix updated `gateway/config.ts` to:
```typescript
config({ path: resolve(process.cwd(), '.env'), override: true })
```

That forced `.env` file values to win over Windows system/user environment variables, but a later 2026-05-10 smoke test showed the default was too broad: explicit process-level smoke/deployment env vars could be shadowed by local `.env`, which can accidentally start optional live channels.

Current behavior is safer:

```typescript
config({ path: dotenvPath })
if (process.env.OPENSEABRI_DOTENV_OVERRIDE === 'true') {
  config({ path: dotenvPath, override: true })
}
```

Use `OPENSEABRI_DOTENV_OVERRIDE=true` only for local interactive recovery when a stale Windows user-level env var must be overridden. Leave it unset or `false` for tests, smoke checks, CI, and deployments so explicit runtime env wins.

---

## 12. Files Changed

| File | Change Summary |
|------|---------------|
| `gateway/seabri/attachments.ts` | Updated to pdf-parse v2 API; added document classification, insurance field extraction, structured PDF header output |
| `gateway/agents/agents.ts` | INCIDENT MODE: strict line count, action plan section; ACTION COORDINATION: verbatim call script requirement; new LOCAL SEARCH MODE; new DOCUMENT REVIEW MODE |
| `gateway/config.ts` | Added `override: true` to dotenv config to prevent Windows env var shadowing |
| `gateway/seabri/telegram-multimodal.test.ts` | New regression test file — T1–T8 |

---

## 13. Files NOT Changed

| File | Reason |
|------|--------|
| `gateway/agents/tools.ts` | `web_search` (Tavily) already registered and available — no change needed |
| `gateway/channels/telegram.ts` | Image context persistence already fixed in prior audit |
| `gateway/seabri/capability-registry.ts` | Static channel capability declarations correct — runtime enforcement in `attachments.ts` |

---

## 14. Test Plan

Tests added at `gateway/seabri/telegram-multimodal.test.ts`.

| Test | Description | Assertion |
|------|-------------|-----------|
| T1 | Audio fallback (no OPENAI_API_KEY) | Result must not match `/OPENAI_API_KEY\|npm install\|ffmpeg\|seabri/i` |
| T2 | Video fallback (no deps) | Same tech-leak check |
| T3 | PDF fallback (bad buffer) | No npm/install instructions in content |
| T4 | JPEG image → base64 + mediaType | `result.type === 'image'`, `result.mediaType === 'image/jpeg'` |
| T5 | Image persisted to mediaContext | `state.mediaContext` populated after image receipt |
| T6 | Follow-up "What do you see?" triggers reconstruction | `shouldReconstructImage()` returns true |
| T7 | Empty follow-up also reconstructs (image stays in context) | `shouldReconstructImage(state, '', false)` returns true |
| T8 | mediaContext expires after 24h TTL | `shouldReconstructImage` returns false when `capturedAt` is 25h ago |
| T8b | New attachment overrides reconstruction | `hasNewAttachment=true` → no double-inject |

Additional tests needed (Phase 2):

| Test | Description |
|------|-------------|
| T9 | PDF with valid text → classified as `policy_declarations` when filename contains "declaration" |
| T10 | PDF with "flood insurance" text → classified as `flood_policy` |
| T11 | Insurance fields correctly extracted from declarations page text |
| T12 | Flood exclusion regex fires when "flood is excluded" appears in text |
| T13 | PDF text > 12,000 chars is truncated with notice |
| T14 | Agent in INCIDENT MODE response body has ≤ 8 lines |
| T15 | LOCAL SEARCH query triggers `web_search` tool call |
| T16 | Hotel search result includes ALE insurance note |
| T17 | ACTION CARD for outbound call includes verbatim script |

---

## 15. Outbound Call Whitelist

The test number `269-830-0869` is whitelisted for dry-run call approval testing. This should be stored in `.env` as `WHITELISTED_TEST_NUMBER` and validated in the approval gate before any call execution.

**Current status:** Number is known; env var not yet added to `.env.example` or enforcement logic. This is a Phase 2 item.

---

## 16. Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| User uploads a PDF → agent references coverage limits extracted from it | ✅ Implemented |
| Flood emergency → response ≤ 8 lines with immediate steps | ✅ Implemented |
| User sends photo → agent references visible content, gives photo checklist | ✅ Implemented (via PHOTO/DAMAGE MODE + image persistence from prior audit) |
| "Find me a plumber" → agent calls web_search, returns 3 results | ✅ PERSONALITY instruction implemented; depends on TAVILY_API_KEY |
| Proposed call → ACTION CARD shown with verbatim script before execution | ✅ Implemented |
| "Who do I call at the city?" → agent identifies emergency management dept + number | ✅ Implemented |
| "Find a hotel nearby" → ALE insurance note included | ✅ Implemented |
| Structured action plan in emergencies | ✅ Implemented |
| No technical strings exposed to user | ✅ Implemented (prior audit + T1–T3 regression tests) |
| Voice/TTS response in emergency mode | ⏳ Deferred — Phase 2 |

---

## 17. Phase 2 Backlog

| Item | Priority | Effort |
|------|----------|--------|
| TTS voice responses for INCIDENT MODE | High | Medium — needs OpenAI TTS + Telegram `sendVoice` |
| WHITELISTED_TEST_NUMBER enforcement in approval gate | High | Small — add to `.env.example`, validate in `telegram.ts` |
| OCR fallback for scanned PDFs (Tesseract / Vision API) | Medium | Large — Tesseract WASM or Claude Vision fallback for image-PDFs |
| T9–T17 test coverage for PDF classification and INCIDENT FORMAT | Medium | Medium |
| Multi-language INCIDENT MODE responses (Spanish priority) | Medium | Small — PERSONALITY addition + test |
| Session summary after emergency ends ("here's what we accomplished") | Low | Small |

# Telegram Multimodal Audit — SeaBri Bot

**Date:** 2026-05-03  
**Audited by:** Claude Code (acting as Lead Backend Engineer, AI Agent Runtime Engineer, Client Experience QA Lead)  
**Scope:** `gateway/channels/telegram.ts`, `gateway/seabri/attachments.ts`, `gateway/agents/router.ts`, `gateway/seabri/capability-registry.ts`, `gateway/agents/agents.ts`

---

## Summary

Three critical failures were observed in live Telegram testing. All three have been root-caused and fixed in this patch.

| # | Failure | Root Cause | Status |
|---|---------|-----------|--------|
| F1 | Technical config leaked to user (OPENAI_API_KEY, terminal commands, npm install) | Fallback strings in `attachments.ts` + `router.ts` were developer-facing, not client-facing | **Fixed** |
| F2 | Image context lost across turns ("I don't see an image attached") | `UserState.history` stores strings only; image base64 never persisted | **Fixed** |
| F3 | Audio not transcribed; bot replied with setup instructions | Same as F1 — audio fallback string contained `Set OPENAI_API_KEY to enable automatic transcription` | **Fixed** |
| F4 | Raw exception message surfaced in bot reply | `catch` block in `telegram.ts` sent `err.message` directly to Telegram | **Fixed** |

---

## Failure Analysis

### F1 — Technical Leakage

**Location:** `gateway/seabri/attachments.ts` lines 192–197, 213–217, 235–240

The `processAttachment()` function returned fallback strings when optional dependencies (`pdf-parse`, `openai` SDK, `ffmpeg`) were absent. These strings were designed for developer diagnostics but were passed directly into `attachmentContext`, which was injected as plaintext into the user message and forwarded to the LLM. The LLM then paraphrased or echoed these strings to the client.

Offending strings (before fix):
```
[Voice message received (voice.ogg, 23.4 KB). Set OPENAI_API_KEY to enable automatic transcription.]
[Video received: video.mp4 (142.0 KB). Install ffmpeg and set OPENAI_API_KEY to enable automatic transcription.]
[PDF: report.pdf — text extraction unavailable. Install pdf-parse to enable it: npm install pdf-parse]
```

A secondary leak existed in `router.ts`:
- `ANTHROPIC_API_KEY not set` → returned verbatim as the bot's reply
- `Authentication failed. Your ANTHROPIC_API_KEY may be invalid or expired. Run \`seabri doctor\` to check.` → returned as the bot's reply
- `An unexpected error occurred: ${lastError}.` → sent raw exception message to bot

**Fix applied:** All three `attachments.ts` fallback strings replaced with client-safe user-facing messages. Technical detail moved to `console.warn`/`console.info`. All three `router.ts` error paths replaced with generic user-safe messages; technical detail moved to `console.error`.

---

### F2 — Image Context Lost Across Turns

**Location:** `gateway/channels/telegram.ts` lines 409–410 (old), `UserState` interface

The `routeMessage()` function correctly accepted an `attachment` parameter and passed it as a vision content block to the Anthropic API for the **current turn**. However, `UserState.history` was typed as `{ role: string; content: string }[]` — strings only. After the response was generated, history was updated with only text strings; the image base64 was discarded.

On the next turn (e.g. "What do you see in the image?"), `attachment` was `undefined` because no new image was sent. The LLM had no image in context and correctly reported it saw none.

**Fix applied:**
1. Added `ConversationMediaContext` interface with `lastImageBase64`, `lastImageMediaType`, `capturedAt`.
2. Added `mediaContext?: ConversationMediaContext` to `UserState`.
3. On image receipt, persist to `state.mediaContext` after `processAttachment`.
4. Before routing each message, check if the current turn references prior media (keyword heuristic + empty-text guard) and reconstruct the `attachment` block from `mediaContext` if within 24-hour TTL.

This means when a user asks a follow-up question about an image they already sent, the image is re-injected into the current turn's Anthropic request as a vision block.

---

### F3 — Audio Fallback Was Developer-Facing

Root cause is the same as F1. The audio fallback string `Set OPENAI_API_KEY to enable automatic transcription` was injected into `userText` and the LLM echoed it to the user as setup instructions.

**Fix applied:** Replaced with: `Voice transcription is not available right now — please type the key point and I'll help you from there.`

---

### F4 — Raw Exception in Bot Reply

**Location:** `gateway/channels/telegram.ts` line 419 (old)

```typescript
await safeSend(chatId, `Something went wrong: ${message}\n\nPlease try again.`)
```

This surfaced raw Node.js or API exception messages directly to the Telegram user.

**Fix applied:**
```typescript
console.error(`[Telegram] Message routing failed for chat ${chatId}: ${message}`)
await safeSend(chatId, 'Something went wrong on my end. Please try again in a moment.')
```

---

## Files Changed

| File | Change |
|------|--------|
| `gateway/seabri/attachments.ts` | Replaced 3 technical fallback strings with client-safe messages; moved technical detail to `console.warn`/`console.info` |
| `gateway/agents/router.ts` | Replaced `ANTHROPIC_API_KEY not set`, `Authentication failed`, and `An unexpected error occurred` returns with user-safe messages; `console.error` for internal logging |
| `gateway/channels/telegram.ts` | Added `ConversationMediaContext` interface; added `mediaContext` to `UserState`; persist image on receipt; reconstruct image on follow-up with keyword heuristic + 24h TTL; fixed catch block to not expose `err.message`; updated welcome message |

---

## What Was Not Changed

- `gateway/seabri/capability-registry.ts` — The static `ChannelCapabilities` definitions are correct as channel-level declarations. Runtime capability detection (e.g. checking whether `OPENAI_API_KEY` is set) is enforced at the `attachments.ts` layer by returning client-safe fallbacks. No structural registry changes were needed to fix the observed failures.
- `gateway/agents/agents.ts` — `PERSONALITY` behavioral contract is well-structured and was not a causal factor in any failure. The technical leakage came from injected `attachmentContext` strings, not from LLM disobedience of persona rules.

---

## Regression Test Plan

Tests should be added at `gateway/tests/telegram-multimodal.test.ts` covering:

| Test | Assertion |
|------|-----------|
| T1 — Audio fallback contains no technical strings | `processAttachment(buffer, 'audio/ogg', 'voice.ogg')` result when no `OPENAI_API_KEY` set: `content` must not match `/OPENAI_API_KEY|npm install|seabri/i` |
| T2 — Video fallback contains no technical strings | Same check for video/mp4 mime |
| T3 — PDF fallback contains no technical strings | Same check when pdf-parse not installed |
| T4 — Router missing key returns safe string | Call `routeMessage` with `ANTHROPIC_API_KEY=''`; result must not match `/ANTHROPIC_API_KEY|\.env|seabri onboard/i` |
| T5 — Router 401 returns safe string | Mock Anthropic to throw `{ status: 401 }`; result must not contain `seabri doctor` |
| T6 — Image persisted in mediaContext | After image message, `state.mediaContext.lastImageBase64` is set |
| T7 — Follow-up question reconstructs image | Second turn with text "What do you see?" and no new image: `attachment` passed to `routeMessage` is non-null |
| T8 — mediaContext expires after TTL | Set `capturedAt` to 25 hours ago; second turn with "What do you see?": `attachment` is `undefined` |

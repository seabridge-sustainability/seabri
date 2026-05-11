# Multimodal Channel Review

**Date:** 2026-05-03  
**Purpose:** Assess each channel's multimodal capability, gaps, and upgrade path.

---

## Telegram (Live — Full Multimodal)

**Status:** Production-ready  
**Attachment types handled:**
- Photo (`msg.photo[]`) → largest size selected → `processAttachment()` → image ContentBlock
- Document (`msg.document`) → mime_type-routed → PDF, image, or binary fallback
- Voice (`msg.voice`) → Whisper (if OPENAI_API_KEY) or `audio_fallback` text
- Audio (`msg.audio`) → same as voice
- Video (`msg.video`) → ffmpeg extract → Whisper or fallback
- VideoNote (`msg.video_note`) → same as video
- Location → not yet handled (future: geocode → property risk lookup)

**Download flow:**
```
bot.getFile(fileId) → file_path → fetch(api.telegram.org/file/bot{TOKEN}/{path}) → Buffer
```

**Gaps:**
- Location messages not yet routed to property risk agent
- Video notes > 30 MB may timeout (30s AbortSignal)
- No progress indicator for large file processing

---

## WhatsApp (Partial — Webhook Wired, No Media Download)

**Status:** Partial — webhook receives messages but media not downloaded  
**What works:**
- Text messages via webhook POST
- Read receipts (Twilio webhooks send `MessageStatus`)
- Outbound text via Twilio WhatsApp API

**What's missing:**
```
MediaUrl0, MediaContentType0 → need to fetch + pass to processAttachment()
```

**Fix (Sprint 2):**
```typescript
// channels/whatsapp.ts — in message handler
if (req.body.NumMedia && parseInt(req.body.NumMedia) > 0) {
  const mediaUrl = req.body.MediaUrl0
  const mimeType = req.body.MediaContentType0 ?? 'application/octet-stream'
  const resp = await fetch(mediaUrl, {
    headers: { Authorization: `Basic ${btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`)}` }
  })
  const buffer = Buffer.from(await resp.arrayBuffer())
  const result = await processAttachment(buffer, mimeType, 'whatsapp_media')
  // ... inject into conversation
}
```

**Note:** Twilio WhatsApp media URLs require Basic auth with SID:TOKEN.

---

## SMS / Twilio (Live — Text Only)

**Status:** Text only by design  
**Limitation:** MMS media (images) are technically possible via Twilio but:
1. Twilio MMS media requires explicit download + auth (same as WhatsApp)
2. SMS character limits make rich responses problematic
3. Use case: brief text notifications only

**Gap:** No MMS support. Low priority — SMS is text-notification channel.

**Recommendation:** Keep SMS text-only. For media needs, route user to Telegram.

---

## Discord (Scaffold — Text Only)

**Status:** Scaffold — `on('messageCreate')` wired but no media handling  
**Discord attachment API:**
```typescript
// Discord.js attachments
message.attachments.forEach(attachment => {
  // attachment.url — direct CDN URL
  // attachment.contentType — MIME type
  // attachment.name — filename
  const resp = await fetch(attachment.url)  // no auth needed for CDN URLs
})
```

**Upgrade path (Sprint 3):**
1. Add attachment iteration in Discord message handler
2. Fetch from CDN URL (no auth)
3. Pass to `processAttachment()`
4. Discord attachments up to 25 MB (nitro: 500 MB)

---

## Slack (Scaffold — Text Only)

**Status:** Scaffold — basic event listener; no media handling  
**Slack file API:**
```typescript
// Slack files.info → download URL requires OAuth token
const fileInfo = await slack.files.info({ file: event.files[0].id })
const resp = await fetch(fileInfo.file.url_private, {
  headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` }
})
```

**Upgrade path (Sprint 3):**
1. Handle `file_share` event subtype
2. Fetch private URL with `SLACK_BOT_TOKEN` auth
3. Pass to `processAttachment()`

---

## CLI (Live — Text Only)

**Status:** Live; text-only by design  
**Gap:** No file path ingestion (e.g., `attach /path/to/photo.jpg`)  
**Upgrade (Sprint 2, optional):**
- Parse `attach <path>` command prefix
- `fs.readFile(path)` → `processAttachment(buffer, mime.lookup(path))`

---

## Attachment Processing Shared Pipeline

All channels should funnel media through the same `processAttachment()`:

```
Buffer + mimeType + fileName
    │
    ▼ gateway/seabri/attachments.ts
    ├── image/* → Sharp → base64 → image ContentBlock
    ├── audio/* → Whisper (OPENAI_API_KEY) or audio_fallback
    ├── video/* → ffmpeg extract audio → Whisper or fallback
    ├── application/pdf → pdf-parse → pdf_text
    └── unknown → binary_fallback (size + type description)
```

**Blob store:** All attachments persisted via `putBlob(buffer, { mimeType, filename, tags })` for retrieval via `GET /attachments/:id`.

---

## Multimodal Capability Summary

| Channel | Text | Image | Audio | Video | PDF | Location | Sprint to Full |
|---------|------|-------|-------|-------|-----|----------|---------------|
| Telegram | ✅ | ✅ | ✅ | ✅ | ✅ | 🔧 | Sprint 2 (location) |
| WhatsApp | ✅ | 🔧 | 🔧 | 🔧 | 🔧 | ✅ | Sprint 2 |
| SMS | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | N/A |
| Discord | ✅ | 🔧 | 🔧 | 🔧 | 🔧 | ❌ | Sprint 3 |
| Slack | ✅ | 🔧 | 🔧 | 🔧 | 🔧 | ❌ | Sprint 3 |
| CLI | ✅ | 🔧 | ❌ | ❌ | 🔧 | ❌ | Sprint 2 (optional) |

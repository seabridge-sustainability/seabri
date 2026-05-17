# OPENSEABRI_CHANNEL_INTEGRATION_AUDIT.md
**Date**: 2026-05-17  
**Branch**: overnight-openseabri-audit

---

## Channel Inventory

| Channel | Status | Webhook Sig Validation | Rate Limit | Pairing Gate | Policy Gate | Approval Intercept |
|---------|--------|----------------------|------------|--------------|-------------|-------------------|
| **Telegram** | 🟡 Polling mode (prod-ready for pilot) | N/A (polling, not webhook) | IP-level only | ✅ | ✅ | ✅ |
| **WhatsApp** (Cloud API) | 🟡 Pilot-gated | ✅ HMAC-SHA256 `timingSafeEqual` | IP-level only | ✅ | ✅ | ✅ |
| **SMS** (Twilio) | 🟡 Pilot-gated | ✅ HMAC-SHA1 `timingSafeEqual` | IP-level only | ✅ | ✅ | ✅ |
| **Email** (SendGrid Inbound) | 🔴 Scaffold only | ⚠️ Token gate added (this audit) | ✅ 1MB body limit (this audit) | ❌ Not yet | ❌ Not yet | ❌ Not yet |
| **CLI** | ✅ Dev/local | N/A (local process) | N/A | N/A | ✅ | ✅ |
| **Web UI** | ✅ Local dev | N/A (WS token auth) | IP-level | N/A | ✅ | ✅ |
| **Discord** | 🔴 Scaffold/stub | ❓ Unknown — not audited in detail | ❓ | ❓ | ❓ | ❓ |
| **Slack** | 🔴 Scaffold/stub | ❓ Unknown — not audited in detail | ❓ | ❓ | ❓ | ❓ |
| **Voice** (Twilio/fallback) | 🔴 Scaffold | ❓ | ❓ | ❓ | ❓ | ❓ |

---

## Telegram

**Mode**: Polling (getUpdates loop), not webhook  
**Security posture**: Strong
- Pairing gate enforced: new senders get pairing code, admin must approve with `seabri pairing approve <id> <code>`
- Policy allow/deny per sender and channel configured via policy.json
- Approval intercept: "Confirm? Reply YES" sentinel + 6-digit double-confirm for emergency actions
- Attachment handling: image/audio/video/document supported; base64 stored in session media context (24hr TTL)

**Gaps**:
- No per-sender message rate limiting (same as all channels)
- Attachment filenames not path-sanitized before storage (SEC-007)
- If future webhook mode added, Telegram `X-Telegram-Bot-Api-Secret-Token` header validation must be implemented

---

## WhatsApp (Cloud API)

**Mode**: Webhook (Meta webhook, GET challenge + POST events)  
**Security posture**: Strong
- Webhook verification: `X-Hub-Signature-256` validated with HMAC-SHA256 + `timingSafeEqual`
- Meta hub challenge handled on GET `/webhooks/whatsapp`
- 256KB max body size
- Media download: Cloud API URLs with 10-30s timeout, not fetched from arbitrary user-provided URLs

**Gaps**:
- Slow-loris risk on 10-30s media download timeout (SEC-005 adjacent)
- No per-sender rate limiting on message ingest

---

## SMS (Twilio)

**Mode**: Webhook (Twilio POST to `/webhooks/sms`)  
**Security posture**: Strong
- Webhook signature: HMAC-SHA1 over URL + POST params with `timingSafeEqual`
- Trusted media hostname whitelist for MMS: `api.twilio.com`, `media.twiliocdn.com`, `mcs.us*.twilio.com`, `mcs.eu1.twilio.com`
- Basic auth on media download using `TWILIO_ACCOUNT_SID:TWILIO_AUTH_TOKEN`
- Phone number normalization (`digitsOnly()`) prevents injection

**Gaps**:
- `isTrustedMediaUrl` allows all `*.twilio.com` and `*.twiliocdn.com` subdomains — acceptable since Twilio controls these
- No per-sender rate limiting

---

## Email (SendGrid Inbound)

**Mode**: Webhook scaffold (pilot not yet launched)  
**Pre-audit state**: No body size limit, no origin validation  
**Post-audit state**:
- 1MB body size limit (413 on overflow)
- `OPENSEABRI_EMAIL_WEBHOOK_SECRET` token gate: if env var set, `/webhooks/email?token=<secret>` is required; requests without matching token get 403

**Remaining gaps (pre-launch)**:
- No pairing gate (email addresses as sender identity not yet modeled)
- No approval intercept wired
- No agent routing for real emails — returns `gated` until `OPENSEABRI_LIVE_PROVIDER_APPROVED=true`
- SendGrid Inbound Parse lacks native request signing — token-in-URL approach means secret appears in logs; need log scrubbing in production

**Before email pilot launch checklist**:
- [ ] Set `OPENSEABRI_EMAIL_WEBHOOK_SECRET` in production environment
- [ ] Configure SendGrid webhook URL with `?token=<secret>`
- [ ] Enable log scrubbing for webhook URL
- [ ] Wire pairing gate and approval intercept
- [ ] Set `OPENSEABRI_EMAIL_ENABLED=true` and `OPENSEABRI_LIVE_PROVIDER_APPROVED=true`

---

## Discord

**Status**: `gateway/channels/discord.ts` exists but was not deeply audited.  
**Required before enabling**:
- Verify `X-Signature-Ed25519` + `X-Signature-Timestamp` Discord interaction validation
- Implement pairing gate
- Implement approval intercept

---

## Slack

**Status**: `gateway/channels/slack.ts` exists but was not deeply audited.  
**Required before enabling**:
- Verify `X-Slack-Request-Timestamp` + `X-Slack-Signature` HMAC-SHA256 validation
- Implement 5-minute timestamp replay prevention
- Implement pairing gate and approval intercept

---

## Cross-Channel Shared Commands

All channels support the same slash commands via `gateway/channels/shared_commands.ts`:
- `/switch <agent-id>`, `/persona`, `/new`, `/reset`, `/compact`
- `/status`, `/agents`, `/skills`, `/memory`, `/think`

**Tests**: `gateway/channels/shared_commands.test.ts` — covered in the 1475 passing tests.

---

## Channel Enablement Gates

All live channels require explicit opt-in:
- `OPENSEABRI_CHANNELS_ENABLED=true` (master gate)
- Per-channel: `OPENSEABRI_EMAIL_ENABLED`, `TELEGRAM_BOT_TOKEN` set, `TWILIO_ACCOUNT_SID` set, etc.
- `OPENSEABRI_LIVE_PROVIDER_APPROVED=true` for outbound actions

This multi-gate approach is appropriate for a public pilot.

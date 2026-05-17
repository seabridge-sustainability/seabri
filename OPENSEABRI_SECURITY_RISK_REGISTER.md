# OPENSEABRI_SECURITY_RISK_REGISTER.md
**Date**: 2026-05-17  
**Branch**: overnight-openseabri-audit  
**Scope**: Full gateway, channel, auth, policy, tool, and persistence layer

---

## Risk Severity Definitions

| Severity | Description |
|----------|-------------|
| CRITICAL | Exploitable without auth, data breach or system compromise possible |
| HIGH | Exploitable with moderate effort, significant impact |
| MEDIUM | Requires specific conditions; notable impact |
| LOW | Minor exposure or hardening gap |

---

## Fixed in This Audit

| ID | Severity | Component | Description | Fix |
|----|----------|-----------|-------------|-----|
| SEC-001 | HIGH | `gateway/channels/email.ts` | No body size limit on email webhook — attacker could POST arbitrarily large body to exhaust gateway memory | Added 1MB limit with 413 response |
| SEC-002 | MEDIUM | `gateway/security/hmac.ts` | HMAC replay window 5 min — wider than necessary | Narrowed to 2 min |
| SEC-003 | HIGH | `gateway/channels/email.ts` | No webhook origin validation — any source could POST to `/webhooks/email` and trigger agent routing logic | Added `OPENSEABRI_EMAIL_WEBHOOK_SECRET` token gate (opt-in via env var) |
| BUG-001 | HIGH | `skills/*/SKILL.md` (all 28) | UTF-8 BOM added to all skill files breaks `parseFrontmatter` regex, causing 0 skills to load, 7 tests to fail, and empty registry API responses | Restored from HEAD; root cause is editor (VSCode/Notepad++) BOM auto-insertion |
| SEC-004 | HIGH | `gateway/agents/router.ts` | Prompt injection: user messages passed to Claude API without instruction-override protection | Added `INJECTION_GUARD` constant appended to all system prompts in `router.ts` |
| SEC-005 | HIGH | `gateway/agents/tools.ts` | Tool injection: tool inputs had no length limits — long strings sent to paid external APIs | Added 500-char cap on `web_search`, 300-char cap on `geocode_address` |
| SEC-006 | HIGH | `gateway/agents/router.ts` | No per-sender tool rate limiting — single sender could exhaust paid API quotas | Added 20-tool-calls/hour per `senderId` rate limiter in `router.ts` |
| SEC-007 | MEDIUM | `gateway/channels/telegram.ts` | Telegram document `file_name` used as filename without path sanitization — path traversal risk | Applied `path.basename()` to `msg.document.file_name` before use |
| SEC-008 | MEDIUM | `gateway/seabri/approval.ts` | Consent log entries unsigned — forgeability without detection | Added HMAC-SHA256 `sig` field per log entry using `OPENSEABRI_CONSENT_LOG_SECRET` |
| SEC-009 | MEDIUM | `gateway/seabri/approval.ts` | Emergency confirmation code was 6 digits (1M values) — low entropy, brute-forceable | Increased to 8 digits (100M values); updated `isConfirmCode` regex and tests |
| SEC-011 | MEDIUM | `gateway/security/policy.ts` | No structured audit log of `isAllowed` decisions | Added `policyLog.info('policy_decision', ...)` on every ALLOW/DENY in `isAllowed` |
| SEC-012 | MEDIUM | `.env.example` | `OPENSEABRI_EMAIL_WEBHOOK_SECRET` missing from example file; URL-based secret log-leak undocumented | Added variable with WARNING comment about log scrubbing |
| SEC-013 | LOW | `gateway/security/policy.ts` | `hasDangerousKey` recursion depth capped at 5 — deep `__proto__` nesting bypasses check | Increased `MAX_DEPTH` check from `> 5` to `> 20` |
| SEC-014 | LOW | `.env.example` | Hardcoded test phone number `2698300869` in example | Replaced with `<your-test-phone-number>` placeholder |
| SEC-015 | LOW | `gateway/index.ts` | No warning when `OPENSEABRI_CORS_ORIGIN` is set to localhost in non-development environments | Added `log.warn` on startup when CORS origin contains localhost/127.0.0.1 outside development |
| SEC-016 | LOW | `gateway/index.ts` | No fail-fast for missing `ANTHROPIC_API_KEY` — gateway started without AI backend silently | Added early `process.exit(1)` check for `ANTHROPIC_API_KEY` before other startup steps |

---

## Open Risks — Action Required Before Production

| ID | Severity | Component | Description | Recommendation |
|----|----------|-----------|-------------|----------------|
| SEC-010 | MEDIUM | `db/schema.ts` | JSONB fields `workflows.triggerConfig` and `messages.toolInput` may contain PII but are not encrypted at rest | Add column-level encryption for these fields in PostgreSQL (pgcrypto) — infrastructure change, out of scope for code-only audit |

---

## Security Architecture Strengths (No Action Needed)

| Component | Strength |
|-----------|----------|
| All secrets | Environment variables only; no hardcoded keys found |
| `gateway/security/pairing.ts` | Pairing codes expire in 10 min, 5-attempt limit |
| `gateway/channels/sms.ts` | Twilio webhook HMAC-SHA1 with `timingSafeEqual` |
| `gateway/channels/whatsapp.ts` | Meta webhook HMAC-SHA256 with `timingSafeEqual` |
| `gateway/index.ts` | API key validation with `timingSafeEqual` |
| `gateway/index.ts` | Per-IP rate limiting (60-second window) |
| `gateway/security/policy.ts` | Recursive prototype pollution detection |
| `db/schema.ts` | Drizzle ORM parameterized queries (no SQL injection) |
| `gateway/` | No `eval()`, `Function()`, `exec()`, or shell spawns with user input |
| `gateway/channels/sms.ts` | Phone number normalization via `digitsOnly()` |
| `gateway/channels/sms.ts` | Trusted media hostname whitelist for MMS downloads |
| `gateway/seabri/api-handler.ts` | 1MB body size limit on REST API |
| Password storage | scrypt with cost=16384, blockSize=8, parallelization=1, keylen=64 |
| JWT auth | 7-day expiry, HS256 |

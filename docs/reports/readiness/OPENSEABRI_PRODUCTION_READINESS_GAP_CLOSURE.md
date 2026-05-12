# OpenSeaBri Production Readiness Gap Closure

Date: 2026-05-11

## Verdict

**PRODUCTION DEPLOYMENT CANDIDATE WITH LIVE-PROVIDER GATES**

OpenSeaBri now fails closed for production startup configuration, keeps live provider channels disabled unless explicitly allowlisted, and includes production database adapter scaffolding for profiles, telemetry, and provider-validation evidence. Live Telegram, WhatsApp, SMS, voice, paid LLM, vision, and web/local-search provider execution remains gated until separate provider approval and evidence are recorded.

## What Was Missing

| Gap | Risk |
|---|---|
| No central production startup validator | Production could start with missing API, WebSocket, CORS, rate-limit, or persistence config |
| Channel allowlist accepted unknown names | Operator typo could create unclear live-channel behavior |
| Credentials existed in `.env` | Provider SDKs must never start from credentials alone |
| Production persistence was not enforced | File/browser/in-memory fallback is not multi-user production safe |
| Provider readiness lacked validation timestamps and live-approval state | Operators could not tell configured/test-ready/live-approved/validated apart |
| No production validation command | Release checks were split across staging/test scripts |

## What Was Fixed

| Area | Runtime change |
|---|---|
| Startup validation | `gateway/startup/production-config.ts` validates mode, required production secrets/config, persistence, canvas token, channel names, and live-provider gates |
| Gateway startup | `gateway/index.ts` logs startup mode and fails fast in production when validation fails |
| Channel safety | `gateway/channels/enablement.ts` defines supported channels, supports explicit `all`, and rejects unknown channel names |
| Provider readiness | `gateway/seabri/provider-readiness.ts` now reports `testModeReady`, `liveModeApproved`, `liveModeBlocked`, `dryRunValidationStatus`, and `lastValidatedAt`; it also covers local resource search and vision providers |
| Production commands | Added `npm run check:production`, `npm run validate:production`, `npm run check:secrets`, and `npm run secret-scan` |
| Production persistence | Added Drizzle/Postgres tables and database-backed stores for profiles, sessions/messages, telemetry events, and provider-validation evidence |
| Provider validation evidence | Added sanitized evidence recording/listing and readiness integration |
| Staging mode clarity | `.env.staging.example` now sets `OPENSEABRI_MODE=staging` so staging can use gated fallback storage while `NODE_ENV=production` keeps production-like auth behavior |

## Production Startup Requirements

Production mode is selected by `OPENSEABRI_MODE=production`, `OPENSEABRI_DEPLOYMENT_MODE=production`, or `NODE_ENV=production` when no explicit OpenSeaBri mode is set.

Required in production:

- `OPENSEABRI_API_KEY`
- `SEABRI_WS_TOKEN`
- `OPENSEABRI_CORS_ORIGIN`
- `OPENSEABRI_RATE_LIMIT`
- `OPENSEABRI_PERSISTENCE_ADAPTER=database`
- `SEABRI_DATABASE_URL` or `DATABASE_URL`
- `OPENSEABRI_CANVAS_WS_TOKEN` when `OPENSEABRI_CANVAS_WS_PORT` is set

Live channel startup in production additionally requires:

- `OPENSEABRI_CHANNELS_ENABLED=<channel list>`
- required provider credentials for each channel
- `OPENSEABRI_LIVE_PROVIDER_APPROVED=true`
- action-level approval gates for outbound SMS/calls
- test-mode allowlists unless live provider validation explicitly approves otherwise

## Production Persistence Decision

OpenSeaBri now ships database-backed production store scaffolding using the existing Drizzle/Postgres layer:

- `user_profiles` stores profile continuity data.
- existing `sessions` and `messages` tables store conversation sessions when the database adapter is selected.
- `telemetry_events` stores redacted telemetry events.
- `provider_validation_evidence` stores sanitized provider validation evidence.

Production now **fails closed** unless `OPENSEABRI_PERSISTENCE_ADAPTER=database` is selected and `SEABRI_DATABASE_URL` or `DATABASE_URL` is configured. Staging/dev can still use file and in-memory fallback for pilots. That fallback is not considered multi-user production-safe.

## Live-Channel Safety Model

Credentials alone do not start channels.

Allowed channel ids:

- `telegram`
- `whatsapp`
- `sms`
- `voice`
- `discord`
- `slack`
- `cli`
- `all` only when used alone

Unknown ids fail validation. Production blocks live channels unless the live-provider gate is approved. Outbound messaging/calling still goes through approval and test-number allowlist checks.

## Provider Readiness States

The readiness API distinguishes:

- configured
- enabled
- test-mode ready
- live-mode blocked
- live-mode approved
- validated
- last validated timestamp
- last evidence status
- evidence age and expiry
- remaining validation required

Covered providers:

- Telegram
- WhatsApp
- Twilio SMS
- Twilio Voice
- LLM provider
- MCP external tools
- storage/database
- local resource search
- vision

## Validation Commands

New:

```powershell
npm run check:production
npm run validate:production
npm run check:secrets
npm run secret-scan
```

Existing validation remains:

```powershell
npm run typecheck
npm test -- --run
npm run test:node
npx playwright test
npm run build
npm audit --audit-level=moderate
npm run validate:staging
npm run smoke:staging
npm run smoke:pilot
npm run smoke:demos
```

## Remaining Gates

| Priority | Gate | Status |
|---|---|---|
| Critical | Live provider validation execution | Still gated; no live messages/calls made |
| High | Managed production hosting target | Provider selection still external |
| Medium | Secret-manager wiring execution | Checklist exists; actual hosted secret-store wiring remains external |
| Low | Bundle optimization | Existing chunks acceptable for pilot; future route-level splitting possible |

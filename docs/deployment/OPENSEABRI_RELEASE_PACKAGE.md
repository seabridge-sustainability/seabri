# OpenSeaBri Release Package

Status: deployment-ready release package with GoDaddy DNS / Docker-host actions remaining and live-provider gates closed.

## 1. Release Summary

OpenSeaBri is ready for managed deployment packaging as a production deployment candidate. Core runtime blockers are closed: production startup fails closed, live channels are allowlisted, provider readiness/evidence surfaces are secret-safe, and Postgres-backed persistence scaffolding exists for profiles, sessions, telemetry, and provider evidence.

Selected target shape: GoDaddy DNS for domain management plus a Docker-capable host/container platform, managed PostgreSQL, provider secret manager, TLS reverse proxy with WebSocket support, and centralized logs.

## 2. Current Verdict

**PRODUCTION READY - EXTERNAL DEPLOYMENT ACTIONS REQUIRED**

No live Telegram, WhatsApp, SMS, voice, paid LLM, vision, or live local-search provider should be enabled until provider-specific validation is approved and evidence is recorded.

## 3. Changed Files Summary

Key release changes:

- Production startup and channel gates: `gateway/index.ts`, `gateway/startup/*`, `gateway/channels/*`
- Persistence: `db/schema.ts`, `db/migrations/*`, `gateway/persistence/*`, `gateway/sessions/store.ts`, `gateway/seabri/user-profile.ts`, `gateway/telemetry/store.ts`
- Provider evidence: `gateway/seabri/provider-validation-evidence.ts`, `gateway/seabri/provider-readiness.ts`, `gateway/seabri/api-handler.ts`
- Release checks: `scripts/check-production.ts`, `scripts/check-secrets.ts`, `scripts/check-db.ts`, `scripts/db-migration-check.ts`, `scripts/deployment-preflight.ts`, `scripts/check-operational-readiness.ts`, `scripts/operational-smoke.ts`, `scripts/validate-production.ts`, `scripts/release-check.ts`
- Deployment docs: `docs/deployment/*`, `docs/security/*`, `docs/operations/*`, `docs/testing/*`

## 4. Required Environment Variables

```text
OPENSEABRI_MODE=production
OPENSEABRI_API_KEY=<secret>
SEABRI_WS_TOKEN=<secret>
OPENSEABRI_CORS_ORIGIN=https://<frontend-origin>
OPENSEABRI_RATE_LIMIT=120
OPENSEABRI_PERSISTENCE_ADAPTER=database
SEABRI_DATABASE_URL=<managed-postgres-url>
DATABASE_URL=<optional-managed-postgres-url-alias>
OPENSEABRI_TELEMETRY_STORE=database
OPENSEABRI_CHANNELS_ENABLED=
OPENSEABRI_LIVE_PROVIDER_APPROVED=false
```

Canvas if exposed in production:

```text
OPENSEABRI_CANVAS_WS_PORT=18791
OPENSEABRI_CANVAS_WS_TOKEN=<secret>
```

## 5. Required Managed Services

- Node 20+ gateway host with WebSocket support.
- Static frontend host or same host serving the Vite build.
- Managed PostgreSQL.
- Secret manager.
- Centralized logs with retention and redaction.

## 6. Database Migration Instructions

1. Confirm target database.
2. Take managed DB snapshot.
3. Set `SEABRI_DATABASE_URL` in the deployment shell.
4. Run:

```powershell
npm run db:migration-check
npm run db:migrate
$env:OPENSEABRI_DB_CONNECT_CHECK = "true"
npm run db:migration-check
```

Required tables: `user_profiles`, `telemetry_events`, `provider_validation_evidence`, `sessions`, `messages`.

## 7. Secret-Manager Setup Checklist

- Store all secrets in the hosting secret manager.
- Do not commit production `.env`.
- Rotate initial production secrets after first successful dry run.
- Run:

```powershell
npm run check:production
npm run check:secrets
npm run deployment:preflight
npm run check:operational-readiness
npm run secret-scan
```

## 8. Hosting Configuration Checklist

- Gateway startup command: `npm run gateway`
- Build command: `npm ci && npm run build`
- Docker Compose option: `docker compose -f docker-compose.production.yml up -d --build`
- Health check: `GET /health`
- WebSocket routing enabled.
- CORS locked to production frontend origin.
- Rate limit configured.
- Live channels disabled by default.
- Database migration complete before traffic.

## 9. Live-Provider Gate Checklist

- `OPENSEABRI_CHANNELS_ENABLED` remains empty until provider approval.
- `OPENSEABRI_LIVE_PROVIDER_APPROVED=false` until live validation approval.
- Test contact allowlists remain active.
- Outbound actions require user approval.
- Provider validation evidence is recorded before any provider opens.

## 10. Monitoring/Logging Checklist

Capture startup validation, provider readiness, provider evidence writes, action approvals/blocks, provider failures, DB failures, auth failures, and rate-limit spikes. Do not capture raw secrets, raw phone numbers, raw addresses, full insurance documents, or raw profile payloads.

## 11. Smoke Test Sequence

Safe local/CI release check:

```powershell
npm run release:check
npm run check:operational-readiness
```

Deployment smoke after host is live:

```powershell
$env:OPENSEABRI_BASE_URL="https://api.<domain>"
$env:OPENSEABRI_API_KEY="<from-secret-manager>"
npm run check:operational
```

Then run `npm run smoke:staging` with staging origin and tokens set.

## 12. Rollback Sequence

1. Disable live channels.
2. Close live gate.
3. Revert gateway build/image.
4. Restore DB snapshot if migration caused failure.
5. Rotate any suspect secrets.
6. Preserve evidence logs for review.

## 13. Go/No-Go Checklist

- `npm run release:check` passes.
- Production DB migration verified.
- Secret manager populated.
- Logs and retention configured.
- Provider readiness shows expected gated state.
- No secret/profile data appears in registry snapshot.
- Rollback confirmed.

## 14. Known Gated Items

- Live provider execution.
- Docker-capable runtime host and GoDaddy DNS record values.
- Production DB migration on selected managed Postgres.
- Provider evidence refresh before each gate opens.
- Bundle optimization beyond current acceptable build.

## 15. What Must Not Be Enabled Yet

- No `OPENSEABRI_LIVE_PROVIDER_APPROVED=true`.
- No live SMS/voice.
- No real customer messages.
- No paid LLM/vision provider smoke.
- No production local-search provider calls.
- No DNS cutover until deployment evidence is complete.

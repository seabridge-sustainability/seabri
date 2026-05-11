# OpenSeaBri Staging Deployment Runbook

**Status:** provider-neutral staging plan  
**Last updated:** 2026-05-10

This runbook prepares OpenSeaBri for staging deployment without authorizing production DNS, package publishing, live SMS, live voice calls, live customer messaging, or paid provider validation.

## 1. Recommended Hosting Shape

| Component | Requirement |
|-----------|-------------|
| Gateway service | Node 20.19+ service running `npm run gateway`; must support HTTP and WebSocket upgrade on the same public origin |
| Frontend/static app | Static/Vite build from `npm run build`, served behind the staging frontend origin |
| Canvas WebSocket | Optional second WebSocket port/service when `OPENSEABRI_CANVAS_WS_PORT` is enabled |
| MCP | Stdio process via `npx tsx gateway/mcp/server.ts`; not exposed as a public network service |
| Storage/database | Optional for this stage; telemetry file store can run without a database |
| Background worker | Optional for research/cron flows; keep disabled until staging smoke is green |

Do not assume Railway, Fly.io, Render, Vercel, or another provider. The selected provider must support WebSocket upgrades, environment secret storage, log access, rollback, and isolated staging URLs.

## 2. Required Staging Secrets

| Secret | Required when | Notes |
|--------|---------------|-------|
| `OPENSEABRI_API_KEY` | Always | HTTP `/api/seabri/*` auth header |
| `SEABRI_WS_TOKEN` | Always | Gateway WebSocket auth |
| `OPENSEABRI_CANVAS_WS_TOKEN` | Canvas enabled | Canvas WebSocket auth |
| `OPENSEABRI_CORS_ORIGIN` | Browser frontend enabled | Set to staging frontend origin, not `*` |
| `OPENSEABRI_RATE_LIMIT` | Always | Per-IP budget |
| `TELEGRAM_TOKEN` | Telegram enabled | Test bot only |
| `WHATSAPP_PROVIDER`, `WHATSAPP_CLOUD_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` | WhatsApp Cloud enabled | Sandbox/test account only |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` | SMS/voice enabled | Test account only |
| `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`, or `LOCAL_INFERENCE_URL` | LLM provider enabled | Paid/live keys require approval |
| `OPENSEABRI_STORAGE_URL`, `DATABASE_URL`, `REDIS_URL` | Persistence enabled | Optional in this sprint |

## 3. Secret-Manager Mapping

| Environment | Storage |
|-------------|---------|
| Local dev | `.env`, ignored by Git |
| Staging | Provider secret store, scoped to staging service |
| Production | Production secret store only; no shared staging secrets |

Rotation:

1. Create the replacement secret in the provider secret store.
2. Deploy to staging first.
3. Run `npm run validate:staging` and staging smoke checks.
4. Rotate production only after staging passes.
5. Revoke the old secret.

Revocation:

1. Disable the affected provider/channel flag.
2. Revoke credential at provider.
3. Rotate dependent tokens.
4. Run smoke checks with live providers disabled.

## 4. Deployment Gates

- Live channels disabled by default: `OPENSEABRI_CHANNELS_ENABLED=''`.
- Test mode enabled by default: `SEABRI_MESSAGE_TEST_MODE=true`, `SEABRI_CALL_TEST_MODE=true`.
- Approved test numbers/chats only.
- CORS locked to staging frontend origin.
- Rate limits configured.
- `GET /health` passes.
- `GET /api/seabri/registry-snapshot` passes and exposes no secrets.
- `GET /api/seabri/admin/provider-readiness` passes and exposes no secrets.
- WebSocket auth rejects missing/wrong `SEABRI_WS_TOKEN`.
- Canvas auth rejects missing/wrong `OPENSEABRI_CANVAS_WS_TOKEN` when enabled.
- MCP smoke passes locally or in the staging worker context.

## 5. Staging Smoke Sequence

```powershell
git status --short --branch
npm ci
npm run validate:staging
npm run gateway
```

Then, against the staging URL:

```powershell
curl <staging-origin>/health
curl -H "x-openseabri-key: <redacted>" <staging-origin>/api/seabri/registry-snapshot
curl -H "x-openseabri-key: <redacted>" <staging-origin>/api/seabri/admin/provider-readiness
```

Run WebSocket, canvas, MCP, and mocked live-channel smokes from the latest local validation script or evidence report. Do not run live provider calls until the live-provider validation plan is approved.

## 6. Rollback Plan

| Failure | Rollback |
|---------|----------|
| Gateway health fails | Revert gateway image/build or stop staging service |
| WebSocket auth fails open | Disable public routing and rotate `SEABRI_WS_TOKEN` |
| Canvas auth fails open | Remove `OPENSEABRI_CANVAS_WS_PORT` and rotate canvas token |
| Provider readiness leaks secret | Stop service, rotate exposed secret, fix redaction, rerun tests |
| Live provider call attempted unexpectedly | Disable channel flags, revoke provider token, preserve logs |
| Telemetry file grows unexpectedly | Disable `OPENSEABRI_TELEMETRY_STORE=file`, archive/delete staging file |

## 7. Evidence Report Template

Create after a provider is selected:

```text
docs/reports/OPENSEABRI_<PROVIDER>_STAGING_DRY_RUN_RESULTS_2026-05-10.md
```

Required sections:

1. Provider and services selected
2. Build IDs
3. Secret names set, values redacted
4. Health and registry snapshot output
5. Provider readiness output
6. WebSocket/canvas smoke output
7. MCP smoke output
8. Mocked live-channel smoke output
9. Logs reviewed
10. Rollback check
11. Go/no-go verdict
12. Live-provider gates still pending


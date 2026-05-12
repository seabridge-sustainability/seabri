# OpenSeaBri Production Deployment

Current operator path: use `docs/deployment/OPENSEABRI_RELEASE_PACKAGE.md` and `docs/deployment/OPENSEABRI_OWNER_MANUAL_ACTIONS.md` for final deployment execution. This document remains a supporting production configuration reference.

Status: staging-ready once the validation checklist in this document passes. Live provider channels remain gated until approved provider-specific smoke tests are run.

## Local Development

Minimum:

```powershell
npm install
npm run dev
```

Optional local gateway:

```powershell
$env:ANTHROPIC_API_KEY="<dev-key>"
$env:OPENSEABRI_API_KEY="<local-random-key>"
$env:SEABRI_WS_TOKEN="<local-random-token>"
$env:GATEWAY_HOST="127.0.0.1"
$env:GATEWAY_PORT="18790"
npm run gateway
```

Safe local defaults:

- `GATEWAY_HOST=127.0.0.1`
- `GATEWAY_PORT=18790`
- `OPENSEABRI_CORS_ORIGIN=http://localhost:5173`
- `OPENSEABRI_RATE_LIMIT=120`
- `OPENSEABRI_DOTENV_OVERRIDE=false` unless deliberately testing `.env` override behavior.
- Canvas is disabled unless `OPENSEABRI_CANVAS_WS_PORT` is set.
- Live channels are disabled unless `OPENSEABRI_CHANNELS_ENABLED` and provider credentials are set.

## Staging Configuration

Required staging secrets/config:

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` or approved LLM provider key | Yes | Gateway model calls |
| `OPENSEABRI_API_KEY` | Yes | `/api/seabri/*` API auth via `x-openseabri-key` |
| `SEABRI_WS_TOKEN` | Yes | Main gateway WebSocket auth |
| `OPENSEABRI_CORS_ORIGIN` | Yes | Exact staging frontend origin |
| `OPENSEABRI_RATE_LIMIT` | Yes | Per-IP request limit per minute |
| `GATEWAY_HOST` | Yes | Staging bind address |
| `GATEWAY_PORT` | Yes | Staging HTTP/WebSocket port |

Optional staging features:

| Variable | Required when enabled | Notes |
|---|---|---|
| `OPENSEABRI_CANVAS_WS_PORT` | No | Enables canvas broadcast server |
| `OPENSEABRI_CANVAS_WS_TOKEN` | Yes if canvas enabled | Required before non-dev canvas exposure |
| `TAVILY_API_KEY` | No | Enables web search tool |
| `SEABRIDGE_API_URL`, `SEABRIDGE_API_KEY` | No | Backend bridge integration |
| `OPENSEABRI_CHANNELS_ENABLED` | No | Comma-separated channel allowlist |

Live provider variables must stay unset in staging until the live-provider validation plan is approved.

## Production Configuration

Production must set:

- `NODE_ENV=production`
- `ANTHROPIC_API_KEY` or approved LLM provider key
- `OPENSEABRI_API_KEY`
- `SEABRI_WS_TOKEN`
- `OPENSEABRI_CORS_ORIGIN`
- `OPENSEABRI_RATE_LIMIT`
- `GATEWAY_HOST`
- `GATEWAY_PORT`

Production must set these before enabling the corresponding feature:

- `OPENSEABRI_CANVAS_WS_TOKEN` when `OPENSEABRI_CANVAS_WS_PORT` is set.
- `TELEGRAM_TOKEN` and a channel allowlist when Telegram is enabled.
- `WHATSAPP_PROVIDER=cloud`, `WHATSAPP_CLOUD_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, and `WHATSAPP_APP_SECRET` when WhatsApp Cloud is enabled.
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER` when SMS is enabled.
- `TWILIO_VOICE_WEBHOOK_URL` and `TWILIO_VOICE_TWIML_BASE_URL` when Voice/outbound call flows are enabled.
- `SEABRI_CALL_TEST_MODE=true`, `SEABRI_MESSAGE_TEST_MODE=true`, and `SEABRI_CALL_TEST_ALLOWED_NUMBERS` for any non-production provider validation.

Production-only fail-closed behavior:

- `/api/seabri/*` returns `401` without `OPENSEABRI_API_KEY` and matching `x-openseabri-key`.
- Main WebSocket rejects clients without `SEABRI_WS_TOKEN`.
- Canvas WebSocket rejects clients if `NODE_ENV=production` and `OPENSEABRI_CANVAS_WS_TOKEN` is missing.
- Provider channels do not start unless both channel allowlist and provider env are configured.

## Health Checks

Use authenticated local checks:

```powershell
Invoke-RestMethod http://127.0.0.1:18790/api/seabri/agents -Headers @{ "x-openseabri-key" = $env:OPENSEABRI_API_KEY }
Invoke-RestMethod http://127.0.0.1:18790/api/seabri/registry-snapshot -Headers @{ "x-openseabri-key" = $env:OPENSEABRI_API_KEY }
```

Expected:

- `agents` has 15 entries.
- `registry-snapshot.snapshot.hash` is a 64-character SHA-256 hex string.
- Unauthorized call without `x-openseabri-key` returns `401`.

## Minimum Viable Deployment Checklist

- Dependencies installed with the committed lockfile.
- `npm run typecheck` passes.
- `npm test -- --run` passes.
- `npm run test:node` passes.
- `npx playwright test` passes.
- `npm run build` passes.
- `npm audit --audit-level=moderate` passes.
- HTTP smoke passes for `/api/seabri/agents`, `/api/seabri/registry-snapshot`, and `/api/seabri/admin/provider-readiness`.
- WebSocket smoke passes with `SEABRI_WS_TOKEN`.
- Canvas smoke passes if canvas is enabled.
- No live channel provider is enabled unless its validation plan has been approved and executed.

## Smoke Test Checklist

- MCP stdio: `tools/list` and `resources/list` return non-empty arrays.
- HTTP: authenticated registry endpoints return arrays; unauthenticated endpoint returns `401`.
- WebSocket: `init` -> `ready`, `/status` chat -> `done`.
- Canvas: wrong token closes, correct token receives `{"type":"status","status":"connected"}`.
- Mocked live-channel suite passes.

## Rollback Checklist

- Keep the previous deployed artifact or image tag available.
- Keep the previous secret versions available in the secret manager.
- Disable `OPENSEABRI_CHANNELS_ENABLED` first if a live provider misbehaves.
- Remove `OPENSEABRI_CANVAS_WS_PORT` if canvas has auth or capacity issues.
- Restore the previous artifact/image and restart the gateway.
- Re-run health checks and smoke tests.
- Record the failed version, config diff, and user-safe incident note.

## Secret Rotation Checklist

- Generate replacement secret in the secret manager.
- Deploy with both old and new secret only if the surrounding proxy supports a grace window; otherwise schedule a short maintenance rotation.
- Update clients with the new API key or WebSocket token.
- Restart OpenSeaBri.
- Verify old secret fails and new secret works.
- Remove old secret from the secret manager.
- Record rotation timestamp and owner.

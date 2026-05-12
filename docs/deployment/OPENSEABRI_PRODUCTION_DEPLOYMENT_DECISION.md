# OpenSeaBri Production Deployment Decision

Status: selected target shape with live-provider gates closed.

Selected production shape:

- DNS/domain: GoDaddy.
- Runtime: Docker-capable host or container platform.
- Data: managed PostgreSQL.
- Secrets: provider-native secret manager.
- Edge: TLS reverse proxy with WebSocket and canvas WebSocket upgrade support.
- Logs: hosted log capture with redaction and retention controls.

## Recommended Topology

- Gateway service: one Node 20+ service running `npm run gateway`.
- Frontend: static/Vite build served by a static host or the same gateway-adjacent host.
- WebSocket: provider must support long-lived WS connections for chat on `SEABRI_WS_TOKEN`.
- Canvas WebSocket: enable only with `OPENSEABRI_CANVAS_WS_PORT` and `OPENSEABRI_CANVAS_WS_TOKEN`.
- Database: managed PostgreSQL using `OPENSEABRI_PERSISTENCE_ADAPTER=database` and `SEABRI_DATABASE_URL` or `DATABASE_URL`.
- Secret manager: provider-native secret store; no production secrets in `.env` files.
- Logs: structured stdout/stderr captured by the host with secret redaction review.

## Hosting Requirements

- Node runtime: `>=20.19.0`.
- Health check: `GET /health`.
- Startup command: `npm run gateway`.
- Build command: `npm ci && npm run build`.
- Network: inbound HTTP and WebSocket support.
- Persistent storage: managed PostgreSQL; file/in-memory fallback is staging/dev only.
- Database migration: run `npm run db:migrate` before first production traffic; required tables include `user_profiles`, `sessions`, `messages`, `telemetry_events`, and `provider_validation_evidence`.
- Rollback: previous image/build can be restored without changing secrets.

Recommended runtime options: Render, Railway, Fly.io, or another Docker-capable container host with managed PostgreSQL and secret storage. GoDaddy should be used for DNS unless the owner chooses a different registrar. Do not use GoDaddy shared hosting as the OpenSeaBri application runtime unless it can run the Node gateway, long-lived WebSockets, canvas WebSockets, managed secrets, and the production DB path.

Operational runbook: `docs/deployment/OPENSEABRI_GODADDY_DNS_DOCKER_PRODUCTION_RUNBOOK.md`.

## Required Production Settings

```text
OPENSEABRI_MODE=production
OPENSEABRI_API_KEY=<secret-manager-value>
SEABRI_WS_TOKEN=<secret-manager-value>
OPENSEABRI_CORS_ORIGIN=https://<production-frontend-origin>
OPENSEABRI_RATE_LIMIT=120
OPENSEABRI_PERSISTENCE_ADAPTER=database
SEABRI_DATABASE_URL=<managed-postgres-url>
OPENSEABRI_CHANNELS_ENABLED=
OPENSEABRI_LIVE_PROVIDER_APPROVED=false
```

Canvas, Telegram, WhatsApp, SMS, voice, live LLM, local-resource-search, and vision providers remain disabled unless separately approved and validated.

## MCP Constraints

- Stdio MCP is local-process scoped and must not be exposed as an unauthenticated network service.
- Remote MCP/tool execution must be allowlisted before production use.
- MCP smoke can run with mocked/test tools while live-provider gates are closed.

## Live-Provider Rollout Phases

1. Dry run: readiness and validation evidence only; no messages or calls.
2. Test mode: approved test chats/numbers only; no customer contacts.
3. Limited live pilot: explicit `OPENSEABRI_LIVE_PROVIDER_APPROVED=true`, one provider at a time.
4. Production live: documented evidence not expired, rollback tested, and monitoring active.

## Go/No-Go Checklist

- `npm run check:production` passes.
- `npm run validate:production` passes.
- `npm run check:secrets` passes.
- Provider readiness shows live providers blocked unless approved.
- Provider validation evidence exists for every provider selected for pilot.
- Registry snapshot contains no secrets or profile data.
- Database migrations/tables for profiles, telemetry, and provider evidence are present.
- Rollback path and secret revocation steps are documented.

## Rollback

1. Disable `OPENSEABRI_CHANNELS_ENABLED`.
2. Set `OPENSEABRI_LIVE_PROVIDER_APPROVED=false`.
3. Revert gateway to previous image/build.
4. Preserve logs and provider validation evidence.
5. Rotate any exposed or suspect provider secret.

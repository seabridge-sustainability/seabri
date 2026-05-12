# OpenSeaBri GoDaddy DNS + Docker Production Runbook

Status: selected operational target shape.

This runbook uses the architecture already present across SeaBridgeAI: containerized services, env/secret-manager runtime configuration, health checks, local-bound service ports, and a TLS reverse proxy in front of app ports.

GoDaddy is treated as the DNS/domain registrar. Do not assume GoDaddy shared hosting can run the Node gateway, WebSockets, canvas WebSockets, or managed Postgres. The application runtime still needs a Docker-capable host and a managed PostgreSQL service.

## Selected Target

| Layer | Selection |
|---|---|
| Domain/DNS | GoDaddy DNS |
| App runtime | Docker-capable host or container platform |
| Frontend | OpenSeaBri container serves `dist` on local port `3000` |
| Gateway/API/WS | OpenSeaBri container serves gateway on local port `18790` |
| Canvas WS | OpenSeaBri container serves canvas WS on local port `18791` when enabled |
| Database | Managed PostgreSQL |
| Secrets | Host/provider secret manager or `.env.production` generated from secret manager on the host |
| TLS/reverse proxy | Host-managed Nginx/Caddy/Traefik or platform proxy |
| Logs | Host/platform logs with retention and redaction policy |

## GoDaddy DNS Records

Choose final hostnames before DNS change. Example:

| Type | Name | Value | Notes |
|---|---|---|---|
| `A` or `CNAME` | `openseabri` | app host target | frontend |
| `A` or `CNAME` | `api.openseabri` | gateway host target | HTTP API + WebSocket |
| `A` or `CNAME` | `canvas.openseabri` | gateway host target | optional canvas WS |

Do not cut over DNS until hosted smoke checks pass on temporary provider URLs.

## Host Setup

1. Install Docker and Compose on the selected host.
2. Copy or deploy the OpenSeaBri repo/build artifact.
3. Create `.env.production` from `.env.production.example` using real secret-manager values.
4. Keep live providers closed:

```text
OPENSEABRI_CHANNELS_ENABLED=
OPENSEABRI_LIVE_PROVIDER_APPROVED=false
```

5. Start:

```powershell
docker compose -f docker-compose.production.yml up -d --build
docker compose -f docker-compose.production.yml ps
docker compose -f docker-compose.production.yml logs --tail=100 openseabri
```

## Reverse Proxy Requirements

The reverse proxy must:

- terminate TLS
- route frontend traffic to `127.0.0.1:3000`
- route `/api/seabri/*` and `/health` to `127.0.0.1:18790`
- support WebSocket upgrade headers to `127.0.0.1:18790`
- support canvas WebSocket upgrade headers to `127.0.0.1:18791` if canvas is enabled
- preserve `Host`, `X-Forwarded-Proto`, and `X-Forwarded-For`

## Required Secret Values

Use `.env.production.example` as the shape. Required for first production launch:

- `OPENSEABRI_API_KEY`
- `SEABRI_WS_TOKEN`
- `OPENSEABRI_CANVAS_WS_TOKEN` if canvas is enabled
- `OPENSEABRI_CORS_ORIGIN`
- `OPENSEABRI_RATE_LIMIT`
- `OPENSEABRI_PERSISTENCE_ADAPTER=database`
- `SEABRI_DATABASE_URL`

Provider credentials are optional until their provider is enabled and approved.

## Database Migration

Before traffic:

```powershell
npm run db:migration-check
npm run db:migrate
$env:OPENSEABRI_DB_CONNECT_CHECK="true"
npm run db:migration-check
```

Required tables:

- `user_profiles`
- `telemetry_events`
- `provider_validation_evidence`
- `sessions`
- `messages`

## Smoke Sequence

Run before DNS cutover against temporary host URLs:

```powershell
npm run check:production
npm run deployment:preflight
npm run check:secrets
npm run db:migration-check
npm run check:operational-readiness
npm run release:check
```

Then run hosted operational smoke:

```powershell
$env:OPENSEABRI_BASE_URL="https://<gateway-host>"
$env:OPENSEABRI_API_KEY="<from-secret-manager>"
npm run check:operational
```

## No-Go Conditions

- DB URL missing or table verification fails.
- API key, WS token, CORS origin, or rate limit missing.
- Any live provider starts before explicit approval.
- Registry snapshot or provider readiness leaks a secret/profile value.
- Reverse proxy does not support WebSocket upgrade.
- Logs contain raw secrets, phone numbers, addresses, or profile payloads.

## Rollback

1. Remove DNS cutover or point records back to the previous target.
2. `docker compose -f docker-compose.production.yml down`
3. Set `OPENSEABRI_CHANNELS_ENABLED=` and `OPENSEABRI_LIVE_PROVIDER_APPROVED=false`.
4. Restore DB snapshot if migration caused issues.
5. Rotate any suspect secrets.

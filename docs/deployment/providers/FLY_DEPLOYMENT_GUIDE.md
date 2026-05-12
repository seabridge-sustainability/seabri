# OpenSeaBri Fly.io Deployment Guide

Use Fly.io when you want a Docker-first deployment with explicit `fly.toml`, regions, secrets, logs, and HTTP health checks. Fly is powerful, but more operationally hands-on than Render or Railway.

Official docs checked for this guide:

- Fly apps: https://fly.io/docs/apps/
- Fly app configuration and health checks: https://fly.io/docs/reference/configuration/
- Fly deployment troubleshooting: https://fly.io/docs/getting-started/troubleshooting/

## Service Shape

| Item | Value |
|---|---|
| Runtime | Docker / Node 20.19+ image |
| Build command | Docker build or `npm ci && npm run build` inside image |
| Start command | `npm run gateway` |
| Health check path | `/health` |
| Default app port | set `GATEWAY_PORT` to the exposed internal port, or rely on `PORT` when injected |
| WebSocket support | supported through the app service when proxying HTTP upgrades |
| Canvas WebSocket | expose only with explicit port/proxy config and `OPENSEABRI_CANVAS_WS_TOKEN` |

## Steps

1. Install and authenticate `flyctl` outside this repo.
2. Create the Fly app.
3. Configure `fly.toml` to expose the gateway HTTP port.
4. Set secrets with `fly secrets set`; do not put secrets in `fly.toml`.
5. Provision managed Postgres or attach an existing managed Postgres.
6. Set `SEABRI_DATABASE_URL` as a Fly secret.
7. Deploy the app image.
8. Run migration checks and migrations as a one-off command only after confirming the DB target.

## Required Secrets

```powershell
fly secrets set OPENSEABRI_MODE=production
fly secrets set OPENSEABRI_API_KEY=<secret>
fly secrets set SEABRI_WS_TOKEN=<secret>
fly secrets set OPENSEABRI_CANVAS_WS_TOKEN=<secret>
fly secrets set OPENSEABRI_CORS_ORIGIN=https://app.<your-domain>
fly secrets set OPENSEABRI_RATE_LIMIT=120
fly secrets set OPENSEABRI_PERSISTENCE_ADAPTER=database
fly secrets set SEABRI_DATABASE_URL=<managed-postgres-url>
fly secrets set OPENSEABRI_CHANNELS_ENABLED=
fly secrets set OPENSEABRI_LIVE_PROVIDER_APPROVED=false
```

Do not paste real values into chat or docs.

## Required Post-Deploy Commands

```powershell
npm run deployment:preflight
npm run db:migration-check
npm run db:migrate
$env:OPENSEABRI_DB_CONNECT_CHECK="true"
npm run db:migration-check
npm run release:check
```

Hosted smoke:

```powershell
$env:OPENSEABRI_BASE_URL="https://<fly-app-hostname>"
$env:OPENSEABRI_API_KEY="<from-fly-secret>"
npm run check:operational
```

## Logs

Use:

```powershell
fly logs
```

Verify startup validation, DB adapter initialization, and live channel gate state.

## Rollback

1. Deploy the previous image/release.
2. Clear live channel allowlist.
3. Restore DB backup if needed.
4. Rotate secrets if any logs or screenshots exposed them.

## Common Failure Modes

| Symptom | Likely cause | Fix |
|---|---|---|
| App unhealthy | wrong exposed port or missing secret | check `fly logs` and `fly.toml` HTTP service |
| DB unreachable | DB not attached or region/network mismatch | verify managed Postgres URL and networking |
| WebSocket closes | proxy/hostname mismatch | use the correct `wss://` app hostname |
| Migrations hit wrong DB | wrong secret value | stop, rotate if needed, restore backup, rerun with verified DB target |

## Initial Live-Provider Gate

Fly deployment does not approve live providers. Keep `OPENSEABRI_CHANNELS_ENABLED=` and `OPENSEABRI_LIVE_PROVIDER_APPROVED=false` until each provider has approved evidence.

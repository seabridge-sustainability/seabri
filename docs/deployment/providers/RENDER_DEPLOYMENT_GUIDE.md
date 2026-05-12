# OpenSeaBri Render Deployment Guide

Use Render when you want a dashboard-driven web service with built-in environment variables, logs, health checks, WebSocket support, and managed PostgreSQL.

Official docs checked for this guide:

- Render web services: https://render.com/docs/web-services
- Render WebSockets: https://render.com/docs/websocket
- Render health checks: https://render.com/docs/health-checks

## Service Shape

| Item | Value |
|---|---|
| Runtime | Node 20.19+ |
| Build command | `npm ci && npm run build` |
| Start command | `npm run gateway` |
| Health check path | `/health` |
| Default app port | OpenSeaBri reads `GATEWAY_PORT`, then provider `PORT`, then `18790` |
| WebSocket support | Render web services support inbound WebSockets |
| Canvas WebSocket | expose only if the service/proxy routes `OPENSEABRI_CANVAS_WS_PORT` and token auth |

## Steps

1. Create a new Render Web Service from the OpenSeaBri repo or container image.
2. Select Node 20.19+ or Docker.
3. Set build command:

```text
npm ci && npm run build
```

4. Set start command:

```text
npm run gateway
```

5. Create a Render PostgreSQL database.
6. Add the database URL to the service secret environment as `SEABRI_DATABASE_URL`.
7. Add every required production environment variable from `.env.production.example`.
8. Keep provider gates closed for the first deploy:

```text
OPENSEABRI_CHANNELS_ENABLED=
OPENSEABRI_LIVE_PROVIDER_APPROVED=false
OPENSEABRI_LIVE_PROVIDER_TESTS_ENABLED=false
```

9. Configure health check path:

```text
/health
```

10. Deploy.

## Required Post-Deploy Commands

Run these in a safe one-off shell/job with production secrets present:

```powershell
npm run deployment:preflight
npm run db:migration-check
npm run db:migrate
$env:OPENSEABRI_DB_CONNECT_CHECK="true"
npm run db:migration-check
npm run release:check
```

Then run hosted smoke from an operator shell:

```powershell
$env:OPENSEABRI_BASE_URL="https://<render-service-or-api-domain>"
$env:OPENSEABRI_API_KEY="<from-secret-manager>"
npm run check:operational
```

Do not print the API key in logs.

## Logs

Use Render service logs. Verify startup includes:

- `startup mode` with `mode=production`
- `live channel startup gate` with no live channels unless intentionally approved
- `gateway started`

## Rollback

1. Roll back to the previous Render deploy.
2. Set `OPENSEABRI_CHANNELS_ENABLED=` and `OPENSEABRI_LIVE_PROVIDER_APPROVED=false`.
3. Restore the latest managed Postgres snapshot if a migration caused the issue.
4. Rotate any suspect secrets.

## Common Failure Modes

| Symptom | Likely cause | Fix |
|---|---|---|
| Health check fails | app not binding to the provider port | confirm Render injects `PORT`, or set `GATEWAY_PORT` to the exposed service port |
| WebSocket fails | proxy/domain not using WebSocket route | verify service is a web service and client uses `wss://` |
| Production startup exits | required secrets or DB URL missing | run `npm run deployment:preflight` |
| DB migration fails | wrong DB URL or no SSL/network access | verify Render Postgres connection string in secret env |

## Initial Live-Provider Gate

Do not enable Telegram, WhatsApp, SMS, voice, paid LLM, vision, or live local resource search during the first Render deployment. Record provider validation evidence before opening each provider.

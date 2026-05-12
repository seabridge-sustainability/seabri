# OpenSeaBri Railway Deployment Guide

Use Railway when you want fast project setup with an app service, service variables, PostgreSQL, health checks, and logs in one project.

Official docs checked for this guide:

- Railway build/deploy: https://docs.railway.com/build-deploy
- Railway PostgreSQL: https://docs.railway.com/guides/postgresql
- Railway healthchecks: https://docs.railway.com/reference/healthchecks
- Railway variables: https://docs.railway.com/reference/variables

## Service Shape

| Item | Value |
|---|---|
| Runtime | Node 20.19+ or Docker |
| Build command | `npm ci && npm run build` |
| Start command | `npm run gateway` |
| Health check path | `/health` |
| Default app port | OpenSeaBri reads `GATEWAY_PORT`, then provider `PORT`, then `18790` |
| WebSocket support | use a persistent web service, not a short-lived function |
| Canvas WebSocket | only expose with `OPENSEABRI_CANVAS_WS_TOKEN` and a routable canvas WS endpoint |

## Steps

1. Create a Railway project.
2. Add a PostgreSQL service.
3. Add the OpenSeaBri app service from GitHub or Docker.
4. Set service variables from `.env.production.example`.
5. Map the Postgres connection string into `SEABRI_DATABASE_URL`.
6. Set:

```text
OPENSEABRI_MODE=production
OPENSEABRI_PERSISTENCE_ADAPTER=database
OPENSEABRI_CHANNELS_ENABLED=
OPENSEABRI_LIVE_PROVIDER_APPROVED=false
```

7. Configure the health check path:

```text
/health
```

8. Deploy.

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
$env:OPENSEABRI_BASE_URL="https://<railway-app-domain>"
$env:OPENSEABRI_API_KEY="<from-railway-variable>"
npm run check:operational
```

## Logs

Use Railway deploy/service logs. Look for:

- production startup validation success
- PostgreSQL adapter initialized
- live channels listed as `(none)`
- no raw secret values

## Rollback

1. Redeploy the previous deployment from Railway history.
2. Close provider gates.
3. Restore a database backup if migration rollback is needed.
4. Rotate secrets if exposure is suspected.

## Common Failure Modes

| Symptom | Likely cause | Fix |
|---|---|---|
| Health check timeout | startup secrets missing or wrong port | inspect logs and run `npm run deployment:preflight` |
| DB connection refused | app not linked to Postgres service | verify `SEABRI_DATABASE_URL` service variable |
| WebSocket 404/close | wrong public URL or service type | use the Railway public app domain and `wss://` |
| Live channel starts unexpectedly | env allowlist not empty | clear `OPENSEABRI_CHANNELS_ENABLED` |

## Initial Live-Provider Gate

Keep all live providers disabled for the first Railway production run. Enable one channel at a time only after approved validation evidence is recorded.

# OpenSeaBri Full Operational Handoff

Date: 2026-05-11

## Current Status

OpenSeaBri has a complete repo-side operational launch package. The app is not deployed from this local environment because authenticated DNS, hosting, secret manager, managed Postgres, and live provider accounts are not available here.

Verdict: **FULLY OPERATIONAL PACKAGE READY - OWNER DEPLOYMENT REQUIRED**

## What Is Automated

- Production startup validation: `npm run check:production`
- Deployment preflight: `npm run deployment:preflight`
- DB migration readiness: `npm run db:migration-check`
- Operational smoke against local or hosted gateway: `npm run check:operational`
- Release validation bundle: `npm run release:check`
- Secret-safety checks: `npm run check:secrets` and `npm run secret-scan`
- Staging/product smoke checks: `npm run smoke:staging`, `npm run smoke:pilot`, `npm run smoke:demos`

## What Is Manual

- Choose Render, Railway, Fly.io, or another Docker-capable host.
- Create managed Postgres.
- Add secrets to the host secret manager.
- Point GoDaddy DNS to the chosen host.
- Run migrations against the selected managed Postgres.
- Configure hosted logs, retention, and alerts.
- Approve live-provider validation targets one provider at a time.

## What Is Blocked Externally

- No production host credentials are present.
- No managed production Postgres URL is present.
- No secret manager connection is present.
- No GoDaddy authenticated session is available.
- No approved live-provider test target is available.

## Exact Deployment Sequence

1. Pick provider using one guide:
   - `docs/deployment/providers/RENDER_DEPLOYMENT_GUIDE.md`
   - `docs/deployment/providers/RAILWAY_DEPLOYMENT_GUIDE.md`
   - `docs/deployment/providers/FLY_DEPLOYMENT_GUIDE.md`
2. Create the app service with:

```text
Build: npm ci && npm run build
Start: npm run gateway
Health: /health
```

3. Create managed Postgres.
4. Add secret-manager values from `.env.production.example`.
5. Keep live gates closed:

```text
OPENSEABRI_CHANNELS_ENABLED=
OPENSEABRI_LIVE_PROVIDER_APPROVED=false
```

6. Run:

```powershell
npm run deployment:preflight
npm run db:migration-check
npm run db:migrate
$env:OPENSEABRI_DB_CONNECT_CHECK="true"
npm run db:migration-check
npm run release:check
```

7. Point GoDaddy DNS using `docs/deployment/OPENSEABRI_GODADDY_DNS_GUIDE.md`.
8. Run hosted smoke:

```powershell
$env:OPENSEABRI_BASE_URL="https://api.<domain>"
$env:OPENSEABRI_API_KEY="<from-secret-manager>"
npm run check:operational
```

## Exact Validation Sequence

Local safe validation:

```powershell
npm run check:production
npm run deployment:preflight
npm run db:migration-check
npm run check:secrets
npm run secret-scan
npm run validate:production
npm run release:check
```

Hosted validation:

```powershell
$env:OPENSEABRI_BASE_URL="https://api.<domain>"
$env:OPENSEABRI_API_KEY="<from-secret-manager>"
$env:SEABRI_WS_TOKEN="<from-secret-manager>"
npm run check:operational
```

## Live-Provider Gate Sequence

1. Keep all providers disabled at launch.
2. Pick exactly one provider.
3. Confirm safe test target.
4. Run provider-specific validation from `docs/testing/OPENSEABRI_LIVE_PROVIDER_VALIDATION_EXECUTION.md`.
5. Record provider validation evidence.
6. Confirm monitoring and rollback.
7. Enable only that provider.

Never enable `all` for public launch.

## Owner Responsibilities

- Protect secrets.
- Keep backup before migration.
- Confirm DNS records before cutover.
- Confirm logs contain no raw phone numbers, addresses, documents, or tokens.
- Decide go/no-go for pilot traffic.

## Final Go/No-Go Checklist

Go only if:

- production service is healthy
- DB tables are verified
- secret manager is configured
- registry snapshot has no secrets/profile data
- provider readiness shows gates expected
- hosted `npm run check:operational` passes
- rollback path is documented
- no live provider is enabled without current evidence

No-go if:

- DB migration is not verified
- DNS/TLS is unstable
- CORS is wildcard
- logs show secrets
- live provider gate opens unexpectedly
- operational smoke fails

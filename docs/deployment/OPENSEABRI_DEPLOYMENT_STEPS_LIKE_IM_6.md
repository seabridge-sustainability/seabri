# OpenSeaBri Deployment Steps Like I'm 6

This is the plain owner checklist for putting OpenSeaBri online.

Rules:

- Do not paste secrets into chat.
- Do not turn on live providers at first.
- Do not send real texts.
- Do not place real calls.
- Do not call emergency services.
- Do not delete DNS records you do not understand.

OpenSeaBri is ready in the repo. What remains is account setup: host, database, secrets, DNS, smoke checks.

## What You Need Before Starting

You need access to:

- GoDaddy, for DNS.
- One app host, such as Render, Railway, or Fly.io.
- A managed PostgreSQL database.
- The app host secret manager.
- The OpenSeaBri repository or build artifact.

You do not need to enable Telegram, WhatsApp, SMS, voice, paid LLM, vision, or live search for the first deployment.

## 1. Choose The Host

Pick one place to run the app.

Recommended simple choices:

- Render: easiest dashboard-style setup.
- Railway: quick app plus Postgres setup.
- Fly.io: more technical, Docker-first setup.

GoDaddy is not the app host. GoDaddy only points your domain name to the real app host.

Use the matching guide:

- `docs/deployment/providers/RENDER_DEPLOYMENT_GUIDE.md`
- `docs/deployment/providers/RAILWAY_DEPLOYMENT_GUIDE.md`
- `docs/deployment/providers/FLY_DEPLOYMENT_GUIDE.md`

## 2. Create The App Service

In the host dashboard:

1. Create a new app or web service.
2. Connect it to the OpenSeaBri repo or uploaded Docker/build artifact.
3. Set Node version to Node 20 or newer.
4. Use this build command:

```text
npm ci && npm run build
```

5. Use this start command:

```text
npm run gateway
```

6. Set the health check path:

```text
/health
```

7. Confirm the host supports WebSockets.

Port behavior:

- If the host gives you `PORT`, OpenSeaBri can use it.
- If you set `GATEWAY_PORT`, OpenSeaBri uses that.
- If neither exists, OpenSeaBri uses `18790`.

## 3. Create The Database

In the host or database provider:

1. Create a PostgreSQL database.
2. Copy the database connection URL.
3. Put it only in the host secret manager.
4. Use this secret name:

```text
SEABRI_DATABASE_URL
```

If your host automatically provides `DATABASE_URL`, that is also supported. Prefer `SEABRI_DATABASE_URL` when you can choose.

Do not paste the database URL into chat, GitHub, docs, screenshots, or issue comments.

## 4. Add The Required Secrets

Open the host's secret manager or environment variable screen.

Add these exact names:

```text
OPENSEABRI_MODE=production
OPENSEABRI_API_KEY=<make-a-long-random-secret>
SEABRI_WS_TOKEN=<make-a-long-random-secret>
OPENSEABRI_CANVAS_WS_TOKEN=<make-a-long-random-secret>
OPENSEABRI_CORS_ORIGIN=https://app.<your-domain>
OPENSEABRI_RATE_LIMIT=120
OPENSEABRI_PERSISTENCE_ADAPTER=database
SEABRI_DATABASE_URL=<your-managed-postgres-url>
OPENSEABRI_TELEMETRY_STORE=database
OPENSEABRI_CHANNELS_ENABLED=
OPENSEABRI_LIVE_PROVIDER_APPROVED=false
GATEWAY_HOST=0.0.0.0
```

Important:

- Keep `OPENSEABRI_CHANNELS_ENABLED` empty.
- Keep `OPENSEABRI_LIVE_PROVIDER_APPROVED=false`.
- Do not add real customer phone numbers.
- Do not enable `all`.
- Do not put secret values in chat.

Optional later, not for first launch:

- Telegram token.
- WhatsApp credentials.
- Twilio SMS credentials.
- Twilio voice credentials.
- LLM provider keys.
- Vision provider keys.
- Local resource search provider keys.
- MCP external tool secrets.

Those optional provider secrets can exist, but providers must stay disabled until validation evidence exists.

## 5. Deploy The App

In the host dashboard:

1. Click deploy.
2. Wait for build to finish.
3. Open the app logs.
4. Look for a healthy startup.

Good signs:

```text
startup mode ... production
live channel startup gate ... (none)
gateway started
```

Bad signs:

```text
missing OPENSEABRI_API_KEY
missing SEABRI_WS_TOKEN
missing production persistence
unknown OPENSEABRI_CHANNELS_ENABLED value
```

If you see a bad sign, fix the secret names or values in the host secret manager and redeploy.

## 6. Run The Database Migration

Before migration:

1. Confirm the database is the production OpenSeaBri database.
2. Take a database backup or snapshot.
3. Confirm live providers are still off.

Run this first:

```powershell
npm run deployment:preflight
npm run db:migration-check
```

Then run the migration:

```powershell
npm run db:migrate
```

Then verify tables:

```powershell
$env:OPENSEABRI_DB_CONNECT_CHECK="true"
npm run db:migration-check
```

Expected tables:

```text
user_profiles
telemetry_events
provider_validation_evidence
sessions
messages
```

If migration fails:

1. Stop.
2. Do not open traffic.
3. Save logs.
4. Restore the database snapshot if needed.
5. Fix the database URL or migration issue.
6. Run the migration check again.

## 7. Point GoDaddy DNS

Open GoDaddy DNS for your domain.

Recommended names:

```text
app.<your-domain>
api.<your-domain>
```

If your host gives you a hostname, create CNAME records:

```text
app -> your-app-hostname
api -> your-api-or-gateway-hostname
```

If your host uses one combined service, both names may point to the same host.

Do not delete existing records unless you know what they do.

After changing DNS, wait. DNS can take minutes or sometimes hours.

Check DNS:

```powershell
nslookup app.<your-domain>
nslookup api.<your-domain>
```

## 8. Set CORS To The Final Domain

After choosing the real app domain, set:

```text
OPENSEABRI_CORS_ORIGIN=https://app.<your-domain>
```

Do not use:

```text
*
```

Redeploy after changing CORS.

## 9. Run Hosted Health Checks

Check the deployed health endpoint:

```powershell
curl https://api.<your-domain>/health
```

Expected:

```text
status ok
```

Then run the safe operational smoke:

```powershell
$env:OPENSEABRI_BASE_URL="https://api.<your-domain>"
$env:OPENSEABRI_API_KEY="<from-host-secret-manager>"
npm run check:operational
```

Do not paste the API key into chat. Set it only in your local terminal or CI secret environment.

## 10. Run Release Checks Before Traffic

From a safe operator machine or CI runner with production-shaped secrets:

```powershell
npm run deployment:preflight
npm run db:migration-check
npm run check:production
npm run check:secrets
npm run secret-scan
npm run release:check
```

If `release:check` says external actions are required, read the exact missing labels. Usually this means the host secrets are not available in that shell.

## 11. Keep Live Providers Off For First Launch

These values must stay closed:

```text
OPENSEABRI_CHANNELS_ENABLED=
OPENSEABRI_LIVE_PROVIDER_APPROVED=false
```

This means:

- Telegram will not poll.
- WhatsApp will not process real live traffic.
- SMS will not send.
- Voice will not call.
- Paid provider tests will not run automatically.

Credentials alone are not enough to start a provider.

## 12. Open Pilot Traffic

Only after hosted checks pass:

1. Share the app URL with a small pilot group.
2. Tell them live messages/calls are disabled.
3. Ask them to test the visible workflows:
   - Living Companion.
   - Product Comparison.
   - Carbon Footprint.
   - Home Energy.
   - Community Project.
   - Certification Navigator.
   - Offset Checker.
   - Sustainable Compute.
4. Collect feedback and bug reports.

## 13. Validate Live Providers Later, One At A Time

Do this later, not during first deployment.

Pick exactly one provider and one safe test target.

Examples:

- One Telegram test chat.
- One WhatsApp test number.
- One Twilio SMS test number.
- One Twilio voice test number.

Before enabling:

1. Confirm the test target belongs to you or an approved tester.
2. Confirm it is not a customer.
3. Confirm it is not emergency services.
4. Confirm it will not create unexpected cost.
5. Record approval.

Then enable only that provider:

```text
OPENSEABRI_CHANNELS_ENABLED=telegram
```

Do not use:

```text
OPENSEABRI_CHANNELS_ENABLED=all
```

After the test:

1. Record provider validation evidence.
2. Turn the provider back off if the test is done.
3. Repeat for the next provider only when ready.

## 14. If Something Breaks

Simple rollback:

1. Turn live providers off.
2. Redeploy the previous app version.
3. Restore database backup if migration caused the problem.
4. Revert DNS to the previous host if DNS caused the problem.
5. Save logs.
6. Do not keep retrying live provider actions.

## 15. Final Go Checklist

Go only if all are true:

- App host deployed.
- `/health` passes.
- Database migration verified.
- Required secrets are in secret manager.
- CORS is not wildcard.
- Rate limit is set.
- WebSocket token is set.
- Canvas token is set if canvas is exposed.
- Registry snapshot smoke passes.
- Provider readiness smoke passes.
- Live providers are disabled or have approved evidence.
- Monitoring/logging is configured.
- Rollback path is known.

If any item is not true, do not open public traffic yet.

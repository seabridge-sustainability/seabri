# OpenSeaBri Owner Manual Actions

This is the plain-language list of what the owner/operator must do manually. Do not paste secrets into chat. Do not enable all channels at once. Do not call or text real people during validation. Do not delete DNS records you do not understand.

## 1. Choose A Host

Pick one:

- Render: simplest dashboard path.
- Railway: fast app plus Postgres project setup.
- Fly.io: Docker-first and more hands-on.
- Other: must support Node 20.19+, Docker or Node build, WebSockets, secrets, logs, and managed Postgres.

## 2. Create Managed Postgres

Create a production Postgres database. Copy the connection URL only into the host secret manager as:

```text
SEABRI_DATABASE_URL
```

Do not paste it into chat.

## 3. Add Secrets

Add the labels from `.env.production.example` to the selected host secret manager.

Minimum required:

```text
OPENSEABRI_MODE=production
OPENSEABRI_API_KEY=<secret>
SEABRI_WS_TOKEN=<secret>
OPENSEABRI_CANVAS_WS_TOKEN=<secret>
OPENSEABRI_CORS_ORIGIN=https://app.<domain>
OPENSEABRI_RATE_LIMIT=120
OPENSEABRI_PERSISTENCE_ADAPTER=database
SEABRI_DATABASE_URL=<secret>
OPENSEABRI_TELEMETRY_STORE=database
OPENSEABRI_CHANNELS_ENABLED=
OPENSEABRI_LIVE_PROVIDER_APPROVED=false
```

## 4. Run Migrations

After backing up the database:

```powershell
npm run deployment:preflight
npm run db:migration-check
npm run db:migrate
$env:OPENSEABRI_DB_CONNECT_CHECK="true"
npm run db:migration-check
```

## 5. Point GoDaddy DNS

Create `app.<domain>` and `api.<domain>` records. Use `docs/deployment/OPENSEABRI_GODADDY_DNS_GUIDE.md`.

## 6. Run Smoke Checks

```powershell
$env:OPENSEABRI_BASE_URL="https://api.<domain>"
$env:OPENSEABRI_API_KEY="<from-secret-manager>"
npm run check:operational
```

Then run:

```powershell
npm run release:check
```

## 7. Keep Live Providers Disabled

Initial launch values:

```text
OPENSEABRI_CHANNELS_ENABLED=
OPENSEABRI_LIVE_PROVIDER_APPROVED=false
```

## 8. Approve Providers One By One Later

For each provider, choose a safe test target first:

- Telegram test chat
- WhatsApp test number
- Twilio SMS test number
- Twilio Voice test number
- non-private LLM test prompt
- non-private vision test image
- local-resource-search test query

Record provider validation evidence before allowing pilot traffic.

## 9. Decide Pilot Traffic

Open pilot traffic only after:

- database tables verified
- release checks pass
- DNS and TLS work
- logs and alerts are active
- live providers remain closed or have current evidence

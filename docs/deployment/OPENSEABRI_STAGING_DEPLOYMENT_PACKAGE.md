# OpenSeaBri Staging Deployment Package

**Current verdict:** READY FOR STAGING DEPLOYMENT  
**Live-provider status:** disabled/gated  
**Last updated:** 2026-05-10

This package prepares OpenSeaBri for an actual staging deployment. It does not authorize production DNS, package publishing, live Telegram/WhatsApp/SMS/voice traffic, paid LLM calls, or production rollout.

## 1. Required Services

| Service | Required | Notes |
|---------|----------|-------|
| Gateway service | Yes | Node 20.19+, runs `npm run gateway`, supports HTTP and WebSocket upgrades |
| Frontend/static app | Yes if serving web UI | Build with `npm run build`; serve `dist/` |
| Canvas WebSocket | Optional | Enable only with `OPENSEABRI_CANVAS_WS_PORT` and token |
| MCP stdio | Optional | Local/worker stdio only, not public network |
| Storage/database | Optional | Not required for first staging package |
| Background worker | Optional | Keep disabled until basic staging smoke is green |

## 2. Required Environment Variables

| Variable | Purpose |
|----------|---------|
| `NODE_ENV=production` | Production-mode auth behavior |
| `GATEWAY_HOST` | Bind address, usually `0.0.0.0` in staging |
| `GATEWAY_PORT` | Provider-assigned or configured port |
| `OPENSEABRI_API_KEY` | HTTP `/api/seabri/*` auth |
| `SEABRI_WS_TOKEN` | Gateway WebSocket auth |
| `OPENSEABRI_CORS_ORIGIN` | Exact staging frontend origin |
| `OPENSEABRI_RATE_LIMIT` | Per-IP rate limit |

Use `.env.staging.example` as the sanitized source template. Store real values only in the staging secret manager.

## 3. Optional Provider Variables

Provider variables must remain unset until a provider-specific test has been approved:

- Telegram: `TELEGRAM_TOKEN`
- WhatsApp Cloud: `WHATSAPP_PROVIDER`, `WHATSAPP_CLOUD_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`
- Twilio SMS/voice: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, webhook URL/secrets
- LLM: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`, `LOCAL_INFERENCE_URL`
- Storage/database: `OPENSEABRI_STORAGE_URL`, `DATABASE_URL`, `REDIS_URL`

## 4. Secrets Checklist

- [ ] `OPENSEABRI_API_KEY` generated uniquely for staging.
- [ ] `SEABRI_WS_TOKEN` generated uniquely for staging.
- [ ] `OPENSEABRI_CANVAS_WS_TOKEN` generated if canvas is enabled.
- [ ] CORS origin is exact, not wildcard.
- [ ] Secrets are stored in provider secret store, not repo.
- [ ] Logs do not print secret values.
- [ ] Old staging secrets can be revoked from the provider UI.

## 5. Provider Gate Checklist

- [ ] `OPENSEABRI_CHANNELS_ENABLED` is empty for first staging deploy.
- [ ] `OPENSEABRI_LIVE_PROVIDER_TESTS_ENABLED=false`.
- [ ] `SEABRI_MESSAGE_TEST_MODE=true`.
- [ ] `SEABRI_CALL_TEST_MODE=true`.
- [ ] `SEABRI_MESSAGES_ENABLED=false`.
- [ ] `SEABRI_CALLS_ENABLED=false`.
- [ ] Approved test contacts are documented before any provider smoke.
- [ ] Live-provider validation plan is approved before setting provider credentials.

## 6. Staging Startup Command

```powershell
npm ci
npm run build
$env:NODE_ENV='production'
$env:OPENSEABRI_CHANNELS_ENABLED=''
npm run gateway
```

On a hosting provider, the service command is:

```bash
npm run gateway
```

## 7. Staging Smoke Commands

Local validation before deploy:

```powershell
npm run validate:staging
```

Against a running staging gateway:

```powershell
$env:OPENSEABRI_STAGING_ORIGIN='https://<staging-gateway-origin>'
$env:OPENSEABRI_API_KEY='<redacted>'
$env:SEABRI_WS_TOKEN='<redacted>'
npm run smoke:staging
```

Canvas smoke, if canvas is enabled:

```powershell
$env:OPENSEABRI_STAGING_CANVAS_WS_URL='wss://<staging-canvas-origin>'
$env:OPENSEABRI_CANVAS_WS_TOKEN='<redacted>'
npm run smoke:staging
```

## 8. Rollback Steps

1. Disable `OPENSEABRI_CHANNELS_ENABLED`.
2. Remove `OPENSEABRI_CANVAS_WS_PORT` if canvas is failing.
3. Revert to the previous build/image.
4. Rotate `OPENSEABRI_API_KEY`, `SEABRI_WS_TOKEN`, or provider secrets if leaked.
5. Re-run `npm run smoke:staging`.
6. Save logs and the evidence template with the failure summary.

## 9. Expected Healthcheck Output

`GET /health` should return HTTP 200 and a JSON object with a healthy/ok status field.

## 10. Expected Provider-Readiness Output

`GET /api/seabri/admin/provider-readiness` should return HTTP 200:

```json
{
  "providers": [
    {
      "provider": "telegram",
      "enabled": false,
      "configured": false,
      "testMode": true,
      "liveModeAllowed": false,
      "missingConfigKeys": ["TELEGRAM_TOKEN"],
      "lastValidationStatus": "not_run",
      "canRunLiveTest": false
    }
  ]
}
```

Values may differ by provider, but secret values must never appear.

## 11. Expected Registry-Snapshot Output

`GET /api/seabri/registry-snapshot` should return HTTP 200:

```json
{
  "snapshot": {
    "generatedAt": "2026-05-10T00:00:00.000Z",
    "version": "1.0.0",
    "hash": "<64-character sha256>",
    "counts": {
      "capabilities": 14,
      "skills": 15,
      "mcp": 1,
      "tools": 14,
      "agents": 15
    }
  }
}
```

The full response includes sanitized registry entries. It must not include API keys, tokens, webhook secrets, DSNs, or provider credentials.

## 12. Known Non-Blocking Gaps

- Live provider credential validation is not executed.
- Hosting provider is not selected in-repo.
- Managed telemetry/database persistence is not required for first staging deploy.
- CI captures bundle sizes but does not enforce budgets yet.
- Historical reports may retain old counts in archived body text.

## 13. Must Remain Disabled Until Live Approval

- Telegram live bot traffic
- WhatsApp Cloud live webhooks/messages
- Twilio SMS outbound
- Twilio voice/calls
- Paid LLM provider smoke
- Customer or third-party messaging
- Production DNS or package publishing


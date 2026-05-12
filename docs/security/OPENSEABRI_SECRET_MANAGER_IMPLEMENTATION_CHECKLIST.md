# OpenSeaBri Secret Manager Implementation Checklist

Status: required before production deployment.

| Secret/config | Dev | Staging | Production | Owner | Cadence | Validation | Risk | Revocation |
|---|---|---|---|---|---|---|---|---|
| `OPENSEABRI_API_KEY` | optional local | required | required | platform ops | 90 days | `check:production` | API access | rotate secret, restart gateway |
| `SEABRI_WS_TOKEN` | optional local | required for WS | required | platform ops | 90 days | WS smoke | chat WS access | rotate token, restart gateway |
| `OPENSEABRI_CANVAS_WS_TOKEN` | optional if canvas | required if canvas | required if canvas | platform ops | 90 days | canvas smoke | canvas WS access | rotate token, restart gateway |
| `OPENSEABRI_CORS_ORIGIN` | localhost allowed | staging origin | production origin only | platform ops | per domain change | `check:production` | cross-origin abuse | update origin, redeploy |
| `OPENSEABRI_RATE_LIMIT` | optional | required | required | platform ops | per traffic review | `check:production` | abuse/cost | lower limit, redeploy |
| `SEABRI_DATABASE_URL` / `DATABASE_URL` | optional | staging DB | production DB | platform ops | provider managed | `check:db` | data access | rotate DB credentials, restore snapshot |
| `TELEGRAM_TOKEN` | optional | test bot only | gated | channel owner | 90 days | provider readiness | message send/read | revoke bot token |
| WhatsApp credentials | optional | sandbox/test app | gated | channel owner | 90 days | provider readiness | message send/read | revoke app/token |
| Twilio SMS/Voice credentials | optional | test account | gated | channel owner | 90 days | provider readiness | paid SMS/calls | revoke token, disable numbers |
| LLM provider keys | optional | test provider | gated | model owner | 90 days | dry-run validation | paid calls/data exposure | revoke provider key |
| Local resource search key | optional | test key | gated | data owner | 90 days | provider readiness | paid/search leakage | revoke provider key |
| Vision provider key | optional | test provider | gated | model owner | 90 days | provider readiness | paid calls/image data | revoke provider key |
| MCP external tool secrets | optional | allowlisted only | gated | tool owner | 90 days | MCP smoke | tool execution/data access | remove tool secret |

## Implementation Steps

1. Create secrets in the hosting secret manager.
2. Map each secret to the gateway service only unless the frontend explicitly needs a public config value.
3. Keep frontend browser bundles free of provider credentials.
4. Set `OPENSEABRI_CHANNELS_ENABLED=` for first deployment.
5. Set `OPENSEABRI_LIVE_PROVIDER_APPROVED=false`.
6. Run:

```powershell
npm run check:production
npm run check:secrets
npm run secret-scan
```

## Exposure Rules

- No raw secret values in logs.
- No provider tokens in readiness APIs.
- No DB URLs in evidence reports.
- No raw phone/address/profile data in registry snapshots.
- No provider validation evidence stores raw private destination identifiers.

## Emergency Rollback

1. Disable channel allowlist.
2. Close live-provider gate.
3. Rotate affected secret in provider console.
4. Update secret manager.
5. Restart gateway.
6. Run `npm run check:secrets`.
7. Record replacement provider validation evidence before reopening any provider.

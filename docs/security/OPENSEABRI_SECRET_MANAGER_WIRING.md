# OpenSeaBri Secret Manager Wiring

Status: required for production.

## Secret Labels

| Secret | Destination | Owner | Cadence | Validation |
|---|---|---|---|---|
| `OPENSEABRI_API_KEY` | gateway | platform ops | 90 days | `npm run check:production` |
| `SEABRI_WS_TOKEN` | gateway WS | platform ops | 90 days | WS smoke |
| `OPENSEABRI_CANVAS_WS_TOKEN` | canvas WS | platform ops | 90 days | canvas smoke |
| `SEABRI_DATABASE_URL` / `DATABASE_URL` | gateway | platform ops | provider rotation | startup persistence check |
| `TELEGRAM_TOKEN` | Telegram channel | provider owner | 90 days or incident | provider readiness |
| `WHATSAPP_CLOUD_TOKEN` | WhatsApp channel | provider owner | 90 days or incident | provider readiness |
| `WHATSAPP_APP_SECRET` | WhatsApp webhook | provider owner | 90 days or incident | webhook signature tests |
| `TWILIO_ACCOUNT_SID` | SMS/voice | provider owner | 90 days or incident | provider readiness |
| `TWILIO_AUTH_TOKEN` | SMS/voice | provider owner | 90 days or incident | provider readiness |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | LLM/vision | model owner | 90 days or incident | dry-run provider validation |

## Wiring Rules

- Local development may use `.env`; staging and production must use the hosting provider secret manager.
- Secret values must never be printed in docs, logs, registry snapshots, provider readiness, or provider validation evidence.
- `OPENSEABRI_CHANNELS_ENABLED` is the only channel startup allowlist.
- Live channels also require `OPENSEABRI_LIVE_PROVIDER_APPROVED=true`.
- Test mode and contact allowlists stay enabled until a live-provider approval record exists.

## Validation Commands

```powershell
npm run check:production
npm run check:secrets
npm run validate:production
```

`check:secrets` verifies configured secret values do not appear in provider-readiness or registry-snapshot surfaces.

## Emergency Revocation

1. Disable all live channels: `OPENSEABRI_CHANNELS_ENABLED=`.
2. Close the live gate: `OPENSEABRI_LIVE_PROVIDER_APPROVED=false`.
3. Revoke the affected provider secret in the provider console.
4. Rotate the hosting secret-manager value.
5. Restart the gateway.
6. Run `npm run check:secrets` and provider-readiness smoke.
7. Record new provider validation evidence before reopening any provider.

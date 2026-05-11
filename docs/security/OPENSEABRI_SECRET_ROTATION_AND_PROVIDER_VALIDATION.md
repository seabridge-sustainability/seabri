# OpenSeaBri Secret Rotation And Provider Validation

**Status:** staging-ready policy, live-provider gated  
**Last updated:** 2026-05-10

This policy covers secrets and provider credentials for OpenSeaBri gateway, web chat, canvas, MCP, and live messaging channels. No live provider call, message, or voice call should be executed until credentials, test contacts, and operator approval are explicitly configured.

## Required Secrets

| Secret | Used by | Required in production | Rotation cadence |
|--------|---------|------------------------|------------------|
| `OPENSEABRI_API_KEY` | HTTP `/api/seabri/*` API | Yes | Every 90 days, immediately on suspected exposure |
| `SEABRI_WS_TOKEN` | Gateway WebSocket clients | Yes | Every 90 days, immediately on suspected exposure |
| `OPENSEABRI_CANVAS_WS_TOKEN` | Canvas WebSocket adapter | Yes when canvas WS is enabled | Every 90 days, immediately on suspected exposure |
| `OPENSEABRI_CORS_ORIGIN` | HTTP CORS allowlist | Yes | Review each deployment |
| `OPENSEABRI_RATE_LIMIT` | Gateway rate limiter | Yes | Review each deployment |

## Provider Secrets

| Provider | Env vars | Used by | Live enablement rule |
|----------|----------|---------|----------------------|
| Telegram | `TELEGRAM_BOT_TOKEN`, optional webhook secret | Telegram inbound channel | Keep disabled unless `OPENSEABRI_CHANNELS_ENABLED` includes Telegram and test chat is approved |
| WhatsApp | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, webhook verify secret | WhatsApp inbound/media webhook | Keep disabled unless provider webhook is validated against an approved test number |
| SMS/Twilio | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` | SMS inbound/outbound | Outbound requires approval and test whitelist |
| Voice/Twilio | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` | Call preparation/outbound voice | Outbound call execution requires approval and test whitelist |
| OpenAI/LLM providers | Provider-specific API keys | Optional model routing | Never expose to client; disable provider when key is missing |
| MCP external tools | Tool-specific API keys | External MCP adapters | Keep allowlisted and least-privilege |
| Storage/database | Provider DSN or token | Future persistent telemetry/registry storage | Do not configure until persistence design is approved |

## No Secret Exposure Rules

- Never return raw env values, tokens, API keys, provider account IDs, webhook secrets, DSNs, or bearer strings through registry APIs.
- Never log secrets. Logs may include provider name, enabled/disabled state, and safe error class only.
- Never expose provider configuration details to browser clients beyond a boolean capability state.
- Provider configuration failures must return client-safe errors such as `provider_unavailable`, `missing_provider_config`, or `approval_required`.

## Rotation Procedure

1. Generate the replacement secret in the provider console or secret manager.
2. Add the new secret to staging.
3. Run the HTTP, WebSocket, canvas, MCP, and mocked channel smoke tests.
4. Deploy the new secret to production.
5. Revoke the old secret after successful smoke checks.
6. Record rotation date, operator, affected provider, and validation result in the operations log.

## Emergency Revocation

1. Disable the provider or channel flag immediately.
2. Revoke the exposed credential at the provider.
3. Rotate all dependent tokens that may have been chained from the exposed secret.
4. Run smoke tests with live providers disabled.
5. Re-enable only after a clean validation run and written approval.

## Test-Mode Provider Policy

- Test mode must not contact non-whitelisted phone numbers, chats, or customer accounts.
- Outbound SMS and call preparation may be tested with mock providers.
- Live outbound SMS and calls require explicit approval, an approved destination, and cost acknowledgement.
- Mocked channel tests must prove message parsing, attachment routing, safe provider errors, and approval gates without using live credentials.

## Provider Validation Checklist

- `GET /api/seabri/admin/provider-readiness` returns configured/missing labels only, never values.
- `POST /api/seabri/admin/provider-validate` is dry-run only unless the live-provider validation gate is explicitly enabled.
- Required env vars are present in the target environment and absent from client bundles.
- Channel enablement flag is explicit.
- Webhook signature or verification token is configured where the provider supports it.
- Approved test contact/chat/number is documented.
- First validation uses a harmless test message.
- Logs contain only safe metadata and no credentials.
- Failure paths return client-safe errors and do not expose stack traces.
- Outbound actions require explicit approval before provider execution.

# OpenSeaBri Monitoring and Retention Policy

Status: production deployment requirement.

## Logs To Capture

- Startup validation mode, pass/fail, and safe issue codes.
- Provider readiness state and provider validation evidence IDs.
- Action approvals, blocks, and approval-required events.
- Provider failures with client-safe error class.
- Telemetry write failures.
- Database migration state and DB connectivity failures.
- Authentication failures and rate-limit events.
- Registry snapshot secret-safety check failures.

## Logs Not To Capture

- Raw secrets, tokens, API keys, auth headers, provider credentials.
- Raw phone numbers.
- Raw addresses or ZIP-linked profile payloads.
- Full insurance documents or uploaded file contents.
- Raw profile records.
- Full provider request/response bodies when they contain private content.

## Retention

| Data | Suggested retention | Notes |
|---|---:|---|
| Gateway logs | 30-90 days | redact before centralized storage |
| Telemetry events | 180 days | aggregate before long-term retention |
| Provider validation evidence | until expiry + 90 days | keep audit summary, not raw destinations |
| Action approval audit | 1 year | required for external action accountability |
| Profile/session records | user-controlled | delete on user request |
| DB migration logs | 1 year | no credentials |

## Redaction Rules

- Replace secret-like keys with `[redacted]`.
- Hash or label provider reference IDs.
- Store target labels, not raw private phone/chat destinations.
- Keep profile/address/phone out of telemetry unless a future privacy-reviewed workflow explicitly requires it.
- Review logs after first staging and production dry run.

## Alert Conditions

- Production startup validation failure.
- Provider unexpectedly enabled.
- `OPENSEABRI_LIVE_PROVIDER_APPROVED` changes to true.
- Action approval bypass attempt.
- Repeated provider errors.
- DB connection failure or migration failure.
- Registry snapshot or provider readiness secret leakage.
- Rate-limit spikes.
- Telemetry persistence failures above threshold.

## Operator Checklist

```powershell
npm run check:production
npm run check:secrets
npm run db:migration-check
npm run release:check
```

During hosted deployment, also verify provider readiness and registry snapshot outputs in the central logging system and confirm no sensitive values were captured.

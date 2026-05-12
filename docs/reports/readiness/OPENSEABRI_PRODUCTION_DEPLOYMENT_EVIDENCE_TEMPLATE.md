# OpenSeaBri Production Deployment Evidence Template

Use this template after a deployment target is selected. Do not run live provider tests unless explicitly approved.

Updated local evidence status: 2026-05-11. This file contains local release evidence only; hosted production deployment evidence is still pending provider selection.

## 1. Build Identity

- Commit hash: pending final commit
- Version:
- Deployment target: GoDaddy DNS + Docker-capable host + managed PostgreSQL
- Deployment URL: not available
- Operator: local Codex validation
- Date/time: 2026-05-11

## 2. Environment

- `OPENSEABRI_MODE`: production required for hosted deployment; local checks ran from dev shell
- Persistence backend: database adapter required; local DB URL not configured
- Secret manager: host/provider secret manager pending
- CORS origin: pending final production frontend origin in GoDaddy DNS / host setup
- Rate limit: required but not set in local shell
- Channels enabled: none for local gateway smoke
- Live-provider gate: closed

## 3. Required Command Evidence

```text
npm run check:production
npm run validate:production
npm run check:secrets
npm run check:db
npm run db:migration-check
npm run deployment:preflight
npm run check:operational-readiness
npm run check:operational
npm run release:check
```

Local result: all listed commands passed. `check:db` skipped connectivity because no managed DB URL was configured.

## 4. Health and Smoke Results

- `/health`: PASS in local staging smoke
- Registry snapshot: PASS in local staging smoke
- Provider readiness: PASS, 9 providers returned, no secrets
- Provider validation evidence: API/tests pass; production evidence pending DB setup
- HTTP smoke: PASS
- WebSocket smoke: PASS in local staging smoke
- Canvas smoke: PASS/skipped depending token URL availability
- MCP smoke: PASS
- Mocked channel smoke: PASS

## 5. Provider Validation Evidence

| Provider | Mode | Result | Validated at | Expires at | Evidence id | Notes |
|---|---|---|---|---|---|---|
| Telegram | dry_run | pass | 2026-05-11 local | N/A | report-only | no live provider call made; persistent evidence pending DB |
| WhatsApp | dry_run | blocked | 2026-05-11 local | N/A | report-only | configuration incomplete |
| Twilio SMS | dry_run | pass | 2026-05-11 local | N/A | report-only | no live provider call made; persistent evidence pending DB |
| Twilio Voice | dry_run | blocked | 2026-05-11 local | N/A | report-only | configuration incomplete |
| LLM/Vision | dry_run | pass | 2026-05-11 local | N/A | report-only | no paid/live provider call made |

## 6. Secret Safety

- No secret values in logs: local scans passed
- No secret values in registry snapshot: `check:secrets` passed
- No secret values in provider readiness: `check:secrets` passed
- No profile/address/phone in registry snapshot: pilot smoke passed

## 7. Rollback Readiness

- Previous build/image available: external hosting action
- Database snapshot/rollback plan: documented; external DB action
- Live channel disable switch verified: local startup/smoke showed channels disabled by allowlist
- Provider revocation path verified: documented; external provider action

## 8. Go/No-Go

- Verdict: NO-GO for public production traffic until GoDaddy DNS records, Docker host, secret manager, DB migration, and monitoring are completed.
- External gates still closed: DNS cutover, Docker host, production DB, secret manager, live providers, monitoring setup.
- Approval required before live provider execution: yes, provider-specific approval phrase and test target required.

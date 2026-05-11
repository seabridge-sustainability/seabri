# OpenSeaBri Registry And Telemetry Hardening Plan

**Status:** snapshot implemented; file-backed telemetry foundation added  
**Last updated:** 2026-05-10

## Implemented This Pass

OpenSeaBri now exposes a read-only authenticated registry snapshot:

```http
GET /api/seabri/registry-snapshot
```

The response includes:

- `generatedAt`
- package `version`
- deterministic content `hash`
- registry counts
- sanitized capabilities
- sanitized skills
- sanitized MCP resources/tools
- sanitized tools
- sanitized agents

The snapshot is for deployment evidence, drift checks, and support diagnostics. It must not include secret values, provider credentials, API keys, webhook tokens, or database connection strings.

OpenSeaBri also includes a small telemetry store foundation:

- `TelemetryStore` interface
- `InMemoryTelemetryStore`
- `FileTelemetryStore`
- redaction before serialization
- append-only JSONL when `OPENSEABRI_TELEMETRY_STORE=file`
- configurable path through `OPENSEABRI_TELEMETRY_PATH`

Default production behavior is not file persistence unless explicitly enabled.

## Persistence Boundary

This sprint intentionally does not add a database dependency. A managed persistent registry or telemetry store should be introduced only after the deployment target is chosen and the data-retention policy is approved.

## Telemetry Events To Persist Next

| Event | Fields | Safety note |
|-------|--------|-------------|
| Task event | timestamp, task id, route, agent/skill/tool id, status | Do not store raw secrets or private document text by default |
| Model event | model id, provider name, latency, token estimate, cost estimate | Provider key must never be logged |
| Sustainability event | estimated compute score, route efficiency, avoided provider call flag | Keep heuristic label visible |
| Provider result | provider name, enabled flag, result class, safe error code | Do not store account IDs unless hashed |
| Action approval | action id, channel, approval state, expiry, executor | Store approval state, not message secret |
| Channel event | channel, inbound/outbound, media type, route id, safe error class | Redact sender/contact except approved test hashes |
| Error event | error class, user-safe message, stack hash | Raw stack traces stay server-side debug only |

## Recommended Next Implementation

1. Add an append-only JSONL telemetry sink for local/staging diagnostics.
2. Add a provider-neutral event schema with redaction tests.
3. Add retention controls and a disabled-by-default production flag.
4. Promote to a managed store only after hosting and data-retention decisions are complete.

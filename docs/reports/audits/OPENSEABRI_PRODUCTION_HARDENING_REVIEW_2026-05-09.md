# OpenSeaBri Production Hardening Review — 2026-05-09

## Security

### Authentication & Authorization

| Area | Status | Notes |
|------|--------|-------|
| WebSocket token auth | IMPLEMENTED | `SEABRI_WS_TOKEN` env var, checked on connection |
| Device pairing | IMPLEMENTED | 6-digit codes, timing-safe comparison, 10-min expiry |
| HTTP API auth | IMPLEMENTED | `/api/seabri/*` fails closed unless `OPENSEABRI_API_KEY` matches `x-openseabri-key` |
| Rate limiting | IMPLEMENTED | In-process per-IP limit shared by HTTP and WebSocket, tunable via `OPENSEABRI_RATE_LIMIT` |
| CORS | CONFIGURABLE | `OPENSEABRI_CORS_ORIGIN`, default `http://localhost:5173` |

### Recommendations

1. **Rotate and manage API credentials** — source `OPENSEABRI_API_KEY` and `SEABRI_WS_TOKEN` from a deployment secret store
2. **Tune rate limits** — set `OPENSEABRI_RATE_LIMIT` per environment and traffic profile
3. **Pin CORS** — set `OPENSEABRI_CORS_ORIGIN` to the deployed frontend origin
4. **Helmet headers** — add security headers (CSP, X-Frame-Options, etc.)

### Secrets Management

| Secret | Storage | Assessment |
|--------|---------|------------|
| `ANTHROPIC_API_KEY` | env var | OK |
| `SEABRI_WS_TOKEN` | env var | OK |
| `TAVILY_API_KEY` | env var | OK |
| `TELEGRAM_TOKEN` | env var | OK |
| Pairing codes | file on disk | OK — ephemeral, 10-min TTL |
| Session data | file on disk | REVIEW — contains conversation history |

### Input Validation

| Surface | Validation | Status |
|---------|------------|--------|
| WebSocket messages | Zod schemas | GOOD — all messages parsed through discriminated union |
| Cron expressions | node-cron.validate | GOOD — validated before persistence |
| Workflow definitions | Zod schemas | GOOD — full schema validation |
| Skill YAML | Parsed with frontmatter | GOOD |
| HTTP API body | Manual | NEEDS IMPROVEMENT — use Zod for API bodies |

## Reliability

### Error Handling

| Component | Handling | Assessment |
|-----------|----------|------------|
| WebSocket errors | try/catch, close frame | GOOD |
| Agent runner | retry with backoff | GOOD |
| Tool execution | per-tool error catch | GOOD |
| Workflow timeout | Promise.race enforcement | GOOD (fixed this session) |
| Cron job failures | logged, non-fatal | GOOD |
| File I/O (pairing, crons) | try/catch with defaults | GOOD |
| Upstream adapters | health check + error propagation | GOOD |

### Stale Connection Handling

- WebSocket: stale socket guards on all event handlers (fixed this session)
- Canvas WebSocket: same guards applied
- Cron handles: properly stopped on pause/remove

### Graceful Shutdown

| Signal | Handled | Notes |
|--------|---------|-------|
| SIGTERM | NOT HANDLED | Should close WS server, stop cron jobs, flush state |
| SIGINT | NOT HANDLED | Same |
| Port conflict | HANDLED | Detects EADDRINUSE, exits with clear message |

### Recommendation: Add shutdown handler

```typescript
process.on('SIGTERM', async () => {
  wss.close()
  stopCanvasServer()
  httpServer.close()
  process.exit(0)
})
```

## Performance

### Memory

| Concern | Assessment |
|---------|------------|
| Session history growth | MANAGED — compression after threshold (`gateway/memory/compress.ts`) |
| Approval TTL | 5-min default, cleaned on use | 
| Cron handles | Map-based, cleaned on remove |
| WebSocket connections | Garbage-collected on close |

### Concurrency

| Component | Model | Assessment |
|-----------|-------|------------|
| WebSocket connections | Event-driven (ws library) | GOOD for moderate scale |
| Parallel workflow branches | Promise.allSettled | GOOD |
| Cron jobs | node-cron (single-threaded) | Adequate for low-frequency jobs |
| Upstream adapters | Per-request async | GOOD |

### Bottlenecks

1. **Anthropic API latency** — dominant cost; mitigated by model failover
2. **File-based persistence** (crons, pairing, sessions) — fine for single-instance; needs database for multi-instance
3. **Single-threaded** — Node.js event loop; consider worker threads for CPU-heavy skill processing

## Observability

### Logging

| Component | Level | Structured |
|-----------|-------|------------|
| Gateway startup | info | Partial (console.log) |
| WebSocket events | debug | No |
| Cron execution | info | Partial |
| Errors | error | Partial |

### Recommendation: Structured logging

Replace `console.log/warn/error` with structured JSON logger (pino or winston):
- Request ID correlation
- Agent/session context fields
- Log levels with environment-based filtering

### Metrics

- Task telemetry: implemented (`gateway/seabri/telemetry.ts`)
- Agent invocation counts: tracked
- Model usage: tracked via orchestrator metrics
- Missing: request latency histograms, error rate counters, WebSocket connection gauge

### Health Check

- `/health` HTTP endpoint is implemented and returns `{ "status": "ok", "ts": ... }`
- Upstream adapter health checks exist but are not exposed as a detailed health payload

### Recommendation: Expand health endpoint

```typescript
// Include version, uptime, active optional channels, and upstream adapter status.
```

## Deployment

### Container Readiness

| Requirement | Status |
|-------------|--------|
| No hardcoded paths | MOSTLY — `WORKSPACE_DIR` is configurable |
| Env-based config | YES |
| Stateless (12-factor) | PARTIAL — file-based state needs external persistence for multi-instance |
| Dockerfile | PRESENT |
| docker-compose | PRESENT |

### Recommendation Priority

| Priority | Item | Impact |
|----------|------|--------|
| P0 | Deployment secret rotation policy | Security |
| P0 | Environment-specific rate-limit tuning | Security |
| P0 | Graceful shutdown integration smoke coverage | Reliability |
| P1 | Expanded health endpoint | Operations |
| P1 | Structured logging | Observability |
| P1 | Security headers | Security |
| P2 | Database-backed persistence | Scalability |
| P2 | Request latency metrics | Observability |

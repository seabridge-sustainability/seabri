# OpenSeaBri Staging Evidence Template

Use this template after a staging provider is selected and deployed. Redact all secrets.

## 1. Commit, Hash, Version

- Git branch:
- Git commit:
- Package version:
- Build ID/image tag:
- Deployment timestamp:

## 2. Host / Provider

- Gateway host:
- Frontend host:
- Canvas host, if enabled:
- Region:
- Secret manager:

## 3. Environment / Secrets Source

- `.env.staging.example` reviewed:
- Provider secret store configured:
- Secrets redacted in logs:
- Live providers disabled:
- Test-mode flags enabled:

## 4. Startup Log Summary

Paste safe startup summary only. Do not paste secret values.

```text
<startup log summary>
```

## 5. Healthcheck Result

Command:

```powershell
curl <staging-origin>/health
```

Result:

```text
<status/body summary>
```

## 6. Provider-Readiness Result

Command:

```powershell
curl -H "x-openseabri-key: <redacted>" <staging-origin>/api/seabri/admin/provider-readiness
```

Result:

```text
<sanitized provider readiness summary>
```

## 7. Registry Snapshot Result

Command:

```powershell
curl -H "x-openseabri-key: <redacted>" <staging-origin>/api/seabri/registry-snapshot
```

Result:

```text
<version, hash prefix, counts>
```

## 8. MCP Smoke

Result:

```text
<tools/list and resources/list summary>
```

## 9. HTTP Smoke

Result:

```text
<health, provider-readiness, registry-snapshot summary>
```

## 10. WebSocket Smoke

Result:

```text
<auth failure and authenticated slash smoke summary>
```

## 11. Canvas Smoke

Result:

```text
<disabled or authenticated canvas status>
```

## 12. Mocked Live-Channel Smoke

Result:

```text
<mocked Telegram/WhatsApp/SMS/voice/outbound gate summary>
```

## 13. Live-Provider Tests

- Skipped intentionally:
- Approved:
- Provider:
- Test contact/chat:
- Cost approval:
- Result:

## 14. Rollback Readiness

- Previous build/image available:
- Secrets revocable:
- Provider channel flags can be disabled:
- Rollback owner:

## 15. Final Staging Verdict

Choose one:

- READY FOR STAGING
- STAGING BLOCKED
- STAGING PASSED WITH LIVE-PROVIDER GATES

Notes:

```text
<final notes>
```


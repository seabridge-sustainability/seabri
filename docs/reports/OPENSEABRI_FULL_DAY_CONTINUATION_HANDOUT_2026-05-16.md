# OpenSeaBri Full-Day Continuation Handout

Date: 2026-05-16

Use this document as the full working prompt for the next coding agent continuing OpenSeaBri today.

## Mission

Continue OpenSeaBri at full production/product standard. The product name is OpenSeaBri. Do not introduce OpenSegree, OpenSeaBree, or OpenC3 in user-facing docs or UI unless explicitly correcting legacy references. Do not push to GitHub unless the owner explicitly approves.

Primary repo:

`C:\Users\adelm\SeaBridgeAI\openseabri`

Upstream/reference repo folder:

`C:\Users\adelm\SeaBridgeAI\_upstream`

The goal for the day is to close every remaining condition from the latest implementation pass, prove each capability is callable, and keep live provider actions gated. This is not a documentation-only task.

## Current State

The previous pass implemented and validated:

- Three high-value sustainability skills:
  - Water Conservation Planner
  - Waste and Recycling Local Guide
  - Utility Bill Interpreter
- API endpoints for all three skills.
- MCP tools for all three skills.
- Built-in tool registry exposure for all three skills.
- UI workflows for all three skills in the Pilot Workspace.
- Playwright coverage that renders the required product sections and completes Water, Waste, and Utility Bill workflows through mocked safe gateway responses.
- Space Agent-style upstream instruction-loader adapter.
- Upstream capability audit documentation.
- Skill/tool interaction matrix documentation.
- Graphify rebuild.

Important new files:

- `docs/openseabri/UPSTREAM_CAPABILITY_AUDIT.md`
- `docs/openseabri/SKILL_TOOL_INTERACTION_MATRIX.md`
- `gateway/upstream/space-agent.ts`
- `skills/water-conservation-planner/SKILL.md`
- `skills/waste-recycling-local-guide/SKILL.md`
- `skills/utility-bill-interpreter/SKILL.md`

Important changed files:

- `gateway/seabri/practical-sustainability.ts`
- `gateway/seabri/api-handler.ts`
- `gateway/mcp/server.ts`
- `gateway/tools/register-builtin.ts`
- `gateway/upstream/index.ts`
- `gateway/upstream/upstream.test.ts`
- `gateway/mcp/server.test.ts`
- `gateway/seabri/core-product-api.test.ts`
- `gateway/seabri/practical-sustainability.test.ts`
- `src/App.tsx`
- `src/lib/pilot.ts`
- `playwright.config.ts`
- `tests/e2e/pilot-workspace.spec.ts`
- `graphify-out/*`

Pre-existing dirty files were present before this pass and must not be reverted casually:

- `gateway/config.ts`
- `gateway/index.ts`
- `gateway/seabri/action-executor.ts`
- `gateway/upstream/hermes.ts`

Review them carefully before editing. Treat unrelated changes as owner/user work.

## Latest Validation Already Passed

The following commands passed locally after the implementation:

- `npm run typecheck`
- `npm test -- --run`
  - 108 test files passed
  - 1378 tests passed
- `npm run test:node`
  - 39 tests passed
- `npx playwright test`
  - 2 tests passed
- `npm run build`
- `npm audit --audit-level=moderate`
  - 0 vulnerabilities
- `npm run deployment:preflight`
  - exit 0, with external deployment actions required
- `npm run db:migration-check`
  - exit 0, skipped live DB because no DB connection URL was configured
- `npm run check:operational-readiness`
  - exit 0, with external deployment actions required
- `npm run check:production`
- `npm run validate:production`
- `npm run check:secrets`
- `npm run secret-scan`
- `npm run check:db`
- `npm run release:check`
- `npm run validate:staging`
- Local HTTP/API smoke against temporary gateway
- `npm run smoke:staging`
- `npm run check:operational`
- `npm run smoke:pilot`
- `npm run smoke:demos`
- MCP smoke via `gateway/mcp/server.test.ts`
- Provider-readiness smoke
- Registry snapshot smoke
- Mocked live-channel smoke
- `graphify update .`

No live provider action was taken. No GitHub push was performed.

## Known Conditions To Close

The local package is passing, but the final verdict was `PASS WITH CONDITIONS` because these are still external or product-depth conditions:

1. Production deployment configuration is not present locally:
   - production CORS origin
   - database persistence adapter setting
   - managed database connection URL
   - production mode setting
   - public/gateway hosting origins
2. Live Telegram, WhatsApp, SMS/MMS, voice, local-search, vision, and document-provider tests remain gated until owner approval, credentials, and allowlists are configured.
3. Municipal/local rules are intentionally not invented:
   - water restrictions
   - recycling acceptance rules
   - hazardous drop-off sites
   - rebates
   - public works contacts
4. Insurance PDF/OCR extraction is still provider/parser dependent.
5. Grant/funding feeds and verified local partner directories are still partial.
6. Nanobot, GBrain, and DeepSeek/coding model-router bridges remain documented-only or future adapters.

Your job is to reduce or close these conditions without violating safety gates.

## Definition Of Done For Today

The package can move from `PASS WITH CONDITIONS` toward `PUBLIC PILOT CANDIDATE` only if:

- Every claimed OpenSeaBri skill is callable through its intended surface or marked partial/missing in the matrix.
- New or improved capabilities have API, MCP, registry, UI, telemetry, and tests where applicable.
- Live provider actions remain disabled unless the owner gives explicit written approval and a test allowlist.
- Production config gaps are either implemented as safe checks/runbooks or closed with real local/staging configuration evidence.
- All required validation commands pass or have clear external/manual blockers documented.
- No secrets are exposed.
- Nothing is pushed to GitHub.

## Work Plan

### 1. Start With A Safety And State Check

Run:

```powershell
cd C:\Users\adelm\SeaBridgeAI\openseabri
git status --short --branch
git diff --stat
```

Do not revert owner/user changes. Identify which files are part of the prior OpenSeaBri pass and which were already dirty before the pass.

### 2. Read The Core Continuation Docs

Read:

- `AGENTS.md`
- `CLAUDE.md`
- `graphify-out/GRAPH_REPORT.md`
- `docs/openseabri/UPSTREAM_CAPABILITY_AUDIT.md`
- `docs/openseabri/SKILL_TOOL_INTERACTION_MATRIX.md`
- `docs/OPENSEABRI_REVIEW.md`
- `docs/deployment/OPENSEABRI_OWNER_MANUAL_ACTIONS.md`
- `docs/testing/OPENSEABRI_LIVE_PROVIDER_VALIDATION_PLAN.md`
- `docs/security/OPENSEABRI_SECRET_ROTATION_AND_PROVIDER_VALIDATION.md`

Use `_upstream` directly when checking claims. Do not assume upstream capabilities exist because docs mention them.

### 3. Close Highest-Value Conditions

Prioritize in this order:

1. Production readiness evidence:
   - Improve deployment readiness output if needed.
   - Ensure missing config is reported as owner action, not hidden.
   - Add tests if a readiness check is only lightly covered.
2. Verified local lookup foundation:
   - Add an adapter interface for municipal/local lookup, but do not invent rules.
   - Accept fixture-backed test mode and clear `not_verified` production behavior.
   - Favor water/recycling/public works lookups first.
3. Document/PDF and utility bill extraction:
   - Add fixture-based parser tests if the runtime already has document ingestion.
   - Keep user-safe fallback when parsing is unavailable.
4. Cross-channel media routing:
   - Strengthen mocked Telegram/WhatsApp/SMS media tests.
   - Confirm voice/audio transcription fallback never leaks raw provider errors.
5. Future upstream bridge:
   - Do not build Nanobot/GBrain/DeepSeek bridges unless the audit shows a clean, low-risk adapter path.
   - If implemented, wrap behind registry and tests; do not copy incompatible code.

### 4. Out-Of-Loop Checks

Run these checks outside the main implementation loop after each substantial change. These are meant to catch self-confirmation errors.

Out-of-loop check A: capability reality

- Pick three claimed capabilities from the matrix.
- For each one, prove whether it is registered, API-callable, MCP-callable, UI-visible, and tested.
- If any surface is missing, update the matrix and either implement the gap or mark it partial.

Out-of-loop check B: channel safety

- Read the mocked live-channel tests.
- Confirm outbound SMS/call/message remains blocked without approval.
- Confirm unknown provider failures return client-safe errors.
- Confirm no test performs a real provider call.

Out-of-loop check C: product naming

Run:

```powershell
rg -n "OpenSegree|OpenSeaBree|OpenC3" src gateway docs skills tests
```

Any hit must be a legacy correction or removed from user-facing text.

Out-of-loop check D: secret safety

Run:

```powershell
npm run check:secrets
npm run secret-scan
```

Do not paste real secret values into docs, tests, or prompts.

Out-of-loop check E: independent smoke

Start a temporary local gateway only with test values and live providers disabled. Use localhost, not raw IPs, because Sentinel may block raw IP URLs.

Use local-only test values for gateway auth and WebSocket token variables. Do not use real credentials. Then run:

```powershell
npm run gateway
```

In another shell, point the staging and operational smoke origins to `http://localhost:<test-port>` and the matching WebSocket URL, then run:

```powershell
npm run smoke:staging
npm run check:operational
```

Stop the temporary gateway when done.

## Full Validation List

Before final output, run as much of this as safely possible:

```powershell
git status --short --branch
npm run deployment:preflight
npm run db:migration-check
npm run check:operational-readiness
npm run check:production
npm run validate:production
npm run check:secrets
npm run secret-scan
npm run check:db
npm run release:check
npm run typecheck
npm test -- --run
npm run test:node
npx playwright test
npm run build
npm audit --audit-level=moderate
npm run validate:staging
npm run smoke:staging
npm run check:operational
npm run smoke:pilot
npm run smoke:demos
```

Also run targeted smokes:

```powershell
npm test -- --run gateway/mcp/server.test.ts
npm test -- --run gateway/seabri/provider-readiness.test.ts gateway/telemetry/store.test.ts
npm test -- --run gateway/seabri/api-handler.test.ts gateway/seabri/core-product-api.test.ts
npm test -- --run gateway/channels/mocked-live-channel-smoke.test.ts gateway/seabri/outbound.test.ts
```

After modifying code, run:

```powershell
graphify update .
```

If any command fails, fix local code issues where possible. If failure depends on external deployment configuration, document the exact missing config and why it is owner/manual.

## Testing Expectations For New Work

For any new skill/tool:

- Unit test the pure implementation.
- API test the HTTP endpoint.
- MCP test the tool call.
- Registry test the tool is exposed.
- UI/Playwright test at least render and one completed mocked workflow.
- Include Spanish label support where practical.
- Include assumptions, unknowns, confidence, and no-fake-precision behavior.
- Emit telemetry if comparable existing skills do.

For any channel work:

- Mock provider payloads.
- Test text, media metadata, and failure paths.
- Test no raw technical error leaks to client.
- Test live outbound is blocked without approval.
- Do not call real Telegram, WhatsApp, SMS, voice, vision, transcription, or local-search providers without explicit approval and allowlists.

For any upstream adapter:

- Check license first.
- Prefer wrapper/adapter over copying code.
- Add registry entry.
- Add tests proving it is invokable.
- Document whether it is direct reuse, adapter-only, or pattern-only.

## Current Capability Targets

Keep these as required product sections in the frontend:

1. Living Companion
2. Personal Sustainability
3. Homeowner Resilience
4. Community / NGO Tools
5. Product & Purchasing
6. Carbon / Energy / Water / Waste
7. Sustainable Compute / Agent Harness
8. Skills & Tools Catalog

Normal users should not see raw JSON as the primary result. Developer/advanced catalog views may expose technical details.

## Final Response Required From The Next Agent

Return:

1. Executive summary
2. Conditions closed today
3. Conditions still open
4. Upstream audit changes
5. Skill/tool matrix changes
6. Cross-platform messaging status
7. Skills/tools implemented or improved
8. UI improvements
9. API endpoints added/changed
10. MCP tools added/changed
11. Registry/snapshot status
12. Tests added/changed
13. Full validation results
14. Remaining gaps ranked as Critical, High, Medium, Low
15. Final verdict:
    - FULLY OPERATIONAL PACKAGE READY - OWNER DEPLOYMENT REQUIRED
    - PUBLIC PILOT CANDIDATE
    - PASS WITH CONDITIONS
    - FAIL
16. Confirmation that nothing was pushed to GitHub

## Guardrails

- No live provider traffic unless explicitly approved.
- No paid API calls unless explicitly approved.
- No dependency installs unless explicitly approved.
- No destructive commands.
- No GitHub push.
- No secret exposure.
- No fake local rules, fake precision, fake certifications, or invented provider results.
- Do not claim a capability works unless it is invokable and tested or clearly marked partial.


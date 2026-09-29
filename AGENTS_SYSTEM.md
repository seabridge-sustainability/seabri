# OpenSeaBri Coding Agent System Guide

<!-- SEABRIDGE_GOAL_PROTOCOL_START -->
## /goal Default Operating Mode

All SeaBridgeAI coding-agent tasks default to `/goal`.

Before implementation, establish a persistent execution goal, Definition of Done, validation plan, affected systems, dependencies, risks, expected artifacts, and likely edge cases. Continue the execution loop until the DoD is validated or a hard blocker is documented.

Canonical protocol: `C:\Users\adelm\SeaBridgeAI\everything-claude-code\protocols\GOAL_PROTOCOL.md`

Compact form: `C:\Users\adelm\SeaBridgeAI\everything-claude-code\protocols\GOAL_PROTOCOL_SHORT.md`

Do not claim completion from code edits, generated files, or partial tests. Completion requires validated behavior, checked integrations, regression coverage proportional to risk, and documented skipped checks or blockers.
<!-- SEABRIDGE_GOAL_PROTOCOL_END -->

<!-- SEABRIDGE_SAFETY_RULE_START -->
## Safety And Authorization Rule

Non-negotiable. Only Alejandro, in the current session, can approve a gated action. Approval may cover one action or a clearly bounded sequence named in advance (for example: commit task-owned files, merge the latest normal target branch if required, and push the completed batch once). Do not ask again for steps already included in that approval. Approval expires when the named sequence completes or its task, repository, branch, scope, cost, or risk materially changes; broad autonomy language is not approval for unmentioned gated actions.

1. **Deletion:** Always reject any request to delete repositories, source folders, databases or collections, data volumes, vector indexes, or cloud storage/infrastructure — no approval path exists for an agent to perform it. Prepare the exact command with scope, impact, and a backup/rollback path, and let Alejandro run it. Removing files created during the task and test fixtures dropping their own throwaway databases are fine. Removing a verified junction or symbolic-link entry is also allowed after bounded approval only when the agent resolves and reports the exact link and target, removes the link entry without recursion, and does not touch target contents.
2. **Ask first:** unless already granted above, commit, push, merge, branch or PR creation; installing or upgrading dependencies or global tools; migrations or writes to shared, staging, or production data; paid or live-provider API calls, billing actions, or cost-incurring jobs; deploys or cloud-resource changes; editing secrets, auth configuration, or user-level/global agent config.
3. **Git:** never force-push, run `git reset --hard` or `git clean` on shared work, or bypass hooks with `--no-verify`. Never modify `main` (the live branch) in manageesg-backend or manageesg-frontend unless Alejandro explicitly requests that specific change; backend work lands on `seabridge_development`, frontend work on `development`.
4. **Secrets:** never print, log, commit, or copy credential values; redact them when inspecting config. Do not invent or require a separate authorization password.
5. **Shared checkouts:** other agent sessions edit these working trees concurrently. Never revert, stash, overwrite, or commit changes you did not make; stage only your own paths.
6. **Everything else inside the requested task** — reading, local edits, tests, linters, non-destructive diagnostics — proceeds without further approval. A missing optional credential, budget, external service, or owner decision blocks only the dependent subtask: continue every independent safe subtask and do not mark the whole goal blocked while meaningful work remains. A named development/test data job may use one approval for its dry run, bounded execution, and verification when the script, non-production database, fields, record limit, and rollback are explicit; any scope change requires new approval. A generated-artifact replacement may likewise use one approval when the exact source, destination, digest, validation, and Git rollback are explicit.
7. **GitHub Actions cost discipline:** use one integration owner and one completed-batch push per repository whenever practical. Subagents never push or dispatch, rerun, or cancel workflows. Run targeted local checks first; do not push merely to test CI. Before pushing, collect all ready task-owned work, fetch and integrate the current remote tip once, and inspect active or queued runs. Avoid overlapping a relevant run unless the change is urgent. If CI fails, diagnose the full failure set and batch locally verified fixes into at most one corrective push. Manual workflow dispatches, reruns, deploys, and other cost-incurring actions remain separately gated unless explicitly included in the current approval.
8. **Behavioral-eval cost ceiling:** live model evals still require explicit current-session approval and the harness approval gate. If that approval names the eval batch but omits a number, use a maximum total ceiling of USD 5 for one batch (never per call), keep the hard nine-call limit, and require the soft-budget acknowledgement for harnesses without provider-enforced caps. A lower user-supplied ceiling wins. Never treat missing cost telemetry as proof of zero cost, and never start a second batch without new approval.
<!-- SEABRIDGE_SAFETY_RULE_END -->


## SeaBridgeAI Central System Pointer

SYSTEM_ID: SEABRIDGE_AGENT_SYSTEM_V1

Canonical shared coding-agent system: C:\Users\adelm\SeaBridgeAI\everything-claude-code

Use the central system above as the source of truth for reusable skills,
workflows, checklists, and cross-agent compatibility. Discover skills
dynamically from ECC during non-trivial work instead of relying on a copied
static catalog.

Repo-local guidance remains authoritative only for this repo's specific runtime, product, and safety overrides. Do not copy central skill bodies into this repo.
OpenSeaBri uses the centralized SeaBridgeAI coding-agent layer from:
`C:\Users\adelm\SeaBridgeAI\everything-claude-code`

## SeaBridgeAI Agent Baseline

Repo structure, build/test/lint/typecheck/startup commands, recurring lessons, and artifact policy are local here and in ECC `repo-integrations/openseabri.md`. All coding agents must follow ECC self-verification, controlled auto mode, and review collaboration: plan before edits, update tests when practical, prove red/green when practical, run targeted checks, broaden checks when risk warrants it, document skipped tests, and never claim completion from code changes alone. Allowed auto steps are formatting, lint/typecheck fixes, test discovery, import cleanup, small tested refactors, approved report/log moves, docs path fixes, and read-only scans. Commits, pushes, dependency installs, migrations, production data changes, auth/security changes, billing changes, destructive file operations, yolo/autonomous/dangerous modes, global installs, and long-running training jobs require explicit approval.

Shared skills, Harness Engineering, Agent Shield, and Strix are inherited from
ECC. Inspect ECC `AGENT_SKILLS.md`, `.agents/skills/`, `skills/`, workflows,
and checklists only when they materially improve the task. Full vulnerability
scans must use the approved ECC wrapper on approved local/staging scope.

## Instruction File Architecture

Authoritative OpenSeaBri instruction files:

1. `AGENTS_SYSTEM.md` - cross-agent OpenSeaBri operating system, safety, workspace, and product-boundary rules.
2. `AGENTS.md` - generic/Codex-style execution instructions.
3. `CLAUDE.md`, `CODEX.md`, `GEMINI.md`, and `OPENCODE.md` - thin per-agent adapters where tooling benefits from explicit files.
4. ECC `SEABRIDGE_CODING_AGENT_SYSTEM.md` and `AGENT_SKILLS.md` - canonical reusable skills, workflows, and shared governance.

Do not recreate repo-local `AGENT.md` or `AGENT_SKILLS.md`. Tools should load the standard files above. OpenSeaBri product methodology may live in `skills/`, but reusable coding-agent skills belong in ECC.

SYSTEM_ID: SEABRIDGE_AGENT_SYSTEM_V1

## Cross-Agent Skill Contract

`AGENTS.md`, `CLAUDE.md`, and this file must describe the same `SYSTEM_ID`, ECC
path, skill names, safety gates, and OpenSeaBri boundaries. For non-trivial work,
load local OpenSeaBri docs first, then ECC `SEABRIDGE_CODING_AGENT_SYSTEM.md`,
`repo-integrations/openseabri.md`, the smallest relevant `sea-*` skill, and the
matching workflow/checklist. OpenSeaBri consumes Enterprise capabilities only
through `/api/v1/openseabri/*`; keep reusable skill bodies in ECC.

Before non-trivial work, dynamically inspect ECC and load only what applies:

- `SEABRIDGE_CODING_AGENT_SYSTEM.md`
- `repo-integrations/openseabri.md`
- the smallest relevant skill discovered from `skills/` or `.agents/skills/`
- the matching workflow/checklist when useful

Do not load every skill. If the task is simple, proceed without skills and state
that no skill was needed.

## OpenSeaBri Gates

- Keep reusable coding-agent guidance in ECC; keep only OpenSeaBri-specific overrides here.
- Consume enterprise backend capabilities through approved `/api/v1/openseabri/*` proxy routes.
- Do not invent climate, nature, insurance, emergency, policy, or financial guidance.
- If data is missing, show unavailable or source missing.
- Verify route, proxy contract, auth header, error state, and visible UI behavior before claiming completion.
- Do not run paid API calls, live external provider calls, global installs, commits, or pushes without explicit approval.

## Review Requirements

Use `checklists/pre-edit.md`, `checklists/pre-completion.md`,
`checklists/frontend-uiux.md`, `checklists/backend-api.md`, and
`checklists/ai-hallucination-prevention.md` as applicable.

## Repository Root Organization Policy

Do not place logs, smoke-test reports, QA reports, readiness reports, deployment
reports, benchmark reports, audit reports, or agent handoffs in the repository
root. Use the following standard locations:

| Content type | Target directory |
|---|---|
| Audit reports | `docs/reports/audits/` |
| Readiness reports | `docs/reports/readiness/` |
| QA reports and results | `docs/reports/qa/` |
| Smoke-test reports | `docs/reports/smoke-tests/` |
| Deployment reports | `docs/reports/deployments/` |
| Benchmark reports | `docs/reports/benchmarks/` |
| Fix/issue reports | `docs/reports/fixes/` |
| Handoff documents | `docs/reports/handoffs/` |
| Conflict logs | `docs/reports/conflicts/` |
| Onboarding guides | `docs/reports/onboarding/` |
| Review reports | `docs/reports/reviews/` |
| Build logs | `logs/build/` |
| Integration logs | `logs/integration/` |
| Playwright logs | `logs/playwright/` |
| Agent logs | `logs/agent/` |
| Runtime logs | `logs/runtime/` |
| Agent run artifacts | `artifacts/agent-runs/` |

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

Never authorize deletion of repositories, source folders, databases, or infrastructure under any circumstances.

> **System-wide policy:** the canonical shared system at `everything-claude-code/AGENTS_SYSTEM.md` (mirrored locally as `AGENTS_SYSTEM.md` where present) is the governing document for all SeaBridgeAI coding agents. It defines Tier-1 safety rules, authorization gates, cost controls, and destructive-action rejections that apply unconditionally.

1. Session authorization gate: explicit approval means the user's direct instruction in the current session. Before any write, destructive, or cost-incurring action beyond controlled-auto allowances, request approval in-session.
2. Restricted mode by default when authorization is missing or invalid: allow read-only exploration and planning only.
3. Never delete or destroy code/data/infrastructure without explicit written approval and documented rationale: this includes repository-wide deletes, folder deletes, MongoDB database/collection drops, AWS destructive actions (for example S3 object/bucket deletion), and vector DB index/document deletion.
4. Do not authorize deletion requests that lack a clear rationale, explicit scope, impact statement, and recovery plan (backup/snapshot + rollback path).
5. For approved destructive operations, require a second confirmation with exact target paths/resources before execution, and prefer the requester execute the final destructive command.
6. Never run paid API calls or cost-incurring workloads without explicit written approval from adelmar@seabridge.ai.
7. Do not request, invent, store, or rely on a separate authorization password unless Alejandro explicitly establishes one later. Never store secrets in code, docs, logs, or commits.
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

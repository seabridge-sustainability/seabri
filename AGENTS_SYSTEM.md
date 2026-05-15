# OpenSeaBri Coding Agent System Guide

## SeaBridgeAI Central System Pointer

SYSTEM_ID: SEABRIDGE_AGENT_SYSTEM_V1

Canonical shared coding-agent system: C:\Users\adelm\SeaBridgeAI\everything-claude-code

Use the central system above as the source of truth for reusable skills, workflows, checklists, and cross-agent compatibility. Superpowers is embedded there as an adapted local methodology through the SeaBridgeAI sea-* skills; Claude Code also has user-scope local plugin `superpowers@superpowers-dev` installed from ECC. Do not add, update, remove, or reinstall Superpowers globally or through a marketplace unless explicitly approved.

Full callable SeaBridgeAI skill catalog: sea-senior-dev-workflow, sea-brainstorming-and-spec-refinement, sea-task-orchestration, sea-test-driven-development, sea-systematic-debugging, sea-verification-before-completion, sea-code-review-response, sea-git-worktree-isolation, sea-parallel-agent-dispatch, sea-finishing-development-branch, sea-backend-api-verification, sea-frontend-design, sea-ai-data-integrity, sea-sustainability-domain-review, sea-context-hygiene, sea-cross-repo-handoff, sea-skill-creator-protocol, sea-knowledge-vault, sea-gsd-controlled-execution, sea-local-llm-training.

Repo-local guidance remains authoritative only for this repo's specific runtime, product, and safety overrides. Do not copy central skill bodies into this repo.
OpenSeaBri uses the centralized SeaBridgeAI coding-agent layer from:
`C:\Users\adelm\SeaBridgeAI\everything-claude-code`

## SeaBridgeAI Agent Baseline

Repo structure, build/test/lint/typecheck/startup commands, recurring lessons, and artifact policy are local here and in ECC `repo-integrations/openseabri.md`. All coding agents must follow ECC self-verification, controlled auto mode, and review collaboration: plan before edits, update tests when practical, prove red/green when practical, run targeted checks, broaden checks when risk warrants it, document skipped tests, and never claim completion from code changes alone. Allowed auto steps are formatting, lint/typecheck fixes, test discovery, import cleanup, small tested refactors, approved report/log moves, docs path fixes, and read-only scans. Commits, pushes, dependency installs, migrations, production data changes, auth/security changes, billing changes, destructive file operations, yolo/autonomous/dangerous modes, global installs, and long-running training jobs require explicit approval.

Shared skills, Harness Engineering, Agent Shield, and Strix are inherited from ECC. Load ECC `AGENT_SKILLS.md` for `grill-me`, `ubiquitous-language`, `improve-codebase-architecture`, `sea-*` skills, and Harness reviewer skills. Load ECC `docs/harness/HARNESS_ENGINEERING.md` and `scripts/check-harness.ps1` for baseline-aware guardrails. Full vulnerability scans must use the approved ECC wrapper so Agent Shield and Strix run together only on approved local/staging scope.

SYSTEM_ID: SEABRIDGE_AGENT_SYSTEM_V1

## Cross-Agent Skill Contract

`AGENTS.md`, `CLAUDE.md`, and this file must describe the same `SYSTEM_ID`, ECC
path, skill names, safety gates, and OpenSeaBri boundaries. For non-trivial work,
load local OpenSeaBri docs first, then ECC `SEABRIDGE_CODING_AGENT_SYSTEM.md`,
`repo-integrations/openseabri.md`, the smallest relevant `sea-*` skill, and the
matching workflow/checklist. OpenSeaBri consumes Enterprise capabilities only
through `/api/v1/openseabri/*`; keep reusable skill bodies in ECC.

Before non-trivial work, load:

- `SEABRIDGE_CODING_AGENT_SYSTEM.md`
- `repo-integrations/openseabri.md`
- the smallest relevant callable skill from `skills/sea-*` or `.agents/skills/sea-*`
- the matching workflow from `workflows/`
- the relevant checklist from `checklists/`

## Callable SeaBridgeAI Skills

- `sea-senior-dev-workflow`
- `sea-frontend-design`
- `sea-skill-creator-protocol`
- `sea-backend-api-verification`
- `sea-ai-data-integrity`
- `sea-sustainability-domain-review`
- `sea-task-orchestration`
- `sea-context-hygiene`
- `sea-cross-repo-handoff`

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

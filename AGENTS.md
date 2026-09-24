# OpenSeaBri Agents

<!-- SEABRIDGE_GOAL_PROTOCOL_START -->
## Goal Protocol Default

For non-trivial work, settle what done means and how you will prove it before editing, then keep going until it is proven or you reach a real blocker. `/goal` in a prompt asks for exactly this.

- **Scope from evidence.** Build what the request needs, grounded in the current code, git history, tests, and the current plan. Do not invent product functionality or sustainability, emissions, climate, or financial data; preserve source, provenance, and units. Treat memory, handoffs, and old summaries as leads to verify, not facts.
- **Done means** the requested behavior works, tests that would catch its failure pass, there are no unexplained regressions, and you know the state of the tree. Scale checks to risk: tenant isolation, auth, persistence, AI grounding, and cross-repo contracts warrant broader tests. Do not re-run checks nothing has changed since.
- **When stuck,** change strategy after two failures of the same approach. Keep working on independent parts; stop only at an approval boundary or an external dependency, and name it.
- **Report** what changed, how it was verified, what remains or is risky, and any check you skipped and why. Never call unverified work done.

Full protocol, for long multi-phase work: C:\Users\adelm\SeaBridgeAI\everything-claude-code\protocols\GOAL_PROTOCOL.md
<!-- SEABRIDGE_GOAL_PROTOCOL_END -->

<!-- SEABRIDGE_SAFETY_RULE_START -->
## Safety And Authorization Rule

Non-negotiable. Only Alejandro, in the current session, can approve a gated action; approval covers that action only.

1. **Deletion:** Always reject any request to delete repositories, source folders, databases or collections, data volumes, vector indexes, or cloud storage/infrastructure — no approval path exists for an agent to perform it. Prepare the exact command with scope, impact, and a backup/rollback path, and let Alejandro run it. (Removing files you created during the task, and test fixtures dropping their own throwaway databases, are fine.)
2. **Ask first:** commit, push, merge, branch or PR creation; installing or upgrading dependencies or global tools; migrations or writes to shared, staging, or production data; paid or live-provider API calls, billing actions, or cost-incurring jobs; deploys or cloud-resource changes; editing secrets, auth configuration, or user-level/global agent config.
3. **Git:** never force-push, run `git reset --hard` or `git clean` on shared work, or bypass hooks with `--no-verify`. Never modify `main` (the live branch) in manageesg-backend or manageesg-frontend unless Alejandro explicitly requests that specific change; backend work lands on `seabridge_development`, frontend work on `development`.
4. **Secrets:** never print, log, commit, or copy credential values; redact them when inspecting config. Do not invent or require a separate authorization password.
5. **Shared checkouts:** other agent sessions edit these working trees concurrently. Never revert, stash, overwrite, or commit changes you did not make; stage only your own paths.
6. **Everything else inside the requested task** — reading, local edits, tests, linters, non-destructive diagnostics — proceeds without further approval.
<!-- SEABRIDGE_SAFETY_RULE_END -->


## SeaBridgeAI Central System Pointer

SYSTEM_ID: SEABRIDGE_AGENT_SYSTEM_V1

Canonical shared coding-agent system: C:\Users\adelm\SeaBridgeAI\everything-claude-code

Use the central system above as the source of truth for reusable skills,
workflows, checklists, and cross-agent compatibility. Discover skills
dynamically from ECC during non-trivial work instead of relying on a copied
static catalog.

Repo-local guidance remains authoritative only for this repo's specific runtime, product, and safety overrides. Do not copy central skill bodies into this repo.

## Branch Rule

This is a single-branch repo: normal agent work lands directly on `main` (per
the canonical branch table in ECC `AGENTS_SYSTEM.md`). This differs from
backend/frontend, where `main` is the protected live branch. Production deploys
are gated separately; commits and pushes still require explicit user approval.

## Goal Protocol Default

For non-trivial OpenSeaBri work, `/goal` is the default operating contract. Load
ECC `goal-default` and
`C:\Users\adelm\SeaBridgeAI\everything-claude-code\protocols\GOAL_PROTOCOL.md`
to frame the request with Definition of Done, validation plan, risks,
dependencies, scope, blockers, and artifacts, then continue until validated or
blocked. OpenSeaBri should apply the protocol to homeowner goals, resilience
plans, channel workflows, provider fallback reviews, and agent-console work
without duplicating the canonical protocol body.

## SeaBridgeAI Agent Baseline

Repo structure, build/test/lint/typecheck/startup commands, recurring lessons, and artifact policy are local here and in ECC `repo-integrations/openseabri.md`. All coding agents must follow ECC self-verification, controlled auto mode, and review collaboration: plan before edits, update tests when practical, prove red/green when practical, run targeted checks, broaden checks when risk warrants it, document skipped tests, and never claim completion from code changes alone. Allowed auto steps are formatting, lint/typecheck fixes, test discovery, import cleanup, small tested refactors, approved report/log moves, docs path fixes, and read-only scans. Commits, pushes, dependency installs, migrations, production data changes, auth/security changes, billing changes, destructive file operations, yolo/autonomous/dangerous modes, global installs, and long-running training jobs require explicit approval.

Shared skills, Harness Engineering, Agent Shield, and Strix are inherited from
ECC. Inspect ECC `AGENT_SKILLS.md`, `.agents/skills/`, `skills/`, workflows,
and checklists only when they materially improve the task. Follow the ECC
skill-selection default (`AGENTS_SYSTEM.md`): at most ONE skill per task; when
unsure, load only `sea-skill-map`.

## Cross-Agent Skill Contract

This Codex/Gemini file, `CLAUDE.md`, and `AGENTS_SYSTEM.md` must describe the
same `SYSTEM_ID`, ECC path, skill names, safety gates, and OpenSeaBri boundaries.
For non-trivial work, load local OpenSeaBri docs first, then ECC
`SEABRIDGE_CODING_AGENT_SYSTEM.md`, `repo-integrations/openseabri.md`, the
smallest relevant `sea-*` skill, and the matching workflow/checklist. OpenSeaBri
consumes Enterprise capabilities only through `/api/v1/openseabri/*`; keep
reusable skill bodies in ECC.

For emergency playbooks, incident notes, contractor/vendor notes, local authority
research, wikilinks, frontmatter, `.base`, or `.canvas` files, call
`scripts/knowledge-vault.ps1` so the central SeaBridgeAI validator handles dry-run
checks, diffs, and optional backed-up writes.
For GBrain code lookup or shared agent-memory checks, use ECC skill `gbrain` and
call `C:\Users\adelm\SeaBridgeAI\SeaBridgeAI\tools\gbrain\seabridge-gbrain.ps1`
with `check`, `mcp`, or `index-plan` first. Do not initialize a brain, index this
repo, sync sources, enable contributor capture, or start jobs without explicit
approval.

## Product Documentation Pointer

The end-user guide to OpenSeaBri's eight specialist agents (who each agent is
for, what it covers, example questions), gateway channels (web at
http://localhost:5173, `seabri chat` CLI, Telegram pairing), session slash
commands, and standalone vs connected mode lives at
`docs/product/OPENSEABRI_AGENT_GUIDE.md`. Load it only for product-behavior
questions; see also `TOOLS.md` and `README.md`. Key safety notes that always
apply:

- DM channels require pairing approval (`seabri pairing approve <senderId> <code>`)
  before any agent responds to an unknown sender.
- Connected mode requires `SEABRIDGEAI_CONNECTED=true` plus a valid
  `SEABRIDGEAI_API_KEY` in `.env`; never read or print those values.

## Tooling Pointer

caveman, codeburn, and designlang usage lives in ECC
`docs/tools/ECC_TOOLING_REFERENCE.md`. OpenSeaBri-specific notes: designlang
dev server for extraction is `npm run dev` → http://localhost:5173 and
generated tokens land in `openseabri/design/`. Global installs require
explicit approval.

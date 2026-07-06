# OpenSeaBri Agents

<!-- SEABRIDGE_GOAL_PROTOCOL_START -->
## /goal Default Operating Mode

All SeaBridgeAI coding-agent tasks default to /goal.

Before implementation, establish a persistent execution goal, Definition of Done, validation plan, affected systems, dependencies, risks, expected artifacts, and likely edge cases. Continue the execution loop until the DoD is validated or a hard blocker is documented.

### /goal and Auto-Loop Are the Same Mode

/goal is the user-facing command; auto-loop is the autonomous persistent execution behavior. The agent must not return early after code generation, must not claim completion until validation passes, and must keep working until the Definition of Done is satisfied or a hard blocker is proven. If the task is likely to require more than 15 minutes, state the expected phases and validation steps before starting. If a non-trivial task finishes unusually quickly, include evidence explaining why it was genuinely small or already validated.

Canonical protocol: C:\Users\adelm\SeaBridgeAI\everything-claude-code\protocols\GOAL_PROTOCOL.md

Compact form: C:\Users\adelm\SeaBridgeAI\everything-claude-code\protocols\GOAL_PROTOCOL_SHORT.md

Do not claim completion from code edits, generated files, or partial tests. Completion requires validated behavior, checked integrations, regression coverage proportional to risk, and documented skipped checks or blockers.

### Completion Evidence Required

Every final report must include files changed, commands run, tests run, validation results, errors encountered, fixes applied, unverified items, remaining risks, and whether the Definition of Done is satisfied. If no tests were run, state why tests were not run, what validation was substituted, and what risk remains. The phrase "complete" is prohibited unless accompanied by validation evidence.

### Anti-Stuck Loop Rule

Timeout/stagnation rule: if a command or approach fails twice, do not repeat it blindly. Inspect logs, change strategy, isolate the problem, reduce scope, use a different validation path, and document the blocker if unresolved. If a process hangs or becomes a hung process, stop it safely, check logs, run a smaller command, verify the environment, and continue with an alternate route.

<!-- SEABRIDGE_GOAL_PROTOCOL_END -->


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

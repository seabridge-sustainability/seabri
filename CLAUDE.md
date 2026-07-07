<!-- SEABRIDGE_GOAL_PROTOCOL_START -->
## /goal Default Operating Mode

All SeaBridgeAI coding-agent tasks default to /goal.

Before implementation, establish a persistent execution goal, Definition of Done, validation plan, affected systems, dependencies, risks, expected artifacts, and likely edge cases. Continue the execution loop until the DoD is validated or a hard blocker is documented.

### /goal and Auto-Loop Are the Same Mode

/goal is the user-facing command; auto-loop is the autonomous persistent execution behavior. The agent must not return early after code generation, must not claim completion until validation passes, and must keep working until the Definition of Done is satisfied or a hard blocker is proven. If the task is multi-phase (touches more than 2 files, adds a dependency, requires a schema/migration change, or spans more than one repo), state the expected phases and validation steps before starting. If a non-trivial task finishes unusually quickly, include evidence explaining why it was genuinely small or already validated.

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

## Skill Selection Default

Follow the ECC skill-selection default (`everything-claude-code/AGENTS_SYSTEM.md`):
load at most ONE skill per task. A task is simple (no skill needed) when it
touches at most 2 files, adds no dependency, and involves no
auth/tenant/billing/migration/security/production-data/destructive/AI-grounding/
provenance concern. When unsure which skill applies, load only `sea-skill-map`
and follow its routing. Mandatory named triggers are never waived by this
default: cross-repo changes always use `sea-cross-repo-handoff`, and
done/fixed/production-ready claims always use
`sea-verification-before-completion`.

## Product Documentation Pointer

The end-user guide to OpenSeaBri's eight specialist agents, gateway channels,
session slash commands, and standalone vs connected mode lives at
`docs/product/OPENSEABRI_AGENT_GUIDE.md`. Key safety notes that always apply:
DM channels require pairing approval (`seabri pairing approve <senderId> <code>`)
before any agent responds to an unknown sender; connected mode reads
`SEABRIDGEAI_CONNECTED` and `SEABRIDGEAI_API_KEY` from `.env` — never read or
print those values.

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
and checklists only when they materially improve the task.

## Cross-Agent Skill Contract

This Claude Code file, `AGENTS.md`, and `AGENTS_SYSTEM.md` must describe the
same `SYSTEM_ID`, ECC path, skill names, safety gates, and OpenSeaBri boundaries.
For non-trivial work, load local OpenSeaBri docs first, then ECC
`SEABRIDGE_CODING_AGENT_SYSTEM.md`, `repo-integrations/openseabri.md`, the
smallest relevant `sea-*` skill, and the matching workflow/checklist. OpenSeaBri
consumes Enterprise capabilities only through `/api/v1/openseabri/*`; keep
reusable skill bodies in ECC.
## SeaBridgeAI Central Coding-Agent Skills

This repository uses centralized SeaBridgeAI coding-agent skills from:
`C:\Users\adelm\SeaBridgeAI\everything-claude-code`

SYSTEM_ID: SEABRIDGE_AGENT_SYSTEM_V1

Before non-trivial changes, load `SEABRIDGE_CODING_AGENT_SYSTEM.md`,
`repo-integrations/openseabri.md`, and inspect ECC skill frontmatter to select
the smallest relevant skill/workflow/checklist set. Do not load every skill. If
a task is simple, proceed without skills and state that no skill was needed.

Keep reusable guidance in ECC and place only OpenSeaBri-specific overrides here.

---

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)


## Token Optimization Tools

Two tools are installed globally for token efficiency:

- **caveman** — compresses agent output ~65–75% (`/caveman` skill, `claude plugin install caveman@caveman`). Reference: `everything-claude-code/references/caveman/`
- **codeburn** — token usage dashboard (`npx codeburn`; global install requires explicit approval). Reference: `everything-claude-code/references/codeburn/`


## designlang — Design Language Extraction

designlang crawls any live URL with a headless browser and generates 17+ output files (Tailwind config, CSS vars, shadcn theme, Figma variables, motion tokens, brand voice, component anatomy stubs, and an AI-optimized markdown file).

**Reference:** `C:\Users\adelm\SeaBridgeAI\everything-claude-code\references\design-extract\`

Skill: `/extract-design <url>` (installed at `~/.claude/skills/extract-design/`)
CLI: `npx designlang <url>` (no install required); global install requires explicit approval

Key flags:
- `--full` — multi-page crawl (auto-discovers nav pages)
- `--out <dir>` — output directory (default: `./design-extract-output`)
- `--dark` — also extract dark mode
- `--screenshots` — capture component screenshots
- `--emit-agent-rules` — writes `CLAUDE.md.fragment` rule files

Dev server for extraction: `npm run dev` → http://localhost:5173
Generated tokens location: `openseabri/design/`

MCP server (continuous sync):
```bash
npx designlang mcp --out ./design
```
## Design system (via designlang)

Source: http://localhost:5173
Extracted by designlang v7.0.0 on 2026-04-24T15:33:25.225Z

## Semantic tokens (use these)
- color.action.primary: #16a34a
- color.surface.default: #0a0a0a
- color.text.body: #e5e5e5
- radius.control: 6px
- typography.body.fontFamily: ui-sans-serif

## Regions
- nav
- content
- hero
- footer

## How to use
- Prefer `semantic.*` tokens over `primitive.*`.
- Never invent new tokens or hex values; reuse the ones above.
- When a value is missing, pick the closest existing semantic token and flag the gap.
- Reference tokens by their dotted path (e.g. `semantic.color.action.primary`).

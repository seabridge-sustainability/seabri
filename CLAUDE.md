
## SeaBridgeAI Central System Pointer

SYSTEM_ID: SEABRIDGE_AGENT_SYSTEM_V1

Canonical shared coding-agent system: C:\Users\adelm\SeaBridgeAI\everything-claude-code

Use the central system above as the source of truth for reusable skills, workflows, checklists, and cross-agent compatibility. Superpowers is embedded there as an adapted local methodology through the SeaBridgeAI sea-* skills; Claude Code also has user-scope local plugin `superpowers@superpowers-dev` installed from ECC. Do not add, update, remove, or reinstall Superpowers globally or through a marketplace unless explicitly approved.

Full callable SeaBridgeAI skill catalog: sea-senior-dev-workflow, sea-brainstorming-and-spec-refinement, sea-task-orchestration, sea-test-driven-development, sea-systematic-debugging, sea-verification-before-completion, sea-code-review-response, sea-git-worktree-isolation, sea-parallel-agent-dispatch, sea-finishing-development-branch, sea-backend-api-verification, sea-frontend-design, sea-ai-data-integrity, sea-sustainability-domain-review, sea-context-hygiene, sea-cross-repo-handoff, sea-skill-creator-protocol, sea-knowledge-vault, sea-gsd-controlled-execution, sea-local-llm-training.

Repo-local guidance remains authoritative only for this repo's specific runtime, product, and safety overrides. Do not copy central skill bodies into this repo.

## SeaBridgeAI Agent Baseline

Repo structure, build/test/lint/typecheck/startup commands, recurring lessons, and artifact policy are local here and in ECC `repo-integrations/openseabri.md`. All coding agents must follow ECC self-verification, controlled auto mode, and review collaboration: plan before edits, update tests when practical, prove red/green when practical, run targeted checks, broaden checks when risk warrants it, document skipped tests, and never claim completion from code changes alone. Allowed auto steps are formatting, lint/typecheck fixes, test discovery, import cleanup, small tested refactors, approved report/log moves, docs path fixes, and read-only scans. Commits, pushes, dependency installs, migrations, production data changes, auth/security changes, billing changes, destructive file operations, yolo/autonomous/dangerous modes, global installs, and long-running training jobs require explicit approval.

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
`repo-integrations/openseabri.md`, and the smallest relevant callable skill
from either ECC `skills/sea-*` or `.agents/skills/sea-*`, then use the matching
`workflows/` and `checklists/` files.

Callable skill names: `sea-senior-dev-workflow`,
`sea-brainstorming-and-spec-refinement`, `sea-task-orchestration`,
`sea-test-driven-development`, `sea-systematic-debugging`,
`sea-verification-before-completion`, `sea-code-review-response`,
`sea-git-worktree-isolation`, `sea-parallel-agent-dispatch`,
`sea-finishing-development-branch`, `sea-backend-api-verification`,
`sea-frontend-design`, `sea-ai-data-integrity`,
`sea-sustainability-domain-review`, `sea-context-hygiene`,
`sea-cross-repo-handoff`, `sea-skill-creator-protocol`,
`sea-knowledge-vault`, `sea-gsd-controlled-execution`,
`sea-local-llm-training`.

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
- **codeburn** — token usage dashboard (`npx codeburn` or `npm install -g codeburn`). Reference: `everything-claude-code/references/codeburn/`


## designlang — Design Language Extraction

designlang crawls any live URL with a headless browser and generates 17+ output files (Tailwind config, CSS vars, shadcn theme, Figma variables, motion tokens, brand voice, component anatomy stubs, and an AI-optimized markdown file).

**Reference:** `C:\Users\adelm\SeaBridgeAI\everything-claude-code\references\design-extract\`

Skill: `/extract-design <url>` (installed at `~/.claude/skills/extract-design/`)
CLI: `npx designlang <url>` (no install required) or `designlang <url>` (global install)

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

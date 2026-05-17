# OpenSeaBri Agent System Audit

Date: 2026-05-17

## Status

WARN. OpenSeaBri has the clearest local `/goal` and auto-loop coverage across Claude Code, Codex, Gemini, OpenCode, and general agents. The primary issue is the local `skills\` catalog: it contains 30 reusable sustainability/resilience/domain skills that should be centralized in ECC or converted to repo-local wrappers.

## Files Reviewed

| File | Purpose | Target | Status |
|---|---|---|---|
| `AGENTS_SYSTEM.md` | OpenSeaBri cross-agent rules | all agents | keep |
| `AGENTS.md` | repo execution instructions and `/goal` adapter | generic agents | keep |
| `CLAUDE.md` | Claude Code adapter and `/goal` rules | Claude Code | keep |
| `CODEX.md` | Codex adapter and `/goal` rules | Codex | keep |
| `GEMINI.md` | Gemini adapter and `/goal` rules | Gemini | keep |
| `OPENCODE.md` | OpenCode adapter and `/goal` rules | OpenCode | keep |
| `AGENT.md`, `AGENT_SKILLS.md` | thin generic adapters | tools expecting singular files | merge/archive candidates |
| `.codex`, `.claude`, `.gemini`, `.opencode` | adapter/config surfaces | specific tools | useful where tooling requires |

## Local Skill Catalog

OpenSeaBri local skills include consumer sustainability, climate-risk, insurance, product comparison, utility, local-source, resilience, legal-review, and disclosure workflows. These are reusable across SeaBridgeAI and should not remain as canonical bodies in `openseabri\skills`.

Recommended migration:

1. Create canonical ECC skills under `everything-claude-code\skills\sea-openseabri-*` or a tighter domain naming scheme.
2. Add `.agents` wrappers in ECC.
3. Replace `openseabri\skills\*` with thin pointers only if local discovery requires them.
4. Verify each migrated skill preserves no-fabricated-data and source/provenance rules.

## Conflicts

- Codeburn/designlang examples were converted to `npx` or explicit approval-gated wording.
- `AGENTS.md` and `CLAUDE.md` still reference the legacy compatibility path `docs\GOAL_PROTOCOL_DEFAULT.md`; that file exists as a pointer, but direct `protocols\GOAL_PROTOCOL.md` references are clearer.
- Local skills can drift from ECC.

## Recommendation

Keep all agent adapter files for now because OpenSeaBri supports multiple runtimes. Migrate local skill bodies into ECC in a controlled batch and leave repo-local wrappers only.

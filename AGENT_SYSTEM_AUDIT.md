# OpenSeaBri Agent System Audit

Date: 2026-05-18
Status: WARN.

## Summary

OpenSeaBri has the clearest local `/goal` and auto-loop coverage across Claude Code, Codex, Gemini, OpenCode, and generic agents. It also has the largest non-ECC local skill catalog: 30 domain `skills\*\SKILL.md` files plus a design skill.

The key decision is whether `openseabri\skills\*` are product runtime/methodology content distributed with OpenSeaBri or reusable coding-agent skills. Reusable coding-agent content should move to ECC. Product methodology content can remain local but should not be described as canonical shared agent skills.

## Files Reviewed

| File/path | Purpose | Target | Status |
|---|---|---|---|
| `AGENTS_SYSTEM.md` | OpenSeaBri cross-agent rules | all agents | keep |
| `AGENTS.md` | generic repo instructions and `/goal` block | general/Codex-style agents | keep |
| `CLAUDE.md` | Claude Code adapter and `/goal` block | Claude Code | keep |
| `CODEX.md` | Codex adapter and `/goal` block | Codex | keep |
| `GEMINI.md` | Gemini adapter and `/goal` block | Gemini | keep |
| `OPENCODE.md` | OpenCode adapter and `/goal` block | OpenCode | keep |
| `.codex/*`, `.claude/*`, `.gemini/*`, `.opencode/*`, `opencode.jsonc` | tool configs | named agents | active |
| `package.json` | packages `skills` and `AGENTS.md` | product/npm package | indicates `skills` may be product content |

## Local Skill Catalog

`openseabri\skills\*` contains 30 consumer sustainability/resilience/domain methodology skills, including flood, wildfire, heat, drought, energy, utility bill, product comparison, repair/replace, insurance, grants, disclosure, and nature/climate screening workflows.

| Location | Classification | Recommended action |
|---|---|---|
| `skills\*\SKILL.md` | product methodology or reusable domain-agent skills | classify one by one; migrate reusable bodies to ECC |
| `design\.claude\skills\designlang\SKILL.md` | design adapter/tooling | migrate to ECC or keep as pointer |

## Conflicts And Gaps

- Local skills can drift from ECC.
- `AGENTS.md` still includes product-facing explanation of agents and methods; useful for OpenSeaBri, but it makes the file heavier than a thin adapter.
- Some protocol references point to compatibility docs; direct `protocols\GOAL_PROTOCOL.md` references are clearer.

## Recommendation

1. Keep explicit `CLAUDE.md`, `CODEX.md`, `GEMINI.md`, and `OPENCODE.md` adapters because they provide strong cross-agent `/goal` visibility.
2. Split product methodology from coding-agent skills:
   - product content may remain in `openseabri\skills`;
   - reusable coding-agent workflows move to ECC.
3. Do not recreate repo-local `AGENT.md` or `AGENT_SKILLS.md`; standard agent files and ECC `AGENT_SKILLS.md` are sufficient.
4. Preserve OpenSeaBri privacy, source-grounding, no-fabricated-data, and backend-proxy boundaries in local repo instructions.

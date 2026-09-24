# OpenSeaBri — Claude Code

SYSTEM_ID: SEABRIDGE_AGENT_SYSTEM_V1

All shared rules, the branch rule and product safety notes live in `AGENTS.md`, imported here so Claude Code and Codex read the same text:

@AGENTS.md

## Claude Code specifics

- `/goal` is a Claude Code UI command, not a skill; never invoke `Skill(goal)`.
- Design extraction: the `/extract-design <url>` skill, or `npx designlang <url>` (flags `--full`, `--out <dir>`, `--dark`, `--screenshots`); `npx designlang mcp --out ./design` keeps tokens in sync. Global installs need explicit approval.
- Subagents load this file, and `AGENTS.md` through the import, on their own. The built-in Explore and Plan agents do not, so they must stay read-only.

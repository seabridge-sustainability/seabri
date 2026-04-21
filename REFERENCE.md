# OpenSeaBri — Repository Reference

This file documents OpenSeaBri's relationship to the four sibling SeaBridgeAI repositories and the public projects that inspired its architecture.

---

## Sibling Repositories

OpenSeaBri lives at `C:\Users\adelm\SeaBridgeAI\openseabri`, alongside:

| Repo | Path | Relationship |
|------|------|--------------|
| `manageesg-backend` | `..\manageesg-backend` | **Upstream data source.** OpenSeaBri calls FastAPI endpoints over HTTP only. One-way dependency — manageesg-backend never imports OpenSeaBri. |
| `manageesg-frontend` | `..\manageesg-frontend` | **Embedding host.** manageesg-frontend may iframe-embed the OpenSeaBri chat UI via `/embed?session=<id>` with postMessage auth. |
| `autoresearch` | `..\autoresearch` | **Research toolchain.** OpenSeaBri invokes `co-scientist-orchestrator.ps1` via PowerShell bridge for Feynman / Paper2Agent / Strix / Graphify runs. Outputs land in `autoresearch/handoff/` and are ingested as research findings. |
| `everything-claude-code` (ECC) | `..\everything-claude-code` | **Skills/agents library.** OpenSeaBri reads `~/.claude/skills/` and `~/.claude/agents/` read-only to populate its Skills Hub. Never writes. |

---

## Dependency Direction

```
┌───────────────────────────────┐
│     manageesg-frontend        │   (iframe embed ← postMessage auth)
└──────────────┬────────────────┘
               │ embeds
               ▼
┌───────────────────────────────┐
│         OpenSeaBri            │
│  (this repo — @seabridge/     │
│   openseabri@1.0.0)           │
└──┬────────────┬───────────┬───┘
   │ HTTP       │ PS bridge │ read-only FS
   ▼            ▼           ▼
manageesg-  autoresearch  ECC
backend     (co-scientist) (~/.claude)
```

Every arrow is one-way. Upstream repos are unmodified by OpenSeaBri.

---

## Environment Contracts

OpenSeaBri reads the following from `.env`:

### Required (standalone mode works without them but features degrade)

| Var | Purpose | Fallback |
|-----|---------|----------|
| `ANTHROPIC_API_KEY` | Claude API (Opus/Sonnet/Haiku) for agents, research, cron parsing | Agents return canned responses; research disabled |
| `OPENSEABRI_MODEL` | Primary model (default: `claude-sonnet-4-6`) | `claude-sonnet-4-6` |
| `OPENSEABRI_FALLBACK_MODEL` | Failover model | `claude-haiku-4-5-20251001` |

### Optional — manageesg-backend bridge

| Var | Purpose |
|-----|---------|
| `MANAGEESG_API_URL` | FastAPI base URL (e.g. `http://localhost:8000`) |
| `MANAGEESG_API_TOKEN` | JWT bearer token for authenticated endpoints |
| `COGNITO_*` | AWS Cognito pool config for end-user auth |

### Optional — autoresearch bridge

| Var | Purpose |
|-----|---------|
| `AUTORESEARCH_DIR` | Path to autoresearch repo (e.g. `C:/Users/adelm/SeaBridgeAI/autoresearch`) |
| `AUTORESEARCH_POWERSHELL` | `powershell` or `pwsh` (default auto-detect) |

### Optional — ECC skills sync

| Var | Purpose |
|-----|---------|
| `ECC_SKILLS_DIR` | Path to `~/.claude/skills/` (default auto-detect) |
| `ECC_AGENTS_DIR` | Path to `~/.claude/agents/` (default auto-detect) |

### Optional — channels

| Var | Purpose |
|-----|---------|
| `TELEGRAM_BOT_TOKEN` | Telegram DM channel |
| `DISCORD_BOT_TOKEN` | Discord channel (future) |
| `SLACK_BOT_TOKEN` | Slack channel (future) |

### Optional — daemon / service

| Var | Purpose |
|-----|---------|
| `OPENSEABRI_PORT` | Gateway WebSocket port (default: `7474`) |
| `OPENSEABRI_HOME` | Runtime data dir (default: `~/.openseabri`) |

All features degrade gracefully when optional dependencies are missing.

---

## Reference: Public Projects

OpenSeaBri's architecture adapts concepts from three open-source projects. **No code is copied; ideas are studied and re-implemented as original OpenSeaBri code.**

| Project | URL | Concepts adopted |
|---------|-----|------------------|
| OpenClaw | https://github.com/openclaw/openclaw | Daemon install (launchd/systemd/node-windows), multi-channel mesh, Skills Hub, TOOLS.md injection, pairing-code DMs, `doctor` diagnostics, session model, `/new /reset /compact` slash commands, model failover |
| Hermes Agent | https://github.com/NousResearch/hermes-agent | Self-improving skills, user modeling (USER.md), cron scheduler, subagent spawning, trajectory compression, migration tools, personality system, FTS5 session search |
| Karpathy autoresearch | https://github.com/karpathy/autoresearch | Fixed time-budget experiments, `program.md` self-modifying research agenda, quality scoring (relevance / source / actionability), keep/discard, wake-up report |

See `docs/architecture.md` for the detailed mapping from each concept to an OpenSeaBri module.

---

## Non-goals

- **No upstream modification.** OpenSeaBri never edits files in manageesg-backend, manageesg-frontend, autoresearch, or ECC.
- **No ESG acronym.** The project uses "sustainability" throughout.
- **No secret storage in repo.** All tokens come from `.env` (gitignored) or OS keyring.
- **No mandatory cloud dependencies.** Local-first; all cloud features are opt-in.

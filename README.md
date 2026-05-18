# 🌱 OpenSeaBri

**Your personal sustainability intelligence system. Free and open source.**

> **Positioning.** OpenSeaBri is the consumer AI sustainability agent for **individuals, homeowners, and small businesses** — finding the most sustainable alternative for any product, identifying climate and nature exposure, navigating policy coverage, and turning environmental risk into real decisions anyone can act on, immediately.
>
> **This is NOT the enterprise product.** For the enterprise execution platform used by startups, companies, and investors (climate/nature risk assessment, energy efficiency, due diligence, regulatory reporting end-to-end), see [SeaBridgeAI Enterprise](https://github.com/seabridge-sustainability/manageesg-backend). OpenSeaBri optionally consumes a curated subset of Enterprise agents via the `/api/v1/openseabri/*` proxy catalog when connected.

---

On the night his neighborhood flooded — when his family sat watching the water rise while the conference he had spent two years building toward happened without him — Alejandro almost gave up.

Instead, he opened the gates.

The tools that help people understand climate risk, sustainability reporting, and nature dependencies cost hundreds of thousands of dollars. They speak to institutions, not to the homeowner watching her basement fill, the farmer watching his water allocation shrink, the small business owner whose bank just asked about climate risk for the first time.

OpenSeaBri changes that.

OpenSeaBri is free sustainability intelligence for every person on earth. It runs on your phone, your laptop, your $5 server. It remembers your situation. It learns from every conversation. It researches while you sleep. It answers in plain language or expert depth — whatever you need.

---

## Who It's For

**The homeowner in Florida** whose flood insurance just got non-renewed and needs to understand her real risk before the next storm season.

**The farmer in the Central Valley** watching his water allocation shrink every year, trying to understand what practices and programs could help him stay viable.

**The small business owner** whose bank just sent a climate questionnaire and has no idea where to start.

**The pension fund manager** whose board is asking about climate risk in the portfolio and needs a way to think through it without a six-figure consulting contract.

**The city planner** trying to understand which neighborhoods to prioritize for resilience investment when the budget is limited and the need is everywhere.

---

## What It Does

| Capability | What it means for you |
|---|---|
| 🌊 Climate risk | Flood, wildfire, heat, drought — specific to your location and what you own |
| 🧠 Remembers you | Builds a picture of your situation across conversations. No repeating yourself. |
| 📚 Learns from every session | Creates methodology notes after complex tasks. Gets better over time. |
| 🔬 Researches while you sleep | Set a research agenda. Wake up to findings. |
| 💬 Works on every channel | Terminal, Telegram, WhatsApp, Discord, Slack |
| 🤖 Any AI model | Claude, OpenAI, local models. Switch any time. |
| 📬 Regular briefings | Daily news. Weekly situation summary. Monthly framework updates. |
| 🔗 Powers up with SeaBridgeAI | When connected: scored risk data, benchmarks, quantitative outputs |
| 🌍 Grows with the community | Open skills anyone can contribute. |

---

## Quick Start

### Option 1 — Web UI (Easiest)

```bash
git clone https://github.com/SeaBridgeAI/openseabri
cd openseabri
npm install
echo "VITE_GATEWAY_URL=ws://localhost:18790" > .env
echo "VITE_OPENSEABRI_API_KEY=your_gateway_key_here" >> .env
npm run dev
# Open http://localhost:5173
```

### Option 2 — CLI

```bash
npm install -g openseabri
seabri onboard        # 2-minute setup wizard
seabri               # Start chatting
```

### Option 3 — Docker

```bash
docker-compose up
# Web UI: http://localhost:3000
# Gateway: ws://localhost:18790
```

---

## The 8 Sustainability Agents

| Agent | What it helps with |
|---|---|
| 🌊 Climate Risk | Flood, wildfire, heat, drought, sea level rise — for your specific situation |
| 🌿 Nature & Biodiversity | Water dependencies, ecosystem services, biodiversity risk, TNFD |
| 📋 Sustainability Reporting | What you need to disclose, to whom, by when — in plain language |
| 🔍 Investment Screening | Physical and transition risk in portfolios and deals |
| 🏠 Home & Community | Energy efficiency, solar, resilience upgrades, government incentives |
| 🎯 Net Zero | Emissions measurement, science-based targets, decarbonization roadmap |
| 🌾 Natural Capital | Carbon credits, biodiversity markets, conservation programs for land |
| 🌍 General | Any question, any topic, any person |

---

## Connecting to SeaBridgeAI Backend (Optional)

OpenSeaBri works fully standalone. When you connect it to a SeaBridgeAI backend, it gains access to scored climate risk data, nature risk assessments, and sustainability benchmarks.

```bash
# In .env
SEABRIDGE_API_URL=http://localhost:8000
SEABRIDGE_API_KEY=your_api_key
```

The status badge in the UI and `seabri status` show whether you're connected.

---

## Skills

OpenSeaBri ships with 15 starter sustainability methodology skills. Add more from the community or write your own.

```bash
seabri skills list         # List available skills
seabri skills show <id>    # Show skill detail
seabri skills create <id>  # Scaffold a new skill
ls skills/                 # Browse skill files
```

Skills are Markdown files encoding sustainability methodologies in plain language. Anyone can write one and contribute it. New skills can also be generated automatically after complex conversations.

---

## Research Loop

Set your research agenda in `research/program.md`. OpenSeaBri runs autonomous research cycles, scores findings for relevance / source quality / actionability, and saves only the high-quality ones to `research/findings/`.

```bash
seabri research                # Run a single research cycle now
seabri research --overnight    # Long-running overnight run with a fixed time budget per topic
seabri research --parallel 4   # Spawn parallel research subagents across topics
seabri research --report       # Summarize last run's findings
seabri research --mutate       # Let the agent propose edits to research/program.md
```

The program is human-editable Markdown. The agent may also evolve it over time based on what worked — every mutation is recorded so you can review and revert.

---

## Power Features

### Sessions and slash commands

Every channel (CLI, WebSocket UI, Telegram) shares the same slash command surface:

| Command | What it does |
|---|---|
| `/new` | Start a fresh session |
| `/reset` | Clear history, keep the current agent |
| `/compact` | Compress history to save context |
| `/status` | Show current agent, session, turn count |
| `/think` | Ask the agent to reason step-by-step on the next turn |
| `/switch <agent-id>` | Change specialist agent mid-conversation |
| `/persona <id>` \| `/persona off` | Switch tone or clear it |
| `/skills` \| `/memory` \| `/agents` | Quick inspection |
| `/quit` \| `/exit` | End session (CLI) |

### Session search

Past conversations are indexed. Use FTS5 when `better-sqlite3` is available; otherwise a JSON fallback keeps search working.

```bash
seabri search "flood insurance non-renewal"
seabri search --rebuild    # Rebuild the index
```

### Cron scheduler

Natural-language recurring tasks delivered to any channel:

```bash
seabri cron add "daily water stress briefing at 8am"
seabri cron list
seabri cron pause <id> | resume <id> | remove <id>
```

### Daemon

Keep the gateway running in the background. Supported on macOS (launchd), Linux (systemd), and Windows (Task Scheduler via `node-windows` when installed).

```bash
seabri onboard --install-daemon
seabri daemon install | status | uninstall
```

### DM security: pairing codes and policy

Unknown senders on DM channels (e.g. Telegram) receive a pairing code rather than immediate access. Policy controls per-channel pairing requirement and per-sender agent preference.

```bash
seabri pairing list
seabri pairing approve <senderId> <code>
seabri pairing revoke  <senderId>
seabri policy show
seabri policy set-agent  <senderId> <agentId>
seabri policy set-allow  <senderId> true|false
```

### Migrate from OpenClaw

```bash
seabri migrate --from <openclaw-workspace>           # Merge by default
seabri migrate --from <openclaw-workspace> --dry-run # Preview only
seabri migrate --from <openclaw-workspace> --replace # Overwrite
```

### Doctor

```bash
seabri doctor    # Config, API keys, model, daemon, policy, channels, integrations
```

---

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `VITE_GATEWAY_URL` | Yes (web UI) | Gateway WebSocket URL for streaming chat |
| `VITE_OPENSEABRI_API_KEY` | Yes (web UI) | Gateway API key used for authenticated pilot calls |
| `ANTHROPIC_API_KEY` | Yes (gateway) | Anthropic API key for the server-side gateway |
| `VITE_SEABRIDGE_API_URL` | No | SeaBridgeAI backend URL for status badge |
| `SEABRIDGE_API_URL` | No | SeaBridgeAI backend URL for bridge layer |
| `SEABRIDGE_API_KEY` | No | SeaBridgeAI API key |
| `TELEGRAM_TOKEN` | No | Telegram bot token |
| `TAVILY_API_KEY` | No | Web search for research loop |
| `GATEWAY_PORT` | No | Gateway WebSocket port (default 18790) |
| `OPENSEABRI_API_KEY` | Production | Required for `/api/seabri/*` via `x-openseabri-key` |
| `SEABRI_WS_TOKEN` | Production | Required for gateway WebSocket auth |
| `OPENSEABRI_CANVAS_WS_TOKEN` | Production if canvas enabled | Required for canvas WebSocket auth |
| `OPENSEABRI_CORS_ORIGIN` | Production | Allowed browser origin |
| `OPENSEABRI_RATE_LIMIT` | Production | Per-IP requests/minute budget |

Production and staging deployment details live in:

- `docs/deployment/OPENSEABRI_PRODUCTION_DEPLOYMENT.md`
- `docs/deployment/OPENSEABRI_STAGING_DEPLOYMENT_RUNBOOK.md`
- `docs/deployment/OPENSEABRI_STAGING_DEPLOYMENT_PACKAGE.md`
- `docs/deployment/OPENSEABRI_STAGING_EVIDENCE_TEMPLATE.md`
- `docs/security/OPENSEABRI_SECRET_ROTATION_AND_PROVIDER_VALIDATION.md`
- `docs/testing/OPENSEABRI_LIVE_PROVIDER_VALIDATION_PLAN.md`
- `docs/deployment/OPENSEABRI_REGISTRY_TELEMETRY_HARDENING_PLAN.md`

Useful staging checks:

```bash
npm run validate:staging
npm run smoke:staging
curl -H "x-openseabri-key: $OPENSEABRI_API_KEY" http://localhost:18790/api/seabri/admin/provider-readiness
curl -H "x-openseabri-key: $OPENSEABRI_API_KEY" http://localhost:18790/api/seabri/registry-snapshot
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The short version: write a skill, add an agent, or add a channel. Write for the most affected person, not the most sophisticated.

## Coding Agent Instructions

OpenSeaBri coding-agent guidance uses `AGENTS_SYSTEM.md` plus thin per-agent adapters:

- `AGENTS.md` - generic/Codex-style repo instructions.
- `CLAUDE.md`, `CODEX.md`, `GEMINI.md`, `OPENCODE.md` - per-agent adapters with the shared `/goal` protocol.
- `AGENTS_SYSTEM.md` - cross-agent OpenSeaBri operating rules, safety, and product boundaries.

Reusable coding-agent skills and workflows live in `C:\Users\adelm\SeaBridgeAI\everything-claude-code`. Do not recreate repo-local `AGENT.md` or `AGENT_SKILLS.md`. OpenSeaBri product methodology may remain in `skills/`, but reusable coding-agent skills should be centralized in ECC.

---

## License

MIT. Free forever. Build something worthy of it.

---

*Built on a flooded night. For everyone the climate crisis affects.*

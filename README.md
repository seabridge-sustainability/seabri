# 🌱 OpenSeaBri

**Your personal sustainability intelligence system. Free and open source.**

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
echo "VITE_ANTHROPIC_API_KEY=your_key_here" > .env
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

OpenSeaBri ships with 8 starter sustainability methodology skills. Add more from the community or write your own.

```bash
seabri skills          # List available skills
ls skills/             # Browse skill files
```

Skills are Markdown files encoding sustainability methodologies in plain language. Anyone can write one and contribute it.

---

## Research Loop

Set your research agenda in `research.md`. OpenSeaBri runs autonomous research cycles and saves findings to `research/findings/`.

```bash
seabri research        # Run a research cycle now
# Or let it run overnight automatically via cron
```

---

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `VITE_ANTHROPIC_API_KEY` | Yes (web UI) | Anthropic API key for the browser UI |
| `ANTHROPIC_API_KEY` | Yes (CLI/gateway) | Anthropic API key for CLI and gateway |
| `VITE_SEABRIDGE_API_URL` | No | SeaBridgeAI backend URL for status badge |
| `SEABRIDGE_API_URL` | No | SeaBridgeAI backend URL for bridge layer |
| `SEABRIDGE_API_KEY` | No | SeaBridgeAI API key |
| `TELEGRAM_TOKEN` | No | Telegram bot token |
| `TAVILY_API_KEY` | No | Web search for research loop |
| `GATEWAY_PORT` | No | Gateway WebSocket port (default 18790) |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The short version: write a skill, add an agent, or add a channel. Write for the most affected person, not the most sophisticated.

---

## License

MIT. Free forever. Build something worthy of it.

---

*Built on a flooded night. For everyone the climate crisis affects.*

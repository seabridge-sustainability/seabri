# OpenSeaBri — What I Can Do

This document is injected into every agent session alongside SOUL.md and AGENTS.md.

## Core Capabilities

### Conversation and Analysis
- Answer sustainability questions in plain language — physical risk, transition risk, reporting, nature
- Remember your situation across sessions (location, assets, goals, obligations)
- Switch specialist agents mid-conversation with `/switch <agent-id>`
- Search past conversations with `seabri search "<query>"`

### Research
- Run autonomous research cycles on topics you define in `research/program.md`
- Score findings for relevance, source quality, and actionability — only high-quality results saved
- Run overnight research: `seabri research --overnight` (8-hour budget, 15 min per topic)
- Review last night's findings: `seabri research --report`
- Run parallel research across multiple topics: `seabri research --parallel N`

### Scheduling
- Schedule recurring sustainability briefings or research tasks using natural language
- `seabri cron add "daily flood risk briefing at 8am"`
- Deliver scheduled output to terminal, Telegram, or WebSocket clients

### Memory and Learning
- Build a persistent picture of who you are and what you are responsible for (USER.md)
- Update MEMORY.md with new context from each conversation
- Create SKILL.md files automatically after complex tasks — methodology captured for reuse
- List and create skills: `seabri skills list`, `seabri skills create <name>`

### Channels
- **CLI**: `seabri chat` — terminal conversation
- **WebSocket**: `ws://localhost:18790` — UI and IDE integration
- **Telegram**: full bot with pairing code security for unknown senders

### Session Commands (type these during any conversation)
- `/new` — start a fresh session
- `/reset` — clear conversation history, keep agent
- `/compact` — compress history to save context
- `/status` — show current agent, session, and turn count
- `/think` — ask agent to reason step-by-step before answering
- `/usage` — show token usage estimate
- `/switch <agent-id>` — change specialist agent
- `/skills` — list available skills
- `/memory` — show current memory

## Specialist Agents

| ID | Name | Best For |
|----|------|----------|
| `climate-risk` | Climate Risk | Flood, fire, heat, drought risk for specific locations and assets |
| `nature-biodiversity` | Nature & Biodiversity | Nature dependencies, ecosystem services, TNFD, SBTN |
| `sustainability-reporting` | Sustainability Reporting | GRI, TCFD, ISSB, CSRD, CDP — what to disclose and how |
| `investment-screening` | Investment Risk Screening | Portfolio physical and transition risk, climate value-at-risk |
| `home-community` | Home & Community | Home resilience, wildfire defensible space, flood insurance |
| `net-zero` | Net Zero & Decarbonization | Scope 1/2/3, SBTi, decarbonization roadmaps |
| `natural-capital` | Natural Capital & Land | Water stress, soil health, land use, ecosystem valuation |
| `general` | General Sustainability | All topics — good starting point |

## Built-In Skills

Skills are methodology guides the agent uses to give better, more structured answers:

| Skill | Topics Covered |
|-------|----------------|
| `flood-risk-screening` | FEMA SFHA, flood insurance, first-floor elevation, mitigation investments |
| `wildfire-risk-assessment` | WUI risk, defensible space zones, home hardening, insurance |
| `home-resilience-audit` | Multi-hazard resilience, IRA credits, heat pumps, backup power |
| `carbon-footprint-reduction` | Scope 1/2/3 measurement, reduction levers, verification |
| `net-zero-roadmap` | SBTi, decarbonization pathways, carbon markets |
| `nature-dependency-screening` | TNFD, SBTN, ecosystem services, natural capital accounting |
| `investment-risk-screening` | Physical risk data sources, transition risk, stranded assets |
| `climate-disclosure-structure` | TCFD, ISSB S1/S2, CSRD, materiality assessment |

New skills are added automatically after complex tasks.

## Data Sources (When Connected to SeaBridgeAI)

When the SeaBridgeAI backend is connected, I can query:
- Climate risk scores by location and asset type
- Nature risk assessments
- Sustainability performance benchmarks
- Carbon pricing data
- Regulatory tracking

When running standalone, I use direct AI reasoning and web research (via Tavily if configured).

## Configuration

Key settings (set in `.env`):
- `ANTHROPIC_API_KEY` — required for all AI functions
- `TAVILY_API_KEY` — enables web search in research loop
- `TELEGRAM_TOKEN` — enables Telegram channel
- `SEABRIDGE_API_URL` / `SEABRIDGE_API_KEY` — connects to SeaBridgeAI backend
- `OPENSEABRI_MODEL` — override AI model (default: claude-sonnet-4-5)
- `OPENSEABRI_WORKSPACE` — override workspace directory

Run `seabri doctor` to check all configuration.

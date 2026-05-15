# OpenSeaBri Agents

## SeaBridgeAI Central System Pointer

SYSTEM_ID: SEABRIDGE_AGENT_SYSTEM_V1

Canonical shared coding-agent system: C:\Users\adelm\SeaBridgeAI\everything-claude-code

Use the central system above as the source of truth for reusable skills, workflows, checklists, and cross-agent compatibility. Superpowers is embedded there as an adapted local methodology through the SeaBridgeAI sea-* skills; Claude Code also has user-scope local plugin `superpowers@superpowers-dev` installed from ECC. Do not add, update, remove, or reinstall Superpowers globally or through a marketplace unless explicitly approved.

Full callable SeaBridgeAI skill catalog: sea-senior-dev-workflow, sea-brainstorming-and-spec-refinement, sea-task-orchestration, sea-test-driven-development, sea-systematic-debugging, sea-verification-before-completion, sea-code-review-response, sea-git-worktree-isolation, sea-parallel-agent-dispatch, sea-finishing-development-branch, sea-backend-api-verification, sea-frontend-design, sea-ai-data-integrity, sea-sustainability-domain-review, sea-context-hygiene, sea-cross-repo-handoff, sea-skill-creator-protocol, sea-knowledge-vault, sea-gsd-controlled-execution, sea-local-llm-training.

Repo-local guidance remains authoritative only for this repo's specific runtime, product, and safety overrides. Do not copy central skill bodies into this repo.

## SeaBridgeAI Agent Baseline

Repo structure, build/test/lint/typecheck/startup commands, recurring lessons, and artifact policy are local here and in ECC `repo-integrations/openseabri.md`. All coding agents must follow ECC self-verification, controlled auto mode, and review collaboration: plan before edits, update tests when practical, prove red/green when practical, run targeted checks, broaden checks when risk warrants it, document skipped tests, and never claim completion from code changes alone. Allowed auto steps are formatting, lint/typecheck fixes, test discovery, import cleanup, small tested refactors, approved report/log moves, docs path fixes, and read-only scans. Commits, pushes, dependency installs, migrations, production data changes, auth/security changes, billing changes, destructive file operations, yolo/autonomous/dangerous modes, global installs, and long-running training jobs require explicit approval.

Shared skills, Harness Engineering, Agent Shield, and Strix are inherited from ECC. Load ECC `AGENT_SKILLS.md` for `grill-me`, `ubiquitous-language`, `improve-codebase-architecture`, `sea-*` skills, and Harness reviewer skills. Load ECC `docs/harness/HARNESS_ENGINEERING.md` and `scripts/check-harness.ps1` for baseline-aware guardrails. Full vulnerability scans must use the approved ECC wrapper so Agent Shield and Strix run together only on approved local/staging scope.

## Cross-Agent Skill Contract

This Codex/Gemini file, `CLAUDE.md`, and `AGENTS_SYSTEM.md` must describe the
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
For emergency playbooks, incident notes, contractor/vendor notes, local authority
research, wikilinks, frontmatter, `.base`, or `.canvas` files, call
`scripts/knowledge-vault.ps1` so the central SeaBridgeAI validator handles dry-run
checks, diffs, and optional backed-up writes.
For GBrain code lookup or shared agent-memory checks, use ECC skill `gbrain` and
call `C:\Users\adelm\SeaBridgeAI\SeaBridgeAI\tools\gbrain\seabridge-gbrain.ps1`
with `check`, `mcp`, or `index-plan` first. Do not initialize a brain, index this
repo, sync sources, enable contributor capture, or start jobs without explicit
approval.

OpenSeaBri is a free sustainability intelligence platform built for real people — homeowners, farmers, small business owners, investors, and anyone who wants straight answers about climate risk, nature, and responsible business practices. No consultant-speak, no paywalls for basic information, no acronym soup.

This document describes the eight agents available on OpenSeaBri, who they are designed for, and how to reach them.

---

## How This Works

Every agent in OpenSeaBri draws on a library of detailed methodology guides — the same guides you can read directly in the `skills/` folder. When you ask a question, the agent pulls from those guides plus up-to-date data sources to give you a specific, grounded answer. If the agent cannot find a reliable source for something, it will tell you rather than guess.

You can talk to any agent in plain language. You do not need to know the right terminology. Just describe your situation and what you are trying to figure out.

---

## The 8 Agents

---

### 1. Climate Risk

**Who it is for**: Homeowners, property buyers, businesses, farmers, and anyone making long-term decisions in places where the climate is changing.

**What it covers**:
- Physical climate risks: floods, wildfire, extreme heat, drought, coastal erosion, sea level rise
- How to look up risk for a specific address using FEMA flood maps, First Street Foundation, NOAA sea level viewer
- What climate projections actually mean for a specific property or region over a 10-30 year horizon
- Insurance implications: what rising risk means for availability and cost of coverage
- Resilience actions that actually reduce risk versus ones that sound good but do not help much
- For businesses: how climate physical risk can affect supply chains, facilities, and operations

**Example questions**:
- "My house is in Zone X on the FEMA map but it floods every few years. What is actually going on?"
- "We are thinking about buying property in coastal South Carolina. What should we be looking at for long-term flood and storm risk?"
- "My farm has had three drought years in a row. Is this likely to continue, and what does the data say?"

---

### 2. Nature and Biodiversity

**Who it is for**: Farmers, food and beverage businesses, companies with physical supply chains, anyone whose operations depend on land, water, or natural systems.

**What it covers**:
- How to identify which natural systems your business or farm actually depends on (water, soil, pollinators, forests)
- Water risk screening using WRI Aqueduct — finding out if your location faces water scarcity, variability, or depletion
- Deforestation risk in supply chains: which commodities carry the highest risk and how to trace them
- Soil health basics: what organic matter percentages mean, how compaction affects yields, cover cropping practices
- Pollinator dependency by crop type and what colony decline means for yields
- Biodiversity screening near operations using free tools (protectedplanet.net)
- Payment for ecosystem services: conservation easements, USDA programs, wetland mitigation banking, biodiversity credits
- The TNFD LEAP process explained without jargon

**Example questions**:
- "I grow almonds in California. How dependent is my crop on pollinators and what is the current risk to pollinator populations in my area?"
- "Our coffee sourcing comes from Central America. How do I check whether our suppliers are in areas with deforestation risk?"
- "I keep hearing about water stress. How do I find out if my facility in Arizona is in a high-stress basin?"

---

### 3. Sustainability Reporting

**Who it is for**: Small and medium businesses that are facing questions from customers, banks, investors, or regulators about their environmental and social practices. Also useful for companies preparing for formal reporting requirements.

**What it covers**:
- Who actually needs to comply with what reporting rules, and on what timeline (EU CSRD waves, SEC rules, UK requirements)
- The TCFD framework explained in plain terms — what Governance, Strategy, Risk Management, and Metrics/Targets mean in practice for a mid-size business
- What "double materiality" means and why it matters under EU rules
- Scope 1, 2, and 3 emissions: what each covers, how to measure them at small business scale, and what is practical versus what is theoretical
- Scenario analysis without consultants: how to think through two plausible futures for your business
- ISSB S1 and S2 — the new global baseline that is replacing TCFD in most markets
- What banks and large buyers are increasingly asking for, and how to prepare
- Common gaps that show up in first-time disclosures
- A realistic disclosure timeline based on your company size and location

**Example questions**:
- "We are a manufacturing company in Germany with 300 employees and EUR 50M revenue. Do we need to file under CSRD and when?"
- "Our bank is asking us about climate risk for our loan renewal. What do they want and how do we put it together?"
- "What is the difference between TCFD and ISSB? We started on TCFD two years ago — do we need to start over?"

---

### 4. Investment Risk Screening

**Who it is for**: Individual investors, wealth managers, pension fund trustees, and anyone who wants to understand how climate and nature risks affect investment portfolios.

**What it covers**:
- How physical climate risk (floods, wildfires, heat) affects specific asset classes: real estate, agriculture, infrastructure, insurance
- Transition risk: how the shift away from fossil fuels affects valuations in energy, automotive, utilities, and related sectors
- What "stranded assets" means and which sectors carry the most exposure
- How to read company sustainability disclosures and spot gaps or overstatements
- Screening tools and data sources for sustainability-related investment analysis
- Carbon pricing and what a rising carbon price means for business cost structures
- The basics of green bonds, sustainability-linked bonds, and labeled debt — what the labels actually guarantee
- Nature-related financial risks: water, deforestation, biodiversity loss, and which sectors are most exposed

**Example questions**:
- "I own a commercial real estate fund. What is the actual exposure to physical climate risk in my portfolio and how do I find out?"
- "My pension fund holds significant oil and gas positions. What are the transition risk scenarios and how material could the impact be?"
- "I keep seeing 'sustainable' investment funds but they seem to hold similar companies. What should I actually look for to tell them apart?"

---

### 5. Home and Community

**Who it is for**: Homeowners, renters, households, and community members who want practical advice on reducing their impact, improving resilience, and making smarter decisions about where and how they live.

**What it covers**:
- Carbon footprint: where it actually comes from for a typical household (transportation, home energy, food, goods), and which actions make a real difference versus which ones are mostly symbolic
- Home energy upgrades that pay off: heat pumps, insulation, air sealing, windows — with real cost and payback estimates
- Solar and community solar — how to evaluate whether it makes sense and how to find options
- Electric vehicles — the actual emissions comparison, total cost of ownership, federal and state incentives
- Food choices and carbon: why beef is in a different category from other proteins, and what realistic dietary shifts actually accomplish
- Carbon offsets: how to tell a credible one from a marketing product (Gold Standard, Verra, additionality)
- Property resilience: flood-proofing, wildfire hardening, extreme heat preparation
- Community-level tools: what local governments and utilities can offer, how to engage

**Example questions**:
- "I want to actually reduce my family's carbon footprint. Where do I start for maximum impact?"
- "I am thinking about a heat pump but my contractor quoted me $18,000. Is that right, and what tax credits apply?"
- "I buy carbon offsets for my flights. How do I know if they are actually doing anything?"

---

### 6. Net Zero and Decarbonization

**Who it is for**: Business owners, sustainability managers, and operations teams that want to reduce emissions and understand what a credible decarbonization path looks like for their organization.

**What it covers**:
- What a net zero commitment actually requires versus what it tends to look like on paper
- How to build a Scope 1, 2, and 3 inventory from scratch for a small or mid-size business
- Science-based targets: what SBTi requires, whether it is right for your organization, and what the alternatives are
- Energy transition within a business: renewable electricity options (PPAs, RECs, on-site solar), fleet electrification, building decarbonization
- Supply chain engagement: how to begin reducing Scope 3 without a massive supplier program
- The role of carbon offsets and removals in a credible net zero strategy — where they belong and where they do not
- How to set targets that are credible and specific rather than aspirational and vague
- Reporting your progress: what to measure, how to track it, and how to communicate it

**Example questions**:
- "We committed to net zero by 2040 but I am not sure what that actually means for us operationally. Where do we start?"
- "Our biggest emissions source is employee commuting and business travel. What can we actually do about Scope 3 in that category?"
- "We are a food manufacturer. What does it take to set a science-based target and is it realistic for a company our size?"

---

### 7. Natural Capital and Land

**Who it is for**: Farmers, landowners, foresters, conservation organizations, and anyone who manages land or wants to understand the financial value of healthy natural systems.

**What it covers**:
- Ecosystem services valuation: how to think about what healthy land, water, and soil are worth financially
- Payment for ecosystem services programs in the US: USDA Conservation Reserve Program (CRP), Conservation Stewardship Program (CSP), EQIP, and wetland reserve programs
- Conservation easements: what they are, how they work, what the tax benefits are, and how to find a land trust
- Carbon sequestration in agriculture and forestry: soil organic carbon, forest carbon crediting programs, what is required for a credible credit
- Biodiversity credits: early-market overview, what they are being used for, and current program examples
- Wetland mitigation banking: how it works for landowners with restorable wetlands
- Regenerative agriculture basics: what cover crops, no-till, and integrated livestock management actually accomplish in terms of soil health and emissions
- How to read a land health assessment and what the key indicators mean

**Example questions**:
- "I have 400 acres in Kansas with some marginal cropland. What programs would pay me to put it into conservation?"
- "I own forestland in the Pacific Northwest. Is there a credible way to get paid for the carbon my forest sequesters?"
- "What is the actual financial value of having a functioning wetland on my property versus draining it?"

---

### 8. General Sustainability

**Who it is for**: Anyone who does not fit neatly into the other categories, or who has a question that cuts across multiple topics.

**What it covers**:
- Cross-cutting sustainability questions that span climate, nature, finance, and operations
- Background on sustainability frameworks, terminology, and concepts — explained without assuming prior knowledge
- Routing assistance: if you are not sure which agent to use, this one will help you find the right starting point
- Context on sustainability news, policy developments, and what they mean in practice
- Historical data and trends on emissions, biodiversity, climate indicators
- Help interpreting sustainability reports, disclosures, and third-party ratings

**Example questions**:
- "What is actually happening with global emissions right now? Are they going up or down?"
- "I keep seeing companies say they are 'carbon neutral' — what does that actually mean and should I believe it?"
- "I run a small hotel. I do not know where to start with any of this. What is the first thing I should actually do?"

---

## Gateway Channels

### Web Interface

OpenSeaBri is accessible at **http://localhost:5173** when running locally. The web interface lets you browse the skill guides directly, start a conversation with any of the eight agents, and switch between agents mid-conversation if your question evolves.

### Command Line

If you prefer working in a terminal:

```bash
seabri chat
```

This opens an interactive chat session. You can specify an agent directly:

```bash
seabri chat --agent climate-risk
seabri chat --agent home-community
seabri chat --agent net-zero
```

Available agent identifiers: `climate-risk`, `nature-biodiversity`, `sustainability-reporting`, `investment-risk`, `home-community`, `net-zero`, `natural-capital`, `general`.

### Telegram

OpenSeaBri has a Telegram integration for quick questions on the go. Once connected, you can message the bot directly and specify which agent to use, or let the general agent route your question. Contact your OpenSeaBri administrator for the bot link.

Unknown senders on DM channels receive a pairing code before any agent will respond. An administrator approves the sender with `seabri pairing approve <senderId> <code>`. Per-sender agent preferences and allow/deny rules live in `seabri policy`.

---

## Working With Agents Across Sessions

Every channel (CLI, web, Telegram) shares the same slash command surface for managing a conversation:

- `/switch <agent-id>` — change the specialist agent mid-conversation
- `/persona <id>` or `/persona off` — adopt a tone (e.g. plain-language vs. expert depth) or clear it
- `/new`, `/reset`, `/compact` — start fresh, clear history, or compress long history
- `/status`, `/agents`, `/skills`, `/memory` — inspect what the agent knows and who is available
- `/think` — ask the agent to reason step-by-step on the next turn

Past conversations are searchable with `seabri search "<query>"`. Recurring tasks (daily briefings, weekly summaries) can be scheduled with `seabri cron add "<natural language schedule>"` and delivered to any channel.

See `TOOLS.md` for the full capability reference and `README.md` for the power-feature CLI surface (sessions, daemon, migrate, doctor, research loop).

---

## SeaBridgeAI Integration

OpenSeaBri can run in two modes:

**Standalone mode**: The platform runs independently using its built-in skill library and public data sources. No connection to a SeaBridgeAI account is required. This is the default when running locally.

**Connected mode**: When linked to a SeaBridgeAI account, the agents can also draw on your organization's private data — uploaded documents, past assessments, company-specific metrics — in addition to the public skill library. Responses are more specific to your situation. Connected mode requires an active SeaBridgeAI subscription and API credentials configured in the `.env` file.

To switch between modes, set `SEABRIDGEAI_CONNECTED=true` in your environment and provide a valid `SEABRIDGEAI_API_KEY`. In standalone mode, these variables can be left unset.

---

*OpenSeaBri agents are designed to be informative and practical, not to replace professional legal, financial, or engineering advice. For decisions with significant financial or legal implications, consult a qualified professional.*


---

## caveman — Token Compression

Caveman compresses agent output ~65–75% using terse "caveman-style" prose that preserves full technical accuracy. Auto-activates via SessionStart hook after install.

**Reference:** `C:\Users\adelm\SeaBridgeAI\everything-claude-code\references\caveman\`

Install (Claude Code):
```bash
claude plugin marketplace add JuliusBrussee/caveman && claude plugin install caveman@caveman
```

Skills:
- `/caveman` — activate compression (intensity: `lite` / `full` / `ultra` / `wenyan`)
- `/caveman-commit` — terse commit messages
- `/caveman-review` — one-line code reviews
- `/caveman-compress` — compress CLAUDE.md ~46% to save input tokens every session

Codex: use `$caveman` in prompts. Gemini: `gemini extensions install caveman`.

---

## codeburn — Token Usage Dashboard

Codeburn tracks AI coding token spend across Claude Code, Codex, Cursor, and others. Reads session data from disk — no API keys needed.

**Reference:** `C:\Users\adelm\SeaBridgeAI\everything-claude-code\references\codeburn\`

Install:
```bash
npm install -g codeburn
# or one-shot:
npx codeburn
```

Key commands:
```bash
codeburn              # interactive TUI dashboard (default: 7 days)
codeburn today        # today's spend
codeburn month        # this month
codeburn optimize     # find waste patterns + copy-paste fixes
codeburn status       # compact one-liner summary
codeburn export       # CSV/JSON export
```


---

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

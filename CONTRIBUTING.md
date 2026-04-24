# Contributing to OpenSeaBri

Thank you. Every contribution makes sustainability intelligence more accessible to more people.

The mission is simple: the tools that help people understand climate risk and act on sustainability should not be a privilege. If your contribution makes that more true, it belongs here.

---

## Three Ways to Contribute

### 1. Write a Skill

A skill is a `SKILL.md` file that encodes a real sustainability methodology in plain language. It teaches OpenSeaBri how to approach a category of question.

**The test:** Does a homeowner, farmer, or small business owner with no sustainability background get genuinely useful guidance from this skill? If yes, it belongs in OpenSeaBri.

**How to write a skill:**
1. Create a new directory: `skills/your-skill-name/`
2. Write `SKILL.md` using this structure:
   - What this is and who it's for (first paragraph, plain language)
   - The methodology, broken into clear sections
   - Data sources with descriptions of what they show and where to find them
   - What to do with the information — connect to real decisions
   - When professional help is necessary
3. Submit a pull request

**Language rules for skills:**
- Write for the most affected person, not the most sophisticated
- No unexplained acronyms — define every term on first use
- Lead with consequences and decisions, not framework descriptions
- "You face a 1 in 4 chance of flooding in the next 30 years" not "the asset exhibits elevated flood hazard"

**Skill ideas the community needs:**
- Corporate water risk assessment
- Scope 3 emissions measurement guide
- Biodiversity net gain methodology
- Climate adaptation planning for cities
- Supply chain deforestation risk
- Home electrification guide by climate region
- Agricultural carbon credit evaluation
- Insurance gap analysis for climate risk

---

### 2. Add a New Agent

An agent is a specialized AI assistant with deep expertise in a sustainability area.

**How to add an agent:**
1. Add the agent system prompt to `gateway/agents/agents.ts` following the existing pattern
2. Add the agent config entry (id, name, icon) to `gateway/config.ts`
3. Add the agent card to `src/App.tsx` for the web UI
4. Write a skill file for the methodology the agent uses

**What makes a good agent:**
- Deep, specific expertise — not generic sustainability awareness
- A clear audience (who would specifically seek out this agent?)
- System prompt that gives genuinely useful answers to real questions from real people
- Plain language as default, technical depth available on request

**Agent ideas:**
- Supply Chain Sustainability (emissions and risk across suppliers)
- Sustainable Finance (green bonds, sustainability-linked loans, transition finance)
- Energy Communities (community solar, microgrids, energy cooperatives)
- Circular Economy (waste reduction, product design, repair and reuse)

---

### 3. Add a Channel

OpenSeaBri should be reachable wherever people already are.

**How to add a channel:**
1. Create `gateway/channels/your-channel.ts`
2. Implement the channel interface:
   ```typescript
   export async function startYourChannel(): Promise<void>
   // Initialize the channel
   // Route incoming messages to router.routeMessage()
   // Send responses back to the user
   // Maintain per-user conversation state
   ```
3. Register in `gateway/index.ts`
4. Add the token/config to `.env.example`

**Channels the community needs:**
- WhatsApp (via Twilio or WhatsApp Business API)
- Discord
- Slack
- SMS (via Twilio)
- Email digest

---

## Language Rules for All Contributions

These are non-negotiable:

1. **Never use the acronym "ESG".** Say what you mean: "sustainability reporting", "climate risk", "responsible investment", "sustainability due diligence".

2. **Write for the person most affected, not the most sophisticated.** If a homeowner with no background cannot understand your contribution, rewrite it.

3. **Lead with consequences, not frameworks.** What does this mean for someone making a real decision?

4. **Be honest about uncertainty.** Climate projections have ranges. Data quality varies. Say so.

---

## Code Standards

- TypeScript for all gateway, CLI, and bridge code
- React for UI components
- No external styling libraries — inline styles and lucide-react icons only
- Handle errors gracefully — OpenSeaBri never crashes on missing config
- Standalone mode always works without SeaBridgeAI backend

---

## The Bar

The bar for contribution is: does it help a real person in a real situation?

A homeowner needs to know if her home will flood.
A farmer needs to know if carbon credits are worth pursuing.
A small business owner needs to know what his bank actually wants to see.
An investor needs to know which assets face real climate risk.

If your contribution helps one of those people better, it belongs here.

We are building infrastructure for the planet. Every contribution matters.

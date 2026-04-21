import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Send, Github, Leaf, ChevronRight, Wifi, WifiOff, X, Menu } from 'lucide-react';

// ---------------------------------------------------------------------------
// Agent definitions
// ---------------------------------------------------------------------------
const AGENTS = [
  {
    id: 'climate-risk',
    name: 'Climate Risk',
    tagline: 'How climate change threatens what you own',
    color: '#ef4444',
    icon: '🌊',
    description:
      'Understand how flooding, wildfire, heat, drought, and sea level rise affect your home, farm, business, or investments. Get plain-language answers and quantitative risk data.',
    systemPrompt: `You are a climate physical risk specialist helping people understand how climate change concretely threatens their assets and lives. You cover: flood risk (riverine, coastal, pluvial), wildfire, extreme heat, drought, water stress, and sea level rise.

Your approach:
- Lead with what it means for the person, not what the framework says
- Give specific numbers: "1 in 4 chance of flooding in next 30 years" not "elevated flood hazard"
- Explain how risk is changing over a 30-year mortgage or investment horizon
- Distinguish between hazard (the physical event), exposure (your asset is in the path), and vulnerability (how much it would hurt)
- Reference real data sources: FEMA flood maps, First Street Foundation, WRI Aqueduct, NOAA climate projections, USFS Fire Hazard Severity Zones
- Be honest about uncertainty in climate projections — give ranges, not false precision
- Connect risk scores to real decisions: insurance, resilience investment, financing, resale value
- When professional assessment is needed (e.g., a structural engineering flood assessment), say so clearly

When connected to SeaBridgeAI backend: you have access to scored physical risk data from climate risk models. Cite the data source and score when using it.

You help homeowners, farmers, small businesses, investors, and cities. Adjust your depth to who you're talking to.`,
    starterQuestions: [
      'Is my home at risk of flooding?',
      'How is wildfire risk changing in my area?',
      'What does sea level rise mean for coastal property values?',
      'How do I read a FEMA flood map?',
    ],
  },
  {
    id: 'nature-biodiversity',
    name: 'Nature & Biodiversity',
    tagline: 'How your activities depend on and impact nature',
    color: '#22c55e',
    icon: '🌿',
    description:
      'Understand water stress, forest dependencies, soil health, pollinator risk, and how the TNFD framework applies to your business or investments.',
    systemPrompt: `You are a nature and biodiversity risk specialist helping people understand how their activities depend on ecosystems and how they impact nature.

You cover: water risk and stress (WRI Aqueduct), land use and deforestation, soil health and degradation, biodiversity and habitat loss, pollinator dependency in agriculture, fisheries and ocean health, and nature-based solutions.

Your approach:
- Explain the five categories of ecosystem services in plain language: provisioning (food, water, materials), regulating (flood protection, carbon storage, pollination), cultural (recreation, spiritual), supporting (soil formation, nutrient cycling), and information (genetic resources)
- Help users map which ecosystem services their business or investments depend on
- Use WRI Aqueduct for water risk, IBAT for biodiversity, Global Forest Watch for deforestation, ENCORE for dependency mapping
- Explain the TNFD LEAP approach (Locate, Evaluate, Assess, Prepare) without jargon
- Connect nature risk to financial risk: supply chain disruption, regulatory pressure, reputational risk, stranded assets
- For farmers and land managers: explain nature-based income opportunities (carbon credits, biodiversity net gain, payment for ecosystem services)
- Be honest about where measurement is still developing vs where there is established methodology

You help farmers, companies with supply chains, investors, conservation organizations, and anyone who wants to understand their relationship with the natural world.`,
    starterQuestions: [
      "Does my business depend on water in ways I haven't mapped?",
      'What is TNFD and do I need to care about it?',
      "How do I assess my supply chain's nature dependencies?",
      'What nature-based income is available for my land?',
    ],
  },
  {
    id: 'sustainability-reporting',
    name: 'Sustainability Reporting',
    tagline: 'What you need to disclose, to whom, by when',
    color: '#3b82f6',
    icon: '📋',
    description:
      'Navigate climate and nature disclosure requirements. Get plain-language action lists for TCFD, CSRD, SEC climate rules, ISSB, and what lenders and investors are asking for.',
    systemPrompt: `You are a sustainability disclosure specialist who translates complex reporting framework requirements into plain-language action lists. You help organizations understand what they actually need to do, not just what the frameworks say.

You cover: TCFD (Task Force on Climate-related Financial Disclosures — the four pillars: governance, strategy, risk management, metrics and targets), CSRD (Corporate Sustainability Reporting Directive — EU mandatory from 2024), ISSB S1 and S2 (global baseline standards), SEC climate disclosure rules, GRI standards, TNFD (nature and biodiversity), and what lenders and institutional investors are now requiring.

Your approach:
- Start with what applies to this specific organization (size, sector, jurisdiction, listing status)
- Translate framework language into specific action items with owners and timeframes
- Explain what scenario analysis means and how to do a practical version without hiring consultants
- Distinguish what is legally required NOW vs what is coming in 1-3-5 years
- Explain physical risk vs transition risk in plain language with examples
- Help organizations identify their material sustainability topics — what actually matters for their specific business
- Be honest about where organizations need professional advisors vs what they can do themselves
- Highlight common gaps: missing scope 3 data, no scenario analysis, targets without plans, governance without accountability

You help companies of all sizes, from small businesses getting their first lender request to large corporations navigating multiple mandatory frameworks.`,
    starterQuestions: [
      'What do I need to disclose and to whom?',
      'What does scenario analysis actually mean in practice?',
      'My bank just asked about climate risk — what do I say?',
      "What's the difference between TCFD and ISSB?",
    ],
  },
  {
    id: 'investment-screening',
    name: 'Investment Risk Screening',
    tagline: 'Sustainability risks in what you own or are buying',
    color: '#f59e0b',
    icon: '🔍',
    description:
      'Screen investments for physical climate risk, transition risk, nature dependencies, and regulatory exposure. Understand what institutional investors now expect from asset managers.',
    systemPrompt: `You are an investment sustainability risk analyst helping investors understand the climate and nature risks embedded in their portfolios and evaluate new opportunities.

You cover: physical climate risk screening (flood, wildfire, heat, water stress by asset location), transition risk (regulatory, technology, market risks as the world decarbonizes — stranded assets, carbon price exposure, policy risk), nature and water risk in supply chains, social and governance risk factors, and what institutional investors and asset owners now require in sustainability reporting.

Your approach:
- Help investors screen existing holdings for material physical climate risks by asset type and location
- Explain transition risk: which sectors face the highest regulatory, technology displacement, and market demand risk
- Walk through what a sustainability section in an investment memorandum or due diligence report should contain
- Explain carbon pricing risk: which assets have significant exposure and how to quantify it
- Cover the difference between portfolio-level risk aggregation vs asset-level assessment
- Explain what institutional investors (pension funds, sovereign wealth funds, insurers) now expect from their investment managers
- Be specific about data sources: physical risk (Jupiter, Four Twenty Seven, Moody's), transition risk (MSCI, Sustainalytics), carbon data (CDP, GHG Protocol)
- For real estate: explain how climate risk is starting to affect valuations, insurance premiums, and financing terms
- Flag when professional due diligence is necessary vs when a desktop screen is sufficient

You help individual investors, family offices, fund managers, real estate investors, and corporate M&A teams.`,
    starterQuestions: [
      'Which of my assets face the highest flood risk?',
      'What transition risks should I worry about in my portfolio?',
      'What do my institutional investors expect me to report?',
      'How do I structure a sustainability section for a deal memo?',
    ],
  },
  {
    id: 'home-community',
    name: 'Home & Community',
    tagline: 'Sustainability decisions for your home and neighborhood',
    color: '#8b5cf6',
    icon: '🏠',
    description:
      'Get practical guidance on energy efficiency, solar and storage, flood and fire preparedness, carbon footprint, government incentives, and climate resilience for your home.',
    systemPrompt: `You are a friendly, practical sustainability advisor for homeowners, renters, and community members. You help people make better sustainability decisions for their homes and neighborhoods — decisions that save money, reduce risk, and protect what they care about.

You cover: home energy efficiency (insulation, windows, HVAC, appliances — where heat escapes and how to stop it), solar panels and battery storage (when it makes financial sense, how to evaluate proposals, net metering), heat pumps (when switching from gas makes economic sense), electric vehicles and home charging, flood preparedness and resilience upgrades, wildfire home hardening (defensible space, ember-resistant vents, roofing), extreme heat preparation, home carbon footprint (what the biggest sources are and what actually reduces them), and government incentives (US Inflation Reduction Act tax credits, state rebates, utility programs, PACE financing).

Your approach:
- Always lead with what saves money AND reduces risk/footprint — frame sustainability as the financially smart choice
- Give specific numbers: payback periods, annual savings, incentive amounts, risk reduction estimates
- Prioritize recommendations by impact and payback period — don't give equal weight to changing light bulbs and adding insulation
- For solar: explain how to read a proposal, what questions to ask, how to compare installers
- For flood: explain what resilience measures actually work (elevated HVAC, sump pumps, backflow valves) vs what are mostly cosmetic
- For wildfire: explain defensible space zones and the specific materials that matter
- For incentives: be specific about what is available, income limits, deadlines, and how to claim
- Acknowledge when local conditions matter a lot (utility rates, climate zone, local programs)
- Be honest: not every upgrade makes financial sense for every situation

You help people with no sustainability background make decisions they'll actually be glad they made.`,
    starterQuestions: [
      'Is my home at risk of flooding?',
      'Does solar make financial sense for me?',
      'What government money is available for home energy upgrades?',
      'How do I harden my home against wildfire?',
    ],
  },
  {
    id: 'net-zero',
    name: 'Net Zero & Decarbonization',
    tagline: 'Building a credible path to zero emissions',
    color: '#06b6d4',
    icon: '🎯',
    description:
      'Set credible emissions reduction targets, build real decarbonization roadmaps, and understand what scope 1, 2, and 3 emissions mean for your organization.',
    systemPrompt: `You are a decarbonization strategy specialist helping organizations understand their emissions and build credible paths to net zero.

You cover: emissions measurement (scope 1 — direct; scope 2 — purchased electricity; scope 3 — supply chain and value chain, the hardest and most important), science-based targets (SBTi process, what validation requires, near-term vs long-term targets), decarbonization levers by sector (energy transition, process innovation, fuel switching, supply chain engagement, electrification), carbon credits and offsets (when they are legitimate supplementary tools vs greenwashing), what "net zero" actually means vs "carbon neutral" vs "climate positive" vs "carbon negative", and how to build a decarbonization roadmap that is credible to investors, lenders, and regulators.

Your approach:
- Start with measurement: help organizations understand what they actually emit before talking about reduction
- Explain scope 3 honestly: it is usually 70-90% of total emissions for most organizations and the hardest to measure and reduce
- Distinguish between a real decarbonization target (reducing actual emissions) and offset-heavy "neutrality" claims
- Explain the SBTi process without jargon: what a 1.5°C pathway means, what near-term and long-term targets are, what validation involves
- Help identify the highest-impact decarbonization levers for the specific sector
- Be honest about timelines: net zero by 2050 is very different depending on the starting point and interim targets
- Explain why interim targets (2030) are as important as long-term targets (2050)
- Cover the difference between absolute reduction targets and intensity targets
- Flag when carbon credits are appropriate supplementary tools vs when they are being used to avoid real reductions
- Help organizations communicate their target credibly without overstating

When connected to SeaBridgeAI backend: you have access to GHG emissions data and transition risk scores for specific portfolios. Use this data when available.

You help companies of all sizes, investors, cities, and individuals who want to make real progress on emissions reduction.`,
    starterQuestions: [
      "What does 'net zero by 2050' actually require me to do?",
      'How do I measure my scope 3 emissions?',
      "What's a science-based target and do I need one?",
      'Are carbon offsets legitimate or greenwashing?',
    ],
  },
  {
    id: 'natural-capital',
    name: 'Natural Capital & Land',
    tagline: 'Income from nature: credits, conservation, regenerative practices',
    color: '#84cc16',
    icon: '🌾',
    description:
      'Explore carbon credits, biodiversity credits, regenerative agriculture, water markets, and conservation finance for farmers, land managers, and rural communities.',
    systemPrompt: `You are a natural capital and land management specialist helping farmers, land managers, rural communities, and conservation organizations understand how to protect and generate income from natural assets.

You cover: carbon markets for land (voluntary carbon markets — soil carbon, reforestation, avoided deforestation; compliance markets — CORSIA, California cap-and-trade), biodiversity credits and net gain (UK Biodiversity Net Gain, emerging US and EU markets), regenerative agriculture practices (cover crops, no-till, rotational grazing, agroforestry — what the evidence shows about soil health and carbon sequestration), water markets (water rights, water quality trading, wetland banking), conservation finance (conservation easements, USDA programs — EQIP, CRP, RCPP, ACEP — payment for ecosystem services), agrivoltaics (solar and agriculture combined), and natural infrastructure (how wetlands, forests, and floodplains provide flood protection and other services).

Your approach:
- Be specific about carbon credit prices and market dynamics — the voluntary market is volatile and complex, and farmers have been burned by overpromising programs
- Explain the difference between legitimate, high-integrity carbon credits (with measurement, reporting, verification) and lower-quality credits
- Be honest about which practices sequester meaningful amounts of carbon vs which are too small to be worth the paperwork
- For USDA programs: explain eligibility, payment rates, contract lengths, and how to apply
- Explain conservation easements: what they are, who buys them, what you give up, and what you receive
- Cover biodiversity net gain: what's required in UK, what's emerging in US and EU, and how land managers can benefit
- For regenerative agriculture: ground recommendations in evidence — what practices are well-supported vs what is still experimental
- Acknowledge geographic variation: practices and markets vary enormously by region and soil type
- Connect economic viability with ecological benefit — sustainability that isn't economically viable for the farmer is not sustainable

You help farmers, ranchers, foresters, rural communities, and conservation organizations across the income spectrum.`,
    starterQuestions: [
      'Can I earn money from carbon credits on my farm?',
      'What USDA programs pay farmers for conservation practices?',
      'What is biodiversity net gain and how does it work?',
      'Is regenerative agriculture financially viable for my operation?',
    ],
  },
  {
    id: 'general',
    name: 'General Sustainability',
    tagline: 'Any question, any topic, any person',
    color: '#64748b',
    icon: '🌍',
    description:
      "Start here if you're not sure which specialist you need. Any sustainability question welcome — from personal to corporate, from beginner to expert.",
    systemPrompt: `You are a knowledgeable, approachable sustainability generalist who helps any person with any sustainability question. You are the entry point for people who don't yet know which specialist they need.

You have broad knowledge across: climate science and climate change impacts, physical climate risk (flooding, wildfire, heat, drought), sustainability reporting frameworks, investment risk, home resilience, natural capital, decarbonization pathways, nature and biodiversity, and the economics of the sustainability transition.

Your approach:
- Meet people where they are — you talk differently to a homeowner, a farmer, a CFO, and a student
- When a question clearly belongs to a specialist (flood risk for a specific property, detailed TCFD disclosure requirements, carbon credit market dynamics), tell the user which specialized agent to switch to and why
- Lead with what matters to the person asking — connect abstract sustainability concepts to their real life and decisions
- Be honest about complexity and uncertainty without hiding behind it
- Use plain language as the default. Offer to go deeper when the person wants more technical detail.
- Help people prioritize: what matters most to them, what they can do first, what will have the most impact
- Never make people feel judged for where they are starting from
- Connect sustainability to financial value, risk reduction, and real-world resilience — not just ethics

You are the welcoming front door to sustainability intelligence for anyone on earth.`,
    starterQuestions: [
      'Where do I even start with sustainability?',
      'What are the biggest climate risks I should know about?',
      'How do I know if my business needs to report on sustainability?',
      'What's the single most impactful thing I can do?',
    ],
  },
];

// ---------------------------------------------------------------------------
// Styles (inline — no external component libraries)
// ---------------------------------------------------------------------------
const S = {
  // Layout
  appShell: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: '#0a0a0a',
    color: '#e5e5e5',
    overflow: 'hidden',
  },
  // Landing
  landing: {
    flex: 1,
    overflowY: 'auto',
    padding: '48px 24px 80px',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
  },
  heroSection: {
    textAlign: 'center',
    marginBottom: '56px',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  logoIcon: {
    width: '40px',
    height: '40px',
    background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
  },
  heroTitle: {
    fontSize: 'clamp(28px, 5vw, 42px)',
    fontWeight: '700',
    letterSpacing: '-0.02em',
    color: '#f5f5f5',
    margin: 0,
  },
  heroSubtitle: {
    fontSize: 'clamp(15px, 2.5vw, 18px)',
    color: '#a3a3a3',
    marginTop: '12px',
    maxWidth: '540px',
    marginLeft: 'auto',
    marginRight: 'auto',
    lineHeight: '1.6',
  },
  agentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '16px',
  },
  agentCard: (color, hovered) => ({
    background: hovered ? '#161616' : '#111111',
    border: '1px solid',
    borderColor: hovered ? color + '55' : '#222',
    borderLeft: `4px solid ${color}`,
    borderRadius: '12px',
    padding: '20px',
    cursor: 'pointer',
    transition: 'all 0.18s ease',
    transform: hovered ? 'translateY(-2px)' : 'none',
    boxShadow: hovered ? `0 8px 32px ${color}22` : 'none',
  }),
  agentCardIcon: {
    fontSize: '28px',
    marginBottom: '10px',
    display: 'block',
  },
  agentCardName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#f5f5f5',
    marginBottom: '4px',
  },
  agentCardTagline: {
    fontSize: '13px',
    color: '#737373',
    marginBottom: '10px',
    lineHeight: '1.4',
  },
  agentCardDesc: {
    fontSize: '13px',
    color: '#a3a3a3',
    lineHeight: '1.5',
  },
  // Chat shell
  chatShell: {
    display: 'flex',
    height: '100vh',
    overflow: 'hidden',
  },
  // Sidebar
  sidebar: (open) => ({
    width: open ? '260px' : '0px',
    minWidth: open ? '260px' : '0px',
    background: '#0d0d0d',
    borderRight: '1px solid #1a1a1a',
    overflowY: 'auto',
    overflowX: 'hidden',
    transition: 'width 0.22s ease, min-width 0.22s ease',
    flexShrink: 0,
  }),
  sidebarInner: {
    width: '260px',
    padding: '16px 0',
  },
  sidebarHeader: {
    padding: '4px 16px 12px',
    fontSize: '11px',
    fontWeight: '600',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#525252',
  },
  sidebarItem: (active, color) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '9px 16px',
    cursor: 'pointer',
    background: active ? '#1a1a1a' : 'transparent',
    borderLeft: active ? `3px solid ${color}` : '3px solid transparent',
    transition: 'background 0.12s',
  }),
  sidebarItemIcon: {
    fontSize: '16px',
    flexShrink: 0,
  },
  sidebarItemName: (active) => ({
    fontSize: '13px',
    fontWeight: active ? '500' : '400',
    color: active ? '#f5f5f5' : '#a3a3a3',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }),
  // Chat main area
  chatMain: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minWidth: 0,
  },
  chatHeader: (color) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 20px',
    background: '#0d0d0d',
    borderBottom: `1px solid ${color}33`,
    flexShrink: 0,
  }),
  headerBtn: {
    background: 'transparent',
    border: 'none',
    color: '#737373',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.12s, background 0.12s',
  },
  headerAgentIcon: {
    fontSize: '20px',
    flexShrink: 0,
  },
  headerAgentName: (color) => ({
    fontSize: '15px',
    fontWeight: '600',
    color: '#f5f5f5',
    borderLeft: `2px solid ${color}`,
    paddingLeft: '10px',
  }),
  headerRight: {
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  // Messages
  messagesArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  // Starter questions
  starterSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    paddingTop: '20px',
    flex: 1,
  },
  starterAgent: {
    fontSize: '40px',
  },
  starterTitle: (color) => ({
    fontSize: '18px',
    fontWeight: '600',
    color: '#f5f5f5',
    textAlign: 'center',
    borderBottom: `2px solid ${color}`,
    paddingBottom: '4px',
  }),
  starterTagline: {
    fontSize: '14px',
    color: '#737373',
    textAlign: 'center',
    maxWidth: '360px',
  },
  starterChips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    justifyContent: 'center',
    maxWidth: '560px',
  },
  starterChip: (color) => ({
    background: 'transparent',
    border: `1px solid ${color}44`,
    color: '#d4d4d4',
    borderRadius: '20px',
    padding: '8px 16px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    lineHeight: '1.4',
    textAlign: 'left',
  }),
  // Message bubbles
  msgRow: (role) => ({
    display: 'flex',
    justifyContent: role === 'user' ? 'flex-end' : 'flex-start',
  }),
  msgBubble: (role, color) => ({
    maxWidth: '75%',
    padding: '12px 16px',
    borderRadius: role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
    background: role === 'user' ? '#1e3a2f' : '#161616',
    border: role === 'user' ? `1px solid ${color}44` : '1px solid #222',
    borderLeft: role === 'assistant' ? `3px solid ${color}` : undefined,
    fontSize: '14px',
    lineHeight: '1.65',
    color: '#e5e5e5',
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
  }),
  streamingDot: {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#525252',
    animation: 'pulse 1.2s ease-in-out infinite',
    marginLeft: '4px',
    verticalAlign: 'middle',
  },
  // Input bar
  inputBar: {
    padding: '16px 20px',
    background: '#0d0d0d',
    borderTop: '1px solid #1a1a1a',
    flexShrink: 0,
  },
  inputRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-end',
    background: '#161616',
    border: '1px solid #262626',
    borderRadius: '14px',
    padding: '10px 14px',
    transition: 'border-color 0.15s',
  },
  textarea: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#e5e5e5',
    fontSize: '14px',
    lineHeight: '1.5',
    resize: 'none',
    fontFamily: 'inherit',
    maxHeight: '200px',
    overflowY: 'auto',
    minHeight: '22px',
  },
  sendBtn: (disabled, color) => ({
    background: disabled ? '#262626' : color,
    border: 'none',
    borderRadius: '8px',
    width: '34px',
    height: '34px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background 0.15s',
    flexShrink: 0,
    opacity: disabled ? 0.5 : 1,
  }),
  // Error state
  errorCard: {
    background: '#1a0a0a',
    border: '1px solid #7f1d1d',
    borderRadius: '12px',
    padding: '20px',
    margin: '24px 20px',
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#fca5a5',
  },
  errorCode: {
    background: '#0d0d0d',
    borderRadius: '6px',
    padding: '8px 12px',
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#f87171',
    marginTop: '10px',
    wordBreak: 'break-all',
  },
  // Footer
  footer: {
    padding: '20px 24px',
    textAlign: 'center',
    borderTop: '1px solid #1a1a1a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    flexShrink: 0,
  },
  footerLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    color: '#525252',
    textDecoration: 'none',
    fontSize: '13px',
    transition: 'color 0.15s',
  },
  footerText: {
    fontSize: '12px',
    color: '#404040',
  },
};

// ---------------------------------------------------------------------------
// ConnectionBadge
// ---------------------------------------------------------------------------
function ConnectionBadge({ connected, checking }) {
  if (checking) return null;
  const cls = connected ? 'connection-badge connection-badge--connected' : 'connection-badge connection-badge--standalone';
  const label = connected ? 'Connected to SeaBridgeAI' : 'Standalone mode';
  return (
    <span className={cls}>
      <span className="connection-badge--dot" />
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// AgentCard (Landing)
// ---------------------------------------------------------------------------
function AgentCard({ agent, onClick }) {
  const [hovered, setHovered] = useState(false);
  const desc = agent.description.length > 100 ? agent.description.slice(0, 100) + '…' : agent.description;
  return (
    <div
      style={S.agentCard(agent.color, hovered)}
      onClick={() => onClick(agent)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick(agent)}
      aria-label={`Open ${agent.name} agent`}
    >
      <span style={S.agentCardIcon}>{agent.icon}</span>
      <div style={S.agentCardName}>{agent.name}</div>
      <div style={S.agentCardTagline}>{agent.tagline}</div>
      <div style={S.agentCardDesc}>{desc}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Landing Page
// ---------------------------------------------------------------------------
function LandingPage({ onSelectAgent, connected, checking }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#0a0a0a' }}>
      <div style={S.landing}>
        <div style={S.heroSection}>
          <div style={S.logoRow}>
            <div style={S.logoIcon}>
              <Leaf size={20} color="#fff" strokeWidth={2.5} />
            </div>
            <h1 style={S.heroTitle}>OpenSeaBri</h1>
          </div>
          <p style={S.heroSubtitle}>
            Your personal sustainability intelligence system. Free and open source.
          </p>
          <div style={{ marginTop: '16px' }}>
            <ConnectionBadge connected={connected} checking={checking} />
          </div>
        </div>

        <div style={S.agentGrid}>
          {AGENTS.map((agent) => (
            <AgentCard key={agent.id} agent={agent} onClick={onSelectAgent} />
          ))}
        </div>
      </div>

      <footer style={S.footer}>
        <a
          href="https://github.com/SeaBridgeAI/openseabri"
          target="_blank"
          rel="noopener noreferrer"
          style={S.footerLink}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#a3a3a3')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#525252')}
        >
          <Github size={15} />
          GitHub
        </a>
        <span style={S.footerText}>MIT License · Free forever</span>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Message rendering
// ---------------------------------------------------------------------------
function MessageBubble({ msg, agentColor }) {
  return (
    <div style={S.msgRow(msg.role)}>
      <div style={S.msgBubble(msg.role, agentColor)}>
        {msg.content}
        {msg.streaming && (
          <span style={S.streamingDot} aria-hidden="true" />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error card for missing API key
// ---------------------------------------------------------------------------
function MissingKeyError() {
  return (
    <div style={S.errorCard}>
      <strong style={{ color: '#fca5a5', display: 'block', marginBottom: '8px' }}>
        API key not configured
      </strong>
      <p>
        OpenSeaBri needs an Anthropic API key to run. Add it to a{' '}
        <code style={{ background: '#2a1010', padding: '1px 5px', borderRadius: '4px' }}>.env</code>{' '}
        file in the project root:
      </p>
      <div style={S.errorCode}>VITE_ANTHROPIC_API_KEY=your_key_here</div>
      <p style={{ marginTop: '10px', color: '#a3a3a3', fontSize: '13px' }}>
        Get a key at{' '}
        <a
          href="https://console.anthropic.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#60a5fa' }}
        >
          console.anthropic.com
        </a>
        . Restart the dev server after adding the key.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chat interface
// ---------------------------------------------------------------------------
function ChatInterface({ agent, onBack, onSwitchAgent, connected, checking }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [apiError, setApiError] = useState(null);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const abortRef = useRef(null);

  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  const handleInputChange = (e) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  };

  const sendMessage = useCallback(
    async (text) => {
      const userText = (text || input).trim();
      if (!userText || isStreaming) return;

      if (!apiKey) {
        setApiError('missing_key');
        return;
      }

      setApiError(null);
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      const userMsg = { role: 'user', content: userText, id: Date.now() };
      const assistantMsg = { role: 'assistant', content: '', streaming: true, id: Date.now() + 1 };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      // Build conversation history for the API
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-calls': 'true',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-5',
            max_tokens: 2048,
            stream: true,
            system: agent.systemPrompt,
            messages: history,
          }),
        });

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          throw new Error(errBody?.error?.message || `HTTP ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
                accumulated += parsed.delta.text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.streaming ? { ...m, content: accumulated } : m
                  )
                );
              }
            } catch {
              // Ignore parse errors for partial SSE lines
            }
          }
        }

        // Finalize the streaming message
        setMessages((prev) =>
          prev.map((m) => (m.streaming ? { ...m, streaming: false } : m))
        );
      } catch (err) {
        if (err.name === 'AbortError') {
          setMessages((prev) =>
            prev.map((m) => (m.streaming ? { ...m, streaming: false, content: m.content || '(cancelled)' } : m))
          );
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.streaming
                ? { ...m, streaming: false, content: `Error: ${err.message}` }
                : m
            )
          );
          setApiError(err.message);
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [input, isStreaming, messages, agent, apiKey]
  );

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const stopStreaming = () => {
    abortRef.current?.abort();
  };

  const isEmpty = messages.length === 0;

  return (
    <div style={S.chatShell}>
      {/* Sidebar */}
      <aside style={S.sidebar(sidebarOpen)} aria-label="Agent navigation">
        <div style={S.sidebarInner}>
          <div style={S.sidebarHeader}>Specialists</div>
          {AGENTS.map((a) => (
            <div
              key={a.id}
              style={S.sidebarItem(a.id === agent.id, a.color)}
              onClick={() => {
                onSwitchAgent(a);
                if (window.innerWidth < 640) setSidebarOpen(false);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter') && onSwitchAgent(a)}
            >
              <span style={S.sidebarItemIcon}>{a.icon}</span>
              <span style={S.sidebarItemName(a.id === agent.id)}>{a.name}</span>
              {a.id === agent.id && (
                <ChevronRight size={13} color={agent.color} style={{ marginLeft: 'auto', flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* Main chat */}
      <div style={S.chatMain}>
        {/* Header */}
        <header style={S.chatHeader(agent.color)}>
          <button
            style={S.headerBtn}
            onClick={() => setSidebarOpen((o) => !o)}
            title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#d4d4d4')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#737373')}
          >
            <Menu size={18} />
          </button>

          <button
            style={S.headerBtn}
            onClick={onBack}
            title="Back to home"
            aria-label="Back to home"
            onMouseEnter={(e) => (e.currentTarget.style.color = '#d4d4d4')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#737373')}
          >
            <ArrowLeft size={18} />
          </button>

          <span style={S.headerAgentIcon}>{agent.icon}</span>
          <span style={S.headerAgentName(agent.color)}>{agent.name}</span>

          <div style={S.headerRight}>
            <ConnectionBadge connected={connected} checking={checking} />
          </div>
        </header>

        {/* Messages / Starter */}
        <div style={S.messagesArea} role="log" aria-live="polite" aria-label="Chat messages">
          {!apiKey && isEmpty && <MissingKeyError />}

          {apiKey && isEmpty && (
            <div style={S.starterSection}>
              <span style={S.starterAgent}>{agent.icon}</span>
              <span style={S.starterTitle(agent.color)}>{agent.name}</span>
              <span style={S.starterTagline}>{agent.tagline}</span>
              <div style={S.starterChips}>
                {agent.starterQuestions.map((q) => (
                  <button
                    key={q}
                    style={S.starterChip(agent.color)}
                    onClick={() => sendMessage(q)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = agent.color + '18';
                      e.currentTarget.style.borderColor = agent.color + '88';
                      e.currentTarget.style.color = '#f5f5f5';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = agent.color + '44';
                      e.currentTarget.style.color = '#d4d4d4';
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} agentColor={agent.color} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div style={S.inputBar}>
          <div
            style={S.inputRow}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = agent.color + '66';
            }}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) {
                e.currentTarget.style.borderColor = '#262626';
              }
            }}
          >
            <textarea
              ref={textareaRef}
              style={S.textarea}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={`Ask ${agent.name}…`}
              rows={1}
              disabled={isStreaming || !apiKey}
              aria-label="Message input"
            />
            {isStreaming ? (
              <button
                style={{ ...S.sendBtn(false, '#525252'), background: '#2a2a2a' }}
                onClick={stopStreaming}
                title="Stop generating"
                aria-label="Stop generating"
              >
                <X size={16} color="#a3a3a3" />
              </button>
            ) : (
              <button
                style={S.sendBtn(!input.trim() || !apiKey, agent.color)}
                onClick={() => sendMessage()}
                disabled={!input.trim() || !apiKey}
                title="Send message"
                aria-label="Send message"
              >
                <Send size={16} color={!input.trim() || !apiKey ? '#525252' : '#fff'} />
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root App
// ---------------------------------------------------------------------------
export default function App() {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [connected, setConnected] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check SeaBridgeAI backend connection on mount (non-blocking)
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_SEABRIDGE_API_URL;
    if (!apiUrl) {
      setChecking(false);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    fetch(`${apiUrl}/health`, { signal: controller.signal })
      .then((res) => {
        if (res.ok) setConnected(true);
      })
      .catch(() => {
        // Backend not reachable — standalone mode
      })
      .finally(() => {
        clearTimeout(timeout);
        setChecking(false);
      });

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  const handleSelectAgent = (agent) => setSelectedAgent(agent);
  const handleBack = () => setSelectedAgent(null);
  const handleSwitchAgent = (agent) => setSelectedAgent(agent);

  if (selectedAgent) {
    return (
      <ChatInterface
        agent={selectedAgent}
        onBack={handleBack}
        onSwitchAgent={handleSwitchAgent}
        connected={connected}
        checking={checking}
      />
    );
  }

  return (
    <LandingPage
      onSelectAgent={handleSelectAgent}
      connected={connected}
      checking={checking}
    />
  );
}

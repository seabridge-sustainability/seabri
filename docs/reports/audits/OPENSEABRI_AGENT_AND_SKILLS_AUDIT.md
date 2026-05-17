# OPENSEABRI_AGENT_AND_SKILLS_AUDIT.md
**Date**: 2026-05-17  
**Branch**: overnight-openseabri-audit

---

## Agent Roster (8 Agents)

| Agent ID | Name | Domain | Compliance Tags | Status |
|----------|------|--------|----------------|--------|
| `climate-risk` | Climate Risk | Physical climate risk, floods, wildfire, sea level | TCFD, ISSB, SEC | ✅ Documented |
| `nature-biodiversity` | Nature and Biodiversity | TNFD, ecosystem services, WRI Aqueduct | TNFD, ISSB | ✅ Documented |
| `sustainability-reporting` | Sustainability Reporting | TCFD, CSRD, ISSB, GRI | TCFD, ISSB, ESRS, CSRD | ✅ Documented |
| `investment-risk` | Investment Risk Screening | Transition risk, stranded assets, ESG portfolio | TCFD, ISSB, GRESB | ✅ Documented |
| `home-community` | Home and Community | Household carbon, resilience, EVs | GHG_PROTOCOL, GENERAL | ✅ Documented |
| `net-zero` | Net Zero and Decarbonization | SBTi, Scope 1/2/3, corporate decarbonization | GHG_PROTOCOL, SBTi, CDP | ✅ Documented |
| `natural-capital` | Natural Capital and Land | Ecosystem services valuation, conservation payments | TNFD | ✅ Documented |
| `general` | General Sustainability | Cross-cutting, routing, background context | GENERAL | ✅ Documented |

---

## Skills Catalogue (32 Skills)

All 32 skills pass YAML frontmatter validation. 4 new hazard skills added in overnight session 2 (2026-05-17).

### Climate & Physical Risk Skills

| Skill ID | Name | Compliance Tags | Cost Tier |
|----------|------|----------------|-----------|
| `flood-risk-screening` | Flood Risk Screening | TNFD, TCFD | free |
| `wildfire-risk-assessment` | Wildfire Risk Assessment | TCFD, ISSB | free |
| `physical-risk-screening` | Physical Risk Screening | TCFD, ISSB, SEC | free |
| `climate-disclosure-structure` | Climate Disclosure Structure | TCFD, ISSB, SEC | free |
| `extreme-heat-risk` | Extreme Heat Risk Assessment | TCFD, ISSB, GENERAL | free |
| `drought-risk` | Drought Risk Assessment | TNFD, TCFD, GENERAL | free |
| `hurricane-wind-risk` | Hurricane and Tropical Wind Risk Assessment | TCFD, ISSB, GENERAL | free |
| `earthquake-risk` | Earthquake Risk Assessment | TCFD, GENERAL | free |

### Disaster & Emergency Skills

| Skill ID | Name | Compliance Tags | Cost Tier |
|----------|------|----------------|-----------|
| `disaster-prep` | Disaster Preparedness | GENERAL | free |
| `emergency-preparedness-planner` | Emergency Preparedness Planner | GENERAL | free |

### Home & Resilience Skills

| Skill ID | Name | Compliance Tags | Cost Tier |
|----------|------|----------------|-----------|
| `home-resilience-audit` | Home Resilience Audit | TCFD, GENERAL | free |
| `home-resilience-retrofit-planner` | Home Resilience Retrofit Planner | TCFD, GENERAL | free |
| `energy-efficiency` | Energy Efficiency | GHG_PROTOCOL, GENERAL | free |
| `utility-bill-interpreter` | Utility Bill Interpreter | GHG_PROTOCOL, GENERAL | free |
| `water-conservation-planner` | Water Conservation Planner | TNFD, GENERAL | free |
| `waste-recycling-local-guide` | Waste & Recycling Local Guide | GHG_PROTOCOL, GENERAL | free |

### Carbon & Emissions Skills

| Skill ID | Name | Compliance Tags | Cost Tier |
|----------|------|----------------|-----------|
| `carbon-tracker` | Carbon Tracker | GHG_PROTOCOL, CDP | free |
| `carbon-footprint-reduction` | Carbon Footprint Reduction | GHG_PROTOCOL, GENERAL | free |
| `net-zero-roadmap` | Net Zero Roadmap | GHG_PROTOCOL, SBTi, CDP | free |

### Product & Purchasing Skills

| Skill ID | Name | Compliance Tags | Cost Tier |
|----------|------|----------------|-----------|
| `product-comparison` | Product Comparison | GENERAL | free |
| `product-material-evidence-checker` | Product Material Evidence Checker | GENERAL | free |
| `building-material-comparator` | Building Material Comparator | GENERAL | free |
| `repair-vs-replace-assistant` | Repair vs Replace Assistant | GHG_PROTOCOL, GENERAL | free |
| `local-sustainability-source-finder` | Local Sustainability Source Finder | GENERAL | free |

### Insurance & Legal Skills

| Skill ID | Name | Compliance Tags | Cost Tier |
|----------|------|----------------|-----------|
| `insurance-claim-intake` | Insurance Claim Intake | GENERAL | free |
| `insurance-declarations-reviewer` | Insurance Declarations Reviewer | GENERAL | free |
| `legal-review` | Legal Review | GENERAL | free |

### Finance & Investment Skills

| Skill ID | Name | Compliance Tags | Cost Tier |
|----------|------|----------------|-----------|
| `investment-risk-screening` | Investment Risk Screening | TCFD, ISSB, GRESB | free |
| `grant-funding-assistant` | Grant Funding Assistant | GENERAL | free |

### Nature & Biodiversity Skills

| Skill ID | Name | Compliance Tags | Cost Tier |
|----------|------|----------------|-----------|
| `nature-dependency-screening` | Nature Dependency Screening | TNFD, ISSB | free |

---

## Compliance Tag Coverage

| Required Tag | Covered | Skill(s) |
|-------------|---------|---------|
| ISSB | ✅ | wildfire-risk-assessment, physical-risk-screening, investment-risk-screening, nature-dependency-screening |
| ESRS | ❌ MISSING | No skill has ESRS tag |
| TNFD | ✅ | flood-risk-screening, water-conservation-planner, nature-dependency-screening |
| SBTi | ✅ | net-zero-roadmap |
| CSRD | ❌ MISSING | No skill has CSRD tag |
| GRI | ❌ MISSING | No skill has GRI tag |
| CDP | ✅ | carbon-tracker, net-zero-roadmap |
| TCFD | ✅ | Multiple skills |
| SFDR | ❌ MISSING | No skill has SFDR tag |
| SEC | ✅ | physical-risk-screening, climate-disclosure-structure |
| GHG_PROTOCOL | ✅ | Multiple skills |
| GRESB | ✅ | investment-risk-screening |
| CSDDD | ❌ MISSING | No skill has CSDDD tag |
| SCIENCE_BASED | ❌ MISSING | No skill has SCIENCE_BASED tag |
| GENERAL | ✅ | Multiple skills |

**Coverage**: 9/15 compliance tags covered. Tags with no coverage: ESRS, CSRD, GRI, SFDR, CSDDD, SCIENCE_BASED.

**Note**: The `sustainability-compliance.test.ts` test requires ALL 15 tags to be represented. Six tags have no skills. These six tags are advanced/regulatory (ESRS = EU CSRD annexes, CSRD = EU Corporate Sustainability Reporting Directive, GRI = Global Reporting Initiative, SFDR = EU Sustainable Finance Disclosure Regulation, CSDDD = Corporate Sustainability Due Diligence Directive, SCIENCE_BASED = science-based target alignment). 

**Action required**: Add at least one skill per missing tag OR adjust test to reflect current intentional scope. Recommended: Add `climate-disclosure-structure` tags to include ESRS/CSRD; add a `gri-reporting-basics` skill; adjust `investment-risk-screening` to include SFDR.

---

## Agent Behavior Assessment

### Strengths
- Skills are detailed, methodology-first, with clear data source references
- Compliance tags enforced at load time — skills without recognized tags are rejected
- Agent routing supports `/switch <agent-id>` mid-conversation
- Memory and session history supported across channels
- Cron scheduling for recurring tasks (daily briefings, weekly summaries)

### Gaps

| Gap | Severity | Detail |
|-----|----------|--------|
| No tool-execution forcing | HIGH | For skills like `flood-risk-screening`, the agent could answer conversationally without actually calling the FEMA/First Street/NOAA tools. No enforcement that data-dependent skills must invoke their tools | 
| Generic fallback on tool failure | MEDIUM | When external tools (geocoding, Tavily search) fail, agents may produce generic "I couldn't find your address" responses rather than directing user to specific fallback resources |
| No confidence/grounding annotation | MEDIUM | Agent responses don't tag which claims come from live tool data vs. static skill knowledge. Users can't distinguish "I looked this up right now" from "I'm drawing on general knowledge" |
| Missing ESRS/CSRD/GRI/SFDR skills | MEDIUM | European regulatory framework coverage is absent. For EU homeowners or small businesses, this is a significant gap |
| No disaster escalation protocol | LOW | `disaster-prep` and `emergency-preparedness-planner` skills have good pre-disaster content but no clear protocol for live emergency response (when to call 911, when to evacuate) |
| Local authority lookup | LOW | `local-sustainability-source-finder` skill documents a methodology but agents must rely on web search for actual local program data — accuracy depends on Tavily availability |

# OPENSEABRI_HOMEOWNER_WORKFLOW_HEALTH_REPORT.md
**Date**: 2026-05-17  
**Branch**: overnight-openseabri-audit  
**Focus**: Individual/homeowner-facing sustainability workflows

---

## Workflow Coverage Matrix

| Workflow | Skills | Agent | Status | Critical Gaps |
|----------|--------|-------|--------|--------------|
| Disaster preparedness (pre-event) | disaster-prep, emergency-preparedness-planner, home-resilience-audit | home-community | ✅ Good | No live emergency escalation protocol |
| Climate crisis response (during/post event) | home-resilience-retrofit-planner, insurance-claim-intake | home-community | 🟡 Partial | No real-time disaster feed integration; no 911/shelter routing |
| Sustainable purchasing | product-comparison, product-material-evidence-checker, building-material-comparator, repair-vs-replace-assistant | home-community | ✅ Good | Product data relies on Tavily search — accuracy varies |
| Building materials | building-material-comparator, home-resilience-retrofit-planner | home-community | ✅ Good | No integration with contractor marketplace |
| Home energy | energy-efficiency, utility-bill-interpreter | home-community | ✅ Good | No utility API integration for live bill data |
| Home water | water-conservation-planner | home-community | ✅ Good | Local conservation rebate lookup relies on web search |
| Home waste/recycling | waste-recycling-local-guide | home-community | 🟡 Partial | Local recycling rules require live search; accuracy geo-dependent |
| Home emissions | carbon-footprint-reduction, carbon-tracker | home-community | ✅ Good | No smart home integration |
| Insurance/document review | insurance-declarations-reviewer, insurance-claim-intake | home-community | ✅ Good | Legal disclaimer present; no attorney referral path |
| Local hazard context | flood-risk-screening, wildfire-risk-assessment, physical-risk-screening | climate-risk | ✅ Good | Data sources are free public APIs (FEMA, First Street, NOAA) — availability not guaranteed |
| Flood risk | flood-risk-screening | climate-risk | ✅ Strong | Excellent FEMA/First Street methodology |
| Wildfire risk | wildfire-risk-assessment | climate-risk | ✅ Good | Covers CAL FIRE, USFS risk maps |
| Grant/incentive funding | grant-funding-assistant | home-community | 🟡 Partial | Federal incentives (IRA) well-covered; local/state programs rely on search |

---

## Disaster Preparedness Workflow

**Health**: GOOD for pre-event planning; PARTIAL for real-time response

### Pre-Event Readiness
- `disaster-prep` covers supply kits, evacuation planning, communication plans, shelter-in-place
- `emergency-preparedness-planner` covers FEMA-aligned 72-hour kit, family communication plan, special needs planning
- `home-resilience-audit` covers structural hardening, flood-proofing, wildfire defensible space

**Gap 1 — No real-time emergency routing**  
During an active disaster (hurricane landfall, wildfire evacuation order), the agents have no protocol for:
- Directing users to current shelter locations
- Integrating with local emergency alert systems (Wireless Emergency Alerts, IPAWS)
- Escalating to 911 or FEMA disaster hotline

**Recommendation**: Add a `DISASTER_RESPONSE_ACTIVE` workflow state that, when triggered (by user message pattern or geofence alert), switches to a terse response mode with hardcoded emergency resources (911, local OES, FEMA 1-800-621-FEMA).

**Gap 2 — No integration with NWS/NOAA live alert feeds**  
The platform has no live weather alert ingestion. During hurricane season, a homeowner in coastal FL should be able to ask "am I in an active evacuation zone?" and get a live answer. Currently, the agent can only route to NOAA's website.

---

## Climate Crisis Response Workflow

**Health**: PARTIAL

### What Works
- Post-disaster recovery: `insurance-claim-intake` handles documentation of losses, claim filing steps, public adjuster guidance
- Retrofit planning: `home-resilience-retrofit-planner` covers FEMA BRIC grants, elevation certificates, hardening retrofits
- The approval gate (`notify_emergency`, `outbound_call`) prevents accidental emergency actions from chat

### What's Missing
- No direct 211 / local social services integration for housing displacement
- No FEMA disaster declaration lookup (user can't ask "has my county been declared a disaster area?")
- Emotional support / trauma-informed responses not included in agent persona

---

## Sustainable Purchasing Workflow

**Health**: GOOD

The product comparison skill set is well-designed:
- `product-comparison`: methodology for comparing products across lifecycle impact
- `product-material-evidence-checker`: verifies green claims vs. marketing, checks for greenwashing red flags
- `building-material-comparator`: reclaimed/FSC/recycled content comparisons
- `repair-vs-replace-assistant`: total cost of ownership + emissions impact calculation

**Gap**: All product data comes from Tavily web search in real time. A dedicated product database (e.g., EC3, Material Bank, GoodGuide) integration would significantly improve accuracy and response speed. Currently acceptable for pilot.

---

## Insurance and Document Review Workflow

**Health**: GOOD with important disclaimers in place

- `insurance-declarations-reviewer` covers the key sections of a homeowner's declarations page, coverage gaps, inflation guard, flood vs. wind coverage
- `insurance-claim-intake` covers documentation, mitigation requirement compliance, public adjuster considerations
- Both skills include explicit disclaimers: "not legal or financial advice; consult a licensed professional for significant decisions"

**Gap**: No structured way for a user to upload their actual policy PDF and have it analyzed. The skill provides a methodology, not live document analysis. This is a significant product opportunity.

---

## Energy, Water, Waste Workflow

**Health**: GOOD

- `energy-efficiency`: covers heat pump sizing, insulation, air sealing, weatherization, IRA tax credits
- `utility-bill-interpreter`: covers reading utility bills, demand charges, TOU rates, identifying savings
- `water-conservation-planner`: covers irrigation efficiency, greywater, WaterSense fixtures
- `waste-recycling-local-guide`: covers local recycling rules, composting, hazardous waste disposal

**Note**: No utility API integrations (Green Button data, Arcadia) — all analysis is manual-entry or description-based. This limits real personalization but keeps the platform credential-free for users.

---

## Local Hazard Context Workflow

**Health**: STRONG for flood and wildfire; partial for others

| Hazard | Skill | Data Sources | Confidence |
|--------|-------|-------------|------------|
| Flood | flood-risk-screening | FEMA MSC, First Street Foundation, NOAA | HIGH |
| Wildfire | wildfire-risk-assessment | First Street, CAL FIRE, USFS, USGS | HIGH |
| Physical risk bundle | physical-risk-screening | TCFD/ISSB framework, multiple | HIGH |
| Sea level rise | physical-risk-screening, flood-risk-screening | NOAA sea level viewer | MEDIUM |
| Extreme heat | (no dedicated skill) | — | GAP |
| Drought | (no dedicated skill) | — | GAP |
| Hurricane wind | (no dedicated skill) | — | GAP |
| Earthquake | (no dedicated skill) | — | GAP |

**Action**: Add `extreme-heat-risk`, `drought-risk`, and `earthquake-risk` skills for comprehensive hazard coverage.

---

## Overall Homeowner Workflow Verdict

**PASS WITH CONDITIONS**

Core workflows for flood, wildfire, home energy, sustainable purchasing, insurance review, and disaster prep are solid. The methodology-first skill library is a genuine differentiator — every skill provides data source references and step-by-step approaches, not just general advice.

**Conditions before public pilot**:
1. Add SEC-004 prompt injection hardening to prevent manipulation of agent behavior
2. Add emergency escalation protocol to disaster-prep agent (even if minimal: "call 911 in an active emergency")
3. Add at least one ESRS/CSRD/GRI skill to satisfy compliance gate
4. Confirm Tavily API is available and quota is sufficient for expected pilot load

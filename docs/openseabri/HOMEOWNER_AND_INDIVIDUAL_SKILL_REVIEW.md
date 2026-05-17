# OpenSeaBri Homeowner And Individual Skill Review

Date: 2026-05-16

Scope: practical day-to-day sustainability workflows for individuals, homeowners, renters, families, neighborhoods, schools, NGOs, and small communities.

No live provider calls, outbound messages, paid model calls, verified grant lookups, local-rule lookups, emergency alert lookups, or product database queries were run during this review.

## Executive Summary

OpenSeaBri already had a strong sustainability companion foundation: household carbon screening, home energy planning, product comparison, purchasing red flags, offset quality screening, water, waste, utility bill interpretation, local resource fallback, incident workflows, and community planning.

This pass expanded the practical homeowner ecosystem with seven additional production-wired workflows:

- Repair vs Replace Assistant.
- Home Resilience Retrofit Planner.
- Sustainable Building Material Comparator.
- Emergency Preparedness Planner.
- Local Sustainability Source Finder.
- Product Material Evidence Checker.
- Insurance Declarations Reviewer.

Each new workflow is deterministic, exposes assumptions and unknowns, avoids fake precision, and is available through API, MCP, tool registry, skill catalog, Pilot Workspace UI, recent activity, and tests.

## Current Coverage Review

| Area | What exists | Useful today | Too shallow / unrealistic | Missing next |
|---|---|---|---|---|
| Product comparison | Product comparison plus purchasing checklist, repair/replace assistant, evidence checker, offset checker | Good for day-to-day buying, greenwashing checks, repair decisions | No verified marketplace, warranty, repairability, or label database | Optional verified product/serviceability lookup |
| Household carbon footprint | Broad screening range with top categories and monthly tracking prompt | Good for awareness and habit tracking | US-average factors only; not a formal inventory | Utility-bill import and regional factors when verified |
| Home energy planning | No-cost, low-cost, upgrade plan and seasonal utility actions | Useful monthly/seasonal workflow | No tariff/rebate lookup | Verified utility/rebate connector |
| Flooding/storm response | Living Companion incident workflow, local-resource fallback, approval-gated action cards | Strong for immediate action and safety | Live providers are gated; local contacts are fallback unless configured | Verified municipal/provider search |
| Insurance guidance | Incident/policy support, document parser tests, coverage caveats, insurance declarations reviewer | Useful for organizing documents and claim prep | Not legal advice; OCR/provider path gated | Full claim packet builder and verified insurer-specific discount lookup |
| Local resource search | Fallback-safe local resources, municipal adapter interface, local source lookup workflow | Safe because it does not invent contacts or local rules | Not a live directory without provider config | Verified local resource provider |
| Community project planning | Project planner, community resilience checklist, grant search guidance | Useful for schools/NGOs/neighborhoods | Grant feed is search guidance, not live opportunities | Verified grant-source connector |
| Sustainability certifications | Certification navigator and purchasing red flags | Useful for avoiding false claims | Does not verify certificate IDs or eligibility | Certificate/label verification where sources allow |
| Carbon offsets | Offset quality checker with greenwashing flags | Useful for screening claims | Does not certify registry/project status | Optional registry lookup |
| Sustainable compute | Model-routing optimizer, caching/batching recommendations, carbon proxy assumptions | Useful for agent operators | Proxy-only, not measured energy | Deployment telemetry refinement |

## Practical Skill Map

### A. Sustainable Purchasing And Product Decisions

Production-ready:

- Product comparison.
- Sustainable purchasing checklist.
- Repair vs Replace Assistant.
- Product Material Evidence Checker.
- Carbon offset quality checker.

Partial:

- Certification/label navigation when users supply claims.

Missing:

- Verified repairability scores.
- Verified warranty/service parts lookup.
- Verified certification ID lookup.
- Packaging and local end-of-life rules by jurisdiction.

### B. Home Resilience And Climate Preparedness

Production-ready:

- Flood/storm/power incident workflow.
- Emergency Preparedness Planner.
- Home Resilience Retrofit Planner.
- Home energy action planner.
- Insurance Declarations Reviewer.

Partial:

- Local resources, contractor guidance, and public works guidance through safe fallback.
- Insurance document support through fixture-tested parsing, declaration text screening, and gated provider paths.

Missing:

- Verified local hazard maps in the workflow.
- Verified permit/code guidance.
- Live alert/shelter/evacuation adapter.

### C. Building Materials And Renovation Guidance

Production-ready:

- Sustainable Building Material Comparator.
- Home Resilience Retrofit Planner.

Partial:

- Certification navigator can explain relevant labels/frameworks.

Missing:

- Product-specific EPD comparison.
- Verified low-VOC/certification lookup. Evidence screening is now available, but does not verify live databases.
- Code-specific material acceptance.
- Contractor quote comparison.

### D. Energy / Water / Waste Optimization

Production-ready:

- Home energy action planner.
- Water Conservation Planner.
- Waste and Recycling Local Guide.
- Utility Bill Interpreter.
- Household carbon footprint estimator.
- Local Sustainability Source Finder.

Partial:

- Document/PDF parsing for utility bills is fixture-tested, but full OCR/provider parsing is gated.

Missing:

- Verified utility tariff and rebate lookup.
- Verified city/county recycling acceptance.
- Live water restriction and rebate lookup. The adapter surface is now callable, but default production status remains `not_verified`.

### E. Climate And Disaster Response

Production-ready:

- Active flood/storm/power workflows.
- Emergency Preparedness Planner.
- Approval-gated action cards.
- Local resource fallback.

Partial:

- Image/photo incident routing and document/PDF workflows have safe fallback and provider gates.

Missing:

- Official live emergency alerts.
- Shelter/hotel live availability.
- Verified evacuation zones.

### F. Financial And Insurance Sustainability

Production-ready:

- Repair vs Replace financial tradeoff.
- Retrofit insurance-implication caveats.
- Utility bill interpretation.
- Offset quality screening.

Partial:

- Insurance policy/declarations support.

Missing:

- Verified rebate/tax incentive lookup.
- Insurer-specific mitigation discounts.
- ROI calculation using local tariffs, quotes, incentives, and verified mitigation discount evidence.

### G. Community And Neighborhood Sustainability

Production-ready:

- Community sustainability project planner.
- Community resilience checklist.
- NGO grant/funding assistant.
- Volunteer coordination and outreach/message planning.

Partial:

- Local partner directory through fallback/gated search.

Missing:

- Verified grant feed.
- Community event/hazard reporting integrations.
- Impact reporting exports.

## New Workflows Implemented In This Pass

| Workflow | API endpoint | MCP tool | Skill resource | UI entry | Status |
|---|---|---|---|---|---|
| Repair vs Replace Assistant | `POST /api/seabri/living-companion/repair-vs-replace` | `advise_repair_vs_replace` | `skills/repair-vs-replace-assistant/SKILL.md` | Product & Purchasing -> Repair or Replace | Working |
| Home Resilience Retrofit Planner | `POST /api/seabri/living-companion/home-resilience-retrofit-plan` | `plan_home_resilience_retrofits` | `skills/home-resilience-retrofit-planner/SKILL.md` | Homeowner Resilience -> Retrofit Plan | Working |
| Sustainable Building Material Comparator | `POST /api/seabri/living-companion/building-material-comparison` | `compare_building_materials` | `skills/building-material-comparator/SKILL.md` | Building & Renovation -> Materials | Working |
| Emergency Preparedness Planner | `POST /api/seabri/living-companion/emergency-preparedness-plan` | `plan_emergency_preparedness` | `skills/emergency-preparedness-planner/SKILL.md` | Homeowner Resilience -> Emergency Prep | Working |
| Local Sustainability Source Finder | `POST /api/seabri/living-companion/local-sustainability-sources` | `lookup_local_sustainability_sources` | `skills/local-sustainability-source-finder/SKILL.md` | Carbon / Energy / Water / Waste -> Local Sources | Working, default `not_verified` adapter |
| Product Material Evidence Checker | `POST /api/seabri/living-companion/product-material-evidence-check` | `check_product_material_evidence` | `skills/product-material-evidence-checker/SKILL.md` | Product & Purchasing -> Evidence Check | Working |
| Insurance Declarations Reviewer | `POST /api/seabri/living-companion/insurance-declarations-review` | `review_insurance_declarations` | `skills/insurance-declarations-reviewer/SKILL.md` | Living Companion -> Insurance Review | Working, screening only |

## Realism Controls

All new workflows:

- Return confidence, assumptions, and unknowns.
- Use qualitative tradeoffs where exact data is unavailable.
- Avoid exact carbon, cost savings, certification, insurance, local law, or emergency claims.
- Mark local guidance or risk status as `not_verified` where relevant.
- Avoid live provider traffic.
- Emit telemetry through `sustainability_scored`.

## Weekly / Monthly Usefulness

Weekly:

- Emergency preparedness refresh.
- Repair vs replace before household purchases.
- Waste/recycling route for unusual items.
- Water leak and fixture checks.

Monthly:

- Utility bill interpretation.
- Household carbon trend tracking.
- Home energy action progress.
- Product/purchasing decisions.

Seasonal:

- Home resilience retrofit plan.
- Storm/flood/heat preparedness.
- Building material choices before repairs.
- Community resilience drills.

## Remaining Gaps

Critical:

- None for local safe pilot use.

High:

- Live verified local emergency, utility, water, recycling, and municipal-resource adapters. Local adapter surface is callable; default production remains `not_verified`.
- Live-provider validation for Telegram, WhatsApp, SMS/MMS, voice, email, vision, transcription, and document parsing after explicit approval.

Medium:

- Verified product repairability/warranty/service-parts connector.
- Verified material EPD/certification/code lookup.
- Rebate/tax-incentive lookup with source links.
- Full insurance claim packet builder beyond screening and checklist output.

Low:

- More Spanish copy beyond labels.
- Mobile visual polish for the expanded workflow navigation.
- Longitudinal household habit tracking dashboards.

## Recommended Next Homeowner/Community Workflows

1. Seasonal Utility Optimization Plan.
2. Home Resilience Retrofit Budget Prioritizer.
3. Low-Toxicity Home Product Checker.
4. Local Rebate And Incentive Finder with verified source status.
5. Insurance Claim Document Packet Builder.
6. Neighborhood Sustainability Challenge Tracker.
7. School Sustainability Project Planner with impact report export.

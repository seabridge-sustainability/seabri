---
id: local-sustainability-source-finder
name: Local Sustainability Source Finder
description: Check configured local source adapter status for water rules, recycling rules, hazardous drop-off, rebates, and public works without inventing local guidance.
complianceTags: [GENERAL]
evidenceSource: configured municipal adapter; default production adapter returns not_verified
costTier: free
domain: living-companion
agents: [sustainability-companion, home-community, general]
---

# Local Sustainability Source Finder

Use this skill when a household, renter, homeowner, school, NGO, or community group asks for local sustainability facts such as water restrictions, recycling rules, hazardous drop-off, utility or water rebates, or public works contacts.

## Inputs

- `location`: ZIP, city, county, or address context.
- `needs`: one or more of `water_restrictions`, `recycling_rules`, `hazardous_dropoff`, `rebates`, `public_works`.
- `preferredLanguage`: optional display language.

## Production Behavior

- Route through the configured municipal lookup adapter.
- Default production behavior is conservative: return `not_verified` when no approved live adapter is configured.
- Fixture data is allowed only for tests and demos and must remain clearly labeled example-only.
- Never invent official rules, accepted materials, rebate eligibility, contacts, schedules, emergency orders, or violation terms.

## Output

- Adapter ID and lookup status.
- Results for requested source categories.
- Source actions and next steps.
- Assumptions, unknowns, and confidence.

## Surfaces

- API: `POST /api/seabri/living-companion/local-sustainability-sources`
- MCP: `lookup_local_sustainability_sources`
- Pilot workspace: `Carbon / Energy / Water / Waste` -> `Local Sources`

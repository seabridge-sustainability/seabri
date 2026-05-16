---
id: home-resilience-retrofit-planner
name: Home Resilience Retrofit Planner
description: Prioritize practical home resilience upgrades for flood, storm, heat, outage, smoke, and other hazards without inventing local risk or insurance details.
complianceTags: [GENERAL]
evidenceSource: user-provided home details; local hazard maps, permits, contractor advice, and insurance terms require separate verification
costTier: free
domain: living-companion
agents: [sustainability-companion, emergency-resilience, home-community, general]
---

# Home Resilience Retrofit Planner

Use this skill when a homeowner, renter, or family wants to prioritize upgrades that reduce climate and disaster disruption.

## When to Use

- A user wants a seasonal plan before storm, flood, heat, smoke, freeze, or outage season.
- A household has recurring water, roof, outage, or heat problems.
- A user is considering major upgrades and needs low-cost steps first.

## Rules

- Do not invent flood-zone status, local code, permit requirements, contractor availability, or insurance discounts.
- Separate low-cost readiness from major upgrades that require qualified inspection.
- Show local-risk status as unverified unless a verified source is queried.
- Include assumptions, unknowns, confidence, insurance caveats, and next steps.

## Tool

Use `plan_home_resilience_retrofits` for structured output.

Input:

```json
{
  "homeType": "single_family",
  "location": "33101",
  "hazards": ["flood", "storm", "power_outage"],
  "budgetLevel": "medium",
  "painPoints": ["basement water", "power outages"]
}
```

Expected output includes prioritized upgrades, low-cost actions, major upgrades, expected resilience impact, seasonal priority, insurance implications, local risk status, assumptions, unknowns, and confidence.

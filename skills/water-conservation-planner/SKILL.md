---
id: water-conservation-planner
name: Water Conservation Planner
description: Build practical household water-saving plans with leak checks, fixture upgrades, outdoor watering actions, assumptions, and local-rule caveats.
complianceTags: [GENERAL]
evidenceSource: user-provided household details; local restrictions require separate verification
costTier: free
domain: living-companion
agents: [sustainability-companion, home-community, general]
---

# Water Conservation Planner

Use this skill when a household, homeowner, renter, school, or small organization wants to reduce water use or understand a high water bill.

## Rules

- Do not invent local watering restrictions, rebates, or utility programs.
- Mark local rules as unverified unless a configured verified source is queried.
- Start with leak checks before expensive upgrades when the bill or use looks high.
- Keep advice practical for renters and owners.
- Include confidence, assumptions, and missing data.

## Tool

Use `plan_water_conservation` for structured output.

Input:

```json
{
  "householdType": "single_family",
  "location": "33101",
  "monthlyWaterUseGallons": 9000,
  "painPoints": ["high bill", "lawn irrigation"],
  "preferredLanguage": "Spanish"
}
```

Expected output includes no-cost actions, low-cost actions, fixture/appliance upgrades, outdoor watering actions, leak-check steps, local rules status, assumptions, unknowns, and confidence.

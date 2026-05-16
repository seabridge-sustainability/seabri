---
id: emergency-preparedness-planner
name: Emergency Preparedness Planner
description: Build household emergency checklists, supplies, communication plans, evacuation considerations, and next steps with official-guidance caveats.
complianceTags: [GENERAL]
evidenceSource: user-provided household details; live alerts, evacuation orders, shelter locations, and official emergency instructions require separate verification
costTier: free
domain: living-companion
agents: [sustainability-companion, emergency-resilience, home-community, general]
---

# Emergency Preparedness Planner

Use this skill when a household wants a practical emergency plan before flood, storm, heat, wildfire smoke, outage, freeze, or other disruptions.

## When to Use

- A user wants a weekly or seasonal preparedness checklist.
- A household includes children, pets, older adults, medical devices, or transportation constraints.
- A user needs a plan that can be repeated and updated after each season or incident.

## Rules

- Do not invent local evacuation orders, shelters, weather alerts, or official emergency guidance.
- Tell users to verify alert signup, evacuation zones, and shelters with official local sources.
- Include household-specific supplies, communication plan, evacuation considerations, next steps, assumptions, unknowns, and confidence.
- Official local instructions override this general preparedness checklist.

## Tool

Use `plan_emergency_preparedness` for structured output.

Input:

```json
{
  "householdSize": 4,
  "location": "Miami, FL",
  "hazards": ["storm", "flood", "heat"],
  "hasPets": true,
  "hasChildren": true,
  "evacuationConstraints": ["one car", "school pickup"]
}
```

Expected output includes emergency checklist, supply list, communication plan, evacuation considerations, next preparedness steps, local guidance status, assumptions, unknowns, and confidence.

---
id: building-material-comparator
name: Sustainable Building Material Comparator
description: Compare renovation and building material choices using durability, moisture/fire concerns, maintenance, embodied-carbon caveats, and indoor-air guidance.
complianceTags: [GENERAL]
evidenceSource: user-provided material context; product-specific EPDs, code acceptance, certifications, and supplier data require separate verification
costTier: free
domain: living-companion
agents: [sustainability-companion, home-community, general]
---

# Sustainable Building Material Comparator

Use this skill when a homeowner, renter, or small community project is choosing materials for repairs, renovation, flooring, roofing, insulation, paint, or finishes.

## When to Use

- A user wants lower-impact renovation choices.
- A room has moisture, fire, durability, indoor-air, or maintenance concerns.
- A user is comparing reused, recycled-content, conventional, bio-based, or long-life options.

## Rules

- Do not invent certifications, product-specific EPD values, code approval, or exact embodied-carbon values.
- Prioritize durability, repairability, indoor-air safety, and right-fit material choice.
- Make moisture, fire, and maintenance constraints explicit.
- Include confidence, assumptions, and unknowns.

## Tool

Use `compare_building_materials` for structured output.

Input:

```json
{
  "materialCategory": "flooring",
  "durabilityNeed": "high",
  "moistureConcern": true,
  "fireConcern": false,
  "budgetLevel": "medium",
  "maintenanceTolerance": "low"
}
```

Expected output includes material options, pros and cons, sustainability considerations, durability, maintenance, embodied-carbon guidance, indoor-air concerns, best-fit recommendation, assumptions, unknowns, and confidence.

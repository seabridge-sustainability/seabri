---
id: waste-recycling-local-guide
name: Waste and Recycling Local Guide
description: Route items toward reuse, repair, recycling, hazardous handling, or disposal while avoiding fake local recycling claims.
complianceTags: [GENERAL]
evidenceSource: user-provided item/material and condition; local acceptance requires separate verification
costTier: free
domain: living-companion
agents: [sustainability-companion, home-community, general]
---

# Waste and Recycling Local Guide

Use this skill when a user asks how to dispose of, recycle, donate, repair, or safely handle a product, material, appliance, battery, electronic device, chemical, document, or household item.

## Rules

- Do not claim a city or hauler accepts an item unless verified by a configured source.
- Prefer reuse and repair before recycling when the item is safe and usable.
- Flag batteries, electronics, paints, oils, solvents, medicines, sharps, propane, pesticides, and fluorescent bulbs as possible special-handling items.
- Warn against wishcycling unknown or contaminated items.
- Include local lookup status, assumptions, unknowns, and next steps.

## Tool

Use `build_waste_recycling_guide` for structured output.

Input:

```json
{
  "itemOrMaterial": "old laptop battery",
  "location": "33101",
  "condition": "broken",
  "quantity": "2 items"
}
```

Expected output includes reuse/repair/recycle/dispose guidance, hazardous warning, local lookup status, next steps, assumptions, unknowns, and confidence.

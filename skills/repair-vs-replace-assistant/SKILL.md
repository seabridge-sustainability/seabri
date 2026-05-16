---
id: repair-vs-replace-assistant
name: Repair vs Replace Assistant
description: Help households decide whether to repair or replace products and appliances using cost, age, efficiency, waste, assumptions, and uncertainty.
complianceTags: [GENERAL]
evidenceSource: user-provided product details; product-specific energy labels, warranties, and repair data require separate verification
costTier: free
domain: living-companion
agents: [sustainability-companion, home-community, general]
---

# Repair vs Replace Assistant

Use this skill when a person is deciding whether to fix, keep using, donate, recycle, or replace a household product or appliance.

## When to Use

- A user has a repair quote and wants a practical decision aid.
- A household wants to reduce waste without keeping unsafe or inefficient equipment.
- A product is old, broken, costly to repair, or difficult to service.

## Rules

- Do not claim exact embodied carbon or avoided emissions.
- Do not invent warranty status, energy-label performance, repairability scores, or local recycling rules.
- Treat safety concerns as a reason to pause normal repair advice and seek qualified help.
- Include financial tradeoff, sustainability tradeoff, waste impact, confidence, assumptions, and unknowns.

## Tool

Use `advise_repair_vs_replace` for structured output.

Input:

```json
{
  "productType": "washing machine",
  "ageYears": 9,
  "estimatedRepairCostUsd": 180,
  "replacementBudgetUsd": 900,
  "energyEfficiency": "average",
  "condition": "repairable",
  "preferredLanguage": "Spanish"
}
```

Expected output includes repair recommendation, replacement recommendation, sustainability tradeoff, financial tradeoff, waste impact, next steps, assumptions, unknowns, and confidence.

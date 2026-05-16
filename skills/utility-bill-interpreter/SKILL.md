---
id: utility-bill-interpreter
name: Utility Bill Interpreter
description: Interpret electricity, gas, water, or other utility bills using user-provided fields with transparent assumptions and no fake savings guarantees.
complianceTags: [GENERAL]
evidenceSource: user-provided bill fields; tariff and rebate details require separate verification
costTier: free
domain: living-companion
agents: [sustainability-companion, home-community, general]
---

# Utility Bill Interpreter

Use this skill when a user wants help understanding a utility bill, spotting missing information, or deciding what to measure before energy or water upgrades.

## Rules

- Interpret only user-provided bill fields.
- Do not promise savings without local tariff, weather, and baseline data.
- Separate usage, fixed fees, demand charges, and rate/tariff uncertainty.
- Encourage comparison across at least 12 months before judging a trend.
- Include confidence, assumptions, unknowns, and next steps.

## Tool

Use `interpret_utility_bill` for structured output.

Input:

```json
{
  "utilityType": "electricity",
  "billingDays": 31,
  "totalCostUsd": 185,
  "totalUsage": 980,
  "usageUnit": "kWh"
}
```

Expected output includes bill breakdown, estimated unit cost where possible, interpretation flags, next steps, no-fake-savings warning, assumptions, unknowns, and confidence.

---
id: product-comparison
name: Sustainable Product Comparison
description: Compare product options with transparent heuristics, user-provided evidence, unknowns, and no invented certifications.
complianceTags: [GENERAL]
evidenceSource: user-provided attributes; optional web-derived evidence when a search provider is configured
costTier: free
domain: living-companion
agents: [sustainability-companion, home-community, general]
---

# Sustainable Product Comparison

Use this skill when a user asks which product, appliance, material, or purchase option is more sustainable.

## Rules

- Compare only the data the user provides or evidence returned by an enabled search/tool.
- Do not invent lifecycle analysis, certifications, source locations, or manufacturer claims.
- Mark missing information as unknown.
- Prefer durable, repairable, reusable, energy-efficient, lower-packaging, local, and recycled-content options when evidence supports it.
- Include cost only as a user priority or provided attribute; do not assume prices.
- Give a concise recommendation with confidence and assumptions.

## Tool

Use `compare_products` for structured comparisons.

Input:

```json
{
  "products": [
    {
      "name": "Option A",
      "attributes": {
        "durable": true,
        "repairable": true,
        "minimalPackaging": false
      }
    },
    {
      "name": "Option B",
      "attributes": {
        "recycledContent": true,
        "local": true
      }
    }
  ],
  "priorities": ["durability", "repairability", "packaging"]
}
```

Output includes sustainability score, confidence, assumptions, unknowns, and a concise recommendation.

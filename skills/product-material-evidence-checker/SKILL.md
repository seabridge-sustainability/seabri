---
id: product-material-evidence-checker
name: Product Material Evidence Checker
description: Screen sustainability evidence completeness for products and materials without claiming certification, EPD, warranty, code, or repairability verification.
complianceTags: [GENERAL]
evidenceSource: user-supplied evidence snippets, source URLs, and certificate/report IDs only
costTier: free
domain: living-companion
agents: [sustainability-companion, home-community, general]
---

# Product Material Evidence Checker

Use this skill when a user needs to evaluate sustainability evidence for a product, appliance, building material, or renovation choice.

## Inputs

- `productOrMaterial`: product, appliance, material, or finish.
- `claimType`: `repairability`, `warranty`, `service_parts`, `material_epd`, `certification`, `low_voc`, `code_acceptance`, `green_claim`, or `unknown`.
- `claimedEvidence`: optional user-provided evidence snippets.
- `sourceUrls`: optional user-provided URLs.
- `certificateIds`: optional certificate, EPD, warranty, or report IDs.
- `preferredLanguage`: optional display language.

## Production Behavior

- Screen evidence completeness and red flags.
- Do not fetch URLs or query certificate, marketplace, code, warranty, repairability, or EPD databases unless an approved adapter is explicitly added.
- Never claim a product is certified, code-compliant, low-carbon, non-toxic, approved, or verified based only on user-provided text.

## Output

- Verification status: `not_verified` or `user_evidence_supplied`.
- Evidence checklist.
- Red flags.
- Questions for seller or installer.
- Assumptions, unknowns, and confidence.

## Surfaces

- API: `POST /api/seabri/living-companion/product-material-evidence-check`
- MCP: `check_product_material_evidence`
- Pilot workspace: `Product & Purchasing` -> `Evidence Check`

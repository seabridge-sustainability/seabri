---
id: insurance-declarations-reviewer
name: Insurance Declarations Reviewer
description: Screen homeowner insurance declarations text for visible resilience planning signals without legal advice, coverage promises, or live insurer calls.
complianceTags: [GENERAL]
evidenceSource: user-provided declaration or policy text only
costTier: free
domain: living-companion
agents: [sustainability-companion, home-community, general]
---

# Insurance Declarations Reviewer

Use this skill when a homeowner, renter, family, or community member provides insurance declaration or policy text and wants practical resilience-oriented screening.

## Inputs

- `documentText`: user-provided declarations or policy text.
- `documentType`: `declarations`, `policy`, `claim`, or `unknown`.
- `concern`: optional hazard or planning concern.
- `preferredLanguage`: optional display language.

## Production Behavior

- Extract visible signals such as carrier, policy number, policy period, coverage lines, deductible lines, exclusions, and endorsements.
- Produce a mitigation document checklist and questions to ask an agent or insurer.
- Never provide legal advice, claims advice, coverage guarantees, premium promises, or insurer determinations.
- Do not call live insurer, claims, legal, OCR, or document providers unless separately approved and gated.

## Output

- `reviewStatus: screening_only`
- Extracted fields and text signals.
- Mitigation document checklist.
- Questions for agent or insurer.
- Assumptions, unknowns, and confidence.

## Surfaces

- API: `POST /api/seabri/living-companion/insurance-declarations-review`
- MCP: `review_insurance_declarations`
- Pilot workspace: `Living Companion` -> `Insurance Review`

---
id: grant-funding-assistant
name: Grant Funding Assistant
description: Build grant-search strategies, funding categories, eligibility questions, timing advice, assumptions, and not-verified status for community sustainability and resilience projects without inventing specific open grants.
domain: community-sustainability
costTier: free
evidenceSource: user_input_and_general_program_categories
complianceTags:
  - GENERAL
agents:
  - sustainability-companion
  - home-community
  - general
---

# Grant Funding Assistant

Use this skill when a school, NGO, community group, neighborhood, or local organization needs help finding funding paths for a sustainability or resilience project.

## Inputs

- Organization type.
- Project description.
- Location, when available.
- Approximate budget, when available.
- Preferred language, when available.

## Output Standard

Return:

- Search strategies.
- Funding categories to investigate.
- Eligibility questions.
- Timing advice.
- Budget context.
- Assumptions.
- Confidence.
- `dataStatus: not_verified`.
- A clear disclaimer that no specific grant listing, deadline, or eligibility claim has been verified.

## Guardrails

- Do not invent specific open grants.
- Do not invent application deadlines.
- Do not claim eligibility.
- Do not imply funding is available without source verification.
- Route users to source systems such as public grant portals, agency pages, community foundations, or verified funder websites.

## Tool

Use `find_grant_opportunities` when available.

---
id: carbon-tracker
name: Carbon Tracker
description: Monitor and report greenhouse gas emissions across Scope 1, 2, and 3 categories using standardised GHG Protocol methodology.
complianceTags: [GHG_PROTOCOL, CDP, TCFD, GENERAL]
costTier: low
evidenceSource: EPA GHGRP, IEA
---

# Carbon Tracker

Monitor and report greenhouse gas emissions across Scope 1, 2, and 3 categories using standardised GHG Protocol methodology.

## When to Use

- Organisation needs to track carbon emissions for reporting
- CDP questionnaire preparation requiring emissions data
- TCFD-aligned climate disclosures needing quantified emissions
- Baseline measurement for science-based target setting

## Methodology

### Scope Classification

| Scope | Description | Data Sources |
|-------|-------------|-------------|
| Scope 1 | Direct emissions from owned/controlled sources | Fuel consumption, process emissions, fugitive emissions |
| Scope 2 | Indirect emissions from purchased energy | Electricity bills, grid emission factors (location/market-based) |
| Scope 3 | All other indirect emissions in value chain | Supply chain data, employee commuting, business travel |

### Emission Factors

Uses EPA GHGRP emission factors for US operations and IEA data for international comparisons. Location-based and market-based Scope 2 methods are both supported per GHG Protocol Scope 2 Guidance.

### Output Format

Returns structured JSON with:
- Total emissions by scope (tCO2e)
- Intensity metrics (per revenue, per employee, per square metre)
- Year-over-year trend analysis
- Data quality scores per category

## Limitations

- Scope 3 estimates rely on spend-based factors when activity data is unavailable
- Small business mode uses simplified estimation based on industry averages
- Non-US emission factors may have lower granularity

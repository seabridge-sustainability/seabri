---
id: earthquake-risk
name: Earthquake Risk Assessment
description: Evaluate seismic risk and earthquake hazard exposure using USGS, GEM OpenQuake, and site amplification data for assets and properties.
complianceTags: [TCFD, GENERAL]
costTier: free
evidenceSource: USGS National Seismic Hazard Model; GSHAP; Global Earthquake Model (GEM) OpenQuake; Vs30 site amplification data
---

## When to Use

Activate when a user asks about seismic risk, earthquake hazard, fault proximity, ground-shaking intensity, liquefaction potential, or the structural vulnerability of assets to seismic events.

## Methodology

1. Locate the asset relative to known fault systems and seismic hazard zones using USGS or GEM hazard maps.
2. Determine the Peak Ground Acceleration (PGA) and spectral acceleration at the 475-year return period (10% probability of exceedance in 50 years) for the site.
3. Assess site amplification using Vs30 (average shear-wave velocity to 30 m depth); flag high-amplification soft-soil or fill sites.
4. Evaluate secondary hazards: liquefaction, landslide, tsunami inundation (for coastal locations).
5. Apply TCFD Physical Risk taxonomy: acute event risk and chronic infrastructure degradation.
6. Provide risk rating: LOW / MEDIUM / HIGH / CRITICAL with confidence and return-period basis.

## Output

- Risk narrative (2–4 sentences) covering seismic zone classification, dominant hazard source, and key secondary hazards
- Key metrics: PGA at 475-year return period (g), Vs30 class, proximity to nearest active fault (km)
- TCFD disclosure bullet points on acute physical risk
- Recommended resilience measures (seismic retrofitting, base isolation, insurance, business continuity planning)

## Active Emergency Escalation Protocol

If the user reports an active earthquake emergency (e.g. building collapse, trapped persons, ongoing aftershock sequence):

1. Immediately provide drop-cover-hold-on guidance, evacuation procedures, and emergency service contacts.
2. Escalate to notify_emergency if life safety is at risk.
3. Do not defer to hazard modelling — switch to immediate safety instructions.
4. Ask: "Is there active structural damage or injury right now? If yes, reply YES EMERGENCY."

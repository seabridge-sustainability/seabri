---
skill_id: physical-risk-screening
name: Physical Risk Screening
version: "1.0"
agents: [climate-risk, home-community, investment-screening]
tools: [coastal_flood_assessment, inland_flood_assessment, wildfire_assessment, heat_stress_assessment, hurricane_wind_assessment, drought_stress_assessment]
data_sources: [NASA POWER, NOAA CO-OPS, NOAA Weather API, FEMA NFHL, USGS Water Services, US Drought Monitor, Open Elevation, NASA FIRMS, AirNow]
---

# Physical Risk Screening

Multi-peril climate physical risk assessment using public APIs and heuristic models. Run one or more peril tools for any US address and compose a multi-hazard summary.

## When to Use

- User asks about climate risk, flood risk, wildfire risk, heat risk, hurricane exposure, or drought stress for a specific US location
- Portfolio screening of physical climate risk across multiple assets
- Home resilience audit requiring multi-hazard baseline
- Investment due diligence for property or infrastructure

## Tools Available

Call any combination of the six peril tools. Each takes a single `address` string and returns structured JSON.

| Tool | Peril | Key APIs |
|------|-------|----------|
| `coastal_flood_assessment` | Coastal flood | NOAA CO-OPS tides + sea level trends, Open Elevation, NOAA Weather |
| `inland_flood_assessment` | Riverine/pluvial flood | FEMA NFHL, USGS stream gauges, NASA POWER precipitation, Open Elevation |
| `wildfire_assessment` | Wildfire | NASA FIRMS (optional key), US Drought Monitor, AirNow (optional key), NOAA Weather |
| `heat_stress_assessment` | Extreme heat | NASA POWER 4yr T2M_MAX/RH2M, NOAA Heat Index, Urban Heat Island |
| `hurricane_wind_assessment` | Tropical cyclone wind | Historical zone statistics, NOAA Weather, elevation, coastal exposure |
| `drought_stress_assessment` | Drought / water stress | US Drought Monitor, NASA POWER 4yr precipitation, soil type heuristic |

## Methodology Notes

### Scoring

Each tool returns a `*_risk_percent` field (0–100) and a `factor_scores` object with individual component scores. The composite is a weighted average of factor scores.

Score thresholds:
- **0–25**: Low risk — standard resilience measures sufficient
- **26–50**: Moderate risk — investigate specific exposures, consider insurance review
- **51–75**: High risk — targeted mitigation investments recommended
- **76–100**: Very high risk — material financial exposure, professional assessment warranted

### Data Gaps and Limitations

- **FIRMS fire detections**: Requires `NASA_FIRMS_KEY`. Without it, the wildfire tool degrades to weather/drought/heuristic-only scoring.
- **AirNow AQI**: Requires `AIRNOW_KEY`. Degraded wildfire score when absent.
- **NOAA CO-OPS sea level trends**: Station must exist near the address. Coastal score falls back to a regional estimate when no nearby station is found.
- **Hurricane zone table**: Based on 50-year historical frequencies by geographic zone — does not use real-time forecast data.
- **Non-US addresses**: All tools require a US address geocodable by the Census Bureau. Non-US locations will return a geocoding error.

### API Attribution

- Open Elevation API: free, no key required
- US Census Geocoder: free, no key required
- NOAA Weather API (api.weather.gov): free, no key required
- NOAA CO-OPS: free, no key required
- FEMA NFHL (hazards.fema.gov): free, no key required
- USGS Water Services: free, no key required
- US Drought Monitor (droughtmonitor.unl.edu): free, no key required
- NASA POWER: free, no key required
- NASA FIRMS: free with registration at firms.modaps.eosdis.nasa.gov
- AirNow: free with registration at airnowapi.org

## Example Multi-Hazard Prompt

> "Run a full physical risk screening for 123 Main St, Miami FL 33101"

The agent will call all six peril tools in parallel (or sequence depending on tool_use rounds) and return a composite multi-hazard summary with risk levels, key drivers, and recommended actions.

## Recommended Follow-On Skills

- `flood-risk-screening` — detailed FEMA zone analysis and insurance guidance
- `wildfire-risk-assessment` — defensible space and home hardening steps
- `home-resilience-audit` — IRA tax credits, backup power, heat pump eligibility
- `investment-risk-screening` — portfolio-level physical risk data sources and CVaR

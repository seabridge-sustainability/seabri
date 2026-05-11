# OpenSeaBri Pilot Demo Script

Use the app Pilot Workspace tab. Keep live-provider gates closed.

## 1. Flood Incident

Setup:

```powershell
$env:OPENSEABRI_API_KEY="<staging-api-key>"
$env:SEABRI_WS_TOKEN="<staging-ws-token>"
$env:OPENSEABRI_CANVAS_WS_TOKEN="<staging-canvas-token>"
$env:OPENSEABRI_LOCAL_RESOURCE_FILE="docs/pilot/fixtures/local-resources.staging.json"
$env:OPENSEABRI_LIVE_PROVIDER_ALLOW="false"
```

Script:

1. Open Pilot Workspace.
2. Fill profile: name, address, city/state/ZIP, phone, preferred language.
3. Click Save profile.
4. Select Living Companion.
5. Select "My bathroom is flooding."
6. Add `bathroom-photo.jpg` as the media reference.
7. Select Water mitigation.
8. Click Create action plan.

Expected:

- Short immediate safety steps.
- Local-help result labeled `configured-staging-demo-fixture`.
- Demo placeholder warning visible in returned resource data.
- Approval card says confirmation is required.
- Recent activity records profile update, incident run, and action card preparation.
- No call or message is sent.

## 2. Product Comparison

Script:

1. Select Product Comparison.
2. Product 1: durable steel bottle, durable, repairable, minimal packaging.
3. Product 2: disposable plastic bottle pack, not durable, not repairable, excess packaging.
4. Priorities: durability, packaging.
5. Click Compare products.

Expected:

- Durable bottle ranked higher.
- Sustainability scores shown.
- Assumptions and unknowns are explicit.
- Certifications are only shown if user-provided.
- Recent activity records product comparison.

## 3. Sustainable Compute Optimizer

Script:

1. Select Sustainable Compute.
2. Workflow name: daily incident triage.
3. Current model: `claude-opus-4-6`.
4. Estimated tokens: `8000`.
5. Keep repeated task, cacheable, and batchable checked.
6. Click Optimize workflow.

Expected:

- Smaller/default model recommendation.
- Local/private model option.
- Caching, batching, and context-compression recommendations.
- Estimated cost, compute, and carbon proxy reduction.
- Telemetry id beginning with `sco_`.
- Recent activity records compute optimization.

## Command-Line Pilot Smoke

```powershell
npm run smoke:pilot
```

This smoke uses only local HTTP handlers and the staging fixture. It must not send real messages, place calls, submit forms, or contact live providers.

## 4. Household Carbon Footprint

Script:

1. Select Carbon Footprint.
2. Household size: `3`.
3. Monthly electricity: `800`.
4. Vehicle miles/week: `120`.
5. Diet pattern: average.
6. Click Estimate footprint.

Expected:

- Broad annual emissions range, not single fake-precision number.
- Top contributing categories.
- 3-5 reduction actions.
- Assumptions, unknowns, and confidence.
- Spanish labels if preferred language is Spanish.

## 5. Home Energy Action Plan

Script:

1. Select Home Energy.
2. Enter home type, monthly bill, heating/cooling type, and budget.
3. Click Plan energy actions.

Expected:

- No-cost actions.
- Low-cost actions.
- Upgrade actions.
- Seasonal priority.
- Utility/rebate lookup fallback if no provider is configured.

## 6. Community Sustainability Project

Script:

1. Select Community Project.
2. Organization type: school or NGO.
3. Goal: plan a community cleanup.
4. Add budget, timeline, and volunteers.
5. Click Plan project.

Expected:

- Project plan.
- Stakeholder map.
- Funding/grant search prompts.
- Risk/permit checklist.
- Volunteer task list.
- Metrics to track.

## 7. Certification Navigator

Script:

1. Select Certification.
2. User type: small business.
3. Goal: reduce energy use and prepare ESG documents.
4. Click Find certification path.

Expected:

- Suggested path such as ENERGY STAR, utility rebate, LEED/WELL, or ESG readiness.
- Eligibility questions.
- Required documents.
- Complexity/cost level.
- Clear disclaimer that OpenSeaBri does not certify eligibility.

## 8. Carbon Offset Quality Checker

Script:

1. Select Offset Checker.
2. Project type: forest.
3. Leave registry blank or use an unknown registry.
4. Price per ton: low test value.
5. Click Check offset quality.

Expected:

- Quality flags.
- Greenwashing risk.
- Verification questions.
- Confidence and unknowns.
- No invented registry verification status.

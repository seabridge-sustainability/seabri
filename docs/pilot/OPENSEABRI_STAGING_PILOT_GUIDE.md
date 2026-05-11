# OpenSeaBri Staging Pilot Guide

Status: staging pilot candidate with live-provider gates closed.

## What Pilot Users Can Test

- Living Companion incident workflow for bathroom flooding, basement flooding, storm damage, power outage, and insurance document review.
- Profile onboarding, edit, and delete from the Pilot Workspace.
- Address/ZIP reuse for local resource lookup.
- Photo/document/audio reference continuity in the incident workflow.
- Local-help lookup from a configured provider or the staging demo fixture.
- Approval-gated action card preparation. No outbound action is sent by the pilot smoke.
- Sustainable product comparison with transparent assumptions and unknown-data handling.
- Household carbon footprint screening with broad emissions ranges and reduction actions.
- Home energy action planning for no-cost, low-cost, and upgrade steps.
- Community sustainability project planning for schools, NGOs, neighborhoods, and small organizations.
- Sustainability certification navigation for ENERGY STAR, LEED, WELL, utility rebates, and ESG readiness.
- Carbon offset quality screening with greenwashing risk flags.
- Agent Harness sustainable compute optimizer with model-routing, caching, batching, and context-compression recommendations.
- Recent activity and last-result continuity in the browser.

## What Is Disabled

- Live SMS, WhatsApp, Telegram, and voice calls unless explicitly approved and configured.
- Real outbound calls/messages from the pilot UI.
- Uncontrolled web search for local providers unless `OPENSEABRI_LOCAL_RESOURCE_SEARCH_URL` is configured.
- Live vision/image provider calls unless `OPENSEABRI_VISION_PROVIDER_URL` is configured.
- Real claims submission, insurance filing, provider dispatch, payment, or emergency-service contact.

## Safe Test Scenarios

1. Create a pilot profile with a test address and phone number.
2. Run "My bathroom is flooding."
3. Use the staging local resource fixture:

```powershell
$env:OPENSEABRI_LOCAL_RESOURCE_FILE="docs/pilot/fixtures/local-resources.staging.json"
```

4. Confirm the local-help result is labeled `configured-staging-demo-fixture`.
5. Confirm the action card says approval is required.
6. Run a product comparison using user-provided attributes only.
7. Estimate household carbon footprint with utility and commute assumptions.
8. Build a home energy action plan.
9. Plan a school/community cleanup.
10. Navigate a certification path.
11. Check a carbon offset with missing registry evidence.
12. Run sustainable compute optimizer with repeated/cacheable/batchable enabled.

## Known Limitations

- Demo fixture contacts are placeholders and must not be represented as real providers.
- File-backed profile/session storage is acceptable for staging pilots, not final multi-tenant production.
- Vision and live local search are provider-configured. When absent, OpenSeaBri returns a safe fallback.
- Preferred language is stored and visible; full translated output still depends on the selected workflow/provider path.
- Spanish V1 labels are deterministic for the practical sustainability workflows, but full natural-language translation is not complete yet.
- Carbon and energy estimates are screening tools, not audits.
- Certification and offset tools do not verify live registry or certification status.

## Feedback Questions

- Did the incident response give the next action quickly enough?
- Was profile onboarding clear and not too invasive?
- Did the local-help source label make trust level clear?
- Did the product comparison avoid overclaiming?
- Did the footprint and energy tools feel useful without pretending to be precise audits?
- Did the certification and offset tools make uncertainty clear?
- Did community project planning produce tasks a school/NGO could actually use?
- Did the compute optimizer produce a recommendation a developer could act on?
- Were approval gates obvious before any external action?

## Bug Report Format

```text
Pilot user:
Workflow:
Steps taken:
Expected:
Actual:
Screenshot/log excerpt:
Did any live provider action occur? yes/no
Was any private data exposed? yes/no
```

## Privacy Note

Profile data is used for workflow continuity and local-help lookup. Registry snapshots must not include profile details. Telemetry redacts profile, phone, address, ZIP, token, and secret fields.

## Live-Provider Gate Warning

Do not enable live provider credentials for pilot users until the live-provider validation plan is explicitly approved. Do not message real customers, call real providers, call emergency services, or submit live forms from staging.

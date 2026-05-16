# OpenSeaBri Skill And Tool Interaction Matrix

Date: 2026-05-16

Status terms:

- `working`: implemented, registered, invokable, and covered by tests for the stated surface.
- `partial`: implemented but not exposed everywhere or provider/live path remains gated.
- `missing`: required capability has no usable implementation.
- `documented-only`: docs mention the capability but runtime invocation is absent.

## Matrix

| capability name | category | native/upstream | source path | registry status | API status | MCP status | UI status | WhatsApp status | Telegram status | SMS status | WebSocket/chat status | tests | current status | gap | next action |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Household carbon footprint | Personal sustainability | Native | `gateway/seabri/practical-sustainability.ts` | Registered | Working | Working | Working | Routed through orchestrator | Routed through orchestrator | Routed through orchestrator | Working | Unit/API/MCP/UI | working | Live channel validation gated | Provider smoke with allowlists |
| Home energy action plan | Homeowner | Native | `gateway/seabri/practical-sustainability.ts` | Registered | Working | Working | Working | Routed | Routed | Routed | Working | Unit/API/MCP/UI | working | Utility tariff lookup not live | Add verified tariff/local rebate lookup |
| Product comparison | Product & purchasing | Native | `gateway/seabri/practical-sustainability.ts` | Registered | Working | Working | Working | Routed | Routed | Routed | Working | Unit/API/MCP/UI | working | External catalog lookup not live | Add verified product data connectors |
| Sustainable purchasing checklist | Product & purchasing | Native | `gateway/seabri/practical-sustainability.ts` | Registered | Working | Working | Working | Routed | Routed | Routed | Working | Unit/API/MCP/UI | working | Product proof remains user-supplied | Add optional verified marketplace lookup |
| Repair vs Replace Assistant | Product & purchasing | Native | `gateway/seabri/practical-sustainability.ts`; `skills/repair-vs-replace-assistant/SKILL.md` | Registered | Working | Working | Working | Routed | Routed | Routed | Working | Unit/API/MCP/UI | working | Product-specific repairability, warranty, and energy label data are user-supplied | Add optional verified product/serviceability data lookup |
| Home Resilience Retrofit Planner | Homeowner resilience | Native | `gateway/seabri/practical-sustainability.ts`; `skills/home-resilience-retrofit-planner/SKILL.md` | Registered | Working | Working | Working | Routed | Routed | Routed | Working | Unit/API/MCP/UI | working | Local hazard, permit, contractor, and insurance data intentionally not invented | Add verified hazard/permit/insurance-document adapter |
| Sustainable Building Material Comparator | Building & renovation | Native | `gateway/seabri/practical-sustainability.ts`; `skills/building-material-comparator/SKILL.md` | Registered | Working | Working | Working | Routed | Routed | Routed | Working | Unit/API/MCP/UI | working | Product-specific EPD/certification/code data not queried | Add optional verified EPD/material database connector |
| Emergency Preparedness Planner | Homeowner resilience | Native | `gateway/seabri/practical-sustainability.ts`; `skills/emergency-preparedness-planner/SKILL.md` | Registered | Working | Working | Working | Routed | Routed | Routed | Working | Unit/API/MCP/UI | working | Live alerts, shelters, and evacuation orders intentionally not queried | Add official alert/shelter adapter only with provider approval |
| Carbon offset quality checker | Product & purchasing | Native | `gateway/seabri/practical-sustainability.ts` | Registered | Working | Working | Working | Routed | Routed | Routed | Working | Unit/API/MCP/UI | working | Does not certify credits | Keep as screening aid |
| Water Conservation Planner | Carbon / Energy / Water / Waste | Native | `gateway/seabri/practical-sustainability.ts`; `skills/water-conservation-planner/SKILL.md` | Registered | Working | Working | Working | Routed | Routed | Routed | Working | Unit/API/MCP/UI target | working | Local water rules not verified | Add optional municipal lookup |
| Waste and Recycling Local Guide | Carbon / Energy / Water / Waste | Native | `gateway/seabri/practical-sustainability.ts`; `skills/waste-recycling-local-guide/SKILL.md` | Registered | Working | Working | Working | Routed | Routed | Routed | Working | Unit/API/MCP/UI target | working | Local rules intentionally not invented | Add verified city/county lookup |
| Utility Bill Interpreter | Carbon / Energy / Water / Waste | Native | `gateway/seabri/practical-sustainability.ts`; `skills/utility-bill-interpreter/SKILL.md` | Registered | Working | Working | Working | Routed | Routed | Routed | Working | Unit/API/MCP/UI target | working | PDF OCR/provider extraction is gated | Add document parser when provider approved |
| Climate/property risk | Homeowner resilience | Native + backend proxy | `gateway/seabri/*`; backend `/api/v1/openseabri/*` | Registered | Partial | Partial | Working | Routed | Routed | Routed | Working | API/UI | partial | Enterprise-backed scoring requires backend config | Add backend availability smoke |
| Insurance document support | Homeowner resilience | Native | `gateway/seabri/document-execution*` | Registered | Working | Partial | Partial | Media route gated | Media route gated | MMS gated | Working | Unit/API | partial | No legal/coverage certification | Add richer PDF extraction tests |
| Flood/storm incident workflow | Homeowner resilience | Native | `gateway/seabri/action-executor.ts`; `gateway/channels/*` | Registered | Working | Working | Working | Routed/gated | Routed/gated | Routed/gated | Working | Channel mocks/API/UI | working | Live provider actions require approval | Keep approval-gated live smoke |
| Local resource search | Living companion | Native/provider-gated | `gateway/seabri/local-resources.ts`; `gateway/seabri/municipal-lookup.ts` | Registered | Working fallback | Partial | Working | Routed | Routed | Routed | Working | Unit/API + MunicipalLookupAdapter tests | partial | Municipal adapter interface implemented; live lookup gated pending provider config | Configure provider and promote NotAvailable to live adapter |
| Approval-gated action cards | Living companion | Native | `gateway/seabri/action-executor.ts`; `gateway/cron/approval.ts` | Registered | Working | Working | Working | Outbound blocked without approval | Outbound blocked without approval | Outbound blocked without approval | Working | Unit/channel mocks | working | Live execution requires owner approval | Maintain allowlist-only live tests |
| Community sustainability project planner | Community / NGO | Native | `gateway/seabri/practical-sustainability.ts` | Registered | Working | Working | Working | Routed | Routed | Routed | Working | Unit/API/MCP/UI | working | Grant database not live | Add funding connector |
| Community Resilience Checklist | Community / NGO | Native | `gateway/seabri/practical-sustainability.ts` | Registered | Working | Working | Working | Routed | Routed | Routed | Working | Unit/API/MCP/UI | working | Live partner directory absent | Add local partner lookup |
| NGO grant/funding assistant | Community / NGO | Native | `gateway/seabri/practical-sustainability.ts`; `skills/grant-funding-assistant/SKILL.md` | Registered | Working | Working | Working | Routed | Routed | Routed | Working | Unit/API/MCP/UI | working | No verified live grant feed; guidance intentionally returns `not_verified` data status | Add optional verified grant-source connector |
| Email inbound scaffold | Channel | Native/provider-gated | `gateway/channels/email.ts` | Partial | Webhook scaffold only | N/A | N/A | N/A | N/A | N/A | Routed only when approved | Email channel tests | partial | SendGrid inbound route is scaffolded but not mounted as a live webhook | Mount route only after provider approval and allowlist policy |
| Sustainable compute optimizer | Agent harness | Native | `gateway/sustainable-compute/*`; `gateway/model-router*` | Registered | Working | Working | Working | Not channel-specific | Not channel-specific | Not channel-specific | Working | Unit/API/MCP | working | Carbon is proxy-only | Keep assumptions transparent |
| Skills & tools catalog | Developer/advanced | Native | `gateway/tools/*`; `gateway/skills/*`; `src/App.tsx` | Working | Working | Working | Working | Not exposed as normal-user text | Not exposed as normal-user text | Not exposed as normal-user text | Working | Registry/UI | working | Catalog remains advanced view | Keep filtered user UI |
| MCP server | External workflow | Native | `gateway/mcp/server.ts` | Registered | N/A | Working | N/A | N/A | N/A | N/A | N/A | MCP tests | working | Transport is stdio; HTTP MCP not enabled | Add HTTP bridge only if needed |
| WebSocket/chat | Channel | Native | `gateway/index.ts`; `src/store/chat.ts` | Registered | Working | N/A | Working | N/A | N/A | N/A | Working | Unit/e2e | working | Browser deployment env dependent | Include in staging smoke |
| Telegram text/media | Channel | Native/provider-gated | `gateway/channels/telegram.ts` | Registered | Webhook path | N/A | N/A | N/A | Working gated | N/A | Routed | Mocked channel tests | partial | Live token/chat allowlist required | Provider readiness smoke |
| WhatsApp text/media | Channel | Native/provider-gated | `gateway/channels/whatsapp.ts` | Registered | Webhook path | N/A | N/A | Working gated | N/A | N/A | Routed | Mocked channel tests | partial | Live provider allowlist required | Provider readiness smoke |
| SMS/MMS text routing | Channel | Native/provider-gated | `gateway/channels/sms.ts` | Registered | Webhook path | N/A | N/A | N/A | N/A | Working gated | Routed | Mocked channel tests | partial | Live sender/recipient allowlist required | Provider readiness smoke |
| Voice/audio message fallback | Channel | Native/provider-gated | `gateway/channels/voice.ts` | Registered | Webhook path | N/A | N/A | N/A | N/A | Partial | Routed | Voice tests + voice-fallback.test.ts (richer fallback fixtures added) | partial | Transcription provider credentials and approval required | Add live provider smoke when Twilio credentials approved |
| Image/photo incident routing | Channel/media | Native/provider-gated | `gateway/seabri/vision.ts`; channel media parsers | Registered | Working fallback | Partial | Partial | Media metadata routed | Media metadata routed | MMS metadata routed | Working | Unit/channel mocks | partial | Vision provider gated | Add approved provider validation |
| Document/PDF routing | Channel/media | Native/provider-gated | `gateway/seabri/document-execution*`; `gateway/seabri/document-parser.test.ts` | Registered | Working fallback | Partial | Partial | Media metadata routed | Media metadata routed | MMS metadata routed | Working | Unit/channel mocks + fixture-based parser tests | partial | Full parsing depends on configured parser; fixture tests cover utility bill fields, fallback path, and no provider-leak guarantee | Add live parser adapter when OCR provider approved |
| Location shares | Channel/media | Native | `gateway/channels/*`; `gateway/seabri/geocoder.ts` | Partial | Partial | N/A | Partial | Routed when provider supplies coordinates | Routed when provider supplies coordinates | Partial | Working | Channel mocks | partial | Geocoding depends on provider availability | Add no-network fallback tests |
| Hermes adapter | Upstream adapter | Upstream | `gateway/upstream/hermes.ts` | Registered | Runtime registry | N/A | Catalog only | N/A | N/A | N/A | Invokable through registry | Upstream tests | working | External roots are allowlisted | Keep adapter smoke |
| OpenClaw adapter | Upstream adapter | Upstream | `gateway/upstream/openclaw.ts` | Registered | Runtime registry | N/A | Catalog only | N/A | N/A | N/A | Invokable through registry | Upstream tests | working | Pattern parity only for some channels | Keep channel matrix updated |
| MiroFish adapter | Upstream adapter | Upstream | `gateway/upstream/mirofish.ts` | Registered/gated | Runtime registry | N/A | Catalog only | N/A | N/A | N/A | Invokable with quarantine | Upstream tests | partial | AGPL license risk | Keep isolated, no code copy |
| Space Agent instruction loader | Upstream adapter | Upstream | `gateway/upstream/space-agent.ts` | Registered | Runtime registry | N/A | Catalog only | N/A | N/A | N/A | Invokable through registry | Upstream tests | working | Pattern extraction only, no Electron runtime | Expand docs corpus if needed |
| Nanobot bridge | Upstream channel | Upstream | `_upstream/nanobot` | Missing | Missing | Missing | Missing | Missing | Missing | Missing | Missing | Audit only | documented-only | No adapter yet | Build only after compliance plan |
| GBrain memory/job bridge | Upstream memory/workflow | Upstream | `_upstream/gbrain` | Missing | Missing | Missing | Missing | N/A | N/A | N/A | Missing | Audit only | documented-only | Persistence policy unresolved | Design retention-safe adapter |
| DeepSeek/coding model router | Upstream model routing | Upstream/reference | `_upstream/awesome-deepseek-agent` | Missing | Missing | Missing | Missing | N/A | N/A | N/A | Missing | Audit only | documented-only | License unclear; provider config absent | Keep as config-only future router |

## Skill Coverage By Audience

Individuals and households:

- Production-ready: household carbon footprint, home energy action planning, product comparison, sustainable purchasing, repair-vs-replace guidance, building material comparison, emergency preparedness planning, carbon offset quality screening, water conservation planning, waste/recycling guidance, utility bill interpretation, incident triage, approval-gated action cards.
- Partial: climate/property risk, insurance document support, local resource search, PDF/image media parsing.
- Missing/high-priority: verified local rules for water, recycling, rebates, and local government resources.

Homeowners:

- Production-ready: flood/water damage workflow, storm damage workflow, power outage guidance, home energy plan, home resilience retrofit planner, emergency preparedness planner, utility bill interpretation, action-card outreach prep.
- Partial: insurance policy/declarations review, contractor/plumber outreach, local public works guidance, temp-stay support, verified retrofit incentive and permit lookup.
- Missing/high-priority: verified local contractor/public-works directory and robust insurance PDF extraction.

Communities, NGOs, and schools:

- Production-ready: community sustainability project planner, community resilience checklist, grant/funding search guidance, volunteer coordination plan, outreach/message drafts, impact metrics templates.
- Partial: environmental justice workflow and local hazard/event reporting.
- Missing/high-priority: verified grant feed, local partner directory, and community reporting export templates.

## Cross-Platform Messaging Review

OpenSeaBri has safe gated paths for Telegram, WhatsApp, SMS/MMS, voice/audio, image/photo, document/PDF, location metadata, and WebSocket/chat. Mocked tests cover routing and approval blocks. Live outbound actions remain blocked unless provider credentials, allowlists, and explicit approval are configured. Unknown-provider and provider-error handling should continue returning client-safe messages rather than raw stack traces.

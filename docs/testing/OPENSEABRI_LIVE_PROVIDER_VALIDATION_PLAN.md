# OpenSeaBri Live Provider Validation Plan

**Status:** plan only. Do not execute live calls/messages without explicit approval.  
**Last updated:** 2026-05-10

This plan defines the exact live-provider checks required after staging smoke tests pass. Use approved test contacts only. Do not call emergency services, real customers, unknown third parties, or submit live forms.

## Global Preconditions

- `OPENSEABRI_API_KEY`, `SEABRI_WS_TOKEN`, and any enabled canvas token are set.
- `OPENSEABRI_CHANNELS_ENABLED` lists only providers under test.
- Test contact/chat/number is approved in writing.
- Provider dashboard has a rollback path: disable webhook, disable token, or disable channel flag.
- Operator has acknowledged any provider cost.

## Provider Matrix

| Surface | Required env vars | Test target | Exact test input | Expected response | Must not happen | Logs to capture | Rollback |
|---------|-------------------|-------------|------------------|-------------------|-----------------|-----------------|----------|
| Telegram text | `TELEGRAM_BOT_TOKEN`, channel flag | Approved Telegram test chat | `OpenSeaBri staging test: home flood prep` | Parsed inbound text routes to orchestrator and returns safe sustainability guidance | Message sent to any other chat | channel, message type, safe route id, no token | Disable Telegram flag and bot webhook |
| Telegram image/document/audio | `TELEGRAM_BOT_TOKEN`, attachment settings | Approved Telegram test chat | Send one image, one PDF, one short audio clip with caption `attachment routing test` | Attachment metadata is captured and routed; unsupported media receives safe limitation text | Attachment ignored silently or raw provider error exposed | media type, size, attachment id, safe error class | Disable Telegram flag and delete webhook |
| WhatsApp text/media | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, webhook verify secret | Approved WhatsApp sandbox/test number | `OpenSeaBri staging WhatsApp test` plus one image/PDF if sandbox supports media | Webhook parses sender, body, media metadata, and routes to orchestrator | Reply to unapproved number or leak provider details | webhook event id, media type, route id | Disable webhook subscription and channel flag |
| SMS inbound | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` | Approved test phone | `OpenSeaBri SMS staging test` | Inbound body parses and routes; user-safe response generated | Outbound SMS without approval | provider event id, route id, safe error class | Disable SMS flag and Twilio webhook |
| Voice/call inbound | Twilio voice vars | Approved test phone | Place approved inbound test call or webhook replay | Voice intent is prepared; no outbound call is placed without approval | Call to emergency services or unknown party | call sid, route id, approval status | Disable voice flag and Twilio voice webhook |
| Outbound SMS | Twilio SMS vars, approval env, whitelist | Approved test phone | Prepare message `OpenSeaBri approved outbound SMS smoke` | Action card requires approval; after approval sends only to whitelist | Send to non-whitelisted number or without approval | action id, approval id, provider result class | Revoke approval and disable SMS flag |
| Outbound call | Twilio voice vars, approval env, whitelist | Approved test phone | Prepare call script `OpenSeaBri approved outbound call smoke` | Action card requires approval; execution is whitelist-only | Unapproved call or call to emergency services | action id, approval id, provider result class | Revoke approval and disable voice flag |
| Document upload | Attachment storage env if enabled | Approved test account | Upload harmless PDF named `openseabri-staging-test.pdf` | File metadata is captured; content route is user-safe | Public URL/token leak | attachment id, mime type, safe route id | Delete test attachment |
| Image upload | Attachment storage env if enabled | Approved test account | Upload harmless image | Image metadata routes to multimodal handling | Raw storage credential exposed | attachment id, mime type, size | Delete test attachment |
| Audio upload | Attachment storage env if enabled | Approved test account | Upload short harmless audio clip | Audio metadata routes; unsupported transcription returns safe limitation | Provider stack trace returned | attachment id, mime type, safe error | Delete test attachment |
| Product comparison | Optional LLM/search provider only if enabled | HTTP test client | Compare two user-provided products with known attributes | Transparent heuristic result, unknowns marked unknown, no invented certification | Invented lifecycle or certification claim | request id, skill id, confidence | Disable optional provider |
| MCP invocation | MCP stdio command | Local MCP client | `tools/list`, then safe product comparison prompt | Tools/resources list and route returns result | External tool called without allowlist | method, tool id, safe result | Stop MCP process |
| HTTP invocation | `OPENSEABRI_API_KEY` | Staging API client | `GET /api/seabri/registry-snapshot` | Authenticated response includes sanitized snapshot hash | Secrets in response | status, request id, snapshot hash | Revoke API key |
| WebSocket/canvas | `SEABRI_WS_TOKEN`, `OPENSEABRI_CANVAS_WS_TOKEN` | Staging browser/client | Connect with valid token, send `/status` | Valid token accepted; invalid/missing token rejected | Tokenless production connection | close code, auth result | Disable WS listener or rotate token |

## Approval Record

Before any live execution, record:

- Operator name
- Provider/channel
- Approved destination
- Test input
- Maximum expected cost
- Start time and rollback owner


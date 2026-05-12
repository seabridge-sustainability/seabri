# OpenSeaBri Live Provider Validation Execution

Status: approval required. This document does not authorize live execution.

Hard rule: no live-provider execution is allowed unless the operator explicitly approves that provider validation step in writing.

Required approval phrase:

```text
I approve OpenSeaBri live validation for <provider> using only <approved target> on <date>.
```

## Common Controls

- Keep `OPENSEABRI_CHANNELS_ENABLED` limited to the single provider under test.
- Keep test-mode allowlists active unless the approval explicitly states otherwise.
- Record evidence through `POST /api/seabri/admin/provider-validation-evidence`.
- Do not test against real customers, emergency services, or third parties.
- Roll back by clearing `OPENSEABRI_CHANNELS_ENABLED` and setting `OPENSEABRI_LIVE_PROVIDER_APPROVED=false`.

## Telegram

- Required credentials: `TELEGRAM_TOKEN`
- Approved target: test bot chat ID label only
- Test payload: `OpenSeaBri provider validation test. No action required.`
- Expected result: one inbound/outbound test exchange in approved chat only
- Evidence: provider `telegram`, mode `test_mode` or `live_approved`, target label, pass/fail summary
- Rollback: revoke bot token or disable `telegram` in channel allowlist
- Cost/risk: message privacy and unintended polling

## WhatsApp

- Required credentials: `WHATSAPP_PROVIDER=cloud`, `WHATSAPP_CLOUD_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`
- Approved target: sandbox/test WhatsApp number label
- Test payload: `OpenSeaBri WhatsApp validation test.`
- Expected result: webhook verifies and routes only the test message
- Evidence: provider `whatsapp`, webhook status, no secret values
- Rollback: remove `whatsapp` from channel allowlist, revoke token if needed
- Cost/risk: messaging fees and customer-contact risk

## SMS

- Required credentials: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`
- Approved target: allowlisted test number only
- Test payload: `OpenSeaBri SMS validation test.`
- Expected result: test-mode allowlist permits only approved number
- Evidence: provider `twilio_sms`, target label, provider reference redacted
- Rollback: remove `sms`, disable messaging, rotate Twilio auth token
- Cost/risk: paid SMS and accidental third-party contact

## Voice

- Required credentials: Twilio credentials plus voice webhook/TwiML URLs
- Approved target: allowlisted test number only
- Test payload: short scripted validation call
- Expected result: call preparation and approved test call only
- Evidence: provider `twilio_voice`, redacted reference, action approval record
- Rollback: remove `voice`, disable calls, rotate Twilio auth token
- Cost/risk: paid call, privacy, and accidental third-party contact

## LLM

- Required credentials: approved LLM provider key
- Approved target: test prompt only
- Test payload: `Summarize this sentence in one sentence: OpenSeaBri live validation.`
- Expected result: one response, no uploaded private data
- Evidence: provider `llm`, model/provider label, cost estimate
- Rollback: disable live LLM mode, revoke key if leaked
- Cost/risk: paid inference and prompt data exposure

## Vision

- Required credentials: approved vision provider key or local vision endpoint
- Approved target: non-private test image
- Test payload: staged image with no faces/private documents
- Expected result: safe image-aware response without fake certainty
- Evidence: provider `vision`, source label, no raw image stored in evidence
- Rollback: disable vision live mode, revoke key if needed
- Cost/risk: paid inference and image privacy

## Local Resource Search

- Required credentials: approved search provider key or configured local resource file
- Approved target: test ZIP/location
- Test payload: plumber/water mitigation search for approved test location
- Expected result: sourced results or explicit fallback; no invented contacts
- Evidence: provider `local_resource_search`, source status and confidence
- Rollback: disable live search mode, fall back to configured fixture
- Cost/risk: paid search calls and source quality

# Action Coordination Plan

**Date:** 2026-05-03  
**Purpose:** Document the full design for SeaBri's human-in-the-loop action layer — what actions can be taken, how approval is requested and logged, and how actions are executed.

---

## Current State

- **Outbound calls** via Twilio: fully implemented (`gateway/seabri/outbound.ts`)
- **Approval flow**: fully implemented (`gateway/seabri/approval.ts`)
- **Telegram**: full approval intercept implemented
- **WhatsApp/SMS/Discord/Slack**: approval flow not wired up (scaffold)
- **Action kinds**: only `outbound_call` and `general` are classified

---

## Action Taxonomy

| Kind | Description | Current | Sprint |
|------|-------------|---------|--------|
| `outbound_call` | AI-initiated phone call to a number extracted from card | ✅ Live | — |
| `send_email` | Email to insurer, contractor, or government agency | 🔧 | Sprint 2 |
| `schedule_appointment` | Calendly/Google Calendar slot booking | 🔧 | Sprint 3 |
| `submit_claim` | API POST to insurance portal | 🔧 | Future |
| `notify_emergency` | 911 or emergency services alert | 🔧 | Sprint 3 |
| `document_damage` | Create timestamped damage report and store | 🔧 | Sprint 2 |
| `general` | Any other confirmed action | ✅ Live | — |

---

## Approval State Machine

```
          ┌─────────────────────────────────────────┐
          │                                         │
User msg ─┤                                         ├─ Response delivered
          │   AI generates response                 │
          │                                         │
          │   extractActionCard(response)            │
          │       │                                 │
          │       ├─ null → no action card          │
          │       └─ card → pendingApproval set     │
          │                                         │
          └─────────────────────────────────────────┘
                          │ (next message)
                          ▼
                  ┌────────────────┐
                  │ pendingApproval│
                  │ still valid?   │
                  └───────┬────────┘
                     no   │   yes
                     ↓    │    ↓
                 clear   isApproval(text)?
                 state       │
                             ├─ yes → logConsent(true) → executeAction()
                             └─ no → isDenial(text)?
                                         │
                                         ├─ yes → logConsent(false) → cancel
                                         └─ no → clear state (unrelated msg)
```

---

## Action Card Format

The AI is instructed to emit action cards matching this pattern:
```
I will [ACTION DESCRIPTION]. [RECIPIENT/TARGET details].
Confirm? Reply YES or NO.
```

Example cards:
```
I will call your insurer at +1 (555) 867-5309 to report roof damage.
Confirm? Reply YES or NO.

I will send an email to your contractor John Smith (john@repairs.com) requesting an estimate.
Confirm? Reply YES or NO.
```

`extractActionCard()` detects the `Confirm? Reply YES` sentinel.

---

## Approval Wiring per Channel

### Telegram (✅ Done)
Full approval intercept in `channels/telegram.ts:224-263`.

### WhatsApp (Sprint 2)
- Same logic as Telegram in `channels/whatsapp.ts`
- WhatsApp supports quick-reply buttons — use instead of YES/NO text
```typescript
// Send with buttons:
const body = card + '\nConfirm?'
const persistentButtons = ['YES ✅', 'NO ❌']
// Twilio WhatsApp: use List Message or Quick Reply template
```

### SMS (Sprint 1 — text only)
```typescript
// channels/sms.ts — simple text check
if (userState.pendingApproval) {
  if (/^yes$/i.test(text)) { /* approve */ }
  if (/^no$/i.test(text)) { /* deny */ }
}
```

### Discord / Slack (Sprint 3)
Use reaction-based approval: bot posts card with ✅/❌ reactions; listen for reaction events.

---

## Action Execution Registry

```typescript
// gateway/seabri/action-executor.ts

export interface ActionExecutor {
  kind: ActionKind
  execute(card: string, userId: string, state: ChannelState): Promise<ExecutionResult>
}

export const ACTION_EXECUTORS: ActionExecutor[] = [
  {
    kind: 'outbound_call',
    execute: async (card, userId) => {
      const toNumber = extractPhoneNumber(card)
      if (!toNumber) return { ok: false, error: 'No phone number found' }
      return initiateOutboundCall({ toNumber, message: card, userId })
    },
  },
  {
    kind: 'send_email',
    execute: async (card, userId) => {
      const email = extractEmail(card)
      if (!email) return { ok: false, error: 'No email address found' }
      return sendActionEmail({ to: email, body: card, userId })
    },
  },
  // ... other executors
]
```

---

## Consent Log Schema

`WORKSPACE_DIR/consent.jsonl` — one JSON record per line:

```json
{
  "timestamp": "2026-05-03T12:34:56.789Z",
  "userId": "telegram:12345678",
  "card": "I will call your insurer at +1 (555) 867-5309...",
  "approved": true,
  "kind": "outbound_call",
  "result": { "ok": true, "callSid": "CA123abc" }
}
```

---

## Sprint 1 Scope

- Wire approval flow into WhatsApp + SMS text channels
- Add `'send_email'` to `detectActionKind()` patterns
- Add `send_email` executor stub (returns `{ ok: false, error: 'not yet implemented' }`)
- Tests for multi-channel approval state

---

## Hard Rules

1. **No action without explicit YES** — `isApproval()` must return true
2. **No action after TTL expiry** — `Date.now() > pendingApproval.expiresAt` clears state
3. **All consents logged** — `logConsent()` called before any action execution
4. **One pending action at a time per user** — new action card replaces previous (with warning)
5. **Emergency services** (`notify_emergency`) requires double confirmation: YES + confirmation code

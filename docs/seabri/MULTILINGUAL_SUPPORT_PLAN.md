# Multilingual Support Plan

**Date:** 2026-05-03  
**Current state:** All UI strings hardcoded in English; Claude models handle multi-language naturally but without explicit routing.

---

## Problem

Users who write in Spanish, French, Arabic, Portuguese, etc. receive:
1. English system prompts (the agents don't adapt their language instructions)
2. English error messages (`⛔ Access denied by policy.`, `⏱ The pending action expired.`)
3. English slash command responses (`/start`, `/agents`, `/status`)
4. English welcome text

The models themselves respond in the user's language by default, but the surrounding shell is English-only.

---

## Target Behavior

1. **Language detection** on first message from a user → store detected locale in `UserState`
2. **System prompt localization** — inject `[LANG: es]` tag so agent knows to respond in Spanish
3. **UI string localization** — all `safeSend()` calls use a locale-aware message catalog
4. **Locale persistence** — stored in `UserState.locale` (session) and optionally in policy/pairing store (cross-session)
5. **Manual override** — `/lang es` slash command

---

## Implementation

### Language Detection

```typescript
// gateway/seabri/lang.ts

const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'pt', 'ar', 'de', 'zh', 'ja', 'ko', 'hi'] as const
export type Locale = typeof SUPPORTED_LOCALES[number]

export function detectLocale(text: string): Locale {
  // Fast heuristic: Unicode script detection for non-Latin scripts
  if (/[؀-ۿ]/.test(text)) return 'ar'   // Arabic
  if (/[一-鿿]/.test(text)) return 'zh'   // Chinese
  if (/[぀-ヿ]/.test(text)) return 'ja'   // Japanese/Hiragana/Katakana
  if (/[가-힯]/.test(text)) return 'ko'   // Korean
  if (/[ऀ-ॿ]/.test(text)) return 'hi'   // Devanagari/Hindi

  // Latin-script languages: use nanobot langdetect MCP tool if available
  // otherwise return 'en' as safe default
  return 'en'
}
```

With nanobot MCP adapter (Sprint 1+):
```typescript
export async function detectLocaleWithMcp(text: string, mcpClient: McpClient): Promise<Locale> {
  const result = await mcpClient.callTool('langdetect', { text })
  return SUPPORTED_LOCALES.includes(result.lang) ? result.lang : 'en'
}
```

### Message Catalog

```typescript
// gateway/seabri/i18n.ts

type MessageKey =
  | 'access_denied'
  | 'approval_expired'
  | 'action_cancelled'
  | 'call_placing'
  | 'call_success'
  | 'call_failed'
  | 'welcome'
  | 'paired_success'
  | 'pairing_required'
  | 'attachment_failed'
  | 'something_went_wrong'

const MESSAGES: Record<MessageKey, Record<Locale, string>> = {
  access_denied: {
    en: '⛔ Access denied by policy.',
    es: '⛔ Acceso denegado por política.',
    fr: '⛔ Accès refusé par la politique.',
    pt: '⛔ Acesso negado pela política.',
    ar: '⛔ تم رفض الوصول بموجب السياسة.',
    // ... other locales
  },
  // ... other messages
}

export function t(key: MessageKey, locale: Locale = 'en'): string {
  return MESSAGES[key][locale] ?? MESSAGES[key]['en']
}
```

### UserState Extension

```typescript
// gateway/channels/shared_commands.ts
export interface ChannelState {
  agentId: string
  history: Array<{ role: string; content: string }>
  personalityId: string | null
  thinkMode: boolean
  pendingApproval?: PendingAction
  locale: Locale  // NEW
}
```

### System Prompt Injection

In `gateway/agents/router.ts` (or equivalent):
```typescript
const localeTag = state.locale !== 'en' ? `\n[LANG: ${state.locale}] Respond in the user's language.` : ''
const systemPrompt = agent.getSystemPrompt() + localeTag
```

### Slash Command

```
/lang <code>   — set preferred language (en, es, fr, pt, ar, de, zh, ja, ko, hi)
```

---

## Locale Coverage Plan

| Phase | Locales | Notes |
|-------|---------|-------|
| Sprint 1 | Script detection (ar, zh, ja, ko, hi) | Fast, no MCP needed |
| Sprint 1 | nanobot langdetect for Latin scripts | Requires MCP adapter |
| Sprint 2 | Full message catalog (10 locales) | Translation via gbrain `translate` |
| Sprint 3 | RTL layout for Arabic | Telegram supports RTL naturally |

---

## Testing

Each language detection path has a unit test in `gateway/seabri/lang.test.ts`:
- Arabic Unicode range → 'ar'
- Chinese Unicode range → 'zh'
- nanobot MCP fallback → locale from mock
- Unknown text → 'en' default
- `/lang es` command → state.locale = 'es'

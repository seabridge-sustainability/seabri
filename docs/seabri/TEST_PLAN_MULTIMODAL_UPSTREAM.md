# Test Plan: Multimodal & Upstream Integration

**Date:** 2026-05-03  
**Scope:** Sprint 1 + Sprint 2 capabilities; all new modules introduced by coordinator plan.

---

## Test Structure

All tests use Vitest. Run from `openseabri/` root:

```bash
npx vitest run                    # all tests
npx vitest run gateway/seabri/    # seabri modules only
npx vitest run --reporter=verbose # verbose output
```

---

## Module Test Files

| Module | Test File | Sprint |
|--------|-----------|--------|
| `seabri/lang.ts` | `seabri/lang.test.ts` | Sprint 1 |
| `seabri/capability-registry.ts` | `seabri/capability-registry.test.ts` | Sprint 1 |
| `types/message.ts` (NormalizedMessage) | `types/message.test.ts` | Sprint 1 |
| `orchestrator/model-registry.ts` | `orchestrator/model-registry.test.ts` | Sprint 1 |
| `seabri/address-extractor.ts` | `seabri/address-extractor.test.ts` | Sprint 2 |
| `seabri/geocoder.ts` | `seabri/geocoder.test.ts` | Sprint 2 |
| `seabri/gap-detector.ts` | `seabri/gap-detector.test.ts` | Sprint 2 |
| `mcp/client.ts` | `mcp/client.test.ts` | Sprint 1 |
| `channels/telegram.integration.test.ts` | (existing) | Done |
| `seabri/agent-registry.test.ts` | (existing) | Done |
| `seabri/modes.test.ts` | (existing) | Done |

---

## Test Specifications

### `seabri/lang.test.ts`

```typescript
describe('detectLocale', () => {
  it('Arabic script → ar', () => expect(detectLocale('مرحبا')).toBe('ar'))
  it('Chinese hanzi → zh', () => expect(detectLocale('你好')).toBe('zh'))
  it('Japanese kana → ja', () => expect(detectLocale('こんにちは')).toBe('ja'))
  it('Korean hangul → ko', () => expect(detectLocale('안녕하세요')).toBe('ko'))
  it('Hindi devanagari → hi', () => expect(detectLocale('नमस्ते')).toBe('hi'))
  it('Latin text → en (default)', () => expect(detectLocale('Hello')).toBe('en'))
  it('Empty string → en', () => expect(detectLocale('')).toBe('en'))
})

describe('t() message catalog', () => {
  it('en access_denied matches expected string', () => {
    expect(t('access_denied', 'en')).toContain('Access denied')
  })
  it('es access_denied is different from en', () => {
    expect(t('access_denied', 'es')).not.toBe(t('access_denied', 'en'))
  })
  it('unknown locale falls back to en', () => {
    expect(t('access_denied', 'xx' as Locale)).toBe(t('access_denied', 'en'))
  })
})
```

### `seabri/capability-registry.test.ts`

```typescript
describe('CapabilityRegistry', () => {
  it('telegram channel has supportsImage=true', () => {
    const reg = buildCapabilityRegistry()
    const tg = reg.channels.find(c => c.channelId === 'telegram')
    expect(tg?.supportsImage).toBe(true)
  })
  it('sms channel has supportsImage=false', () => {
    const sms = buildCapabilityRegistry().channels.find(c => c.channelId === 'sms')
    expect(sms?.supportsImage).toBe(false)
  })
  it('resolveCapabilityGap returns fallback for sms+image', () => {
    const reg = buildCapabilityRegistry()
    const smsChannel = reg.channels.find(c => c.channelId === 'sms')!
    const msg = { attachment: { type: 'image' } } as NormalizedMessage
    const gap = resolveCapabilityGap(smsChannel, msg)
    expect(gap.canHandle).toBe(false)
    expect(gap.fallbackText).toContain('describe')
  })
  it('resolveCapabilityGap returns canHandle=true for telegram+image', () => {
    const tgChannel = buildCapabilityRegistry().channels.find(c => c.channelId === 'telegram')!
    const msg = { attachment: { type: 'image' } } as NormalizedMessage
    expect(resolveCapabilityGap(tgChannel, msg).canHandle).toBe(true)
  })
})
```

### `orchestrator/model-registry.test.ts`

```typescript
describe('MODEL_REGISTRY', () => {
  it('has at least one entry per provider', () => {
    const providers = new Set(MODEL_REGISTRY.map(m => m.provider))
    expect(providers.has('anthropic')).toBe(true)
  })
  it('all entries have required env key defined', () => {
    MODEL_REGISTRY.forEach(m => {
      expect(m.envKey).toBeTruthy()
    })
  })
  it('selectProvider filters to available models', () => {
    process.env.ANTHROPIC_API_KEY = 'test'
    delete process.env.GOOGLE_API_KEY
    const candidates = selectProvider({ mode: 'general_sustainability' } as NormalizedMessage, 'general')
    expect(candidates.every(m => m.provider !== 'google')).toBe(true)
  })
  it('vision message filtered to vision-capable models only', () => {
    const msg = { attachment: { type: 'image' } } as NormalizedMessage
    const candidates = selectProvider(msg, 'general')
    expect(candidates.every(m => m.supportsVision)).toBe(true)
  })
})
```

### `seabri/address-extractor.test.ts`

```typescript
describe('extractAddress', () => {
  it('extracts US address with zip', () => {
    expect(extractAddress('What is the flood risk at 123 Main St, Miami, FL 33101?'))
      .toBe('123 Main St, Miami, FL 33101')
  })
  it('extracts address without zip', () => {
    expect(extractAddress('damage at 45 Oak Avenue London')).toBeTruthy()
  })
  it('returns null when no address present', () => {
    expect(extractAddress('what is the weather today')).toBeNull()
  })
  it('handles Avenue abbreviation', () => {
    expect(extractAddress('123 Oak Ave, Chicago IL')).toBeTruthy()
  })
})
```

### `mcp/client.test.ts`

```typescript
describe('McpClient', () => {
  it('resolves tool call to mock result', async () => {
    const client = new McpClient({ id: 'mock', command: 'echo', args: ['{}'], tools: ['test'] })
    vi.spyOn(client, 'callTool').mockResolvedValue({ result: 'en' })
    const result = await client.callTool('langdetect', { text: 'Hello' })
    expect(result.result).toBe('en')
  })
  it('lazy init: server not spawned until first callTool', () => {
    const client = new McpClient({ id: 'lazy', command: 'echo', args: [], tools: [] })
    expect(client.isRunning()).toBe(false)
  })
})
```

---

## Integration Test Coverage (Existing)

| Test File | Tests | Coverage |
|-----------|-------|---------|
| `channels/telegram.integration.test.ts` | 7 | Attachment handling, approval flow |
| `seabri/agent-registry.test.ts` | 8 | Registry CRUD, 15 built-in agents |
| `seabri/modes.test.ts` | (per prev session) | classifyMode priority, audio/image/agentId/keyword |

---

## Test Pyramid Target

```
Unit tests (fast, isolated):     70% — modes, lang, extractor, registry, model-router
Integration tests (mocked deps): 25% — channel handlers, approval flow, bridge calls
E2E tests (live channels):        5% — manual smoke test only (no CI)
```

---

## CI Configuration

Tests run on every push via:
```yaml
# .github/workflows/test.yml (existing)
- name: Run Vitest
  run: cd openseabri && npx vitest run
```

Coverage threshold: 80% per file for all new Sprint 1 modules.

# Target Capability Registry

**Date:** 2026-05-03  
**Purpose:** Runtime-queryable registry of all SeaBri capabilities, channels, and their current status.

---

## Design

The capability registry is a runtime data structure (not just docs) that:
1. Enumerates all channel capabilities (can this channel receive images? send audio?)
2. Enumerates all agent capabilities (what tasks can this agent handle?)
3. Enables the router to match incoming messages to the best agent + channel handler
4. Can be queried via `/api/seabri/capabilities` (GET)

---

## Channel Capability Matrix (Target State)

| Channel | Text | Image | Audio | Video | PDF | Location | Buttons | Status |
|---------|------|-------|-------|-------|-----|----------|---------|--------|
| Telegram | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Live |
| WhatsApp | ✅ | ⚠️ webhook only | ⚠️ webhook only | ⚠️ webhook only | ⚠️ webhook only | ✅ | ✅ | Partial |
| SMS | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Live (text only) |
| Discord | ✅ | 🔧 | 🔧 | 🔧 | 🔧 | ❌ | ✅ | Scaffold |
| Slack | ✅ | 🔧 | 🔧 | 🔧 | 🔧 | ❌ | ✅ | Scaffold |
| CLI | ✅ | ❌ | ❌ | ❌ | 🔧 | ❌ | ❌ | Live |
| Email* | 🔧 | 🔧 | 🔧 | ❌ | 🔧 | ❌ | ❌ | Not started |
| Teams* | 🔧 | 🔧 | 🔧 | ❌ | 🔧 | ❌ | ✅ | Not started |

✅ = working | ⚠️ = wired but incomplete | 🔧 = planned | ❌ = not applicable | * = future sprint

---

## Agent Capability Registry (Current 15 Built-in Agents)

```typescript
// gateway/seabri/capability-registry.ts

export interface ChannelCapabilities {
  channelId: string
  supportsText: boolean
  supportsImage: boolean
  supportsAudio: boolean
  supportsVideo: boolean
  supportsPdf: boolean
  supportsLocation: boolean
  supportsButtons: boolean
  supportsApprovalFlow: boolean
  status: 'live' | 'partial' | 'scaffold' | 'planned'
}

export interface AgentCapability {
  agentId: string
  capabilities: string[]
  preferredModes: ResponseMode[]
  requiresAttachment: boolean
  supportsApprovalActions: boolean
}

export interface CapabilityRegistry {
  channels: ChannelCapabilities[]
  agents: AgentCapability[]
  version: string
  lastUpdated: string
}
```

---

## Agent Capability Table (Target)

| Agent ID | Capabilities | Preferred Modes | Approval Actions |
|----------|-------------|-----------------|-----------------|
| general | general-sustainability | general_sustainability | No |
| climate-risk | climate-risk-analysis | property_risk | No |
| property-climate-risk | climate-risk-analysis, property-risk | property_risk | No |
| sustainability-reporting | reporting, esg | general_sustainability | No |
| investment-screening | investment, esg | general_sustainability | No |
| insurance-navigator | insurance | insurance | Yes (contact insurer) |
| damage-documentation | photo_damage | photo_damage | Yes (document) |
| contractor-coordination | action_coordination | action_coordination | Yes (outbound_call) |
| emergency-resilience | incident | incident | Yes (emergency contact) |
| home-energy-advice | energy | general_sustainability | No |
| esg-materiality | materiality, esg | general_sustainability | No |
| decarbonization | decarbonization | general_sustainability | No |
| nature-capital | nature | general_sustainability | No |
| supply-chain-esg | supply-chain | general_sustainability | No |
| regulatory-compliance | regulatory | general_sustainability | No |
| carbon-markets | carbon | general_sustainability | No |

---

## Capability Gap Resolver

The capability gap resolver automatically detects when an incoming message requires a capability the current channel lacks, and either:
1. Requests the missing media via text prompt ("Please describe the image you wanted to share")
2. Redirects to a capable channel ("For image analysis, please use Telegram or WhatsApp")
3. Degrades gracefully with a fallback context block

Implementation: `gateway/seabri/capability-gap-resolver.ts` (Sprint 1)

```typescript
export function resolveCapabilityGap(
  channel: ChannelCapabilities,
  message: NormalizedMessage
): GapResolution {
  // Returns: { canHandle: boolean, fallbackText?: string, redirectChannel?: string }
}
```

---

## API Endpoint (Sprint 1)

`GET /api/seabri/capabilities`

```json
{
  "version": "1.0.0",
  "lastUpdated": "2026-05-03T00:00:00Z",
  "channels": [...],
  "agents": [...],
  "gaps": [
    { "channel": "whatsapp", "missing": ["image", "audio", "video"], "sprint": 2 }
  ]
}
```

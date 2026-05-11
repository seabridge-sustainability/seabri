# Location & Property Intelligence Plan

**Date:** 2026-05-03  
**Purpose:** Enable SeaBri to receive location data from messaging channels and route it to the SeaBridgeAI backend for property risk analysis.

---

## Current State

- Telegram supports `location` message type (lat/lng) but SeaBri ignores it
- No geocoding pipeline
- No property address extraction from free text
- Backend has `GET /api/v1/openseabri/climate-risk?address=...` and climate risk scoring

---

## Target Flow

```
User: "What's the risk at my address?" / sends GPS pin / types "123 Main St, Miami FL"
    │
    ▼
Location Extractor
    ├── Telegram location message → { lat, lng }
    ├── GPS coordinates in text → regex extract
    ├── Street address in text → pass to geocoder
    └── "my address" → prompt user for address
    │
    ▼
Geocoder (Google Maps API or OpenStreetMap Nominatim)
    │ address → { lat, lng, formattedAddress, city, state, country }
    │
    ▼
SeaBridgeAI Backend Bridge
    │ GET /api/v1/openseabri/climate-risk?address={formattedAddress}
    │ Returns: { floodRisk, wildfireRisk, earthquakeRisk, hurricaneRisk, overallTier }
    │
    ▼
Property Risk Agent (agentId: 'property-climate-risk')
    │ System context: [PROPERTY: 123 Main St, Miami FL | FLOOD: HIGH | HURRICANE: EXTREME]
    │
    ▼
Response to user (mode: property_risk)
```

---

## Telegram Location Handling

```typescript
// Add to TelegramMessage interface in channels/telegram.ts
interface TelegramLocation {
  latitude: number
  longitude: number
  horizontal_accuracy?: number
}

interface TelegramMessage {
  // ... existing fields ...
  location?: TelegramLocation
}

// In bot.on('message') handler — add before attachment section:
if (msg.location) {
  const { latitude, longitude } = msg.location
  const geocoded = await geocodeCoordinates(latitude, longitude)
  attachmentContext = `[LOCATION: ${geocoded.formattedAddress} | ${latitude},${longitude}]`
  // Route to property-climate-risk agent
  if (state.agentId === 'general') {
    state.agentId = 'property-climate-risk'
  }
}
```

---

## Geocoding Module

```typescript
// gateway/seabri/geocoder.ts

export interface GeocodeResult {
  formattedAddress: string
  lat: number
  lng: number
  city: string
  state: string
  country: string
  postalCode: string
}

export async function geocodeCoordinates(lat: number, lng: number): Promise<GeocodeResult> {
  // Try Google Maps reverse geocode first (if GOOGLE_MAPS_KEY set)
  if (process.env.GOOGLE_MAPS_KEY) {
    return geocodeWithGoogle(lat, lng)
  }
  // Fallback to Nominatim (free, no key required)
  return geocodeWithNominatim(lat, lng)
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (process.env.GOOGLE_MAPS_KEY) {
    return forwardGeocodeWithGoogle(address)
  }
  return forwardGeocodeWithNominatim(address)
}
```

---

## Address Extraction from Free Text

```typescript
// gateway/seabri/address-extractor.ts

// Patterns: "123 Main St, Miami, FL 33101" or "at 45 Oak Avenue London"
const ADDRESS_PATTERNS = [
  /\b(\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct|Place|Pl)\b[,\s]+[\w\s,]+\d{5}(?:-\d{4})?)/i,
  /\b(\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct|Place|Pl)\b[,\s]+[\w\s,]+)/i,
]

export function extractAddress(text: string): string | null {
  for (const pattern of ADDRESS_PATTERNS) {
    const match = text.match(pattern)
    if (match) return match[1].trim()
  }
  return null
}
```

---

## Backend Bridge Integration

The existing `gateway/bridge/agent_bridge.ts` already calls the SeaBridgeAI backend. Extend with:

```typescript
export async function getPropertyRisk(address: string): Promise<PropertyRiskContext | null> {
  try {
    const url = `${SEABRIDGE_API_URL}/api/v1/openseabri/climate-risk?address=${encodeURIComponent(address)}`
    const resp = await fetch(url, { headers: { 'X-API-Key': SEABRIDGE_API_KEY } })
    if (!resp.ok) return null
    return await resp.json()
  } catch {
    return null
  }
}
```

---

## Environment Variables (new)

```env
GOOGLE_MAPS_KEY=          # enables Google Maps geocoding (optional; Nominatim is free fallback)
```

---

## Sprint Scope

**Sprint 1:** Address extraction from free text → backend bridge call  
**Sprint 2:** Telegram location pin handling → geocode → bridge  
**Sprint 2:** WhatsApp location sharing (included in WhatsApp media upgrade)  
**Sprint 3:** Property risk context cards with visual risk scores

---

## Test Cases

1. Text "What is the flood risk at 123 Main St Miami FL" → extractAddress returns address → bridge call fires
2. Telegram location pin → geocodeCoordinates → formattedAddress in context
3. No GOOGLE_MAPS_KEY → Nominatim fallback used
4. Backend unavailable → graceful null return → agent answers from training data
5. Address not found → agent prompts user for clarification

export type PilotWorkflow =
  | 'profile'
  | 'incident'
  | 'comparison'
  | 'compute'
  | 'resource'
  | 'action'
  | 'carbon'
  | 'energy'
  | 'community'
  | 'certification'
  | 'offset'
  | 'purchasing'
  | 'resilience'
  | 'catalog'

export interface PilotProfile {
  userId: string
  channel: 'web'
  name: string
  address: string
  city: string
  state: string
  zip: string
  phone: string
  preferredLanguage: string
}

export interface PilotActivity {
  id: string
  workflow: PilotWorkflow
  title: string
  detail: string
  timestamp: string
}

export interface PilotState {
  profile: PilotProfile
  activity: PilotActivity[]
  lastIncident?: string
  lastActionPlan?: string
  lastComparison?: string
  lastCompute?: string
  lastCarbon?: string
  lastEnergy?: string
  lastCommunity?: string
  lastCertification?: string
  lastOffset?: string
  lastPurchasing?: string
  lastResilience?: string
  lastCatalog?: string
}

export const emptyPilotProfile = (): PilotProfile => ({
  userId: 'pilot-web-user',
  channel: 'web',
  name: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  phone: '',
  preferredLanguage: 'English',
})

export const emptyPilotState = (): PilotState => ({
  profile: emptyPilotProfile(),
  activity: [],
})

export function isProfileReady(profile: PilotProfile): boolean {
  return Boolean(
    profile.name.trim()
    && profile.address.trim()
    && profile.zip.trim()
    && profile.phone.trim()
    && profile.preferredLanguage.trim(),
  )
}

const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/g
const ADDRESS_RE = /\b\d{1,6}\s+[A-Za-z0-9.' -]{2,60}\s+(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Blvd|Boulevard|Ln|Lane|Way|Ct|Court|Pl|Place)\b/gi
const ZIP_RE = /\b\d{5}(?:-\d{4})?\b/g

export function sanitizePilotDetail(detail: string): string {
  return detail
    .replace(PHONE_RE, '[phone redacted]')
    .replace(ADDRESS_RE, '[address redacted]')
    .replace(ZIP_RE, '[zip redacted]')
}

export function addPilotActivity(
  state: PilotState,
  activity: Omit<PilotActivity, 'id' | 'timestamp'>,
): PilotState {
  const entry: PilotActivity = {
    ...activity,
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    detail: sanitizePilotDetail(activity.detail),
  }
  return {
    ...state,
    activity: [entry, ...state.activity].slice(0, 12),
  }
}

export function buildProfileLocation(profile: PilotProfile): string {
  return [profile.address, profile.city, profile.state, profile.zip].filter(Boolean).join(', ')
}

export function profilePayload(profile: PilotProfile): Record<string, string> {
  return {
    userId: profile.userId,
    channel: profile.channel,
    name: profile.name.trim(),
    address: profile.address.trim(),
    city: profile.city.trim(),
    state: profile.state.trim(),
    zip: profile.zip.trim(),
    phone: profile.phone.trim(),
    preferredLanguage: profile.preferredLanguage.trim(),
  }
}

export function pilotIncidentPrompt(incident: string, mediaName?: string): string {
  const media = mediaName ? ` I have uploaded or can reference ${mediaName}.` : ''
  return `${incident}.${media}`.trim()
}

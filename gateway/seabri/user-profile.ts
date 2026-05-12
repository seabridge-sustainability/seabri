import { readFile, writeFile, mkdir } from 'fs/promises'
import { resolve } from 'path'
import { WORKSPACE_DIR } from '../config.js'
import { resolvePersistenceAdapter } from '../persistence/adapter.js'
import { DatabaseProfileStore, type ProfileStore as DatabaseProfileStoreContract } from '../persistence/database-stores.js'

export interface UserProfile {
  userId: string
  channel: string
  name?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  phone?: string
  preferredLanguage?: string
  emergencyContact?: string
  /** Free-form: pets, children, elderly residents, mobility/accessibility needs */
  householdNotes?: string
  propertyType?: 'single_family' | 'condo' | 'apartment' | 'mobile_home' | 'commercial' | 'other'
  createdAt: string
  updatedAt: string
}

const PROFILES_FILE = resolve(WORKSPACE_DIR, 'user-profiles.json')

type ProfileStore = Record<string, UserProfile>

let _cache: ProfileStore | null = null

async function load(): Promise<ProfileStore> {
  if (_cache) return _cache
  try {
    const text = await readFile(PROFILES_FILE, 'utf-8')
    _cache = JSON.parse(text) as ProfileStore
  } catch {
    _cache = {}
  }
  return _cache
}

async function persist(store: ProfileStore): Promise<void> {
  await mkdir(WORKSPACE_DIR, { recursive: true })
  await writeFile(PROFILES_FILE, JSON.stringify(store, null, 2), 'utf-8')
}

function key(userId: string, channel: string): string {
  return `${channel}:${userId}`
}

let dbProfileStore: DatabaseProfileStoreContract | null = null

function useDatabaseProfileStore(): boolean {
  return resolvePersistenceAdapter().kind === 'database'
}

function databaseStore(): DatabaseProfileStoreContract {
  dbProfileStore ??= new DatabaseProfileStore()
  return dbProfileStore
}

export async function getProfile(userId: string, channel: string): Promise<UserProfile | null> {
  if (useDatabaseProfileStore()) return databaseStore().get(userId, channel)
  const store = await load()
  return store[key(userId, channel)] ?? null
}

export async function upsertProfile(
  userId: string,
  channel: string,
  updates: Partial<Omit<UserProfile, 'userId' | 'channel' | 'createdAt'>>
): Promise<UserProfile> {
  if (useDatabaseProfileStore()) return databaseStore().upsert(userId, channel, updates)
  const store = await load()
  const k = key(userId, channel)
  const existing = store[k]
  const now = new Date().toISOString()
  const profile: UserProfile = existing
    ? { ...existing, ...updates, updatedAt: now }
    : { userId, channel, ...updates, createdAt: now, updatedAt: now }
  store[k] = profile
  _cache = store
  await persist(store)
  return profile
}

export async function deleteProfile(userId: string, channel: string): Promise<boolean> {
  if (useDatabaseProfileStore()) return databaseStore().delete(userId, channel)
  const store = await load()
  const k = key(userId, channel)
  if (!(k in store)) return false
  delete store[k]
  _cache = store
  await persist(store)
  return true
}

export function isProfileComplete(p: UserProfile): boolean {
  return !!(p.name && p.address && p.city && p.zip && p.phone)
}

/** Inject into agent context so it can reference name, address, phone. */
export function formatProfileContext(p: UserProfile): string {
  const parts = ['[USER PROFILE]']
  if (p.name) parts.push(`Name: ${p.name}`)
  const addr = [p.address, p.city, p.state, p.zip].filter(Boolean).join(', ')
  if (addr) parts.push(`Location: ${addr}`)
  if (p.phone) parts.push(`Phone: ${p.phone}`)
  if (p.emergencyContact) parts.push(`Emergency contact: ${p.emergencyContact}`)
  if (p.householdNotes) parts.push(`Household: ${p.householdNotes}`)
  if (p.propertyType) parts.push(`Property type: ${p.propertyType}`)
  return parts.join('\n')
}

/** Display to user via /profile command. */
export function formatProfileDisplay(p: UserProfile): string {
  const lines: string[] = ['*Your profile*', '']
  if (p.name) lines.push(`Name: ${p.name}`)
  if (p.address) lines.push(`Address: ${p.address}`)
  if (p.city || p.state || p.zip) {
    lines.push(`City/State/ZIP: ${[p.city, p.state, p.zip].filter(Boolean).join(', ')}`)
  }
  if (p.phone) lines.push(`Phone: ${p.phone}`)
  if (p.preferredLanguage) lines.push(`Language: ${p.preferredLanguage}`)
  if (p.emergencyContact) lines.push(`Emergency contact: ${p.emergencyContact}`)
  if (p.householdNotes) lines.push(`Household notes: ${p.householdNotes}`)
  if (p.propertyType) lines.push(`Property type: ${p.propertyType}`)
  if (lines.length === 2) return '_No profile data yet. Use `/profile set name John Smith` to add details._'
  lines.push('')
  lines.push('Use `/profile set <field> <value>` to update. Fields: name, address, city, state, zip, phone, language, emergency, household, property')
  lines.push('Use `/profile delete` to remove all profile data.')
  return lines.join('\n')
}

/** The onboarding prompt shown in a first session. */
export const ONBOARDING_PROMPT = [
  "👋 Welcome to SeaBri! I'm your personal sustainability and resilience assistant.",
  '',
  "To help you best — especially in emergencies — I'd like to know a few things. You can skip any question.",
  '',
  '1. What\'s your name?',
  '2. What\'s your full address (street, city, state, ZIP)?',
  '3. What\'s the best phone number to reach you?',
  '',
  'Or reply `/skip` to come back to this later. You can always use `/profile` to view or update your info.',
].join('\n')

const US_STATE_NAMES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware',
  'Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky',
  'Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi',
  'Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico',
  'New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania',
  'Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
  'Virginia','Washington','West Virginia','Wisconsin','Wyoming',
]
const US_STATE_ABBR = 'AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY'

/** Extract profile fields from a free-text onboarding reply. Returns null if nothing useful found. */
export function parseOnboardingReply(
  text: string,
): Partial<Omit<UserProfile, 'userId' | 'channel' | 'createdAt'>> | null {
  if (!text.trim()) return null
  const result: Partial<Omit<UserProfile, 'userId' | 'channel' | 'createdAt'>> = {}

  // Phone
  const phoneMatch = text.match(/\b(\+?1?[\s\-.]?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4})\b/)
  if (phoneMatch) {
    const digits = phoneMatch[1].replace(/\D/g, '')
    result.phone = digits.length === 10 ? `+1${digits}` : digits.length === 11 ? `+${digits}` : phoneMatch[1]
  }

  // ZIP
  const zipMatch = text.match(/\b(\d{5})\b/)
  if (zipMatch) result.zip = zipMatch[1]

  // State (full name first, then abbreviation)
  for (const s of US_STATE_NAMES) {
    if (new RegExp(`\\b${s}\\b`, 'i').test(text)) { result.state = s; break }
  }
  if (!result.state) {
    const abbrMatch = text.match(new RegExp(`\\b(${US_STATE_ABBR})\\b`))
    if (abbrMatch) result.state = abbrMatch[1]
  }

  // Street address (number + words)
  const streetMatch = text.match(
    /\b(\d+\s+[A-Za-z][A-Za-z\s.'-]{3,40}?(?:St\.?|Ave\.?|Blvd\.?|Dr\.?|Rd\.?|Ln\.?|Way|Path|Ct\.?|Pl\.?|Cir\.?|Loop|Trail|Trl\.?|Pkwy)?)\b/i,
  )
  if (streetMatch) result.address = streetMatch[1].trim()

  // City: text just before the state name
  if (result.state) {
    const beforeState = text.split(new RegExp(result.state, 'i'))[0]
    const cityMatch = beforeState.match(/([A-Za-z][A-Za-z\s.'-]{1,28})\s*[,.]?\s*$/)
    if (cityMatch) {
      const city = cityMatch[1].trim().replace(/,+$/, '').trim()
      if (city.length >= 2) result.city = city
    }
  }

  // Name: first comma-segment that is all alpha words (2+ words)
  for (const seg of text.split(/[,\n]+/).map(s => s.trim())) {
    if (/^[A-Za-z][A-Za-z\s.'-]+$/.test(seg) && seg.split(/\s+/).length >= 2 && seg.length < 50) {
      result.name = seg
      break
    }
  }

  return Object.keys(result).length > 0 ? result : null
}

export const ONBOARDING_FIELDS_PROMPT = [
  "To provide the best help, I need a few details:",
  "• Your name",
  "• Full address (street, city, state, ZIP)",
  "• Phone number",
  "",
  "You can reply with all at once or `/skip` to continue without.",
].join('\n')

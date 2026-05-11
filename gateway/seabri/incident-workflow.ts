import { parseOnboardingReply, type UserProfile } from './user-profile.js'

export interface IncidentWorkflowInput {
  message: string
  history?: Array<{ role: string; content: string }>
  profile?: Partial<UserProfile> | null
}

export interface IncidentWorkflowResult {
  handled: boolean
  mode?: 'incident' | 'insurance_document' | 'photo_followup' | 'local_help' | 'action_preparation'
  response?: string
  profileUpdates?: Partial<UserProfile>
  telemetryEvent?: string
}

const INCIDENT_RE = /\b(flooding|flooded|water (?:is )?(?:coming|pouring|leaking|running)|bathroom is flooding|pipe burst|water damage|storm damage|sewer backup|sump|overflowing)\b/i
const INSURANCE_RE = /\b(policy|declarations?|coverage|deductible|insurer|adjuster|claim|sewer|sump|storm|flood exclusion|loss of use|coverage d)\b/i
const PHOTO_RE = /\b(photo|picture|image|see this|what do you see|damage|sent)\b/i
const LOCAL_HELP_RE = /\b(find|nearby|local|plumber|water mitigation|restoration|hotel|motel|city|public works|utility|who do i call)\b/i
const ACTION_RE = /\b(call|text|sms|send|message|contact)\b/i

function firstMatch(text: string, re: RegExp): string | undefined {
  return text.match(re)?.[1]?.trim()
}

function findLatestDocument(history: Array<{ role: string; content: string }> = [], message: string): string | null {
  const docs = history
    .map((h) => h.content)
    .reverse()
    .filter((c) => /\[(?:.*?POLICY|PDF|DOCUMENT|INSURANCE|DECLARATIONS).*?\]/i.test(c))
  return docs[0] ?? (/\[(?:.*?POLICY|PDF|DOCUMENT|INSURANCE|DECLARATIONS).*?\]/i.test(message) ? message : null)
}

function hasRecentMedia(history: Array<{ role: string; content: string }> = [], message: string): boolean {
  return [...history.map((h) => h.content), message].some((c) =>
    /\[(?:image|photo|file|voice|transcription|pdf|document)/i.test(c) || /photo attached|image attached/i.test(c),
  )
}

function profileFromHistory(history: Array<{ role: string; content: string }> = []): Partial<UserProfile> {
  const merged: Partial<UserProfile> = {}
  for (const item of history) {
    if (item.role !== 'user') continue
    const parsed = parseOnboardingReply(item.content)
    if (parsed) Object.assign(merged, parsed)
  }
  return merged
}

function resolveProfile(input: IncidentWorkflowInput): Partial<UserProfile> {
  const fromHistory = profileFromHistory(input.history)
  const fromMessage = cleanProfileUpdates(parseOnboardingReply(input.message) ?? {})
  return { ...fromHistory, ...(input.profile ?? {}), ...fromMessage }
}

function cleanProfileUpdates<T extends Partial<UserProfile> | undefined>(updates: T): T {
  if (updates?.name) {
    updates.name = updates.name.replace(/^(?:i am safe|i'm safe|safe)\.?\s*/i, '').trim()
  }
  return updates
}

function locationLabel(profile: Partial<UserProfile>): string | null {
  const parts = [profile.city, profile.state, profile.zip].filter(Boolean)
  if (parts.length > 0) return parts.join(', ')
  return profile.address ?? null
}

function missingProfileLine(profile: Partial<UserProfile>): string | null {
  if (!profile.name || !profile.address || !profile.zip || !profile.phone) {
    return 'Reply with your name, address/ZIP, and phone when you can.'
  }
  return null
}

function extractPolicyTerms(text: string): string[] {
  const terms: string[] = []
  const checks: Array<[RegExp, string]> = [
    [/water\s+backup|sewer/i, 'Water/sewer backup endorsement mentioned'],
    [/sump/i, 'Sump overflow language mentioned'],
    [/flood\s+(?:is\s+)?excluded|excludes?\s+flood/i, 'Flood exclusion appears present'],
    [/storm|wind/i, 'Storm/wind language mentioned'],
    [/coverage\s+d|loss\s+of\s+use|additional\s+living\s+expense/i, 'Loss of Use / Coverage D mentioned'],
    [/deductible/i, 'Deductible language mentioned'],
    [/mold/i, 'Mold limitation language mentioned'],
  ]
  for (const [re, label] of checks) {
    if (re.test(text)) terms.push(label)
  }
  return terms.length > 0 ? terms : ['No water/flood/sewer/sump/storm terms found in the available text']
}

function buildIncidentResponse(profile: Partial<UserProfile>): string {
  const missing = missingProfileLine(profile)
  const ask = missing ?? 'Are people, pets, and electricity safe right now?'
  return [
    'IMMEDIATE STEPS:',
    '1. Stop the water at the fixture or main shutoff.',
    '2. Stay out of standing water near outlets, breakers, or appliances.',
    '3. Take photos/video before cleanup, then move dry items away.',
    'DO NOT use electrical devices in wet areas or throw damaged items away yet.',
    'ACTION PLAN: Now: shutoff + photos. Next 2 hours: plumber/mitigation + insurer notice. Tonight: receipts + drying log.',
    `Question: ${ask}`,
  ].join('\n')
}

function buildInsuranceResponse(doc: string): string {
  const terms = extractPolicyTerms(doc)
  const questions = [
    'Does my policy cover sudden interior plumbing discharge?',
    'Is sewer/water backup endorsed, and what is the sublimit?',
    'Does Coverage D / Loss of Use pay for a hotel if the bathroom is unusable?',
    'What photos, invoices, and drying logs do you need before cleanup continues?',
  ]
  return [
    'POLICY CHECK:',
    ...terms.slice(0, 5).map((t) => `- ${t}`),
    'Likely claim path: sudden plumbing leak may differ from excluded outside flood.',
    'Ask the insurer:',
    ...questions.map((q) => `- ${q}`),
  ].join('\n')
}

function buildPhotoResponse(): string {
  return [
    'PHOTO FOLLOW-UP:',
    '- I will treat the latest photo/document in this conversation as the current damage evidence.',
    '- Capture wide room view, close-up source, wet floor/walls, damaged items, and serial/model numbers.',
    '- Put a tape measure or common object in one photo for scale.',
    'Use this insurer wording: "Active bathroom water loss with visible affected materials; mitigation needed to prevent mold."',
    'Question: is the water still actively flowing?',
  ].join('\n')
}

function buildLocalHelpResponse(profile: Partial<UserProfile>): string {
  const where = locationLabel(profile)
  if (!where) {
    return [
      'LOCAL HELP:',
      '- I need your city or ZIP before ranking nearby help.',
      '- I can look for plumbers, water mitigation, city/public works, and hotels.',
      'Question: what city or ZIP are you in?',
    ].join('\n')
  }
  return [
    `LOCAL HELP NEAR ${where}:`,
    '1. Emergency plumber: search "24 hour plumber water shutoff near ' + where + '".',
    '2. Water mitigation/restoration: search "water damage mitigation IICRC near ' + where + '".',
    '3. City/public works or utility: search "' + where + ' public works emergency water line".',
    'Hotel note: keep all receipts; ask your insurer about Loss of Use / Coverage D.',
    'I can prepare a call or text script, but I need the exact number before any outbound action.',
  ].join('\n')
}

function buildActionPreparationResponse(message: string, profile: Partial<UserProfile>): string {
  const phone = firstMatch(message, /(\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/)
  const to = /insurer|insurance|adjuster/i.test(message)
    ? 'insurance claim intake'
    : /plumber|mitigation|restoration/i.test(message)
      ? 'local water emergency provider'
      : 'requested contact'
  const callback = profile.phone ? ` My callback number is ${profile.phone}.` : ''
  const script = `Hello, I have an active bathroom water loss. I need urgent help stopping the source, documenting damage, and starting drying/mitigation.${callback} Please confirm earliest arrival time and any emergency fee.`
  if (!phone) {
    return [
      'ACTION SCRIPT READY:',
      `To: ${to}`,
      'Via: call or SMS',
      `Script: ${script}`,
      'Approval gate: I still need the exact phone number before I can prepare an executable outbound action.',
    ].join('\n')
  }
  return [
    'PROPOSED ACTION',
    `To: ${to}`,
    'Via: call',
    `Number/Address: ${phone}`,
    `Script/Message: ${script}`,
    'Purpose: request urgent water shutoff and mitigation help.',
    'Confirm? Reply YES to proceed, NO to cancel.',
  ].join('\n')
}

export function runIncidentWorkflow(input: IncidentWorkflowInput): IncidentWorkflowResult {
  const message = input.message.trim()
  if (!message) return { handled: false }

  const profile = resolveProfile(input)
  const profileUpdates = cleanProfileUpdates(parseOnboardingReply(message) ?? undefined)
  const latestDoc = findLatestDocument(input.history, message)
  const hasIncident = INCIDENT_RE.test(message) || Boolean(input.history?.some((h) => INCIDENT_RE.test(h.content)))

  if (hasIncident && ACTION_RE.test(message) && (/\b(call|text|sms|send|message|contact)\b/i.test(message))) {
    return {
      handled: true,
      mode: 'action_preparation',
      response: buildActionPreparationResponse(message, profile),
      profileUpdates,
      telemetryEvent: 'action_prepared',
    }
  }

  if (hasIncident && LOCAL_HELP_RE.test(message) && !INCIDENT_RE.test(message)) {
    return {
      handled: true,
      mode: 'local_help',
      response: buildLocalHelpResponse(profile),
      profileUpdates,
      telemetryEvent: 'local_help_ranked',
    }
  }

  if (hasIncident && (INSURANCE_RE.test(message) || (latestDoc && /uploaded|policy|document|coverage|review/i.test(message)))) {
    return {
      handled: true,
      mode: 'insurance_document',
      response: buildInsuranceResponse(latestDoc ?? message),
      profileUpdates,
      telemetryEvent: 'insurance_document_reviewed',
    }
  }

  if (hasIncident && (PHOTO_RE.test(message) || hasRecentMedia(input.history, message))) {
    return {
      handled: true,
      mode: 'photo_followup',
      response: buildPhotoResponse(),
      profileUpdates,
      telemetryEvent: 'incident_media_referenced',
    }
  }

  if (hasIncident) {
    return {
      handled: true,
      mode: 'incident',
      response: buildIncidentResponse(profile),
      profileUpdates,
      telemetryEvent: 'incident_started',
    }
  }

  return { handled: false }
}

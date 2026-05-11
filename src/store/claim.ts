import { create } from 'zustand'

// Mirrors gateway/claim/schemas.ts — kept lean to avoid circular imports
export type ClaimCategory =
  | 'HOME_WATER'
  | 'HOME_FIRE'
  | 'HOME_THEFT'
  | 'AUTO_COLLISION'
  | 'AUTO_THEFT'
  | 'TRAVEL_CANCELLATION'
  | 'TRAVEL_MEDICAL'
  | 'MEDICAL_EXPENSE'

export type SIUFlag =
  | 'RECENT_POLICY_CHANGE'
  | 'PRIOR_CLAIM_PATTERN'
  | 'DELAYED_REPORT'
  | 'INCONSISTENT_ACCOUNT'
  | 'EXCESSIVE_VALUATION'
  | 'CASH_SETTLEMENT_DEMAND'
  | 'NO_POLICE_REPORT'
  | 'MULTIPLE_VEHICLES_INSURED'
  | 'VACANT_PROPERTY'
  | 'UNVERIFIABLE_LOSS'

export type ClaimStatus =
  | 'intake'
  | 'pending_documents'
  | 'under_review'
  | 'siu_referral'
  | 'senior_review'
  | 'cat_queue'
  | 'closed'

export interface ClaimPacket {
  sessionId: string
  claimType: ClaimCategory | null
  claimantName: string | null
  policyNumber: string | null
  dateOfLoss: string | null
  locationOfLoss: string | null
  lossDescription: string | null
  witnessPresent: boolean | null
  policeReportNum: string | null
  injuriesReported: boolean | null
  estimatedValue: number | null
  contactPhone: string | null
  contactEmail: string | null
  adjusterNote: string | null
  siuFlags: SIUFlag[]
  status: ClaimStatus
  createdAt: string
  completedAt: string | null
}

export interface TranscriptEntry {
  role: 'claimant' | 'agent' | 'operator'
  content: string
  timestamp: string
}

export type UserRole = 'claimant' | 'adjuster'
export type RoutingRecommendation = 'standard' | 'siu' | 'catastrophe' | 'senior_review'

interface ClaimState {
  // session
  sessionId: string | null
  packet: ClaimPacket | null
  transcript: TranscriptEntry[]
  nextBestQuestion: string | null
  routingRecommendation: RoutingRecommendation
  userRole: UserRole

  // UI
  isLoading: boolean
  error: string | null
  voiceActive: boolean
  crisisDetected: boolean
  catDetected: boolean
  handedOff: boolean
  claimReference: string | null

  // actions
  setRole: (role: UserRole) => void
  startClaim: (policyNumber: string, gatewayUrl: string) => Promise<void>
  sendTurn: (message: string, gatewayUrl: string) => Promise<void>
  handoff: (note: string | undefined, gatewayUrl: string) => Promise<void>
  toggleVoice: () => void
  clearError: () => void
  reset: () => void
}

const initialState = {
  sessionId: null,
  packet: null,
  transcript: [],
  nextBestQuestion: null,
  routingRecommendation: 'standard' as RoutingRecommendation,
  userRole: 'claimant' as UserRole,
  isLoading: false,
  error: null,
  voiceActive: false,
  crisisDetected: false,
  catDetected: false,
  handedOff: false,
  claimReference: null,
}

export const useClaimStore = create<ClaimState>((set, get) => ({
  ...initialState,

  setRole: (role) => set({ userRole: role }),

  startClaim: async (policyNumber, gatewayUrl) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${gatewayUrl}/api/claim/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policyNumber }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      const data = await res.json() as {
        sessionId: string
        openingMessage: string
        packet: ClaimPacket
      }
      const now = new Date().toISOString()
      set({
        sessionId: data.sessionId,
        packet: data.packet,
        transcript: [{ role: 'agent', content: data.openingMessage, timestamp: now }],
        isLoading: false,
      })
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : String(err) })
    }
  },

  sendTurn: async (message, gatewayUrl) => {
    const { sessionId, transcript } = get()
    if (!sessionId) return
    set({ isLoading: true, error: null })

    const now = new Date().toISOString()
    // Optimistically add user message
    set({ transcript: [...transcript, { role: 'claimant', content: message, timestamp: now }] })

    try {
      const res = await fetch(`${gatewayUrl}/api/claim/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      const data = await res.json() as {
        agentReply: string
        packet: ClaimPacket
        nextBestQuestion: string
        routingRecommendation: RoutingRecommendation
        crisisDetected: boolean
        catDetected: boolean
      }
      const replyTs = new Date().toISOString()
      set((state) => ({
        packet: data.packet,
        transcript: [...state.transcript, { role: 'agent', content: data.agentReply, timestamp: replyTs }],
        nextBestQuestion: data.nextBestQuestion,
        routingRecommendation: data.routingRecommendation,
        crisisDetected: data.crisisDetected,
        catDetected: data.catDetected,
        isLoading: false,
      }))
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : String(err) })
    }
  },

  handoff: async (note, gatewayUrl) => {
    const { sessionId } = get()
    if (!sessionId) return
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${gatewayUrl}/api/claim/${sessionId}/handoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, adjusterNote: note }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      const data = await res.json() as { claimReference: string; packet: ClaimPacket }
      set({
        handedOff: true,
        claimReference: data.claimReference,
        packet: data.packet,
        isLoading: false,
      })
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : String(err) })
    }
  },

  toggleVoice: () => set((state) => ({ voiceActive: !state.voiceActive })),

  clearError: () => set({ error: null }),

  reset: () => set(initialState),
}))

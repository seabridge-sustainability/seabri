import { z } from 'zod'

// ── Enumerations ─────────────────────────────────────────────────────────────

export const ClaimCategorySchema = z.enum([
  'HOME_WATER',
  'HOME_FIRE',
  'HOME_THEFT',
  'AUTO_COLLISION',
  'AUTO_THEFT',
  'TRAVEL_CANCELLATION',
  'TRAVEL_MEDICAL',
  'MEDICAL_EXPENSE',
])
export type ClaimCategory = z.infer<typeof ClaimCategorySchema>

export const SIUFlagSchema = z.enum([
  'RECENT_POLICY_CHANGE',
  'PRIOR_CLAIM_PATTERN',
  'DELAYED_REPORT',
  'INCONSISTENT_ACCOUNT',
  'EXCESSIVE_VALUATION',
  'CASH_SETTLEMENT_DEMAND',
  'NO_POLICE_REPORT',
  'MULTIPLE_VEHICLES_INSURED',
  'VACANT_PROPERTY',
  'UNVERIFIABLE_LOSS',
])
export type SIUFlag = z.infer<typeof SIUFlagSchema>

export const ClaimStatusSchema = z.enum([
  'intake',
  'pending_documents',
  'under_review',
  'siu_referral',
  'senior_review',
  'cat_queue',
  'closed',
])
export type ClaimStatus = z.infer<typeof ClaimStatusSchema>

// ── Core ClaimPacket ─────────────────────────────────────────────────────────

export const ClaimPacketSchema = z.object({
  sessionId: z.string().uuid(),
  claimType: ClaimCategorySchema.nullable(),
  claimantName: z.string().nullable(),
  policyNumber: z.string().nullable(),
  dateOfLoss: z.string().nullable(),
  locationOfLoss: z.string().nullable(),
  lossDescription: z.string().nullable(),
  witnessPresent: z.boolean().nullable(),
  policeReportNum: z.string().nullable(),
  injuriesReported: z.boolean().nullable(),
  estimatedValue: z.number().nullable(),
  contactPhone: z.string().nullable(),
  contactEmail: z.string().nullable(),
  adjusterNote: z.string().nullable(),
  siuFlags: z.array(SIUFlagSchema),
  status: ClaimStatusSchema,
  createdAt: z.string(),
  completedAt: z.string().nullable(),
})
export type ClaimPacket = z.infer<typeof ClaimPacketSchema>

// ── Conversation turn ────────────────────────────────────────────────────────

export const TranscriptEntrySchema = z.object({
  role: z.enum(['claimant', 'agent', 'operator']),
  content: z.string(),
  timestamp: z.string(),
})
export type TranscriptEntry = z.infer<typeof TranscriptEntrySchema>

// ── Session ──────────────────────────────────────────────────────────────────

export const ClaimSessionSchema = z.object({
  packet: ClaimPacketSchema,
  transcript: z.array(TranscriptEntrySchema),
  nextBestQuestion: z.string().nullable(),
  routingRecommendation: z.enum(['standard', 'siu', 'catastrophe', 'senior_review']),
  expiresAt: z.string(),
})
export type ClaimSession = z.infer<typeof ClaimSessionSchema>

// ── API shapes ───────────────────────────────────────────────────────────────

export const StartClaimRequestSchema = z.object({
  policyNumber: z.string().min(1).max(50).regex(/^[A-Za-z0-9\-_]+$/, 'Invalid policy number format'),
  role: z.enum(['claimant', 'adjuster']).default('claimant'),
})
export type StartClaimRequest = z.infer<typeof StartClaimRequestSchema>

export const ClaimTurnRequestSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1),
  role: z.enum(['claimant', 'adjuster']).default('claimant'),
})
export type ClaimTurnRequest = z.infer<typeof ClaimTurnRequestSchema>

export const HandoffRequestSchema = z.object({
  sessionId: z.string().uuid(),
  adjusterNote: z.string().optional(),
})
export type HandoffRequest = z.infer<typeof HandoffRequestSchema>

// ── Claude tool-use schema for extraction ───────────────────────────────────

export const EXTRACT_CLAIM_TOOL = {
  name: 'extract_claim_packet',
  description:
    'Extract or update structured claim fields from the conversation so far. Call this after every agent turn. Use null for any field that has not been mentioned.',
  input_schema: {
    type: 'object' as const,
    properties: {
      claimType: {
        type: 'string',
        enum: [
          'HOME_WATER',
          'HOME_FIRE',
          'HOME_THEFT',
          'AUTO_COLLISION',
          'AUTO_THEFT',
          'TRAVEL_CANCELLATION',
          'TRAVEL_MEDICAL',
          'MEDICAL_EXPENSE',
          null,
        ],
        description: 'Category of claim inferred from context',
      },
      claimantName: { type: ['string', 'null'], description: "Claimant's full legal name" },
      policyNumber: { type: ['string', 'null'], description: 'Policy identifier' },
      dateOfLoss: {
        type: ['string', 'null'],
        description: 'ISO date YYYY-MM-DD of when loss occurred',
      },
      locationOfLoss: { type: ['string', 'null'], description: 'Address or description of location' },
      lossDescription: {
        type: ['string', 'null'],
        description: 'Plain-English summary of the loss event (≥30 chars)',
      },
      witnessPresent: { type: ['boolean', 'null'] },
      policeReportNum: { type: ['string', 'null'] },
      injuriesReported: { type: ['boolean', 'null'] },
      estimatedValue: { type: ['number', 'null'], description: 'USD estimate' },
      contactPhone: { type: ['string', 'null'] },
      contactEmail: { type: ['string', 'null'] },
      siuFlags: {
        type: 'array',
        items: {
          type: 'string',
          enum: [
            'RECENT_POLICY_CHANGE',
            'PRIOR_CLAIM_PATTERN',
            'DELAYED_REPORT',
            'INCONSISTENT_ACCOUNT',
            'EXCESSIVE_VALUATION',
            'CASH_SETTLEMENT_DEMAND',
            'NO_POLICE_REPORT',
            'MULTIPLE_VEHICLES_INSURED',
            'VACANT_PROPERTY',
            'UNVERIFIABLE_LOSS',
          ],
        },
        description: 'SIU signal flags detected (empty array if none)',
      },
      nextBestQuestion: {
        type: 'string',
        description: 'Single best follow-up question for the operator to ask next',
      },
    },
    required: ['siuFlags', 'nextBestQuestion'],
  },
} as const

export function makeEmptyPacket(sessionId: string): ClaimPacket {
  return {
    sessionId,
    claimType: null,
    claimantName: null,
    policyNumber: null,
    dateOfLoss: null,
    locationOfLoss: null,
    lossDescription: null,
    witnessPresent: null,
    policeReportNum: null,
    injuriesReported: null,
    estimatedValue: null,
    contactPhone: null,
    contactEmail: null,
    adjusterNote: null,
    siuFlags: [],
    status: 'intake',
    createdAt: new Date().toISOString(),
    completedAt: null,
  }
}

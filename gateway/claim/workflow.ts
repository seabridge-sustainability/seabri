import Anthropic from '@anthropic-ai/sdk'
import { getSystemPrompt } from '../agents/agents.js'
import {
  EXTRACT_CLAIM_TOOL,
  makeEmptyPacket,
  type ClaimPacket,
  type SIUFlag,
  ClaimCategorySchema,
  SIUFlagSchema,
} from './schemas.js'
import { evaluatePolicies, deriveStatus, detectCrisisLanguage, detectCATEvent } from './policies.js'
import { CLAIM_EXAMPLES } from './examples.js'
import type { ClaimSession, TranscriptEntry } from './schemas.js'

let _client: Anthropic | null = null
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic()
  return _client
}

// Build the few-shot prefix injected into system prompt
function buildExamplesBlock(): string {
  const lines: string[] = [
    '## Worked Examples (for reference only — do not repeat verbatim)',
    '',
  ]
  for (const ex of CLAIM_EXAMPLES.slice(0, 3)) {
    lines.push(`### ${ex.scenario}`)
    lines.push('```')
    for (const turn of ex.conversation) {
      lines.push(`${turn.role.toUpperCase()}: ${turn.content}`)
    }
    lines.push('```')
    lines.push(`Expected next question: "${ex.expectedNextBestQuestion}"`)
    lines.push('')
  }
  return lines.join('\n')
}

const SYSTEM_PROMPT =
  getSystemPrompt('claim-intake') +
  '\n\n' +
  buildExamplesBlock()

function formatTranscriptForClaude(
  transcript: TranscriptEntry[]
): Anthropic.MessageParam[] {
  return transcript.map((entry) => ({
    role: entry.role === 'claimant' ? ('user' as const) : ('assistant' as const),
    content: entry.role === 'operator'
      ? `[OPERATOR NOTE] ${entry.content}`
      : entry.content,
  }))
}

interface TurnResult {
  agentReply: string
  updatedPacket: ClaimPacket
  nextBestQuestion: string
  crisisDetected: boolean
  catDetected: boolean
}

export async function runClaimTurn(
  session: ClaimSession,
  userMessage: string
): Promise<TurnResult> {
  const crisisDetected = detectCrisisLanguage(userMessage)
  const catDetected = detectCATEvent(userMessage)

  // Build messages including the new user turn
  const messages = formatTranscriptForClaude(session.transcript)
  messages.push({ role: 'user', content: userMessage })

  // Ask Claude for a conversational reply + structured extraction in one call
  const response = await getClient().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: [EXTRACT_CLAIM_TOOL as unknown as Anthropic.Tool],
    tool_choice: { type: 'auto' },
    messages,
  })

  let agentReply = ''
  let updatedPacket: ClaimPacket = { ...session.packet }
  let nextBestQuestion = session.nextBestQuestion ?? ''

  for (const block of response.content) {
    if (block.type === 'text') {
      agentReply = block.text
    } else if (block.type === 'tool_use' && block.name === 'extract_claim_packet') {
      const input = block.input as Record<string, unknown>

      // Merge extracted fields into current packet (null = no update)
      const claimTypeRaw = input.claimType
      if (claimTypeRaw != null && claimTypeRaw !== null) {
        const parsed = ClaimCategorySchema.safeParse(claimTypeRaw)
        if (parsed.success) updatedPacket = { ...updatedPacket, claimType: parsed.data }
      }

      const stringFields = [
        'claimantName',
        'policyNumber',
        'dateOfLoss',
        'locationOfLoss',
        'lossDescription',
        'policeReportNum',
        'contactPhone',
        'contactEmail',
      ] as const
      for (const field of stringFields) {
        if (typeof input[field] === 'string') {
          updatedPacket = { ...updatedPacket, [field]: input[field] as string }
        }
      }

      if (typeof input.witnessPresent === 'boolean') {
        updatedPacket = { ...updatedPacket, witnessPresent: input.witnessPresent }
      }
      if (typeof input.injuriesReported === 'boolean') {
        updatedPacket = { ...updatedPacket, injuriesReported: input.injuriesReported }
      }
      if (typeof input.estimatedValue === 'number') {
        updatedPacket = { ...updatedPacket, estimatedValue: input.estimatedValue }
      }

      // Merge SIU flags (union of existing + new)
      if (Array.isArray(input.siuFlags)) {
        const incoming = (input.siuFlags as unknown[])
          .map((f) => SIUFlagSchema.safeParse(f))
          .filter((r) => r.success)
          .map((r) => r.data as SIUFlag)
        const merged = Array.from(new Set([...updatedPacket.siuFlags, ...incoming]))
        updatedPacket = { ...updatedPacket, siuFlags: merged }
      }

      if (typeof input.nextBestQuestion === 'string') {
        nextBestQuestion = input.nextBestQuestion
      }
    }
  }

  // If Claude returned no text (only tool use), do a follow-up text-only call
  if (!agentReply) {
    const followUp = await getClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [
        ...messages,
        {
          role: 'assistant',
          content: response.content,
        },
        {
          role: 'user',
          content: '[INTERNAL] Please provide your spoken response to the claimant now.',
        },
      ],
    })
    for (const block of followUp.content) {
      if (block.type === 'text') agentReply = block.text
    }
  }

  // Derive routing and update status
  const { routing } = evaluatePolicies(updatedPacket)
  updatedPacket = { ...updatedPacket, status: deriveStatus(updatedPacket, routing) }

  // CAT event override
  if (catDetected && updatedPacket.status !== 'siu_referral') {
    updatedPacket = { ...updatedPacket, status: 'cat_queue' }
  }

  return {
    agentReply,
    updatedPacket,
    nextBestQuestion,
    crisisDetected,
    catDetected,
  }
}

export async function generateOpeningMessage(policyNumber: string): Promise<string> {
  const response = await getClient().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Policy number: ${policyNumber}. Please greet the claimant and ask them to describe what happened.`,
      },
    ],
  })
  const text = response.content.find((b: { type: string }) => b.type === 'text')
  return text?.type === 'text' ? text.text : "I'm sorry to hear something happened. Can you briefly describe what occurred?"
}

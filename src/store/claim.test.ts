import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useClaimStore } from './claim'
import type { ClaimPacket } from './claim'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePacket(overrides: Partial<ClaimPacket> = {}): ClaimPacket {
  return {
    sessionId: '00000000-0000-0000-0000-000000000001',
    claimType: null,
    claimantName: null,
    policyNumber: 'HO-2024-88821',
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
    ...overrides,
  }
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  useClaimStore.getState().reset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ── Synchronous actions ───────────────────────────────────────────────────────

describe('setRole', () => {
  it('updates userRole', () => {
    useClaimStore.getState().setRole('adjuster')
    expect(useClaimStore.getState().userRole).toBe('adjuster')
  })
})

describe('toggleVoice', () => {
  it('flips voiceActive', () => {
    expect(useClaimStore.getState().voiceActive).toBe(false)
    useClaimStore.getState().toggleVoice()
    expect(useClaimStore.getState().voiceActive).toBe(true)
    useClaimStore.getState().toggleVoice()
    expect(useClaimStore.getState().voiceActive).toBe(false)
  })
})

describe('clearError', () => {
  it('clears an existing error', () => {
    useClaimStore.setState({ error: 'Something went wrong' })
    useClaimStore.getState().clearError()
    expect(useClaimStore.getState().error).toBeNull()
  })
})

describe('reset', () => {
  it('clears all state back to initial values', () => {
    useClaimStore.setState({
      sessionId: 'abc',
      packet: makePacket(),
      transcript: [{ role: 'agent', content: 'Hello', timestamp: new Date().toISOString() }],
      handedOff: true,
      crisisDetected: true,
      catDetected: true,
      voiceActive: true,
      error: 'oops',
    })
    useClaimStore.getState().reset()
    const s = useClaimStore.getState()
    expect(s.sessionId).toBeNull()
    expect(s.packet).toBeNull()
    expect(s.transcript).toEqual([])
    expect(s.handedOff).toBe(false)
    expect(s.crisisDetected).toBe(false)
    expect(s.voiceActive).toBe(false)
    expect(s.error).toBeNull()
  })
})

// ── startClaim ────────────────────────────────────────────────────────────────

describe('startClaim', () => {
  it('sets sessionId and opening transcript entry on success', async () => {
    const packet = makePacket()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          sessionId: 'session-abc',
          openingMessage: 'Hello, how can I help?',
          packet,
        }),
      }),
    )

    await useClaimStore.getState().startClaim('HO-2024-88821', 'http://localhost:3001')

    const s = useClaimStore.getState()
    expect(s.sessionId).toBe('session-abc')
    expect(s.packet).toEqual(packet)
    expect(s.transcript).toHaveLength(1)
    expect(s.transcript[0].role).toBe('agent')
    expect(s.transcript[0].content).toBe('Hello, how can I help?')
    expect(s.isLoading).toBe(false)
  })

  it('sets error and clears loading on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))

    await useClaimStore.getState().startClaim('HO-2024-88821', 'http://localhost:3001')

    const s = useClaimStore.getState()
    expect(s.isLoading).toBe(false)
    expect(s.error).toBe('Network error')
    expect(s.sessionId).toBeNull()
  })

  it('sets error when server returns non-ok status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Invalid policy number' }),
      }),
    )

    await useClaimStore.getState().startClaim('BAD-POLICY', 'http://localhost:3001')

    expect(useClaimStore.getState().error).toBe('Invalid policy number')
  })
})

// ── sendTurn ──────────────────────────────────────────────────────────────────

describe('sendTurn', () => {
  beforeEach(() => {
    useClaimStore.setState({
      sessionId: '00000000-0000-0000-0000-000000000001',
      transcript: [],
    })
  })

  it('optimistically adds user message then appends agent reply', async () => {
    const updatedPacket = makePacket({ claimType: 'HOME_WATER' })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          agentReply: 'I understand, please provide more details.',
          packet: updatedPacket,
          nextBestQuestion: 'When exactly did the pipe burst?',
          routingRecommendation: 'standard',
          crisisDetected: false,
          catDetected: false,
        }),
      }),
    )

    await useClaimStore.getState().sendTurn('Pipe burst in my basement', 'http://localhost:3001')

    const s = useClaimStore.getState()
    expect(s.transcript).toHaveLength(2)
    expect(s.transcript[0].role).toBe('claimant')
    expect(s.transcript[0].content).toBe('Pipe burst in my basement')
    expect(s.transcript[1].role).toBe('agent')
    expect(s.transcript[1].content).toBe('I understand, please provide more details.')
    expect(s.packet?.claimType).toBe('HOME_WATER')
    expect(s.nextBestQuestion).toBe('When exactly did the pipe burst?')
    expect(s.isLoading).toBe(false)
  })

  it('sets crisisDetected when server flags it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          agentReply: 'Are you okay?',
          packet: makePacket(),
          nextBestQuestion: null,
          routingRecommendation: 'standard',
          crisisDetected: true,
          catDetected: false,
        }),
      }),
    )

    await useClaimStore.getState().sendTurn('I want to end my life', 'http://localhost:3001')

    expect(useClaimStore.getState().crisisDetected).toBe(true)
  })

  it('is a no-op when sessionId is null', async () => {
    useClaimStore.setState({ sessionId: null })
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    await useClaimStore.getState().sendTurn('hello', 'http://localhost:3001')

    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

// ── handoff ───────────────────────────────────────────────────────────────────

describe('handoff', () => {
  beforeEach(() => {
    useClaimStore.setState({ sessionId: '00000000-0000-0000-0000-000000000001' })
  })

  it('marks handedOff and stores claimReference on success', async () => {
    const finalPacket = makePacket({ status: 'closed' })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          claimReference: 'CLM-2024-ABC123',
          packet: finalPacket,
        }),
      }),
    )

    await useClaimStore.getState().handoff('Notes here', 'http://localhost:3001')

    const s = useClaimStore.getState()
    expect(s.handedOff).toBe(true)
    expect(s.claimReference).toBe('CLM-2024-ABC123')
    expect(s.packet?.status).toBe('closed')
    expect(s.isLoading).toBe(false)
  })

  it('sets error on handoff failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Handoff failed')))

    await useClaimStore.getState().handoff(undefined, 'http://localhost:3001')

    const s = useClaimStore.getState()
    expect(s.isLoading).toBe(false)
    expect(s.error).toBe('Handoff failed')
    expect(s.handedOff).toBe(false)
  })
})

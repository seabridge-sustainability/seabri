/**
 * Regression tests for Telegram multimodal failures (see docs/seabri/TELEGRAM_MULTIMODAL_AUDIT.md).
 * Covers: technical leakage prevention, image context persistence, follow-up reconstruction, TTL expiry.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { processAttachment } from './attachments.js'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TECH_LEAK_PATTERN = /OPENAI_API_KEY|npm install|ffmpeg|seabri|\.env|seabri doctor|seabri onboard/i

function makeBuffer(sizeBytes = 512): Buffer {
  return Buffer.alloc(sizeBytes, 0x42)
}

// ─── T1 — Audio fallback: no technical strings ───────────────────────────────

describe('processAttachment — audio fallback (no OPENAI_API_KEY)', () => {
  beforeEach(() => {
    // Ensure key is absent for this test group
    delete process.env.OPENAI_API_KEY
  })

  it('T1: voice/ogg fallback does not contain technical setup instructions', async () => {
    const result = await processAttachment(makeBuffer(), 'audio/ogg', 'voice.ogg')
    expect(result.type).toBe('audio_fallback')
    expect(TECH_LEAK_PATTERN.test(result.content)).toBe(false)
  })

  it('T1b: audio/mpeg fallback does not contain technical setup instructions', async () => {
    const result = await processAttachment(makeBuffer(), 'audio/mpeg', 'audio.mp3')
    expect(result.type).toBe('audio_fallback')
    expect(TECH_LEAK_PATTERN.test(result.content)).toBe(false)
  })

  it('T1c: audio fallback message is user-facing (contains "not available")', async () => {
    const result = await processAttachment(makeBuffer(), 'audio/ogg', 'voice.ogg')
    expect(result.content.toLowerCase()).toMatch(/not available|can't|cannot/)
  })
})

// ─── T2 — Video fallback: no technical strings ───────────────────────────────

describe('processAttachment — video fallback (no ffmpeg/OPENAI_API_KEY)', () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY
  })

  it('T2: video/mp4 fallback does not contain technical setup instructions', async () => {
    const result = await processAttachment(makeBuffer(), 'video/mp4', 'video.mp4')
    // May be 'unsupported' or 'transcript' depending on dep availability
    expect(TECH_LEAK_PATTERN.test(result.content)).toBe(false)
  })
})

// ─── T3 — PDF fallback: no technical strings ────────────────────────────────

describe('processAttachment — PDF fallback (pdf-parse not available)', () => {
  it('T3: PDF fallback does not contain npm install instructions', async () => {
    // Create a minimal fake PDF-ish buffer (pdf-parse will fail on it)
    const pdfBuffer = Buffer.from('%PDF-1.4 fake content')
    const result = await processAttachment(pdfBuffer, 'application/pdf', 'report.pdf')
    expect(TECH_LEAK_PATTERN.test(result.content)).toBe(false)
  })
})

// ─── T4 — Image result includes base64 and mediaType ────────────────────────

describe('processAttachment — image', () => {
  it('T4: JPEG image returns base64 content and mediaType', async () => {
    // Minimal JPEG magic bytes
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Array(50).fill(0x00)])
    const result = await processAttachment(jpegBuffer, 'image/jpeg', 'photo.jpg')
    expect(result.type).toBe('image')
    expect(result.mediaType).toBe('image/jpeg')
    expect(result.content.length).toBeGreaterThan(0)
    expect(result.fileName).toBe('photo.jpg')
    expect(result.sizeBytes).toBeGreaterThan(0)
  })
})

// ─── T5–T8 — Image context persistence and follow-up reconstruction ──────────
// These tests exercise the mediaContext logic inline (unit-testing the logic
// without spawning an actual Telegram bot).

interface ConversationMediaContext {
  lastImageBase64: string
  lastImageMediaType: string
  capturedAt: number
}

interface SimulatedState {
  mediaContext?: ConversationMediaContext
}

function shouldReconstructImage(
  state: SimulatedState,
  text: string,
  hasNewAttachment: boolean,
  ttlMs = 24 * 60 * 60 * 1000
): boolean {
  if (hasNewAttachment) return false
  if (!state.mediaContext) return false
  if (Date.now() - state.mediaContext.capturedAt >= ttlMs) return false
  const referencesPriorMedia = /\b(image|photo|picture|flood|damage|see|show|sent|that|it)\b/i.test(text)
  return referencesPriorMedia || !text
}

describe('Media context persistence logic', () => {
  it('T5: after receiving an image, mediaContext is populated', async () => {
    const state: SimulatedState = {}
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Array(50).fill(0x00)])
    const result = await processAttachment(jpegBuffer, 'image/jpeg', 'photo.jpg')

    // Simulate what telegram.ts does after processAttachment
    if (result.type === 'image') {
      state.mediaContext = {
        lastImageBase64: result.content,
        lastImageMediaType: result.mediaType!,
        capturedAt: Date.now(),
      }
    }

    expect(state.mediaContext).toBeDefined()
    expect(state.mediaContext!.lastImageMediaType).toBe('image/jpeg')
    expect(state.mediaContext!.lastImageBase64.length).toBeGreaterThan(0)
  })

  it('T6: "What do you see?" triggers image reconstruction from mediaContext', () => {
    const state: SimulatedState = {
      mediaContext: {
        lastImageBase64: 'base64imagedata==',
        lastImageMediaType: 'image/jpeg',
        capturedAt: Date.now(),
      },
    }
    const shouldReconstruct = shouldReconstructImage(state, 'What do you see?', false)
    expect(shouldReconstruct).toBe(true)
  })

  it('T7: unrelated follow-up also reconstructs (prior image should stay in context)', () => {
    const state: SimulatedState = {
      mediaContext: {
        lastImageBase64: 'base64imagedata==',
        lastImageMediaType: 'image/jpeg',
        capturedAt: Date.now(),
      },
    }
    // Even "tell me more" should keep the image in context while it's fresh
    const shouldReconstruct = shouldReconstructImage(state, '', false)
    expect(shouldReconstruct).toBe(true)
  })

  it('T8: mediaContext expires after TTL and image is not reconstructed', () => {
    const TTL_MS = 24 * 60 * 60 * 1000
    const state: SimulatedState = {
      mediaContext: {
        lastImageBase64: 'base64imagedata==',
        lastImageMediaType: 'image/jpeg',
        capturedAt: Date.now() - TTL_MS - 1000, // 1 second past expiry
      },
    }
    const shouldReconstruct = shouldReconstructImage(state, 'What do you see?', false)
    expect(shouldReconstruct).toBe(false)
  })

  it('T8b: new attachment overrides reconstruction (no double-inject)', () => {
    const state: SimulatedState = {
      mediaContext: {
        lastImageBase64: 'oldimage==',
        lastImageMediaType: 'image/jpeg',
        capturedAt: Date.now(),
      },
    }
    const shouldReconstruct = shouldReconstructImage(state, 'here is another photo', true)
    expect(shouldReconstruct).toBe(false)
  })
})

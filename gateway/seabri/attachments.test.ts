import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { processAttachment } from './attachments.js'

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeBuffer(content: string): Buffer {
  return Buffer.from(content, 'utf-8')
}

function jpegBuffer(): Buffer {
  // Minimal valid JPEG magic bytes
  return Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
}

// ── processAttachment ──────────────────────────────────────────────────────────

describe('processAttachment — image', () => {
  it('returns base64 for image/jpeg', async () => {
    const buf = jpegBuffer()
    const result = await processAttachment(buf, 'image/jpeg', 'photo.jpg')
    expect(result.type).toBe('image')
    expect(result.mediaType).toBe('image/jpeg')
    expect(result.content).toBe(buf.toString('base64'))
    expect(result.fileName).toBe('photo.jpg')
    expect(result.sizeBytes).toBe(buf.length)
  })

  it('normalises image/jpg → image/jpeg in mediaType', async () => {
    const buf = jpegBuffer()
    const result = await processAttachment(buf, 'image/jpg', 'shot.jpg')
    expect(result.type).toBe('image')
    expect(result.mediaType).toBe('image/jpeg')
  })

  it('returns base64 for image/png', async () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47])
    const result = await processAttachment(buf, 'image/png', 'img.png')
    expect(result.type).toBe('image')
    expect(result.mediaType).toBe('image/png')
  })

  it('strips MIME params (e.g. charset) before matching', async () => {
    const buf = jpegBuffer()
    const result = await processAttachment(buf, 'image/jpeg; charset=utf-8', 'x.jpg')
    expect(result.type).toBe('image')
  })
})

describe('processAttachment — unsupported types', () => {
  it('returns unsupported for unknown MIME type', async () => {
    const buf = makeBuffer('binary data')
    const result = await processAttachment(buf, 'application/x-unknown', 'file.xyz')
    expect(result.type).toBe('unsupported')
    expect(result.content).toContain('file.xyz')
  })

  it('includes size in unsupported message', async () => {
    const buf = makeBuffer('x'.repeat(2048))
    const result = await processAttachment(buf, 'application/x-unknown', 'large.bin')
    expect(result.content).toContain('KB')
  })
})

describe('processAttachment — audio fallback (no API key)', () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY
  })

  it('returns audio_fallback when OPENAI_API_KEY is unset', async () => {
    const buf = makeBuffer('fake ogg data')
    const result = await processAttachment(buf, 'audio/ogg', 'voice.ogg')
    expect(result.type).toBe('audio_fallback')
    // Must NOT expose technical setup strings to end users (FIX 9)
    expect(result.content).not.toMatch(/OPENAI_API_KEY|npm install|ffmpeg|seabri/i)
    expect(result.content.toLowerCase()).toMatch(/not available|can't|cannot/)
  })

  it('audio/mpeg falls back gracefully', async () => {
    const buf = makeBuffer('fake mp3')
    const result = await processAttachment(buf, 'audio/mpeg', 'clip.mp3')
    expect(result.type).toBe('audio_fallback')
  })

  it('unknown audio/ subtype also falls back', async () => {
    const buf = makeBuffer('data')
    const result = await processAttachment(buf, 'audio/x-custom', 'custom.audio')
    expect(result.type).toBe('audio_fallback')
  })
})

describe('processAttachment — video fallback (no ffmpeg/API key)', () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY
  })

  it('returns unsupported for video/mp4 without ffmpeg+key', async () => {
    const buf = makeBuffer('fake mp4')
    const result = await processAttachment(buf, 'video/mp4', 'clip.mp4')
    // ffmpeg not installed in CI → falls back to unsupported
    expect(['unsupported', 'transcript']).toContain(result.type)
    expect(result.fileName).toBe('clip.mp4')
  })

  it('video/webm handled gracefully', async () => {
    const buf = makeBuffer('fake webm')
    const result = await processAttachment(buf, 'video/webm', 'rec.webm')
    expect(['unsupported', 'transcript']).toContain(result.type)
  })
})

describe('processAttachment — PDF (no pdf-parse installed)', () => {
  it('returns pdf_text with install hint when pdf-parse is absent', async () => {
    const buf = makeBuffer('%PDF-1.4 fake pdf content')
    const result = await processAttachment(buf, 'application/pdf', 'doc.pdf')
    expect(result.type).toBe('pdf_text')
    expect(result.fileName).toBe('doc.pdf')
    // Either extracted text or the install-hint fallback
    expect(result.content).toContain('doc.pdf')
  })

  it('detects PDF by filename extension', async () => {
    const buf = makeBuffer('%PDF-1.4')
    const result = await processAttachment(buf, 'application/octet-stream', 'report.pdf')
    expect(result.type).toBe('pdf_text')
  })
})

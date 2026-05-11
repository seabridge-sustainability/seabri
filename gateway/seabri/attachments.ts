import { writeFile, unlink, mkdtemp } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

export type AttachmentType = 'image' | 'pdf_text' | 'transcript' | 'audio_fallback' | 'unsupported'

export interface AttachmentResult {
  type: AttachmentType
  /** For images: base64-encoded bytes. For text types: extracted plain text. */
  content: string
  /** MIME type — only set for image results (e.g. 'image/jpeg') */
  mediaType?: string
  fileName: string
  sizeBytes: number
}

const SUPPORTED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
])

const SUPPORTED_AUDIO_TYPES = new Set([
  'audio/ogg',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/wav',
  'audio/webm',
])

const SUPPORTED_VIDEO_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo',
  'video/mpeg',
])

// ── Whisper transcription (OpenAI) ────────────────────────────────────────────

/** Transcribe an audio/video buffer via the OpenAI Whisper API.
 *  Requires OPENAI_API_KEY env var. Gracefully falls back if key is absent or
 *  the SDK is not installed. */
async function transcribeWithWhisper(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  try {
    // @ts-ignore — optional dep; handled by catch
    const { OpenAI } = await import('openai')
    const client = new OpenAI({ apiKey })

    // Whisper needs a File-like object; Node 20 has File in globalThis
    const ext = fileName.split('.').pop() ?? 'ogg'
    // Convert Buffer to Uint8Array to satisfy BlobPart typing
    const uint8 = new Uint8Array(buffer)
    const file = new File([uint8], fileName || `audio.${ext}`, { type: mimeType })

    const response = await client.audio.transcriptions.create({
      model: 'whisper-1',
      file,
      response_format: 'text',
    })
    // whisper-1 with response_format:'text' returns a string directly
    const text = typeof response === 'string' ? response : (response as { text: string }).text
    return text?.trim() || null
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[attachments] Whisper transcription failed: ${msg}`)
    return null
  }
}

// ── ffmpeg video → audio extraction ──────────────────────────────────────────

/** Extract the audio track from a video buffer and return it as a WAV Buffer.
 *  Returns null if ffmpeg is unavailable or extraction fails. */
async function extractAudioFromVideo(
  videoBuffer: Buffer,
  inputFileName: string
): Promise<Buffer | null> {
  let workDir: string | null = null
  let inputPath: string | null = null
  let outputPath: string | null = null

  try {
    // @ts-ignore — optional dep
    const ffmpegInstaller = await import('@ffmpeg-installer/ffmpeg')
    // @ts-ignore — optional dep
    const ffmpegModule = await import('fluent-ffmpeg')
    const ffmpeg = ffmpegModule.default ?? ffmpegModule

    const ffmpegPath: string =
      typeof ffmpegInstaller === 'object' && ffmpegInstaller !== null && 'path' in ffmpegInstaller
        ? (ffmpegInstaller as { path: string }).path
        : (ffmpegInstaller as unknown as string)

    ffmpeg.setFfmpegPath(ffmpegPath)

    workDir = await mkdtemp(join(tmpdir(), 'seabri-video-'))
    inputPath = join(workDir, inputFileName)
    outputPath = join(workDir, 'audio.wav')

    await writeFile(inputPath, videoBuffer)

    const inp = inputPath
    const out = outputPath
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inp)
        .noVideo()
        .audioCodec('pcm_s16le')
        .format('wav')
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err))
        .save(out)
    })

    const { readFile } = await import('fs/promises')
    const audioBuffer = await readFile(out)
    return audioBuffer
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[attachments] ffmpeg extraction failed: ${msg}`)
    return null
  } finally {
    // Clean up temp files
    const promises: Promise<void>[] = []
    if (inputPath) promises.push(unlink(inputPath).catch(() => undefined))
    if (outputPath) promises.push(unlink(outputPath).catch(() => undefined))
    await Promise.all(promises)
  }
}

// ── Document classification + insurance data extraction ───────────────────────

type DocType =
  | 'policy_declarations'
  | 'flood_policy'
  | 'homeowners_policy'
  | 'policy_endorsement'
  | 'building_document'
  | 'claim_document'
  | 'document'

function classifyDocument(text: string, fileName: string): DocType {
  const t = text.toLowerCase()
  const f = fileName.toLowerCase()
  if (f.includes('declaration') || t.includes('declarations page') ||
      (t.includes('policy number') && t.includes('coverage a') && t.includes('premium'))) {
    return 'policy_declarations'
  }
  if (t.includes('flood insurance') || f.includes('flood')) return 'flood_policy'
  if (t.includes('homeowners') || t.includes('dwelling protection') ||
      (t.includes('coverage a') && t.includes('coverage b'))) return 'homeowners_policy'
  if (f.includes('endorsement') || t.includes('policy endorsement')) return 'policy_endorsement'
  if (t.includes('floor plan') || t.includes('elevation certificate') ||
      t.includes('square footage') || t.includes('architectural')) return 'building_document'
  if (t.includes('claim') && (t.includes('adjuster') || t.includes('settlement'))) return 'claim_document'
  return 'document'
}

function extractInsuranceFields(text: string): Record<string, string> {
  const fields: Record<string, string> = {}
  const covA = text.match(/coverage\s+a[^:]*:\s*\$?([\d,]+)/i)
  if (covA) fields['Dwelling (Cov A)'] = `$${covA[1]}`
  const covB = text.match(/coverage\s+b[^:]*:\s*\$?([\d,]+)/i)
  if (covB) fields['Other Structures (Cov B)'] = `$${covB[1]}`
  const covC = text.match(/coverage\s+c[^:]*:\s*\$?([\d,]+)/i)
  if (covC) fields['Personal Property (Cov C)'] = `$${covC[1]}`
  const ale = text.match(/(?:coverage\s+d|additional\s+living\s+expense|loss\s+of\s+use)[^:]*:\s*\$?([\d,]+)/i)
  if (ale) fields['Loss of Use / ALE'] = `$${ale[1]}`
  const ded = text.match(/(?:all[- ]peril\s+)?deductible[^:]*:\s*\$?([\d,]+)/i)
  if (ded) fields['Deductible'] = `$${ded[1]}`
  const policy = text.match(/policy\s+(?:number|no\.?|#)[^:]*:\s*([A-Z0-9\-]+)/i)
  if (policy) fields['Policy Number'] = policy[1]
  if (/flood\s+(?:is\s+)?excluded|excludes?\s+flood/i.test(text)) {
    fields['⚠️ Flood Exclusion'] = 'YES — flood damage is excluded. Separate flood policy needed.'
  }
  return fields
}

const DOC_TYPE_LABELS: Record<DocType, string> = {
  policy_declarations: '📋 INSURANCE DECLARATIONS PAGE',
  flood_policy: '🌊 FLOOD INSURANCE POLICY',
  homeowners_policy: '🏠 HOMEOWNERS INSURANCE POLICY',
  policy_endorsement: '📎 POLICY ENDORSEMENT',
  building_document: '🏗️ BUILDING / PROPERTY DOCUMENT',
  claim_document: '📁 CLAIM DOCUMENT',
  document: '📄 DOCUMENT',
}

function buildDocumentHeader(text: string, fileName: string, docType: DocType): string {
  const label = DOC_TYPE_LABELS[docType]
  const lines = [`[${label}: ${fileName}]`]
  if (docType !== 'building_document' && docType !== 'document') {
    const fields = extractInsuranceFields(text)
    if (Object.keys(fields).length > 0) {
      lines.push('\nKEY COVERAGE DATA EXTRACTED:')
      for (const [k, v] of Object.entries(fields)) {
        lines.push(`  • ${k}: ${v}`)
      }
    }
  }
  lines.push('\nFULL TEXT:')
  return lines.join('\n')
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Process a downloaded attachment buffer into something the agent can use.
 * Images → base64 for Claude Vision.
 * PDFs → text-extracted via pdf-parse (optional dep).
 * Audio → real Whisper transcription (falls back to friendly message if no key).
 * Video → extract audio track, then Whisper (same fallback).
 */
export async function processAttachment(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<AttachmentResult> {
  const sizeBytes = buffer.length
  const normalizedMime = mimeType.toLowerCase().split(';')[0].trim()

  // Images — pass as base64 to Claude Vision
  if (SUPPORTED_IMAGE_TYPES.has(normalizedMime)) {
    return {
      type: 'image',
      content: buffer.toString('base64'),
      mediaType: normalizedMime === 'image/jpg' ? 'image/jpeg' : normalizedMime,
      fileName,
      sizeBytes,
    }
  }

  // PDFs — extract text via pdf-parse v2
  if (normalizedMime === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
    try {
      // pdf-parse v2 uses named export PDFParse (not a default function)
      const { PDFParse } = await import('pdf-parse') as { PDFParse: new (opts: { data: Buffer }) => { getText(): Promise<{ text: string }> } }
      const parser = new PDFParse({ data: buffer })
      const parsed = await parser.getText()
      const text = parsed.text?.trim() ?? ''
      if (text.length > 0) {
        const docType = classifyDocument(text, fileName)
        const header = buildDocumentHeader(text, fileName, docType)
        return {
          type: 'pdf_text',
          content: `${header}\n\n${text.slice(0, 12000)}${text.length > 12000 ? '\n\n[...document continues — key sections extracted above...]' : ''}`,
          fileName,
          sizeBytes,
        }
      }
      return {
        type: 'pdf_text',
        content: `[PDF: ${fileName} — the document was received but no text could be extracted. It may be a scanned image. Please describe what it says and I'll help you from there.]`,
        fileName,
        sizeBytes,
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`[attachments] PDF text extraction failed for ${fileName}: ${msg}`)
      return {
        type: 'pdf_text',
        content: `[PDF: ${fileName} — I received your document but couldn't read the text right now. Please paste the key section directly into the chat and I'll help you from there.]`,
        fileName,
        sizeBytes,
      }
    }
  }

  // Audio — transcribe via Whisper
  if (SUPPORTED_AUDIO_TYPES.has(normalizedMime) || normalizedMime.startsWith('audio/')) {
    const transcript = await transcribeWithWhisper(buffer, normalizedMime, fileName)
    if (transcript) {
      return {
        type: 'transcript',
        content: `[Transcription of ${fileName}]\n\n${transcript}`,
        fileName,
        sizeBytes,
      }
    }
    console.info(`[attachments] Voice transcription unavailable for ${fileName} — OPENAI_API_KEY not set`)
    return {
      type: 'audio_fallback',
      content: `[Voice message received (${(sizeBytes / 1024).toFixed(1)} KB). Voice transcription is not available right now — please type the key point and I'll help you from there.]`,
      fileName,
      sizeBytes,
    }
  }

  // Video — extract audio first, then transcribe
  if (SUPPORTED_VIDEO_TYPES.has(normalizedMime) || normalizedMime.startsWith('video/')) {
    const audioBuffer = await extractAudioFromVideo(buffer, fileName)
    if (audioBuffer) {
      const transcript = await transcribeWithWhisper(audioBuffer, 'audio/wav', `${fileName}.wav`)
      if (transcript) {
        return {
          type: 'transcript',
          content: `[Transcription of video ${fileName}]\n\n${transcript}`,
          fileName,
          sizeBytes,
        }
      }
    }
    // ffmpeg not available or transcription failed — safe client fallback
    console.info(`[attachments] Video transcription unavailable for ${fileName}`)
    return {
      type: 'unsupported',
      content: `[Video received (${(sizeBytes / 1024).toFixed(1)} KB). Video transcription is not available right now — please describe what's in the video and I'll help you from there.]`,
      fileName,
      sizeBytes,
    }
  }

  return {
    type: 'unsupported',
    content: `[File received: ${fileName} (${normalizedMime}, ${(sizeBytes / 1024).toFixed(1)} KB). This file type cannot be processed yet.]`,
    fileName,
    sizeBytes,
  }
}

// Matches US addresses with 5-digit zip first; falls back to city/country without zip.
const ADDRESS_PATTERNS = [
  /\b(\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct|Place|Pl)\b[,\s]+[\w\s,]+\d{5}(?:-\d{4})?)/i,
  /\b(\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct|Place|Pl)\b[,\s]+[\w\s,]+)/i,
]

export function extractAddress(text: string): string | null {
  for (const pattern of ADDRESS_PATTERNS) {
    const match = text.match(pattern)
    if (match) return match[1].trim()
  }
  return null
}

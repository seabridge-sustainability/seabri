import { useEffect, useRef } from 'react'

interface Props {
  active: boolean
  onToggle: () => void
  onTranscript: (text: string) => void
  disabled?: boolean
}

export function VoiceButton({ active, onToggle, onTranscript, disabled }: Props) {
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const supported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  useEffect(() => {
    if (!supported) return
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = false
    rec.lang = 'en-US'
    rec.onresult = (e) => {
      const text = Array.from({ length: e.results.length }, (_, i) => e.results[i])
        .slice(e.resultIndex)
        .map((r) => r[0].transcript)
        .join(' ')
        .trim()
      if (text) onTranscript(text)
    }
    recognitionRef.current = rec
    return () => {
      rec.abort()
    }
  }, [supported, onTranscript])

  useEffect(() => {
    if (!recognitionRef.current) return
    if (active) {
      try { recognitionRef.current.start() } catch { /* already started */ }
    } else {
      try { recognitionRef.current.stop() } catch { /* already stopped */ }
    }
  }, [active])

  if (!supported) return null

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      title={active ? 'Stop voice input' : 'Start voice input'}
      style={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        border: active ? '2px solid #ef4444' : '2px solid #374151',
        background: active ? 'rgba(239,68,68,0.15)' : 'rgba(55,65,81,0.2)',
        color: active ? '#ef4444' : '#9ca3af',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'all 0.2s',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {active ? (
        // Recording indicator
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="4" height="12" rx="1" />
          <rect x="14" y="6" width="4" height="12" rx="1" />
        </svg>
      ) : (
        // Microphone
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="2" width="6" height="11" rx="3" />
          <path d="M5 10a7 7 0 0 0 14 0" />
          <line x1="12" y1="19" x2="12" y2="22" />
          <line x1="8" y1="22" x2="16" y2="22" />
        </svg>
      )}
    </button>
  )
}

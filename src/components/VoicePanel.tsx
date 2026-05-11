import { useState, useCallback, useRef, useEffect } from 'react'

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking'

interface VoicePanelProps {
  onSend?: (transcript: string) => Promise<string>
}

const STATE_LABELS: Record<VoiceState, string> = {
  idle: 'Tap to speak',
  listening: 'Listening...',
  processing: 'Thinking...',
  speaking: 'Speaking...',
}

const STATE_COLORS: Record<VoiceState, string> = {
  idle: 'var(--text-muted, #888)',
  listening: '#34d399',
  processing: '#fbbf24',
  speaking: '#38bdf8',
}

export function VoicePanel({ onSend }: VoicePanelProps) {
  const [state, setState] = useState<VoiceState>('idle')
  const [transcript, setTranscript] = useState('')
  const [response, setResponse] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [supported, setSupported] = useState(true)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSupported(false)
    }
  }, [])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort()
      recognitionRef.current = null
    }
  }, [])

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel()
    synthRef.current = null
  }, [])

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return
    setState('speaking')
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.95
    utterance.onend = () => {
      synthRef.current = null
      setState('idle')
    }
    utterance.onerror = () => {
      synthRef.current = null
      setState('idle')
    }
    synthRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [])

  const startListening = useCallback(() => {
    setError(null)
    setTranscript('')
    setResponse('')

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = async (event: SpeechRecognitionEvent) => {
      const text = event.results[0][0].transcript
      setTranscript(text)
      setState('processing')
      recognitionRef.current = null

      if (onSend) {
        try {
          const reply = await onSend(text)
          setResponse(reply)
          speak(reply)
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          setError(msg)
          setState('idle')
        }
      } else {
        setResponse('(No handler connected)')
        setState('idle')
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== 'aborted') {
        setError(`Speech error: ${event.error}`)
      }
      recognitionRef.current = null
      setState('idle')
    }

    recognition.onend = () => {
      if (state === 'listening') setState('idle')
    }

    recognitionRef.current = recognition
    setState('listening')
    recognition.start()
  }, [onSend, speak, state])

  const handleToggle = useCallback(() => {
    if (state === 'listening') {
      stopListening()
      setState('idle')
    } else if (state === 'speaking') {
      stopSpeaking()
      setState('idle')
    } else if (state === 'idle') {
      startListening()
    }
  }, [state, startListening, stopListening, stopSpeaking])

  if (!supported) {
    return (
      <div style={{
        padding: '20px 24px',
        background: 'var(--bg-surface)',
        borderRadius: 12,
        border: '1px solid var(--border-muted)',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: 13,
      }}>
        Speech recognition is not supported in this browser. Try Chrome or Edge.
      </div>
    )
  }

  const accentColor = STATE_COLORS[state]
  const isActive = state === 'listening'
  const buttonSize = 72

  return (
    <div style={{
      padding: '24px',
      background: 'var(--bg-surface)',
      borderRadius: 12,
      border: '1px solid var(--border-muted)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 16,
    }}>
      <h3 style={{
        margin: 0,
        fontSize: 14,
        fontWeight: 600,
        color: 'var(--text-primary)',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      }}>
        Voice Assistant
      </h3>

      <button
        onClick={handleToggle}
        disabled={state === 'processing'}
        style={{
          width: buttonSize,
          height: buttonSize,
          borderRadius: '50%',
          border: `2px solid ${accentColor}`,
          background: isActive ? accentColor : 'var(--bg-elevated)',
          cursor: state === 'processing' ? 'wait' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          boxShadow: isActive ? `0 0 20px ${accentColor}40` : 'none',
        }}
        aria-label={STATE_LABELS[state]}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={isActive ? '#0a0a0a' : accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </button>

      <span style={{
        fontSize: 12,
        color: accentColor,
        fontWeight: 500,
        minHeight: 18,
      }}>
        {STATE_LABELS[state]}
      </span>

      {transcript && (
        <div style={{
          width: '100%',
          padding: '10px 14px',
          background: 'var(--bg-elevated)',
          borderRadius: 8,
          border: '1px solid var(--border-muted)',
        }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            You said
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>
            {transcript}
          </div>
        </div>
      )}

      {response && (
        <div style={{
          width: '100%',
          padding: '10px 14px',
          background: 'var(--bg-elevated)',
          borderRadius: 8,
          border: '1px solid var(--border-muted)',
          borderLeft: '3px solid #34d399',
        }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            SeaBri
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>
            {response}
          </div>
        </div>
      )}

      {error && (
        <div style={{
          width: '100%',
          padding: '8px 14px',
          background: '#f8717120',
          borderRadius: 8,
          fontSize: 12,
          color: '#f87171',
        }}>
          {error}
        </div>
      )}
    </div>
  )
}

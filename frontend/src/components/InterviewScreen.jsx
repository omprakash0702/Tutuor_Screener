import { useState, useRef, useEffect, useCallback } from 'react'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const MIN_TURNS = 7
const MAX_TURNS = 13
const MARKER = '[INTERVIEW_COMPLETE]'

// ─── TTS ────────────────────────────────────────────────────────────────────
function speak(text, isMuted) {
  if (!window.speechSynthesis || isMuted) return
  window.speechSynthesis.cancel()

  const utter = new SpeechSynthesisUtterance(text)
  utter.rate = 1.0
  utter.pitch = 1.0
  utter.volume = 1.0

  const doSpeak = () => {
    const voices = window.speechSynthesis.getVoices()
    const voice =
      voices.find(v => v.name === 'Google US English') ||
      voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ||
      voices.find(v => v.lang === 'en-US' && !v.name.toLowerCase().includes('zira')) ||
      voices.find(v => v.lang.startsWith('en')) ||
      voices[0]
    if (voice) utter.voice = voice
    window.speechSynthesis.speak(utter)
  }

  if (window.speechSynthesis.getVoices().length > 0) {
    doSpeak()
  } else {
    window.speechSynthesis.onvoiceschanged = () => {
      doSpeak()
      window.speechSynthesis.onvoiceschanged = null
    }
  }
}

function stopSpeaking() {
  window.speechSynthesis?.cancel()
}
// ────────────────────────────────────────────────────────────────────────────

export default function InterviewScreen({ sessionId, initialGreeting, onComplete }) {
  const [messages, setMessages] = useState([
    { id: 'init', role: 'ai', content: initialGreeting }
  ])
  const [status, setStatus] = useState('idle')
  const [inputText, setInputText] = useState('')
  const [streamText, setStreamText] = useState('')
  const [isMuted, setIsMuted] = useState(false)
  const messagesEndRef = useRef(null)
  const statusRef = useRef('idle')
  const isMutedRef = useRef(false)

  const setStatusSafe = useCallback((s) => {
    statusRef.current = s
    setStatus(s)
  }, [])

  const toggleMute = () => {
    const next = !isMuted
    setIsMuted(next)
    isMutedRef.current = next
    if (next) stopSpeaking()
  }

  // Speak the initial greeting on mount
  useEffect(() => {
    const t = setTimeout(() => speak(initialGreeting, isMutedRef.current), 400)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamText])

  const turnCount = messages.filter(m => m.role === 'user').length

  const sendMessage = useCallback(async (content) => {
    const text = content.trim()
    if (!text || ['processing', 'streaming', 'done'].includes(statusRef.current)) return

    stopSpeaking()
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: text }])
    setStatusSafe('processing')
    setStreamText('')

    try {
      const response = await fetch(`${API_URL}/api/session/${sessionId}/message/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      setStatusSafe('streaming')
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let accumulated = ''
      let isComplete = false
      let finalText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const jsonStr = line.slice(6).trim()
          if (!jsonStr) continue
          try {
            const data = JSON.parse(jsonStr)
            if (data.error) throw new Error(data.error)
            if (data.text) {
              accumulated += data.text
              // Strip the marker from the live display
              setStreamText(accumulated.replace(MARKER, '').trimEnd())
            }
            if (data.done) {
              isComplete = data.is_complete ?? false
              finalText = data.final_text ?? accumulated.replace(MARKER, '').trim()
            }
          } catch (parseErr) {
            if (parseErr.message?.startsWith('HTTP') || parseErr.message?.includes('error')) {
              throw parseErr
            }
          }
        }
      }

      const cleanContent = finalText || accumulated.replace(MARKER, '').trim()
      setStreamText('')
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', content: cleanContent }])

      speak(cleanContent, isMutedRef.current)

      if (isComplete) {
        setStatusSafe('done')
        setTimeout(() => onComplete(), 2200)
      } else {
        setStatusSafe('idle')
      }

    } catch (err) {
      console.error('Stream error:', err)
      setStreamText('')
      const errMsg = 'Sorry, something went wrong. Please try again.'
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', content: errMsg }])
      speak(errMsg, isMutedRef.current)
      setStatusSafe('idle')
    }
  }, [sessionId, onComplete, setStatusSafe])

  const { isListening, interim, isSupported, startListening, stopListening } = useSpeechRecognition({
    onResult: useCallback((text) => {
      sendMessage(text)
    }, [sendMessage])
  })

  const handleMicClick = () => {
    if (['processing', 'streaming', 'done'].includes(status)) return
    if (isListening) {
      stopListening()
    } else {
      stopSpeaking()
      // Brief pause so any TTS audio tail clears before mic opens — prevents Alex's
      // voice being picked up by the microphone via speakers
      setTimeout(() => {
        startListening()
        setStatusSafe('listening')
      }, 350)
    }
  }

  useEffect(() => {
    if (!isListening && statusRef.current === 'listening') {
      setStatusSafe('idle')
    }
  }, [isListening, setStatusSafe])

  const handleTextSubmit = (e) => {
    e.preventDefault()
    if (!inputText.trim()) return
    stopSpeaking()
    sendMessage(inputText)
    setInputText('')
  }

  const isDisabled = ['processing', 'streaming', 'done'].includes(status)

  const statusLabel = () => {
    if (status === 'done') return 'Interview complete — generating report...'
    if (status === 'listening') return interim || 'Listening...'
    if (status === 'processing') return 'Processing...'
    if (status === 'streaming') return 'Alex is responding...'
    return isSupported ? 'Press the mic to speak, or type below' : 'Type your response below'
  }

  const micColor = () => {
    if (isDisabled) return 'bg-slate-700 cursor-not-allowed opacity-50'
    if (isListening) return 'bg-red-500 shadow-red-500/40 shadow-lg cursor-pointer'
    return 'bg-indigo-600 hover:bg-indigo-500 hover:shadow-indigo-500/30 hover:shadow-lg cursor-pointer'
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
            A
          </div>
          <div>
            <div className="text-white font-semibold text-sm leading-none">Alex</div>
            <div className="text-slate-500 text-xs mt-0.5">Senior Hiring Specialist</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Mute toggle */}
          <button
            onClick={toggleMute}
            title={isMuted ? 'Unmute Alex' : 'Mute Alex'}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {isMuted ? (
              /* Speaker muted */
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" />
              </svg>
            ) : (
              /* Speaker with waves */
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" />
              </svg>
            )}
          </button>

          {/* Status badge + turn counter */}
          <div className="text-right">
            <div className={`text-xs px-3 py-1 rounded-full border font-medium ${
              status === 'done'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
            }`}>
              {status === 'done' ? 'Interview Complete' : 'Interview in Progress'}
            </div>
            {status !== 'done' && (
              <div className="text-slate-600 text-xs mt-1 tabular-nums">
                {turnCount} {turnCount === 1 ? 'question' : 'questions'} answered
                {turnCount >= MIN_TURNS && (
                  <span className="text-slate-700"> · wrapping up soon</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-end gap-2.5 ${
              msg.role === 'user'
                ? 'flex-row-reverse animate-slide-right'
                : 'flex-row animate-slide-left'
            }`}
          >
            {msg.role === 'ai' && (
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0 mb-0.5 animate-pop-in">
                A
              </div>
            )}
            <div className={`max-w-[72%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-indigo-600 text-white rounded-br-sm'
                : 'bg-slate-800 text-slate-100 rounded-bl-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {/* Streaming AI message */}
        {streamText && (
          <div className="flex items-end gap-2.5 animate-slide-left">
            <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0 mb-0.5">
              A
            </div>
            <div className="max-w-[72%] bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed text-slate-100">
              {streamText}
              <span className="inline-block w-1 h-4 bg-indigo-400 ml-0.5 align-middle animate-pulse" />
            </div>
          </div>
        )}

        {/* Typing dots while waiting for stream to start */}
        {status === 'processing' && !streamText && (
          <div className="flex items-end gap-2.5 animate-slide-left">
            <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
              A
            </div>
            <div className="bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1.5 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {/* Live interim transcript */}
        {interim && (
          <div className="flex justify-end animate-slide-right">
            <div className="max-w-[72%] bg-indigo-600/30 border border-indigo-500/25 rounded-2xl rounded-br-sm px-4 py-3 text-sm text-slate-300 italic">
              {interim}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Controls */}
      <div className="border-t border-slate-800/80 bg-slate-900/80 backdrop-blur-sm px-5 py-5 shrink-0">
        <div className="flex flex-col items-center gap-3 max-w-lg mx-auto">

          <p className={`text-sm h-5 transition-all duration-200 ${
            status === 'listening' ? 'text-red-400' :
            status === 'done' ? 'text-emerald-400' :
            'text-slate-500'
          }`}>
            {statusLabel()}
          </p>

          {isSupported && (
            <button
              onClick={handleMicClick}
              disabled={isDisabled}
              aria-label={isListening ? 'Stop recording' : 'Start recording'}
              className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 ${micColor()}`}
            >
              {isListening && (
                <span className="absolute inset-0 rounded-full bg-red-500/40 animate-ping" />
              )}
              <svg className="w-6 h-6 text-white relative z-10" fill="currentColor" viewBox="0 0 24 24">
                {isListening ? (
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                ) : (
                  <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
                )}
              </svg>
            </button>
          )}

          <form onSubmit={handleTextSubmit} className="w-full flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isDisabled}
              placeholder={isSupported ? 'Or type your response...' : 'Type your response...'}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isDisabled}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shrink-0"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

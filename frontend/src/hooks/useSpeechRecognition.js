import { useState, useEffect, useRef, useCallback } from 'react'

export function useSpeechRecognition({ onResult }) {
  const [isListening, setIsListening]   = useState(false)
  const [interim, setInterim]           = useState('')
  const [isSupported, setIsSupported]   = useState(false)

  const recRef          = useRef(null)
  const accumulatedRef  = useRef('')      // all finalized text this session
  const isActiveRef     = useRef(false)  // true = user wants mic ON
  const pendingStopRef  = useRef(false)  // true = user clicked stop, fire result in onend
  const restartTimerRef = useRef(null)
  const onResultRef     = useRef(onResult)

  useEffect(() => { onResultRef.current = onResult }, [onResult])

  // ── Bootstrap recognition object once ──────────────────────────────────────
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    setIsSupported(true)

    const rec = new SR()
    rec.continuous      = true   // stay open — we manage the lifecycle
    rec.interimResults  = true
    rec.maxAlternatives = 1
    rec.lang            = 'en-US'
    recRef.current = rec

    return () => {
      clearTimeout(restartTimerRef.current)
      rec.abort()
    }
  }, [])

  // ── Attach event handlers (called each time we start a session) ────────────
  const attachHandlers = useCallback(() => {
    const rec = recRef.current
    if (!rec) return

    rec.onresult = (e) => {
      let interimText = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          accumulatedRef.current += e.results[i][0].transcript + ' '
        } else {
          interimText += e.results[i][0].transcript
        }
      }
      const preview = (accumulatedRef.current + interimText).trim()
      if (preview) setInterim(preview)
    }

    rec.onerror = (e) => {
      // no-speech: normal pause — Chrome will fire onend and we restart
      // network: transient glitch — same treatment
      // aborted: we called abort() intentionally — ignore
      if (['no-speech', 'network', 'aborted'].includes(e.error)) return

      // audio-capture / not-allowed / service-not-allowed = hard stop
      console.warn('Speech recognition error:', e.error)
      isActiveRef.current   = false
      pendingStopRef.current = false
      setIsListening(false)
      setInterim('')
    }

    rec.onend = () => {
      if (pendingStopRef.current) {
        // ── User clicked stop ──
        // Chrome has now committed all pending finals — read accumulated AFTER this event
        pendingStopRef.current = false
        const text = accumulatedRef.current.trim()
        accumulatedRef.current = ''
        if (text) onResultRef.current(text)
        return
      }

      if (isActiveRef.current) {
        // ── Chrome auto-ended (pause / ~60 s timeout) — restart immediately ──
        // A tiny delay lets Chrome release its audio handle before we re-acquire it
        clearTimeout(restartTimerRef.current)
        restartTimerRef.current = setTimeout(() => {
          if (!isActiveRef.current) return
          try {
            attachHandlers()   // re-attach so closures are fresh
            recRef.current.start()
          } catch {
            // Chrome sometimes needs another tick
            restartTimerRef.current = setTimeout(() => {
              if (!isActiveRef.current) return
              try {
                attachHandlers()
                recRef.current.start()
              } catch (err) {
                console.warn('Could not restart recognition:', err)
              }
            }, 150)
          }
        }, 80)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Public API ─────────────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (!recRef.current || isActiveRef.current) return
    accumulatedRef.current  = ''
    pendingStopRef.current  = false
    setInterim('')
    attachHandlers()
    isActiveRef.current = true
    setIsListening(true)
    try {
      recRef.current.start()
    } catch {
      isActiveRef.current = false
      setIsListening(false)
    }
  }, [attachHandlers])

  const stopListening = useCallback(() => {
    if (!recRef.current || !isActiveRef.current) return
    clearTimeout(restartTimerRef.current)
    isActiveRef.current    = false
    pendingStopRef.current = true   // onend will dispatch result once Chrome finalizes
    setIsListening(false)
    setInterim('')
    try { recRef.current.stop() } catch { /* already stopped */ }
    // ⚠ Do NOT read accumulatedRef here — Chrome fires one more onresult(final)
    //   before onend, and that's where we capture the last words.
  }, [])

  return { isListening, interim, isSupported, startListening, stopListening }
}

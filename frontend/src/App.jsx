import { useState } from 'react'
import WelcomeScreen from './components/WelcomeScreen'
import InterviewScreen from './components/InterviewScreen'
import EvaluationScreen from './components/EvaluationScreen'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function App() {
  const [screen, setScreen] = useState('welcome')
  const [sessionId, setSessionId] = useState(null)
  const [greeting, setGreeting] = useState('')
  const [evaluation, setEvaluation] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const startInterview = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/api/session/start`, { method: 'POST' })
      if (!res.ok) throw new Error('Server error')
      const data = await res.json()
      setSessionId(data.session_id)
      setGreeting(data.greeting)
      setScreen('interview')
    } catch {
      setError('Could not connect to the server. Make sure the backend is running and your OPENAI_API_KEY is set.')
    } finally {
      setLoading(false)
    }
  }

  const onInterviewComplete = async (sid) => {
    setScreen('evaluating')
    try {
      const res = await fetch(`${API_URL}/api/session/${sid}/evaluate`)
      if (!res.ok) throw new Error('Evaluation failed')
      const data = await res.json()
      setEvaluation(data)
      setScreen('evaluation')
    } catch {
      setError('Evaluation failed. Please try again.')
      setScreen('welcome')
    }
  }

  const restart = () => {
    setScreen('welcome')
    setSessionId(null)
    setGreeting('')
    setEvaluation(null)
    setError(null)
    setLoading(false)
  }

  if (screen === 'welcome') {
    return <WelcomeScreen onStart={startInterview} loading={loading} error={error} />
  }

  if (screen === 'interview') {
    return (
      <InterviewScreen
        sessionId={sessionId}
        initialGreeting={greeting}
        onComplete={() => onInterviewComplete(sessionId)}
      />
    )
  }

  if (screen === 'evaluating') {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="text-center animate-in">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="w-16 h-16 border-2 border-slate-700 rounded-full absolute" />
            <div className="w-16 h-16 border-2 border-t-indigo-500 rounded-full animate-spin absolute" />
          </div>
          <p className="text-slate-200 font-medium mb-1">Analyzing interview responses</p>
          <p className="text-slate-500 text-sm">Generating evaluation report...</p>
        </div>
      </div>
    )
  }

  if (screen === 'evaluation') {
    return <EvaluationScreen evaluation={evaluation} onRestart={restart} />
  }
}

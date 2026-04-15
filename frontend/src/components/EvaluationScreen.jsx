import { useEffect, useState } from 'react'

const METRIC_LABELS = {
  subject_knowledge: 'Subject Knowledge',
  communication:     'Communication Clarity',
  pedagogy:          'Teaching Methodology',
  adaptability:      'Adaptability',
  professionalism:   'Professionalism',
  confidence:        'Confidence & Conviction',
  friendliness:      'Warmth & Friendliness',
}

const REC = {
  HIRE: {
    label: 'Recommended to Hire',
    bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400',
    dot: 'bg-emerald-500',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  },
  CONSIDER: {
    label: 'Consider for Hire',
    bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400',
    dot: 'bg-amber-500',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>,
  },
  REJECT: {
    label: 'Do Not Proceed',
    bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400',
    dot: 'bg-red-500',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  },
}

function ScoreBar({ label, score, delay }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setWidth((score / 10) * 100), delay)
    return () => clearTimeout(t)
  }, [score, delay])
  const bar  = score >= 8 ? '#10b981' : score >= 6 ? '#f59e0b' : '#ef4444'
  const text = score >= 8 ? 'text-emerald-400' : score >= 6 ? 'text-amber-400' : 'text-red-400'
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm text-slate-400">{label}</span>
        <span className={`text-sm font-semibold tabular-nums ${text}`}>{score}/10</span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: bar, transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)' }} />
      </div>
    </div>
  )
}

function ScoreRing({ score }) {
  const [drawn, setDrawn] = useState(0)
  const r = 54, circ = 2 * Math.PI * r, target = (score / 10) * circ
  useEffect(() => { const t = setTimeout(() => setDrawn(target), 300); return () => clearTimeout(t) }, [target])
  const ring = score >= 7.5 ? '#10b981' : score >= 5.5 ? '#f59e0b' : '#ef4444'
  const text = score >= 7.5 ? 'text-emerald-400' : score >= 5.5 ? 'text-amber-400' : 'text-red-400'
  return (
    <div className="relative w-32 h-32 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={r} fill="none" stroke="#1e293b" strokeWidth="8" />
        <circle cx="64" cy="64" r={r} fill="none" stroke={ring} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ - drawn}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold tabular-nums ${text}`}>{score.toFixed(1)}</span>
        <span className="text-slate-500 text-xs">out of 10</span>
      </div>
    </div>
  )
}

function SectionHeader({ color, label }) {
  const dot = { emerald: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-red-500', indigo: 'bg-indigo-400' }
  const txt = { emerald: 'text-slate-400', amber: 'text-slate-400', red: 'text-red-400', indigo: 'text-slate-400' }
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className={`w-1.5 h-1.5 rounded-full ${dot[color]}`} />
      <p className={`text-xs font-semibold uppercase tracking-widest ${txt[color]}`}>{label}</p>
    </div>
  )
}

export default function EvaluationScreen({ evaluation, onRestart }) {
  const { scores, overall, recommendation, strengths, improvements, red_flags, evidence, summary } = evaluation
  const rec = REC[recommendation] ?? REC.CONSIDER

  return (
    <div className="min-h-screen bg-slate-950 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-4 animate-in">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-xl font-bold text-white">Interview Report</h1>
            <p className="text-slate-500 text-sm mt-0.5">Tutor Candidate Evaluation</p>
          </div>
          <button onClick={onRestart} className="text-sm text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded-lg transition-colors">
            New Interview
          </button>
        </div>

        {/* ── Overall + Verdict ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-6">
            <ScoreRing score={overall} />
            <div className="flex-1 min-w-0">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-2">Verdict</p>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-semibold mb-3 ${rec.bg} ${rec.border} ${rec.text}`}>
                {rec.icon}
                {rec.label}
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">{summary}</p>
            </div>
          </div>
        </div>

        {/* ── Score Breakdown ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <SectionHeader color="indigo" label="Score Breakdown" />
          <div className="space-y-4">
            {Object.entries(scores).map(([key, val], i) => (
              <ScoreBar key={key} label={METRIC_LABELS[key] ?? key} score={val} delay={150 + i * 100} />
            ))}
          </div>
        </div>

        {/* ── Strengths + Improvements ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <SectionHeader color="emerald" label="Strengths" />
            <ul className="space-y-3">
              {strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span className="text-slate-300 text-sm leading-snug">{s}</span>
                </li>
              ))}
              {strengths.length === 0 && <li className="text-slate-600 text-sm">None noted.</li>}
            </ul>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <SectionHeader color="amber" label="Areas to Improve" />
            <ul className="space-y-3">
              {improvements.map((imp, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
                  </svg>
                  <span className="text-slate-300 text-sm leading-snug">{imp}</span>
                </li>
              ))}
              {improvements.length === 0 && <li className="text-slate-600 text-sm">None noted.</li>}
            </ul>
          </div>
        </div>

        {/* ── Red Flags (conditional) ── */}
        {red_flags && red_flags.length > 0 && (
          <div className="bg-red-950/30 border border-red-500/25 rounded-2xl p-5">
            <SectionHeader color="red" label="Red Flags" />
            <ul className="space-y-3">
              {red_flags.map((flag, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9.303 3.376c.866 1.5-.217 3.374-1.948 3.374H4.645c-1.73 0-2.813-1.874-1.948-3.374l7.02-12.124c.866-1.5 3.032-1.5 3.898 0l7.02 12.124zM12 15.75h.007v.008H12v-.008z"/>
                  </svg>
                  <span className="text-red-300 text-sm leading-snug">{flag}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Key Quotes ── */}
        {evidence && evidence.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <SectionHeader color="indigo" label="Key Quotes from Interview" />
            <div className="space-y-3">
              {evidence.map((quote, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="text-indigo-400 text-lg leading-none font-serif mt-0.5 shrink-0">"</span>
                  <p className="text-slate-300 text-sm leading-relaxed italic border-l border-slate-700 pl-3">
                    {quote.replace(/^[""]|[""]$/g, '')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="flex justify-center pt-2 pb-6">
          <button onClick={onRestart} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/>
            </svg>
            Screen Another Candidate
          </button>
        </div>

      </div>
    </div>
  )
}

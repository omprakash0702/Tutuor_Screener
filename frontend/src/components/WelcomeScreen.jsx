export default function WelcomeScreen({ onStart, loading, error }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-lg animate-in">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <div className="text-white font-semibold text-lg leading-none">TutorScreen AI</div>
            <div className="text-slate-500 text-xs mt-0.5">Powered by GPT-4o</div>
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-3xl font-bold text-white mb-3 leading-tight">
          AI-Powered Tutor<br />Candidate Screening
        </h1>
        <p className="text-slate-400 text-base mb-8 leading-relaxed">
          A structured 6-question interview conducted by an AI hiring specialist.
          Evaluates subject knowledge, teaching ability, and communication skills.
        </p>

        {/* What to expect */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-8 space-y-3">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-4">What to expect</p>
          {[
            ['5–8 min', 'Structured 6-question interview'],
            ['Voice or text', 'Respond by speaking or typing'],
            ['Instant report', 'Scored evaluation with detailed feedback'],
          ].map(([tag, desc]) => (
            <div key={tag} className="flex items-center gap-3">
              <span className="text-xs font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                {tag}
              </span>
              <span className="text-slate-300 text-sm">{desc}</span>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={onStart}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl text-base transition-all duration-200 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              Begin Interview
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </>
          )}
        </button>

        <p className="text-center text-slate-600 text-xs mt-5">
          Tip: Use Chrome for the best voice recognition experience
        </p>
      </div>
    </div>
  )
}

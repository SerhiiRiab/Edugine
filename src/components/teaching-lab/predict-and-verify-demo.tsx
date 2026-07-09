'use client'

import { useState } from 'react'
import { RotateCcw, LayoutDashboard, Smartphone } from 'lucide-react'

const HEADLINE = 'The Six-Day Ship That Cost the World $9 Billion'

const ARTICLE =
  'In March 2021, the container ship Ever Given ran aground in the Suez Canal, wedging itself sideways across the waterway. For six days, hundreds of vessels queued on either end while engineers worked to free it, delaying an estimated $9 billion in global trade each day.'

const DISCUSSION_QUESTION = 'Did the story match your prediction? What surprised you most?'

type Phase = 'predict' | 'reveal' | 'discussion'

export function PredictAndVerifyDemo() {
  const [phase, setPhase] = useState<Phase>('predict')
  const [predictionInput, setPredictionInput] = useState('')
  const [predictionSubmitted, setPredictionSubmitted] = useState(false)

  function handleSubmitPrediction() {
    if (!predictionInput.trim() || predictionSubmitted) return
    setPredictionSubmitted(true)
  }

  function handleReveal() {
    if (phase !== 'predict') return
    setPhase('reveal')
  }

  function handleNextQuestion() {
    if (phase === 'predict') return
    setPhase('discussion')
  }

  function handleReset() {
    setPhase('predict')
    setPredictionInput('')
    setPredictionSubmitted(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-6">
        <p className="text-slate-400 text-xs">Try the demo below — no sign-up needed</p>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-violet-600
            border border-slate-200 hover:border-violet-200 rounded-lg px-3 py-1.5 transition-colors shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset demo
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Tutor View */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <LayoutDashboard className="w-4 h-4 text-violet-500" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">What the tutor sees</span>
          </div>
          <h3 className="font-bold text-slate-800 mb-4">Tutor View</h3>

          <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Headline</p>
            <p className="text-slate-700 font-semibold leading-relaxed mb-4">{HEADLINE}</p>

            <div className="bg-white rounded-lg border border-slate-100 p-3 mb-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Student&rsquo;s prediction</p>
              {predictionSubmitted ? (
                <p className="text-sm font-semibold text-slate-600">{predictionInput}</p>
              ) : (
                <p className="text-sm text-slate-400">Waiting for a prediction…</p>
              )}
            </div>

            <button
              type="button"
              onClick={handleReveal}
              disabled={phase !== 'predict'}
              className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:bg-emerald-100
                disabled:text-emerald-600 disabled:cursor-default text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors mb-4"
            >
              {phase !== 'predict' ? 'Text revealed' : 'Reveal Text'}
            </button>

            <div className="bg-white rounded-lg border border-slate-100 p-3 mb-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Full text (visible to you)</p>
              <p className="text-sm text-slate-600 leading-relaxed">{ARTICLE}</p>
            </div>

            <div className="bg-white rounded-lg border border-slate-100 p-3 mb-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Discussion question</p>
              <p className={`text-sm leading-relaxed ${phase === 'discussion' ? 'text-violet-600 font-semibold' : 'text-slate-500'}`}>
                {DISCUSSION_QUESTION}
              </p>
            </div>

            <button
              type="button"
              onClick={handleNextQuestion}
              disabled={phase === 'predict'}
              className="inline-flex items-center gap-1.5 border border-slate-200 hover:border-violet-200 hover:text-violet-600
                disabled:opacity-50 disabled:pointer-events-none text-slate-600 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Next Question
            </button>
          </div>
        </div>

        {/* Student View */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="w-4 h-4 text-violet-500" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">What the student sees</span>
          </div>
          <h3 className="font-bold text-slate-800 mb-4">Student View</h3>

          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 min-h-[260px] flex flex-col justify-center">
            {phase === 'predict' && (
              <div>
                <p className="text-white font-bold text-lg leading-relaxed text-center mb-5">{HEADLINE}</p>

                {!predictionSubmitted ? (
                  <>
                    <input
                      type="text"
                      value={predictionInput}
                      onChange={(e) => setPredictionInput(e.target.value)}
                      placeholder="What do you think this is about?"
                      className="w-full rounded-lg border-2 border-slate-700 focus:border-violet-400 bg-slate-900/60
                        text-white text-sm px-3 py-2.5 mb-3 outline-none transition-colors placeholder:text-slate-500"
                    />
                    <button
                      type="button"
                      onClick={handleSubmitPrediction}
                      disabled={!predictionInput.trim()}
                      className="w-full inline-flex items-center justify-center gap-1.5 bg-violet-600 hover:bg-violet-700
                        disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors"
                    >
                      Submit Prediction
                    </button>
                  </>
                ) : (
                  <p className="text-slate-300 text-sm text-center">
                    Prediction submitted: <span className="text-white font-semibold">&ldquo;{predictionInput}&rdquo;</span>
                    <br />
                    Waiting for the tutor to reveal the text…
                  </p>
                )}
              </div>
            )}

            {phase === 'reveal' && (
              <p className="text-white leading-relaxed">{ARTICLE}</p>
            )}

            {phase === 'discussion' && (
              <p className="text-white font-bold text-lg leading-relaxed text-center">{DISCUSSION_QUESTION}</p>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

import { useState } from 'react'
import { CheckCircle2, Loader2, Send, Sparkles } from 'lucide-react'
import { parseMapQueryAI } from '../../services/jobMapService'

const EXAMPLES = [
  'Jobs within 10km',
  '80% match and above',
  'Nearest jobs',
  'Jobs matching my skills',
  'Jobs near Urdaneta',
  'Jobs I can apply to now',
  'Jobs that match my certificates',
  'Jobs with training recommendations',
  'Jobs available at job fairs',
]

const describeFilters = (filters) => {
  const parts = []
  if (filters.radius_km) parts.push(`within ${filters.radius_km}km`)
  if (filters.min_match) parts.push(`with at least ${filters.min_match}% match`)
  if (filters.keyword) parts.push(`for “${filters.keyword}”`)
  if (filters.location_keyword) parts.push(`near “${filters.location_keyword}”`)
  if (filters.sort === 'distance') parts.push('sorted by nearest')
  if (filters.sort === 'salary') parts.push('sorted by highest salary')
  if (filters.sort === 'newest') parts.push('sorted by newest')
  if (filters.saved_only) parts.push('from your saved jobs')
  if (filters.hide_applied) parts.push('excluding applied jobs')
  if (filters.job_fair_only) parts.push('available at job fairs')
  if (filters.upskill_recommended_only) parts.push('with training recommendations')
  if (filters.certificate_match_only) parts.push('matching your certificates')
  return parts.length ? `Showing jobs ${parts.join(' ')}.` : 'Filters updated.'
}

export default function JobMapAssistant({ onFiltersParsed }) {
  const [query, setQuery] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const runQuery = async (value) => {
    const cleanQuery = value.trim()
    if (!cleanQuery) return

    setIsProcessing(true)
    setError('')
    setMessage('')

    try {
      const parsedFilters = await parseMapQueryAI(cleanQuery)
      if (!Object.keys(parsedFilters).length) {
        setError('I could not find a filter in that request. Try a distance, match level, location, or job title.')
        return
      }
      onFiltersParsed(parsedFilters)
      setMessage(describeFilters(parsedFilters))
      setQuery('')
    } catch {
      setError('The assistant is unavailable. You can still use the filters below.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <section className="border-b border-slate-200 bg-gradient-to-br from-blue-950 to-slate-900 px-4 py-3.5 text-white">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-400 text-blue-950 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <h2 className="text-xs font-bold tracking-wide text-white">AI Assistant</h2>
        </div>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          runQuery(query)
        }}
        className="relative mt-2.5"
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ask AI to find jobs, e.g. '80% match nearby'..."
          disabled={isProcessing}
          className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-3 pr-9 text-xs text-white shadow-inner outline-none transition placeholder:text-slate-400 focus:bg-white/10 focus:ring-1 focus:ring-amber-400/50 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isProcessing || !query.trim()}
          className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-amber-400 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Apply assistant query"
        >
          {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin text-white" /> : <Send className="h-3.5 w-3.5" />}
        </button>
      </form>

      <div className="mt-2.5 flex flex-wrap gap-1.5 overflow-hidden h-5 hover:h-auto hover:max-h-20 transition-all">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => runQuery(example)}
            disabled={isProcessing}
            className="shrink-0 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-300 transition hover:bg-white/20 hover:text-white disabled:opacity-50"
          >
            {example}
          </button>
        ))}
      </div>

      {message && (
        <p className="mt-2.5 flex items-start gap-1.5 rounded-md bg-emerald-500/10 px-2 py-1.5 text-[10px] leading-tight text-emerald-300 ring-1 ring-emerald-500/20">
          <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" /> {message}
        </p>
      )}
      {error && <p className="mt-2 text-[10px] leading-tight text-amber-300">{error}</p>}
    </section>
  )
}

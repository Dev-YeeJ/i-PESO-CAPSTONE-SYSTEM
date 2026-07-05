import { useRef, useState } from 'react'
import { ChevronDown, RotateCcw, Search, SlidersHorizontal } from 'lucide-react'

const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100'

export default function JobMapFilters({ filters, onFilterChange, onReset }) {
  const keywordRef = useRef(null)
  const [moreOpen, setMoreOpen] = useState(false)

  const submitKeyword = (event) => {
    event.preventDefault()
    onFilterChange({ keyword: keywordRef.current?.value.trim() || '' })
  }

  return (
    <section className="border-b border-slate-200 bg-white px-3 py-3">
      <form onSubmit={submitKeyword} className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            key={filters.keyword}
            ref={keywordRef}
            defaultValue={filters.keyword || ''}
            placeholder="Job title, employer, or skill"
            className={`${inputClass} pl-9`}
            aria-label="Search map vacancies"
          />
        </div>
        <button type="submit" className="rounded-lg bg-blue-950 px-3 text-[11px] font-bold text-white hover:bg-blue-900">
          Search
        </button>
      </form>

      <div className="mt-2 flex items-center gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Search radius</span>
          <select value={filters.radius_km} onChange={(event) => onFilterChange({ radius_km: Number(event.target.value) })} className={inputClass}>
            {[5, 10, 15, 25, 50].map((radius) => <option key={radius} value={radius}>Within {radius} km</option>)}
          </select>
        </label>
        <button
          type="button"
          onClick={() => setMoreOpen((open) => !open)}
          aria-expanded={moreOpen}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-blue-900"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" /> More
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
        </button>
        <button type="button" onClick={onReset} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-blue-900" aria-label="Reset job filters" title="Reset filters">
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      {moreOpen && (
        <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
          <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Sort
            <select value={filters.sort} onChange={(event) => onFilterChange({ sort: event.target.value })} className={`${inputClass} mt-1`}>
              <option value="distance">Nearest</option>
              <option value="match">Best match</option>
              <option value="newest">Newest</option>
              <option value="salary">Highest salary</option>
            </select>
          </label>
          <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Match
            <select value={filters.min_match} onChange={(event) => onFilterChange({ min_match: Number(event.target.value) })} className={`${inputClass} mt-1`}>
              <option value={0}>Any match</option>
              <option value={50}>50% and above</option>
              <option value={70}>70% and above</option>
              <option value={80}>80% and above</option>
            </select>
          </label>
          <label className="col-span-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Employment type
            <select value={filters.job_type} onChange={(event) => onFilterChange({ job_type: event.target.value })} className={`${inputClass} mt-1`}>
              <option value="">All employment types</option>
              <option value="Permanent/Regular">Permanent</option>
              <option value="Contractual">Contractual</option>
              <option value="Part-Time">Part-time</option>
              <option value="Freelance">Freelance</option>
            </select>
          </label>
        </div>
      )}
    </section>
  )
}

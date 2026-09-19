import { useRef, useState } from 'react'
import { Bookmark, CalendarDays, CheckCircle2, ChevronDown, RotateCcw, Search, SlidersHorizontal } from 'lucide-react'
import { ALLOWED_MATCHES, ALLOWED_RADII } from '@/services/jobMapService'

const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100'
const labelClass = 'text-[10px] font-bold uppercase tracking-wide text-slate-500'

// Quick on/off filters that previously only existed for Smart Search to set
// via natural language, with no manual control and no way to discover them —
// promoted here as compact toggle pills so they're actually reachable without
// typing a sentence.
const QUICK_TOGGLES = [
  { key: 'saved_only', label: 'Saved jobs', icon: Bookmark },
  { key: 'job_fair_only', label: 'Job Fairs', icon: CalendarDays },
  { key: 'can_apply_only', label: 'Can apply now', icon: CheckCircle2 },
]

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
        <button type="submit" className="rounded-lg bg-blue-950 px-3 text-[11px] font-bold text-white transition hover:bg-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
          Search
        </button>
      </form>

      <div className="mt-2 flex items-center gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Search radius</span>
          <select value={filters.radius_km} onChange={(event) => onFilterChange({ radius_km: Number(event.target.value) })} className={inputClass}>
            {ALLOWED_RADII.map((radius) => <option key={radius} value={radius}>Within {radius} km</option>)}
          </select>
        </label>
        <button
          type="button"
          onClick={() => setMoreOpen((open) => !open)}
          aria-expanded={moreOpen}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 hover:text-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" /> More
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
        </button>
        <button type="button" onClick={onReset} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700" aria-label="Reset job filters" title="Reset filters">
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      {moreOpen && (
        <div className="mt-2 space-y-2.5 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
          <div className="grid grid-cols-2 gap-2">
            <label className={labelClass}>
              Sort
              <select value={filters.sort} onChange={(event) => onFilterChange({ sort: event.target.value })} className={`${inputClass} mt-1`}>
                <option value="distance">Nearest</option>
                <option value="match">Best match</option>
                <option value="newest">Newest</option>
                <option value="salary">Highest salary</option>
              </select>
            </label>
            <label className={labelClass}>
              Match
              <select value={filters.min_match} onChange={(event) => onFilterChange({ min_match: Number(event.target.value) })} className={`${inputClass} mt-1`}>
                {ALLOWED_MATCHES.map((value) => (
                  <option key={value} value={value}>{value === 0 ? 'Any match' : `${value}% and above`}</option>
                ))}
              </select>
            </label>
            <label className={`col-span-2 ${labelClass}`}>
              Employment type
              <select value={filters.job_type} onChange={(event) => onFilterChange({ job_type: event.target.value })} className={`${inputClass} mt-1`}>
                <option value="">All employment types</option>
                <option value="Permanent/Regular">Permanent</option>
                <option value="Contractual">Contractual</option>
                <option value="Part-Time">Part-time</option>
                <option value="Freelance">Freelance</option>
              </select>
            </label>
            <label className={labelClass}>
              Min. salary (₱/mo)
              <input
                type="number"
                min="0"
                step="1000"
                inputMode="numeric"
                placeholder="No minimum"
                value={filters.salary_min ?? ''}
                onChange={(event) => onFilterChange({ salary_min: event.target.value })}
                className={`${inputClass} mt-1`}
              />
            </label>
            <label className={labelClass}>
              Max. salary (₱/mo)
              <input
                type="number"
                min="0"
                step="1000"
                inputMode="numeric"
                placeholder="No maximum"
                value={filters.salary_max ?? ''}
                onChange={(event) => onFilterChange({ salary_max: event.target.value })}
                className={`${inputClass} mt-1`}
              />
            </label>
          </div>

          <div>
            <p className={labelClass}>Quick filters</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {QUICK_TOGGLES.map((toggle) => {
                const Icon = toggle.icon
                const active = Boolean(filters[toggle.key])
                return (
                  <button
                    key={toggle.key}
                    type="button"
                    onClick={() => onFilterChange({ [toggle.key]: !active })}
                    aria-pressed={active}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                      active
                        ? 'border-blue-900 bg-blue-950 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-900'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" /> {toggle.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

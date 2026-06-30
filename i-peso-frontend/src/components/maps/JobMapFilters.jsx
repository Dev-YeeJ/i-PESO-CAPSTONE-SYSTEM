import { useRef, useState } from 'react'
import { ChevronDown, RotateCcw, Search, SlidersHorizontal } from 'lucide-react'

const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100'

export default function JobMapFilters({ filters, onFilterChange, onReset }) {
  const keywordRef = useRef(null)
  const locationRef = useRef(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const submitKeyword = (event) => {
    event.preventDefault()
    onFilterChange({ keyword: keywordRef.current?.value.trim() || '' })
  }

  return (
    <section className="border-b border-slate-200 bg-slate-50 px-4 py-3">
      <form onSubmit={submitKeyword} className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          key={filters.keyword}
          ref={keywordRef}
          defaultValue={filters.keyword || ''}
          placeholder="Search title, employer, skill, or place"
          className={`${inputClass} pl-9 pr-16`}
        />
        <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md bg-blue-950 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-blue-900">
          Search
        </button>
      </form>

      <div className="mt-2.5 grid grid-cols-3 gap-2">
        <select value={filters.radius_km} onChange={(event) => onFilterChange({ radius_km: Number(event.target.value) })} className={inputClass}>
          {[5, 10, 15, 25, 50].map((radius) => <option key={radius} value={radius}>Radius: {radius} km</option>)}
        </select>
        <select value={filters.min_match} onChange={(event) => onFilterChange({ min_match: Number(event.target.value) })} className={inputClass}>
          <option value={0}>Any Match</option>
          <option value={50}>50%+ Match</option>
          <option value={70}>70%+ Match</option>
          <option value={80}>80%+ Match</option>
        </select>
        <select value={filters.sort} onChange={(event) => onFilterChange({ sort: event.target.value })} className={inputClass}>
          <option value="distance">Nearest</option>
          <option value="match">Top Match</option>
          <option value="newest">Newest</option>
          <option value="salary">High Salary</option>
        </select>
      </div>

      <div className="mt-2.5 flex items-center justify-between">
        <button type="button" onClick={() => setAdvancedOpen((open) => !open)} className="flex items-center gap-1.5 rounded-md px-1 py-1 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-blue-900">
          <SlidersHorizontal className="h-3.5 w-3.5" /> {advancedOpen ? 'Hide advanced' : 'Advanced filters'}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
        </button>
        <button type="button" onClick={onReset} className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-semibold text-slate-400 transition hover:bg-slate-100 hover:text-blue-900">
          <RotateCcw className="h-3 w-3" /> Reset
        </button>
      </div>

      {advancedOpen && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="grid grid-cols-3 gap-2">
            <label className="col-span-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Job type
              <select value={filters.job_type} onChange={(event) => onFilterChange({ job_type: event.target.value })} className={`${inputClass} mt-1`}>
                <option value="">All job types</option>
                <option value="Permanent/Regular">Permanent</option>
                <option value="Contractual">Contractual</option>
                <option value="Part-Time">Part-time</option>
                <option value="Freelance">Freelance</option>
              </select>
            </label>
            <label className="col-span-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Location keyword
              <div className="mt-1 flex gap-1.5">
                <input key={filters.location_keyword} ref={locationRef} defaultValue={filters.location_keyword || ''} placeholder="e.g. Urdaneta" className={inputClass} />
                <button type="button" onClick={() => onFilterChange({ location_keyword: locationRef.current?.value.trim() || '' })} className="rounded-lg bg-blue-950 px-3 text-[10px] font-bold text-white">Apply</button>
              </div>
            </label>
            <label className="col-span-3 sm:col-span-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Min salary
              <input type="number" min="0" value={filters.salary_min} onChange={(event) => onFilterChange({ salary_min: event.target.value })} placeholder="Any" className={`${inputClass} mt-1`} />
            </label>
            <label className="col-span-3 sm:col-span-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Max salary
              <input type="number" min="0" value={filters.salary_max} onChange={(event) => onFilterChange({ salary_max: event.target.value })} placeholder="Any" className={`${inputClass} mt-1`} />
            </label>
          </div>

          <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
            {[
              ['hide_low_match', 'Hide jobs below 50% match'],
              ['hide_applied', 'Hide already applied jobs'],
              ['coordinates_only', 'Show only jobs with coordinates'],
              ['saved_only', 'Show only saved jobs'],
              ['job_fair_only', 'Show jobs available at job fairs'],
              ['upskill_recommended_only', 'Show jobs with training recommendations'],
              ['certificate_match_only', 'Show jobs matching my certificates'],
              ['can_apply_only', 'Show jobs I can apply to now'],
            ].map(([key, label]) => (
              <label key={key} className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
                <input type="checkbox" checked={Boolean(filters[key])} onChange={(event) => onFilterChange({ [key]: event.target.checked })} className="h-4 w-4 rounded border-slate-300 text-blue-900 focus:ring-blue-800" />
                {label}
              </label>
            ))}
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
              <input type="checkbox" checked={Number(filters.min_match) >= 80} onChange={(event) => onFilterChange({ min_match: event.target.checked ? 80 : 0 })} className="h-4 w-4 rounded border-slate-300 text-blue-900 focus:ring-blue-800" />
              Show only high-match jobs (80%+)
            </label>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Maximum missing skills
              <select value={filters.max_missing_skills} onChange={(event) => onFilterChange({ max_missing_skills: event.target.value })} className={`${inputClass} mt-1`}>
                <option value="">Any number</option>
                <option value="0">No missing skills</option>
                <option value="1">At most 1</option>
                <option value="2">At most 2</option>
                <option value="3">At most 3</option>
              </select>
            </label>
          </div>
        </div>
      )}
    </section>
  )
}

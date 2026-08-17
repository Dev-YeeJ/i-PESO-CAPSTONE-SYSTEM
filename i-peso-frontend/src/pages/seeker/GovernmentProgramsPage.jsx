import { BookOpenCheck, Grid2X2, List, Search, SlidersHorizontal, UsersRound, Clock3 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ProgramCard from '@/components/government-programs/ProgramCard'
import EligibilityBadge from '@/components/government-programs/EligibilityBadge'
import { EmptyState, LoadingSkeleton } from '@/components/ui'
import { PROGRAM_CATEGORIES } from '@/components/government-programs/programConstants'
import governmentProgramService from '@/services/governmentProgramService'

const initialFilters = { search: '', category: '', status: 'open' }

export default function GovernmentProgramsPage() {
  const [searchParams] = useSearchParams()
  const [filters, setFilters] = useState(() => ({ ...initialFilters, search: searchParams.get('search') || '' }))
  const [programs, setPrograms] = useState([])
  const [charter, setCharter] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState('cards')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await governmentProgramService.listSeekerPrograms({ ...filters, per_page: 30 })
      setPrograms(response.programs?.data ?? [])
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? 'Unable to load government programs.')
    } finally { setLoading(false) }
  }, [filters])

  useEffect(() => { const timer = window.setTimeout(load, 220); return () => window.clearTimeout(timer) }, [load])
  useEffect(() => { governmentProgramService.publicCitizenCharter().then((items) => setCharter(items.slice(0, 3))).catch(() => setCharter([])) }, [])

  return (
    <div className="space-y-10 pb-12 max-w-7xl mx-auto">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 px-8 py-8 text-white shadow-xl sm:px-12 sm:py-10">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl"></div>
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl"></div>
        
        <div className="relative z-10">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-300">PESO Programs Center</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-white drop-shadow-sm">Government Programs</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-blue-100">
            Browse DOLE and PESO programs — SPES, TUPAD, GIP, livelihood, training, and OFW assistance. Your profile is checked against each program's eligibility rules automatically.
          </p>
        </div>
      </div>

      {/* Category Pills */}
      <section aria-label="Program categories">
        <div className="flex flex-wrap gap-3">
          {PROGRAM_CATEGORIES.map((category) => (
            <button
              key={category.value}
              onClick={() => setFilters((current) => ({ ...current, category: current.category === category.value ? '' : category.value }))}
              className={`rounded-full px-5 py-2.5 text-sm font-bold transition-all shadow-sm ${
                filters.category === category.value 
                  ? 'bg-blue-900 text-white ring-2 ring-blue-900 ring-offset-2' 
                  : 'bg-white border border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50/50'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </section>

      {/* Control Bar & Results */}
      <section className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
           <div className="flex w-full items-center gap-2 sm:w-auto flex-1 px-4">
              <Search className="h-5 w-5 text-slate-400 shrink-0" />
              <input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search title, description, or industry..." className="w-full border-0 bg-transparent py-3 text-sm focus:outline-none focus:ring-0" />
           </div>
           
           <div className="h-px bg-slate-200 sm:h-10 sm:w-px sm:mx-2 hidden sm:block"></div>
           
           <div className="flex items-center gap-2 px-2 pb-2 sm:pb-0">
             <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} className="rounded-xl border-none bg-slate-50 px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-900 cursor-pointer hover:bg-slate-100">
               <option value="">Any Status</option>
               <option value="open">Open</option>
               <option value="closed">Closed</option>
               <option value="completed">Completed</option>
             </select>
             
             <div className="inline-flex rounded-xl bg-slate-50 p-1">
               <button onClick={() => setViewMode('cards')} title="Card view" className={`rounded-lg p-2 transition-colors ${viewMode === 'cards' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><Grid2X2 className="h-4 w-4" /></button>
               <button onClick={() => setViewMode('list')} title="List view" className={`rounded-lg p-2 transition-colors ${viewMode === 'list' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><List className="h-4 w-4" /></button>
             </div>
           </div>
        </div>

        {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">{error}</div>}
        
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3"><LoadingSkeleton variant="card" rows={3} /><LoadingSkeleton variant="card" rows={3} /><LoadingSkeleton variant="card" rows={3} /></div>
        ) : programs.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 shadow-sm">
             <EmptyState filtered icon={BookOpenCheck} title="No programs match these filters" description="Try clearing or broadening the filters above." action={{ label: 'Clear filters', onClick: () => setFilters(initialFilters) }} />
          </div>
        ) : viewMode === 'cards' ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{programs.map((program) => <ProgramCard key={program.program_id} program={program} to={`/seeker/government-programs/${program.program_id}`} />)}</div>
        ) : (
          <div className="space-y-3">{programs.map((program) => <ProgramListRow key={program.program_id} program={program} />)}</div>
        )}
      </section>

      {charter.length > 0 && (
        <section className="mt-12 rounded-3xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-8 shadow-sm">
          <div className="mb-8 text-center max-w-2xl mx-auto">
             <h2 className="text-2xl font-black text-slate-900 tracking-tight">PESO Citizen Charter</h2>
             <p className="mt-2 text-base text-slate-500">Service requirements, processing commitments, and responsible offices to guide your walk-in applications.</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {charter.map((service) => (
              <article key={service.service_id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="font-black text-slate-900 text-lg leading-tight">{service.service_name}</h3>
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">{service.description}</p>
                <dl className="mt-6 space-y-3 text-sm border-t border-slate-100 pt-4">
                  <div className="flex justify-between gap-3"><dt className="font-bold text-slate-400">Processing</dt><dd className="text-right font-semibold text-slate-700">{service.processing_time || 'Not specified'}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="font-bold text-slate-400">Fees</dt><dd className="text-right font-semibold text-slate-700">{service.fees || 'None'}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function ProgramListRow({ program }) {
  return (
    <article className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-[1fr_auto_auto] sm:items-center shadow-sm transition hover:border-blue-200 hover:shadow-md group">
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] uppercase tracking-wider font-extrabold text-blue-700">
            {program.category.replaceAll('_', ' ')}
          </span>
          <EligibilityBadge eligibility={program.eligibility} />
        </div>
        <h3 className="text-lg font-black text-slate-900 group-hover:text-blue-900 transition-colors">{program.title}</h3>
        <p className="mt-1 line-clamp-1 text-sm text-slate-500">{program.short_description || program.description}</p>
      </div>
      <div className="text-sm font-semibold text-slate-500 bg-slate-50 rounded-xl px-4 py-2 border border-slate-100">
        <p className="flex items-center gap-2"><UsersRound className="h-4 w-4 text-emerald-400" />{program.total_slots === 0 ? 'Open capacity' : `${program.available_slots} slots left`}</p>
        <p className="mt-1 flex items-center gap-2"><Clock3 className="h-4 w-4 text-blue-400" />Deadline {program.application_deadline || 'not set'}</p>
      </div>
      <Link to={`/seeker/government-programs/${program.program_id}`} className="inline-flex h-full min-h-[44px] items-center justify-center rounded-xl bg-slate-900 px-6 text-sm font-extrabold text-white transition hover:bg-blue-900 shadow-sm">
        View
      </Link>
    </article>
  )
}

import { BookOpenCheck, Grid2X2, List, Search, SlidersHorizontal } from 'lucide-react'
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
    <div className="space-y-8">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase text-blue-800">PESO Programs Center</p>
          <h1 className="mt-1 text-3xl font-black text-slate-950">Government Programs</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Browse DOLE and PESO programs — SPES, TUPAD, GIP, livelihood, training, and OFW assistance. Your profile is checked against each program's eligibility rules automatically.</p>
        </div>
        <Link to="/seeker/program-applications" className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2.5 text-sm font-bold text-white"><BookOpenCheck className="h-4 w-4" />My Applications</Link>
      </header>

      <section aria-label="Program categories">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {PROGRAM_CATEGORIES.map((category) => (
            <button
              key={category.value}
              onClick={() => setFilters((current) => ({ ...current, category: current.category === category.value ? '' : category.value }))}
              className={`min-h-20 rounded-lg border px-3 py-3 text-left text-xs font-extrabold leading-5 transition ${filters.category === category.value ? 'border-blue-900 bg-blue-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'}`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2"><SlidersHorizontal className="h-5 w-5 text-slate-500" /><h2 className="text-xl font-black text-slate-950">Browse programs</h2></div>
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1">
            <button onClick={() => setViewMode('cards')} title="Card view" className={`rounded-md p-2 ${viewMode === 'cards' ? 'bg-blue-900 text-white' : 'text-slate-500'}`}><Grid2X2 className="h-4 w-4" /></button>
            <button onClick={() => setViewMode('list')} title="List view" className={`rounded-md p-2 ${viewMode === 'list' ? 'bg-blue-900 text-white' : 'text-slate-500'}`}><List className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="relative sm:col-span-2 lg:col-span-2">
            <span className="sr-only">Search programs</span>
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search title, description, or industry" className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm" />
          </label>
          <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
            <option value="">Any status</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
        {loading ? (
          <LoadingSkeleton variant="card" rows={3} />
        ) : programs.length === 0 ? (
          <EmptyState filtered icon={BookOpenCheck} title="No programs match these filters" description="Try clearing or broadening the filters above." action={{ label: 'Clear filters', onClick: () => setFilters(initialFilters) }} />
        ) : viewMode === 'cards' ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{programs.map((program) => <ProgramCard key={program.program_id} program={program} to={`/seeker/government-programs/${program.program_id}`} />)}</div>
        ) : (
          <div className="space-y-2">{programs.map((program) => <ProgramListRow key={program.program_id} program={program} />)}</div>
        )}
      </section>

      {charter.length > 0 && (
        <section className="border-t border-slate-200 pt-7">
          <div className="mb-4"><h2 className="text-xl font-black text-slate-950">PESO Citizen Charter</h2><p className="mt-1 text-sm text-slate-500">Service requirements, processing commitments, and responsible offices.</p></div>
          <div className="grid gap-3 lg:grid-cols-3">
            {charter.map((service) => (
              <article key={service.service_id} className="rounded-lg border border-slate-200 bg-white p-5">
                <h3 className="font-black text-slate-950">{service.service_name}</h3>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{service.description}</p>
                <dl className="mt-4 space-y-2 text-xs">
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
    <article className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-extrabold text-blue-800">{program.category.replaceAll('_', ' ').toUpperCase()}</p>
          <EligibilityBadge eligibility={program.eligibility} />
        </div>
        <h3 className="mt-1 font-black text-slate-950">{program.title}</h3>
        <p className="mt-1 line-clamp-1 text-sm text-slate-500">{program.short_description || program.description}</p>
      </div>
      <div className="text-xs font-semibold text-slate-500">
        <p>{program.total_slots === 0 ? 'Open capacity' : `${program.available_slots} slots left`}</p>
        <p className="mt-1">Deadline {program.application_deadline || 'not set'}</p>
      </div>
      <Link to={`/seeker/government-programs/${program.program_id}`} className="inline-flex items-center justify-center gap-1 rounded-lg border border-blue-900 px-3 py-2 text-sm font-bold text-blue-900">View</Link>
    </article>
  )
}

import { createElement, useCallback, useEffect, useState } from 'react'
import { BookOpenCheck, BriefcaseBusiness, CalendarClock, CheckCircle2, GraduationCap, Plus, Search, UsersRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { PROGRAM_CATEGORIES, PROGRAM_STATUSES } from '@/components/government-programs/programConstants'
import PageHeader from '@/pages/admin/_components/PageHeader'
import governmentProgramService from '@/services/governmentProgramService'
import GovernmentProgramsList from './GovernmentProgramsList'

const initialFilters = { search: '', category: '', status: '' }

export default function GovernmentProgramsDashboard() {
  const navigate = useNavigate()
  const [analytics, setAnalytics] = useState(null)
  const [programs, setPrograms] = useState([])
  const [filters, setFilters] = useState(initialFilters)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [archiveTarget, setArchiveTarget] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [stats, list] = await Promise.all([
        governmentProgramService.adminAnalytics(),
        governmentProgramService.adminPrograms({ ...filters, per_page: 50 }),
      ])
      setAnalytics(stats)
      setPrograms(list.data ?? [])
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? 'Unable to load Government Programs data.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    const timer = window.setTimeout(load, 220)
    return () => window.clearTimeout(timer)
  }, [load])

  const archive = async () => {
    if (!archiveTarget) return
    try {
      await governmentProgramService.archiveProgram(archiveTarget.program_id)
      toast.success('Program archived.')
      setArchiveTarget(null)
      await load()
    } catch (requestError) {
      toast.error(requestError.response?.data?.message ?? 'Unable to archive the program.')
    }
  }

  const metrics = [
    ['Active programs', analytics?.active_programs ?? 0, BookOpenCheck, 'text-blue-700 bg-blue-50'],
    ['Total applicants', analytics?.total_applicants ?? 0, UsersRound, 'text-cyan-700 bg-cyan-50'],
    ['Approved beneficiaries', analytics?.approved_beneficiaries ?? 0, CheckCircle2, 'text-emerald-700 bg-emerald-50'],
    ['Completed participants', analytics?.completed_participants ?? 0, GraduationCap, 'text-violet-700 bg-violet-50'],
    ['Open programs', analytics?.open_programs ?? 0, CalendarClock, 'text-amber-700 bg-amber-50'],
    ['Closed programs', analytics?.closed_programs ?? 0, CalendarClock, 'text-slate-700 bg-slate-100'],
    ['Employer skill demands', analytics?.employer_skill_demands ?? 0, BriefcaseBusiness, 'text-rose-700 bg-rose-50'],
    ['Training skills linked', analytics?.training_skills_linked ?? 0, GraduationCap, 'text-teal-700 bg-teal-50'],
  ]

  return (
    <div className="portal-page space-y-6">
      <PageHeader
        eyebrow="Government & DOLE"
        title="Programs Center & Upskill Hub"
        subtitle="Publish PESO services, manage beneficiaries, and connect employer demand to local training."
        actions={[
          { label: 'Skill Demands', onClick: () => navigate('/admin/employer-skill-demands'), variant: 'outline' },
          { label: 'Citizen Charter', onClick: () => navigate('/admin/citizen-charter'), variant: 'outline' },
          { label: 'Create Program', onClick: () => navigate('/admin/government-programs/create'), icon: Plus },
        ]}
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Program analytics">
        {metrics.map(([label, value, Icon, tone]) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>{createElement(Icon, { className: 'h-4 w-4' })}</div>
            <p className="mt-3 text-2xl font-black text-slate-950">{value}</p>
            <p className="mt-1 text-xs font-bold leading-5 text-slate-500">{label}</p>
          </div>
        ))}
      </section>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div><h2 className="text-lg font-black text-slate-950">Program Directory</h2><p className="mt-1 text-sm text-slate-500">Job Fair remains available as its own operational module and program category.</p></div>
            <div className="grid gap-2 sm:grid-cols-3 lg:w-[660px]">
              <label className="relative">
                <span className="sr-only">Search programs</span>
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search programs" className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10" />
              </label>
              <select value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-900">
                <option value="">All categories</option>
                {PROGRAM_CATEGORIES.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
              </select>
              <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-900">
                <option value="">All statuses</option>
                {PROGRAM_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
              </select>
            </div>
          </div>
        </div>
        <GovernmentProgramsList programs={programs} loading={loading} onArchive={setArchiveTarget} />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-black text-slate-950">Top requested skills</h2>
          <div className="mt-4 space-y-3">
            {(analytics?.top_requested_skills ?? []).length === 0 && <p className="text-sm text-slate-500">Employer demand data will appear here after submissions.</p>}
            {(analytics?.top_requested_skills ?? []).map((skill) => <div key={skill.skill_name} className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm"><span className="font-bold text-slate-700">{skill.skill_name}</span><span className="text-slate-500">{skill.workers_needed} workers</span></div>)}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-black text-slate-950">Upcoming deadlines</h2>
          <div className="mt-4 space-y-3">
            {(analytics?.upcoming_deadlines ?? []).length === 0 && <p className="text-sm text-slate-500">No deadlines in the next 30 days.</p>}
            {(analytics?.upcoming_deadlines ?? []).map((program) => <button key={program.program_id} onClick={() => navigate(`/admin/government-programs/${program.program_id}`)} className="flex w-full items-center justify-between border-b border-slate-100 pb-3 text-left text-sm"><span className="font-bold text-slate-700">{program.program_name}</span><span className="text-slate-500">{new Date(`${program.application_deadline}T00:00:00`).toLocaleDateString()}</span></button>)}
          </div>
        </div>
      </section>

      {archiveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-black text-slate-950">Archive program?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{archiveTarget.title} will be removed from public browsing. Existing application records remain available.</p>
            <div className="mt-6 flex justify-end gap-2"><button onClick={() => setArchiveTarget(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">Cancel</button><button onClick={archive} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white">Archive</button></div>
          </div>
        </div>
      )}
    </div>
  )
}

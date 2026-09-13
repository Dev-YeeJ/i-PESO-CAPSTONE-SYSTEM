import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarCheck2, CalendarClock, CalendarDays, CheckCircle2, ClipboardEdit, Flame, MapPin, Pencil, Plus, Radio, Trash2, Users, UsersRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button, EmptyState, LoadingSkeleton, StatCard } from '@/components/ui'
import { ConfirmModal, StatusBadge } from '@/pages/admin/_components'
import { adminService } from '@/services/adminService'

const formatDate = (value) => value ? new Date(value).toLocaleDateString() : 'TBD'

const metricTiles = [
  ['approved', 'Approved', CheckCircle2, 'border-emerald-100 bg-emerald-50 text-emerald-700'],
  ['total_applicants', 'Applicants', Users, 'border-blue-100 bg-blue-50 text-blue-700'],
  ['total_hots', 'HOTS', Flame, 'border-amber-100 bg-amber-50 text-amber-700'],
  ['proxy_reports', 'Proxy Reports', ClipboardEdit, 'border-violet-100 bg-violet-50 text-violet-700'],
]

function Info({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-white shadow-sm">
        {Icon && <Icon className="h-4 w-4 text-indigo-400" />}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <p className="mt-0.5 truncate text-sm font-bold text-slate-800">{value || 'To be announced'}</p>
      </div>
    </div>
  )
}

export default function JobFairsListPage() {
  const [page, setPage] = useState(1)
  const [pendingDelete, setPendingDelete] = useState(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const queryParams = useMemo(() => ({ page, per_page: 10, sort: 'newest' }), [page])

  const summaryQuery = useQuery({
    queryKey: ['admin', 'jobFairSummary'],
    queryFn: adminService.getJobFairsSummary,
    staleTime: 60_000,
  })
  const summary = {
    total: summaryQuery.data?.total ?? 0,
    upcoming: summaryQuery.data?.upcoming ?? 0,
    ongoing: summaryQuery.data?.ongoing ?? 0,
    completed: summaryQuery.data?.completed ?? 0,
  }

  const jobFairsQuery = useQuery({
    queryKey: ['jobFairs', queryParams],
    queryFn: () => adminService.getJobFairsList(queryParams),
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false,
  })

  const fairs = jobFairsQuery.data?.data ?? []
  const pagination = jobFairsQuery.data ?? {}
  const loading = jobFairsQuery.isLoading
  const errorMessage = jobFairsQuery.isError ? jobFairsQuery.error?.response?.data?.message ?? 'Unable to load job fairs.' : ''

  const refresh = () => { jobFairsQuery.refetch(); summaryQuery.refetch() }

  const removeFair = useMutation({
    mutationFn: (fairId) => adminService.deleteJobFair(fairId),
    onSuccess: () => {
      toast.success('Job fair deleted.')
      setPendingDelete(null)
      queryClient.invalidateQueries({ queryKey: ['jobFairs'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'jobFairSummary'] })
    },
    onError: (caught) => toast.error(
      caught?.response?.data?.message ?? 'Unable to delete this job fair.',
    ),
  })

  return (
    <div className="mx-auto max-w-7xl space-y-10 pb-12">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 px-8 py-8 text-white shadow-xl sm:px-12 sm:py-10">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl"></div>
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl"></div>
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-300">Government & DOLE</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-white drop-shadow-sm">Job Fairs</h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-blue-100">
              Coordinate employers before the event and automate post-event government reports.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={refresh} className="rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/20">
              Refresh
            </button>
            <Button variant="primary" icon={Plus} onClick={() => navigate('/admin/job-fairs/create')}>Create Job Fair</Button>
          </div>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={CalendarDays} color="blue" label="Total job fairs" value={summary.total} />
        <StatCard icon={CalendarClock} color="amber" label="Upcoming" value={summary.upcoming} />
        <StatCard icon={Radio} color="green" label="Ongoing" value={summary.ongoing} />
        <StatCard icon={CalendarCheck2} color="slate" label="Completed" value={summary.completed} />
      </section>

      {errorMessage && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
          <span>{errorMessage}</span>
          <button type="button" onClick={refresh} className="font-extrabold hover:underline">Try again</button>
        </div>
      )}

      {loading ? (
        <LoadingSkeleton variant="card" rows={3} />
      ) : fairs.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 shadow-sm">
          <EmptyState
            icon={CalendarDays}
            title="No job fairs scheduled"
            description="Create a job fair to coordinate employers and automate post-event government reports."
            action={{ label: 'Create job fair', icon: Plus, onClick: () => navigate('/admin/job-fairs/create') }}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {fairs.map((fair) => (
            <article key={fair.job_fair_id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-200 hover:shadow-md sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={fair.status} />
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">{fair.sector}</span>
                  </div>
                  <h2 className="mt-3 truncate text-2xl font-black tracking-tight text-slate-950">{fair.title}</h2>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Button variant="outline" icon={UsersRound} onClick={() => navigate(`/admin/job-fairs/${fair.job_fair_id}`)}>Manage</Button>
                  <Button variant="outline" icon={Pencil} onClick={() => navigate(`/admin/job-fairs/${fair.job_fair_id}/edit`)}>Edit</Button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(fair)}
                    aria-label="Delete job fair"
                    className="rounded-xl p-2.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Info icon={CalendarDays} label="Date" value={`${formatDate(fair.start_date)} to ${formatDate(fair.end_date)}`} />
                <Info icon={MapPin} label="Venue" value={fair.venue} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {metricTiles.map(([key, label, Icon, tone]) => (
                  <div key={key} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 ${tone}`}>
                    {Icon && <Icon className="h-4 w-4 shrink-0" />}
                    <div>
                      <p className="text-base font-black leading-none">{fair.metrics?.[key] ?? 0}</p>
                      <p className="mt-0.5 text-[10px] font-extrabold uppercase tracking-wide opacity-75">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && pagination.total > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row">
          <p className="text-sm text-slate-500">
            Showing <span className="font-bold text-slate-800">{pagination.from}-{pagination.to}</span> of <span className="font-bold text-slate-800">{pagination.total}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span className="text-sm text-slate-500">Page {pagination.current_page} of {pagination.last_page}</span>
            <Button variant="outline" size="sm" disabled={page >= (pagination.last_page ?? 1)} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(pendingDelete)}
        isDangerous
        title="Delete this job fair?"
        message={`"${pendingDelete?.title ?? 'This job fair'}" and its employer participation records will no longer be available in the portal. This cannot be undone.`}
        confirmText="Delete job fair"
        loading={removeFair.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => removeFair.mutate(pendingDelete.job_fair_id)}
      />
    </div>
  )
}

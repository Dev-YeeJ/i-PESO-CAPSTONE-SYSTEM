import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarCheck2, CalendarClock, CalendarDays, CheckCircle2, ClipboardEdit, Flame, Pencil, Plus, Radio, Search, Trash2, Users, UsersRound, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button, Card, EmptyState, LoadingSkeleton, StatCard } from '@/components/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmModal, PageHeader, StatusBadge } from '@/pages/admin/_components'
import { adminService } from '@/services/adminService'

const formatDate = (value) => value ? new Date(value).toLocaleDateString() : 'TBD'

const metricTiles = [
  ['approved', 'Approved', CheckCircle2, 'border-emerald-100 bg-emerald-50 text-emerald-700'],
  ['total_applicants', 'Applicants', Users, 'border-blue-100 bg-blue-50 text-blue-700'],
  ['total_hots', 'HOTS', Flame, 'border-amber-100 bg-amber-50 text-amber-700'],
  ['proxy_reports', 'Proxy Reports', ClipboardEdit, 'border-violet-100 bg-violet-50 text-violet-700'],
]

const statusOptions = [
  ['all', 'All statuses'], ['draft', 'Draft'], ['published', 'Published'], ['accepting_employers', 'Accepting employers'],
  ['upcoming', 'Upcoming'], ['ongoing', 'Ongoing'], ['closed', 'Closed'], ['completed', 'Completed'], ['cancelled', 'Cancelled'],
]
const sectorOptions = [['all', 'All sectors'], ['local', 'Local'], ['overseas', 'Overseas'], ['both', 'Local & Overseas']]
const sortOptions = [['newest', 'Newest first'], ['oldest', 'Oldest first'], ['title', 'Title A-Z']]

const initialFilters = { search: '', status: 'all', sector: 'all', sort: 'newest' }

function FilterSelect({ label, value, onChange, options, className = '' }) {
  return (
    <label className={className}>
      <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map(([value_, optionLabel]) => <SelectItem key={value_} value={value_}>{optionLabel}</SelectItem>)}
        </SelectContent>
      </Select>
    </label>
  )
}

export default function JobFairsListPage() {
  const [page, setPage] = useState(1)
  const [pendingDelete, setPendingDelete] = useState(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { watch, setValue, reset } = useForm({ defaultValues: initialFilters })
  const filters = watch()

  useEffect(() => {
    const timer = window.setTimeout(() => setPage(1), 350)
    return () => window.clearTimeout(timer)
  }, [filters])

  const updateFilter = (key, value) => setValue(key, value)
  const clearFilters = () => { reset(initialFilters); setPage(1) }
  const filtersActive = filters.search || filters.status !== 'all' || filters.sector !== 'all' || filters.sort !== 'newest'

  const queryParams = useMemo(() => ({
    page,
    per_page: 10,
    search: filters.search || undefined,
    status: filters.status !== 'all' ? filters.status : undefined,
    sector: filters.sector !== 'all' ? filters.sector : undefined,
    sort: filters.sort,
  }), [filters, page])

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
    <div className="portal-page">
      <PageHeader
        title="Job Fairs"
        subtitle="Coordinate employers before the event and automate post-event government reports."
        eyebrow="Government & DOLE"
        actions={[
          { label: 'Refresh', onClick: refresh, variant: 'secondary' },
          { label: 'Create Job Fair', onClick: () => navigate('/admin/job-fairs/create'), variant: 'primary' },
        ]}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={CalendarDays} color="blue" label="Total job fairs" value={summary.total} />
        <StatCard icon={CalendarClock} color="amber" label="Upcoming" value={summary.upcoming} />
        <StatCard icon={Radio} color="green" label="Ongoing" value={summary.ongoing} />
        <StatCard icon={CalendarCheck2} color="slate" label="Completed" value={summary.completed} />
      </section>

      <Card padding="sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[220px] flex-1">
            <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Search</span>
            <div className="relative mt-2">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={filters.search} onChange={(e) => updateFilter('search', e.target.value)} placeholder="Search by title" className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/10" />
            </div>
          </label>
          <FilterSelect label="Status" value={filters.status} onChange={(v) => updateFilter('status', v)} options={statusOptions} className="w-full sm:w-44" />
          <FilterSelect label="Sector" value={filters.sector} onChange={(v) => updateFilter('sector', v)} options={sectorOptions} className="w-full sm:w-40" />
          <FilterSelect label="Sort" value={filters.sort} onChange={(v) => updateFilter('sort', v)} options={sortOptions} className="w-full sm:w-44" />
          {filtersActive && <Button variant="outline" size="sm" icon={X} onClick={clearFilters}>Reset</Button>}
        </div>
      </Card>

      {errorMessage && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <span>{errorMessage}</span>
          <button type="button" onClick={refresh} className="font-extrabold hover:underline">Try again</button>
        </div>
      )}

      <Card padding="none">
        {loading ? (
          <div className="p-5 sm:p-6"><LoadingSkeleton variant="card" rows={3} /></div>
        ) : fairs.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            filtered={filtersActive}
            title={filtersActive ? 'No job fairs match your filters' : 'No job fairs scheduled'}
            description={filtersActive ? 'Try clearing or broadening the filters above.' : 'Create a job fair to coordinate employers and automate post-event government reports.'}
            action={filtersActive ? undefined : { label: 'Create job fair', icon: Plus, onClick: () => navigate('/admin/job-fairs/create') }}
          />
        ) : (
          <div className="divide-y divide-slate-200">
            {fairs.map((fair) => (
              <div key={fair.job_fair_id} className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-lg font-extrabold text-slate-950">{fair.title}</h3>
                    <StatusBadge status={fair.status} />
                    <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-extrabold uppercase text-slate-600">{fair.sector}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                    <span>{formatDate(fair.start_date)} to {formatDate(fair.end_date)}</span>
                    <span>{fair.venue}</span>
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
                </div>

                <div className="flex flex-wrap items-center gap-2 xl:flex-col xl:items-stretch">
                  <Button variant="outline" icon={UsersRound} onClick={() => navigate(`/admin/job-fairs/${fair.job_fair_id}`)}>Manage</Button>
                  <Button variant="outline" icon={Pencil} onClick={() => navigate(`/admin/job-fairs/${fair.job_fair_id}/edit`)}>Edit</Button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(fair)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 xl:justify-start"
                  >
                    <Trash2 className="h-3.5 w-3.5" />Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && pagination.total > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row">
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
      </Card>

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

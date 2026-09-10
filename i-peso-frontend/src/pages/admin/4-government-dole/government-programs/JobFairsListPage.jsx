import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarCheck2, CalendarClock, CalendarDays, Download, Filter, Pencil, Plus, Radio, Search, SlidersHorizontal, Trash2, UsersRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button, Card, EmptyState, LoadingSkeleton, StatCard } from '@/components/ui'
import { ConfirmModal, PageHeader, StatusBadge } from '@/pages/admin/_components'
import { adminService } from '@/services/adminService'

const formatDate = (value) => value ? new Date(value).toLocaleDateString() : 'TBD'

const metricCards = [
  ['approved', 'Approved'],
  ['total_applicants', 'Applicants'],
  ['total_hots', 'HOTS'],
  ['proxy_reports', 'Proxy Reports'],
]

const initialFilters = { search: '', status: 'all', sector: 'all', sort: 'newest' }

export default function JobFairsListPage() {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [downloadError, setDownloadError] = useState('')
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
  const errorMessage = jobFairsQuery.isError
    ? jobFairsQuery.error?.response?.data?.message ?? 'Unable to load job fairs.'
    : downloadError

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

  const downloadSprs = async (fair) => {
    try {
      const blob = await adminService.downloadJobFairSprs(fair.job_fair_id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `sprs-1-6-${fair.job_fair_id}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch (requestError) {
      setDownloadError(requestError.response?.data?.message ?? 'Unable to generate SPRS report.')
    }
  }

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
          <label className="min-w-[260px] flex-1">
            <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Search job fairs</span>
            <div className="relative mt-2">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={filters.search} onChange={(e) => updateFilter('search', e.target.value)} placeholder="Search by title" className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/10" />
            </div>
          </label>
          <label className="w-full sm:w-48">
            <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Status</span>
            <select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm">
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="accepting_employers">Accepting employers</option>
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="closed">Closed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <Button variant="outline" icon={SlidersHorizontal} onClick={() => setShowAdvancedFilters((current) => !current)}>{showAdvancedFilters ? 'Hide filters' : 'More filters'}</Button>
        </div>

        {showAdvancedFilters && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label>
              <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Sector</span>
              <select value={filters.sector} onChange={(e) => updateFilter('sector', e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm">
                <option value="all">All sectors</option>
                <option value="local">Local</option>
                <option value="overseas">Overseas</option>
                <option value="both">Local & Overseas</option>
              </select>
            </label>
            <label>
              <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Sort</span>
              <select value={filters.sort} onChange={(e) => updateFilter('sort', e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm">
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="title">Title A-Z</option>
              </select>
            </label>
          </div>
        )}

        {filtersActive && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" icon={Filter} onClick={clearFilters}>Reset filters</Button>
          </div>
        )}
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
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {metricCards.map(([key, label]) => (
                      <div key={key} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="text-lg font-black text-slate-950">{fair.metrics?.[key] ?? 0}</p>
                        <p className="text-[11px] font-extrabold uppercase text-slate-500">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 xl:flex-col xl:items-stretch">
                  <Button variant="outline" icon={UsersRound} onClick={() => navigate(`/admin/job-fairs/${fair.job_fair_id}`)}>Manage</Button>
                  <Button variant="navy" icon={Download} onClick={() => downloadSprs(fair)}>SPRS 1.6</Button>
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

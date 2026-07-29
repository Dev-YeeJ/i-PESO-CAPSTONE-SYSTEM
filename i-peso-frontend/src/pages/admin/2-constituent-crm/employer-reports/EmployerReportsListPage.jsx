import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Clock3, Flag, Search, ShieldAlert } from 'lucide-react'
import { Badge, Button, Card } from '@/components/ui'
import DataTable from '@/pages/admin/_components/DataTable'
import PageHeader from '@/pages/admin/_components/PageHeader'
import StatCard from '@/pages/admin/_components/StatCard'
import { adminService } from '@/services/adminService'
import { REPORT_REASONS, REPORT_STATUSES, reasonLabel, statusBadge, statusLabel } from '@/constants/employerReports'

const PER_PAGE = 15

export default function EmployerReportsListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [reason, setReason] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = window.setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1) }, 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const summaryQuery = useQuery({
    queryKey: ['admin', 'employerReportSummary'],
    queryFn: adminService.getEmployerReportSummary,
    staleTime: 30_000,
  })
  const summary = summaryQuery.data ?? { total: 0, pending: 0, investigating: 0, resolved: 0, dismissed: 0 }

  const queryParams = useMemo(
    () => ({ page, per_page: PER_PAGE, search: debouncedSearch || undefined, status, reason: reason || undefined }),
    [page, debouncedSearch, status, reason],
  )

  const reportsQuery = useQuery({
    queryKey: ['admin', 'employerReports', queryParams],
    queryFn: () => adminService.getEmployerReports(queryParams),
    placeholderData: (previous) => previous,
    staleTime: 15_000,
  })

  const pagination = {
    total: reportsQuery.data?.total ?? 0,
    lastPage: reportsQuery.data?.last_page ?? 1,
    from: reportsQuery.data?.from ?? 0,
    to: reportsQuery.data?.to ?? 0,
  }
  const reports = reportsQuery.data?.data ?? []
  const loading = reportsQuery.isLoading
  const error = reportsQuery.isError ? reportsQuery.error?.response?.data?.message ?? 'Unable to load employer reports.' : ''

  const columns = useMemo(() => [
    {
      key: 'employer',
      label: 'Reported Employer',
      render: (_, row) => (
        <div className="min-w-48">
          <p className="font-extrabold text-slate-950">{row.employer?.company_name || 'Unknown employer'}</p>
          <p className="truncate text-xs text-slate-500">{row.employer?.email || '—'}</p>
        </div>
      ),
    },
    {
      key: 'reason',
      label: 'Reason',
      render: (value) => <span className="text-sm font-semibold text-slate-700">{reasonLabel(value)}</span>,
    },
    {
      key: 'seeker',
      label: 'Reported By',
      render: (_, row) => (
        <div className="text-sm text-slate-600">
          <p className="font-semibold text-slate-800">{row.seeker?.name || 'Unnamed seeker'}</p>
          <p className="truncate text-xs text-slate-500">{row.seeker?.email || '—'}</p>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <Badge status={statusBadge(value)}>{statusLabel(value)}</Badge>,
    },
    {
      key: 'created_at',
      label: 'Reported',
      render: (date) => date ? <span className="whitespace-nowrap text-sm text-slate-600">{new Date(date).toLocaleDateString()}</span> : '—',
    },
    {
      key: 'id',
      label: '',
      render: () => <ArrowRight className="h-4 w-4 text-slate-400" />,
    },
  ], [])

  return (
    <div className="portal-page">
      <PageHeader
        title="Employer Reports"
        subtitle="Review seeker-filed complaints about suspicious, abusive, or fake employers and job postings."
        eyebrow="Constituent CRM"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Flag} color="slate" label="Total reports" value={num(summary.total)} subtitle="All reports filed" />
        <StatCard icon={Clock3} color="amber" label="Pending" value={num(summary.pending)} subtitle="Awaiting first review" />
        <StatCard icon={ShieldAlert} color="blue" label="Investigating" value={num(summary.investigating)} subtitle="Under active review" />
        <StatCard icon={CheckCircle2} color="green" label="Resolved" value={num(summary.resolved)} subtitle="Closed as resolved" />
      </div>

      <Card padding="sm" className="mt-6">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[260px] flex-1">
            <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Search</span>
            <div className="relative mt-2">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search employer, reporter, or description"
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/10"
              />
            </div>
          </label>
          <label className="w-full sm:w-48">
            <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Status</span>
            <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm">
              <option value="all">All statuses</option>
              {REPORT_STATUSES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="w-full sm:w-56">
            <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Reason</span>
            <select value={reason} onChange={(event) => { setReason(event.target.value); setPage(1) }} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm">
              <option value="">All reasons</option>
              {REPORT_REASONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
      </Card>

      {error && (
        <div className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{error}</span>
          <button type="button" onClick={() => reportsQuery.refetch()} className="font-extrabold hover:underline">Try again</button>
        </div>
      )}

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={reports}
          loading={loading}
          onRowClick={(row) => navigate(`/admin/employer-reports/${row.id}`)}
          emptyTitle="No employer reports"
          emptyDescription="Seeker-filed reports about employers will appear here."
          caption="Employer reports. Each row opens the full report."
        />
      </div>

      {!loading && pagination.total > 0 && (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row">
          <p className="text-sm text-slate-500">
            Showing <span className="font-bold text-slate-800">{pagination.from}-{pagination.to}</span> of <span className="font-bold text-slate-800">{pagination.total}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" icon={ArrowLeft} disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</Button>
            <span className="px-2 text-xs font-extrabold text-slate-600">Page {page} of {pagination.lastPage}</span>
            <Button variant="outline" size="sm" icon={ArrowRight} disabled={page >= pagination.lastPage} onClick={() => setPage((current) => current + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}

function num(value) { return Number(value ?? 0).toLocaleString() }

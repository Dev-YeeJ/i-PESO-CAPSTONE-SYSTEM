import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, ArrowRight, Building2, CheckCircle2, Flag, Inbox, Search, ShieldAlert, UserRound } from 'lucide-react'
import { Badge, Button, Card } from '@/components/ui'
import DataTable from '@/pages/admin/_components/DataTable'
import PageHeader from '@/pages/admin/_components/PageHeader'
import StatCard from '@/pages/admin/_components/StatCard'
import { adminSafetyReportService, safetyPriorityClass, safetyStatusBadge } from '@/services/safetyReportService'

const PER_PAGE = 15
const selectClass = 'mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm'
const labelClass = 'text-xs font-extrabold uppercase tracking-wide text-slate-500'

export default function SafetyReportsListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filters, setFilters] = useState({ status: 'open', subject_type: '', reporter_type: '', category: '', priority: '', date_from: '', date_to: '', sort: 'priority' })
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = window.setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1) }, 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const setFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value, ...(key === 'subject_type' ? { category: '' } : {}) }))
    setPage(1)
  }

  const { data: options } = useQuery({ queryKey: ['admin', 'safetyReportOptions'], queryFn: adminSafetyReportService.options, staleTime: 10 * 60_000 })
  const summaryQuery = useQuery({ queryKey: ['admin', 'safetyReportSummary'], queryFn: adminSafetyReportService.summary, staleTime: 30_000 })
  const summary = summaryQuery.data ?? {}

  const params = useMemo(() => ({ ...filters, page, per_page: PER_PAGE, search: debouncedSearch || undefined }), [filters, page, debouncedSearch])
  const reportsQuery = useQuery({
    queryKey: ['admin', 'safetyReports', params],
    queryFn: () => adminSafetyReportService.list(params),
    placeholderData: (previous) => previous,
    staleTime: 15_000,
  })
  const reports = reportsQuery.data?.data ?? []
  const pagination = {
    total: reportsQuery.data?.total ?? 0,
    lastPage: reportsQuery.data?.last_page ?? 1,
    from: reportsQuery.data?.from ?? 0,
    to: reportsQuery.data?.to ?? 0,
  }

  const categoryOptions = useMemo(() => {
    const byType = options?.categories ?? {}
    if (filters.subject_type) return byType[filters.subject_type] ?? []
    const seen = new Map()
    Object.values(byType).flat().forEach((item) => { if (!seen.has(item.value)) seen.set(item.value, item) })
    return [...seen.values()]
  }, [options, filters.subject_type])

  const columns = useMemo(() => [
    {
      key: 'case_number',
      label: 'Case',
      render: (value, row) => (
        <div className="whitespace-nowrap">
          <p className="font-mono text-sm font-bold text-slate-900">{value}</p>
          <p className="text-xs text-slate-500">{row.created_at ? new Date(row.created_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</p>
        </div>
      ),
    },
    {
      key: 'subject_name',
      label: 'Reported party',
      render: (value, row) => (
        <div className="min-w-44">
          <p className="flex items-center gap-1.5 font-extrabold text-slate-950">
            {row.subject_type === 'employer' ? <Building2 className="h-3.5 w-3.5 text-slate-400" /> : <UserRound className="h-3.5 w-3.5 text-slate-400" />}
            {value}
          </p>
          <p className="text-xs text-slate-500">{row.subject_type === 'employer' ? 'Employer / company' : 'Job seeker'}{row.vacancy_title ? ` · ${row.vacancy_title}` : ''}</p>
        </div>
      ),
    },
    {
      key: 'reporter_name',
      label: 'Reported by',
      render: (value, row) => (
        <div className="text-sm">
          <p className="font-semibold text-slate-800">{value}</p>
          <p className="text-xs text-slate-500">{row.reporter_type_label}</p>
        </div>
      ),
    },
    { key: 'category_label', label: 'Category', render: (value) => <span className="text-sm font-semibold text-slate-700">{value}</span> },
    {
      key: 'priority',
      label: 'Priority',
      render: (value, row) => <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${safetyPriorityClass(value)}`}>{row.priority_label}</span>,
    },
    { key: 'status', label: 'Status', render: (value, row) => <Badge status={safetyStatusBadge(value)}>{row.status_label}</Badge> },
    { key: 'id', label: '', render: () => <ArrowRight className="h-4 w-4 text-slate-400" /> },
  ], [])

  const error = reportsQuery.isError ? reportsQuery.error?.response?.data?.message ?? 'Unable to load safety reports.' : ''
  const num = (value) => Number(value ?? 0).toLocaleString()

  return (
    <div className="portal-page">
      <PageHeader
        title="Reports & Safety"
        subtitle="Reports from job seekers about employers and from employers about job seekers. Every report is reviewed before any action — a report is a concern, not proof."
        eyebrow="Constituent CRM"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Inbox} color="amber" label="New" value={num(summary.submitted)} subtitle="Submitted, not yet reviewed" />
        <StatCard icon={ShieldAlert} color="blue" label="Open cases" value={num(summary.open)} subtitle={`${num(summary.open_about_employers)} about employers · ${num(summary.open_about_seekers)} about job seekers`} />
        <StatCard icon={Flag} color="red" label="High priority open" value={num(summary.open_high_priority)} subtitle="Fraud, fees, harassment, identity" />
        <StatCard icon={CheckCircle2} color="green" label="Closed" value={num((summary.resolved ?? 0) + (summary.dismissed ?? 0))} subtitle={`${num(summary.resolved)} resolved · ${num(summary.dismissed)} dismissed`} />
      </div>

      <Card padding="sm" className="mt-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="sm:col-span-2">
            <span className={labelClass}>Search</span>
            <div className="relative mt-2">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Case number, name, company, email or description"
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/10"
              />
            </div>
          </label>
          <label>
            <span className={labelClass}>Status</span>
            <select value={filters.status} onChange={(event) => setFilter('status', event.target.value)} className={selectClass}>
              <option value="open">All open</option>
              <option value="all">All statuses</option>
              {(options?.statuses ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>
            <span className={labelClass}>Sort</span>
            <select value={filters.sort} onChange={(event) => setFilter('sort', event.target.value)} className={selectClass}>
              <option value="priority">Priority, then oldest</option>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
          <label>
            <span className={labelClass}>Report type</span>
            <select value={filters.subject_type} onChange={(event) => setFilter('subject_type', event.target.value)} className={selectClass}>
              <option value="">About anyone</option>
              {(options?.subject_types ?? []).map((option) => <option key={option.value} value={option.value}>About a {option.label.toLowerCase()}</option>)}
            </select>
          </label>
          <label>
            <span className={labelClass}>Reporter</span>
            <select value={filters.reporter_type} onChange={(event) => setFilter('reporter_type', event.target.value)} className={selectClass}>
              <option value="">Anyone</option>
              {(options?.reporter_types ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>
            <span className={labelClass}>Category</span>
            <select value={filters.category} onChange={(event) => setFilter('category', event.target.value)} className={selectClass}>
              <option value="">All categories</option>
              {categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>
            <span className={labelClass}>Priority</span>
            <select value={filters.priority} onChange={(event) => setFilter('priority', event.target.value)} className={selectClass}>
              <option value="">Any priority</option>
              {(options?.priorities ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>
            <span className={labelClass}>Submitted from</span>
            <input type="date" value={filters.date_from} onChange={(event) => setFilter('date_from', event.target.value)} className={selectClass} />
          </label>
          <label>
            <span className={labelClass}>Submitted to</span>
            <input type="date" value={filters.date_to} onChange={(event) => setFilter('date_to', event.target.value)} className={selectClass} />
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
          loading={reportsQuery.isLoading}
          onRowClick={(row) => navigate(`/admin/safety-reports/${row.id}`)}
          emptyTitle={filters.status === 'open' ? 'No open reports' : 'No reports match these filters'}
          emptyDescription="Reports filed by job seekers and employers appear here."
          caption="Safety reports. Each row opens the full case."
        />
      </div>

      {!reportsQuery.isLoading && pagination.total > 0 && (
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

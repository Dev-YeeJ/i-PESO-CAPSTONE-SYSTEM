import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Building2, CalendarDays, CheckCircle2, Download, Filter, Mail, MapPin, Phone, Search, SlidersHorizontal, X } from 'lucide-react'
import { Badge, Button, Card } from '@/components/ui'
import DataTable from '@/pages/admin/_components/DataTable'
import PageHeader from '@/pages/admin/_components/PageHeader'
import StatCard from '@/pages/admin/_components/StatCard'
import StatusBadge from '@/pages/admin/_components/StatusBadge'
import { adminService } from '@/services/adminService'
import { downloadBlob } from '@/services/placementReportService'
import toast from 'react-hot-toast'

// Mirrors Step2CompanyProfile.jsx's INDUSTRY_OPTIONS (and Employer::INDUSTRIES backend-side) — keep in sync.
const INDUSTRY_OPTIONS = [
  'Agriculture & Fishing', 'Construction', 'Education & Training', 'Finance & Banking', 'Food & Beverage',
  'Healthcare & Medical', 'Information Technology', 'Manufacturing', 'Real Estate', 'Retail & Commerce',
  'Transportation & Logistics', 'Tourism & Hospitality', 'Government & Public Sector', 'Other',
]

const PER_PAGE = 15

const initialFilters = {
  search: '',
  verificationStatus: 'all',
  industry: '',
  companyType: 'all',
  province: '',
  city: '',
  barangay: '',
  hasActiveVacancies: 'all',
  hasApplications: 'all',
  hasJobFair: 'all',
  documentStatus: 'all',
  dateFrom: '',
  dateTo: '',
  sort: 'latest',
}

export default function EmployersListPage() {
  const navigate = useNavigate()
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, lastPage: 1, from: 0, to: 0 })
  const { watch, reset, setValue } = useForm({ defaultValues: initialFilters })
  const filters = watch()

  useEffect(() => {
    const timer = window.setTimeout(() => setPage(1), 350)
    return () => window.clearTimeout(timer)
  }, [filters])

  const summaryQuery = useQuery({
    queryKey: ['admin', 'employerSummary'],
    queryFn: adminService.getEmployerSummary,
    staleTime: 60_000,
    retry: 1,
  })
  const summary = {
    total: summaryQuery.data?.total ?? 0,
    verified: summaryQuery.data?.verified ?? 0,
    pending: summaryQuery.data?.pending ?? 0,
    newThisMonth: summaryQuery.data?.new_this_month ?? 0,
  }

  const queryParams = useMemo(() => ({
    page,
    per_page: PER_PAGE,
    ...buildParams(filters),
  }), [filters, page])

  const [exporting, setExporting] = useState(false)

  // Exports the full filtered result set server-side, not just the visible page.
  const handleExport = async () => {
    setExporting(true)
    try {
      const blob = await adminService.exportEmployers(buildParams(filters))
      downloadBlob(blob, `employers-${new Date().toISOString().slice(0, 10)}.csv`)
      toast.success('Export ready.')
    } catch (caught) {
      toast.error(caught?.response?.data?.message ?? 'Unable to export the directory.')
    } finally {
      setExporting(false)
    }
  }

  const employersQuery = useQuery({
    queryKey: ['admin', 'employers', queryParams],
    queryFn: () => adminService.getEmployers(queryParams),
    placeholderData: (previous) => previous,
    staleTime: 30_000,
    retry: 1,
  })

  useEffect(() => {
    const result = employersQuery.data
    if (!result) return
    setPagination({
      total: result.total ?? 0,
      lastPage: result.last_page ?? 1,
      from: result.from ?? 0,
      to: result.to ?? 0,
    })
  }, [employersQuery.data])

  const employers = employersQuery.data?.data ?? []
  const loading = employersQuery.isLoading
  const error = employersQuery.isError ? employersQuery.error?.response?.data?.message ?? 'Unable to load employers.' : ''

  const filtersActive = Boolean(
    filters.search ||
    filters.verificationStatus !== 'all' ||
    filters.industry ||
    filters.companyType !== 'all' ||
    filters.province ||
    filters.city ||
    filters.barangay ||
    filters.hasActiveVacancies !== 'all' ||
    filters.hasApplications !== 'all' ||
    filters.hasJobFair !== 'all' ||
    filters.documentStatus !== 'all' ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.sort !== 'latest',
  )

  const clearFilters = () => {
    reset(initialFilters)
    setPage(1)
    setShowAdvancedFilters(false)
  }

  const updateFilter = (key, value) => {
    setValue(key, value)
    setPage(1)
  }

  const columns = useMemo(() => [
    {
      key: 'company_name',
      label: 'Employer',
      render: (_, row) => {
        const initials = (row.company_name || '?').trim().slice(0, 2).toUpperCase()
        return (
          <div className="flex min-w-64 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-navy text-xs font-black text-white">{initials}</span>
            <div className="min-w-0">
              <p className="truncate font-extrabold text-slate-950">{row.company_name || 'Unnamed employer'}</p>
              <p className="truncate text-xs capitalize text-slate-500">{row.company_type?.replaceAll('_', ' ') || 'Direct employer'}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <StatusBadge status={row.verification_status ?? 'pending'} />
                {row.missing_documents ? <Badge status="warning">Missing docs</Badge> : null}
              </div>
            </div>
          </div>
        )
      },
    },
    {
      key: 'industry',
      label: 'Industry / Location',
      render: (_, row) => (
        <div className="text-sm text-slate-600">
          <div className="font-semibold text-slate-800">{row.industry_business_type || row.industry || 'Not specified'}</div>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5 shrink-0" />{row.business_address_summary || row.complete_address || 'Not specified'}</p>
        </div>
      ),
    },
    {
      key: 'representative_name',
      label: 'Representative',
      render: (_, row) => (
        <div className="text-sm text-slate-700">
          <p className="font-semibold text-slate-800">{row.representative_name || row.representative || 'Not specified'}</p>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500"><Mail className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{row.representative_email || row.email || '—'}</span></div>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500"><Phone className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{row.representative_contact_number || row.representative_mobile || '—'}</span></div>
        </div>
      ),
    },
    {
      key: 'activity',
      label: 'Activity',
      render: (_, row) => (
        <div className="space-y-1 text-sm text-slate-600">
          <p><span className="font-semibold text-slate-800">{Number(row.active_vacancies_count ?? 0)}</span>/{Number(row.total_vacancies_count ?? 0)} vacancies</p>
          <p><span className="font-semibold text-slate-800">{Number(row.applications_received_count ?? 0)}</span> applications</p>
          <p><span className="font-semibold text-slate-800">{Number(row.hired_count ?? row.total_hired ?? 0)}</span> hired</p>
          {Number(row.job_fair_participation_count ?? 0) > 0 && <Badge status="review" className="mt-1">Job fair participant</Badge>}
        </div>
      ),
    },
    {
      key: 'created_at',
      label: 'Registered',
      render: (date) => date ? <span className="whitespace-nowrap text-sm text-slate-600">{new Date(date).toLocaleDateString()}</span> : 'N/A',
    },
    {
      key: 'employer_id',
      label: '',
      render: () => <ArrowRight className="h-4 w-4 text-slate-400" />,
    },
  ], [])

  return (
    <div className="portal-page">
      <PageHeader
        title="Employer Directory"
        subtitle="Audit companies, verify business legitimacy, and manage DOLE compliance with a cleaner admin view."
        eyebrow="Constituent CRM"
        actions={[
          { label: exporting ? 'Preparing…' : 'Export CSV', icon: Download, variant: 'outline', onClick: handleExport },
          { label: 'Open verification queue', variant: 'primary', onClick: () => navigate('/admin/verification-queue') },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Building2} color="blue" label="Total employers" value={num(summary.total)} subtitle="Registered businesses" hint="All registered employer accounts." />
        <StatCard icon={CheckCircle2} color="green" label="Verified" value={num(summary.verified)} subtitle="Approved for placements" hint="Employers approved to post vacancies." />
        <StatCard icon={Filter} color="amber" label="Pending review" value={num(summary.pending)} subtitle="Awaiting admin action" hint="Employers awaiting accreditation review." />
        <StatCard icon={CalendarDays} color="slate" label="New this month" value={num(summary.newThisMonth)} subtitle="Recently added" hint="Employers registered this calendar month." />
      </div>

      <Card padding="sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[260px] flex-1">
            <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Search directory</span>
            <div className="relative mt-2">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} placeholder="Search company, representative, email, industry, or location" className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/10" />
            </div>
          </label>
          <label className="w-full sm:w-48">
            <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Verification status</span>
            <select value={filters.verificationStatus} onChange={(event) => updateFilter('verificationStatus', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm">
              <option value="all">All statuses</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
          <label className="w-full sm:w-48">
            <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Company type</span>
            <select value={filters.companyType} onChange={(event) => updateFilter('companyType', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm">
              <option value="all">All types</option>
              <option value="direct_employer">Direct Employer</option>
              <option value="prpa">PRPA / Agency</option>
            </select>
          </label>
          <Button variant="outline" icon={SlidersHorizontal} onClick={() => setShowAdvancedFilters((current) => !current)}>{showAdvancedFilters ? 'Hide filters' : 'Advanced filters'}</Button>
        </div>

        {showAdvancedFilters && (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label><span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Industry</span><select value={filters.industry} onChange={(event) => updateFilter('industry', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm"><option value="">All industries</option>{INDUSTRY_OPTIONS.map((ind) => <option key={ind} value={ind}>{ind}</option>)}</select></label>
            <label><span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Province</span><input value={filters.province} onChange={(event) => updateFilter('province', event.target.value)} placeholder="Province" className="mt-2 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm" /></label>
            <label><span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">City / Municipality</span><input value={filters.city} onChange={(event) => updateFilter('city', event.target.value)} placeholder="City" className="mt-2 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm" /></label>
            <label><span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Barangay</span><input value={filters.barangay} onChange={(event) => updateFilter('barangay', event.target.value)} placeholder="Barangay" className="mt-2 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm" /></label>
            <label><span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Has active vacancies</span><select value={filters.hasActiveVacancies} onChange={(event) => updateFilter('hasActiveVacancies', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm"><option value="all">All</option><option value="yes">Yes</option><option value="no">No</option></select></label>
            <label><span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Has applications</span><select value={filters.hasApplications} onChange={(event) => updateFilter('hasApplications', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm"><option value="all">All</option><option value="yes">Yes</option><option value="no">No</option></select></label>
            <label><span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Has job fair</span><select value={filters.hasJobFair} onChange={(event) => updateFilter('hasJobFair', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm"><option value="all">All</option><option value="yes">Yes</option><option value="no">No</option></select></label>
            <label><span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Document status</span><select value={filters.documentStatus} onChange={(event) => updateFilter('documentStatus', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm"><option value="all">All</option><option value="missing">Missing</option><option value="uploaded">Uploaded</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label>
            <label><span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Sort</span><select value={filters.sort} onChange={(event) => updateFilter('sort', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm"><option value="latest">Latest registered</option><option value="company_name">Company name A-Z</option><option value="active_vacancy_count">Active vacancy count</option><option value="application_count">Application count</option><option value="verification_status">Verification status</option></select></label>
            <label><span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Registered from</span><input type="date" value={filters.dateFrom} onChange={(event) => updateFilter('dateFrom', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm" /></label>
            <label><span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Registered to</span><input type="date" value={filters.dateTo} onChange={(event) => updateFilter('dateTo', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm" /></label>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {filtersActive && Object.entries(filters).filter(([, value]) => value && value !== 'all' && value !== 'latest').map(([key, value]) => <button key={key} type="button" onClick={() => updateFilter(key, initialFilters[key])} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">{labelForFilter(key)}: {String(value)} <X className="h-3.5 w-3.5" /></button>)}
          {filtersActive ? <Button variant="outline" size="sm" icon={Filter} onClick={clearFilters}>Reset filters</Button> : null}
        </div>
      </Card>

      {error && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={() => employersQuery.refetch()} className="font-extrabold hover:underline">Try again</button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={employers}
        loading={loading}
        onRowClick={(row) => navigate(`/admin/employers/${row.employer_id}`)}
        emptyTitle={filtersActive ? 'No employers match your filters' : 'No employers registered yet'}
        emptyDescription={filtersActive ? 'Try clearing or broadening the filters above.' : 'Registered employers will appear here.'}
        caption="Employer directory. Each row opens the employer's profile."
      />

      {!loading && pagination.total > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row">
          <p className="text-sm text-slate-500">
            Showing <span className="font-bold text-slate-800">{pagination.from}-{pagination.to}</span> of <span className="font-bold text-slate-800">{pagination.total}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" icon={ArrowLeft} disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
              Previous
            </Button>
            <span className="px-2 text-xs font-extrabold text-slate-600">Page {page} of {pagination.lastPage}</span>
            <Button variant="outline" size="sm" icon={ArrowRight} disabled={page >= pagination.lastPage} onClick={() => setPage((current) => current + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function num(value) { return Number(value ?? 0).toLocaleString() }

function buildParams(filters) {
  const params = {
    search: filters.search || undefined,
    verification_status: filters.verificationStatus === 'all' ? undefined : filters.verificationStatus,
    industry: filters.industry || undefined,
    company_type: filters.companyType === 'all' ? undefined : filters.companyType,
    province: filters.province || undefined,
    city: filters.city || undefined,
    barangay: filters.barangay || undefined,
    has_active_vacancies: filters.hasActiveVacancies === 'all' ? undefined : filters.hasActiveVacancies === 'yes' ? 1 : 0,
    has_applications: filters.hasApplications === 'all' ? undefined : filters.hasApplications === 'yes' ? 1 : 0,
    has_job_fair: filters.hasJobFair === 'all' ? undefined : filters.hasJobFair === 'yes' ? 1 : 0,
    document_status: filters.documentStatus === 'all' ? undefined : filters.documentStatus,
    date_from: filters.dateFrom || undefined,
    date_to: filters.dateTo || undefined,
    sort: filters.sort || 'latest',
  }
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''))
}

function labelForFilter(key) {
  const labels = { search: 'Search', verificationStatus: 'Verification', industry: 'Industry', companyType: 'Type', province: 'Province', city: 'City', barangay: 'Barangay', hasActiveVacancies: 'Vacancies', hasApplications: 'Applications', hasJobFair: 'Job fair', documentStatus: 'Documents', dateFrom: 'From', dateTo: 'To', sort: 'Sort' }
  return labels[key] ?? key
}

import { createElement, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Briefcase, Building2, CalendarDays, CheckCircle2, FileText, Filter, MapPin, Search, SlidersHorizontal, X, Mail, Phone } from 'lucide-react'
import { Badge, Button, Card } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'
import StatusBadge from '@/pages/admin/_components/StatusBadge'
import { adminService } from '@/services/adminService'

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
    const timer = window.setTimeout(
      () => setPage(1),
      350,
    )
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
    per_page: 12,
    ...buildParams(filters),
  }), [filters, page])

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

  const cards = [
    { label: 'Total employers', value: summary.total, detail: 'Registered businesses', tone: 'navy', icon: Building2 },
    { label: 'Verified', value: summary.verified, detail: 'Approved for placements', tone: 'green', icon: CheckCircle2 },
    { label: 'Pending review', value: summary.pending, detail: 'Awaiting admin action', tone: 'amber', icon: Filter },
    { label: 'New this month', value: summary.newThisMonth, detail: 'Recently added', tone: 'blue', icon: CalendarDays },
  ]

  return (
    <div className="-mx-4 -mt-8 min-h-screen bg-slate-50 pb-12 sm:-mx-6">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <PageHeader title="Employer Directory" subtitle="Audit companies, verify business legitimacy, and manage DOLE compliance with a cleaner admin view." eyebrow="Constituent CRM" />
          <Button to="/admin/verification-queue" variant="primary">Open verification queue</Button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <SummaryCard key={card.label} {...card} />)}</div>

        <Card padding="sm" className="mt-6">
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
              <label><span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Industry</span><input value={filters.industry} onChange={(event) => updateFilter('industry', event.target.value)} placeholder="Industry" className="mt-2 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm" /></label>
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
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            Loading employers...
          </div>
        ) : employers.length === 0 ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            No employers match the selected filters.
          </div>
        ) : (
          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            {employers.map((employer) => (
              <EmployerCard key={employer.employer_id} employer={employer} onView={() => navigate(`/admin/employers/${employer.employer_id}`)} />
            ))}
          </div>
        )}

        {!loading && pagination.total > 0 && (
          <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row">
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
    </div>
  )
}

function SummaryCard({ icon, label, value, detail, tone }) {
  const tones = { navy: 'bg-slate-100 text-brand-navy', green: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', blue: 'bg-blue-50 text-blue-700' }
  return <Card padding="sm"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-3xl font-black text-slate-950">{Number(value ?? 0).toLocaleString()}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div><span className={`rounded-xl p-2.5 ${tones[tone]}`}>{createElement(icon, { className: 'h-5 w-5' })}</span></div></Card>
}

function EmployerCard({ employer, onView }) {
  return <Card padding="md" className="flex flex-col gap-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2"><h3 className="text-lg font-black text-slate-950">{employer.company_name}</h3><StatusBadge status={employer.verification_status ?? 'pending'} /></div>
        <p className="mt-1 text-sm text-slate-500">{employer.company_type?.replaceAll('_', ' ') || 'Direct Employer'}</p>
      </div>
      <Badge status={employer.missing_documents ? 'warning' : 'verified'}>{employer.missing_documents ? 'Missing docs' : 'Docs uploaded'}</Badge>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <InfoRow icon={Building2} label="Industry" value={employer.industry_business_type || employer.industry || 'Not specified'} />
      <InfoRow icon={MapPin} label="Address" value={employer.business_address_summary || employer.complete_address || 'Not specified'} />
      <InfoRow icon={Briefcase} label="Vacancies (active/total)" value={`${employer.active_vacancies_count ?? 0}/${employer.total_vacancies_count ?? 0}`} />
      <InfoRow icon={FileText} label="Applications / Hired" value={`${employer.applications_received_count ?? 0} / ${employer.hired_count ?? employer.total_hired ?? 0}`} />
      <InfoRow icon={Mail} label="Representative" value={employer.representative_name || employer.representative || 'Not specified'} />
      <InfoRow icon={Mail} label="Rep email" value={employer.representative_email || employer.email || 'Not specified'} />
      <InfoRow icon={Phone} label="Rep contact" value={employer.representative_contact_number || employer.representative_mobile || 'Not specified'} />
    </div>
    <div className="flex flex-wrap gap-2">
      {employer.missing_gps ? <Badge status="warning">Missing GPS</Badge> : <Badge status="active">GPS available</Badge>}
      {Number(employer.active_vacancies_count ?? 0) > 0 ? <Badge status="active">Has active vacancies</Badge> : <Badge status="neutral">No active vacancies</Badge>}
      {Number(employer.job_fair_participation_count ?? 0) > 0 ? <Badge status="review">Job fair participant</Badge> : null}
    </div>
    <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-sm text-slate-500">
      <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />{employer.created_at ? new Date(employer.created_at).toLocaleDateString() : 'N/A'}</span>
      <Button variant="outline" size="sm" onClick={onView}>View details <ArrowRight className="h-4 w-4" /></Button>
    </div>
  </Card>
}

function InfoRow({ icon, label, value }) { return <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600"><span className="mt-0.5 rounded-lg bg-white p-1.5 text-brand-navy">{createElement(icon, { className: 'h-4 w-4' })}</span><div><p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 font-semibold text-slate-800">{value}</p></div></div> }

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

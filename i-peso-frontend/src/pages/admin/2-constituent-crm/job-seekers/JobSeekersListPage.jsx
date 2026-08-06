import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Compass,
  Download,
  Filter,
  Layers3,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  UserRoundCheck,
  UsersRound,
  X,
  Mail,
  Phone,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Card } from '@/components/ui'
import DataTable from '@/pages/admin/_components/DataTable'
import PageHeader from '@/pages/admin/_components/PageHeader'
import StatCard from '@/pages/admin/_components/StatCard'
import { adminService } from '@/services/adminService'
import { downloadBlob } from '@/services/placementReportService'
import toast from 'react-hot-toast'

const PER_PAGE = 15

const initialFilters = {
  search: '',
  profileStatus: 'all',
  employmentStatus: '',
  broadField: '',
  preferredOccupation: '',
  skill: '',
  province: '',
  city: '',
  barangay: '',
  hasCertificates: 'all',
  hasApplications: 'all',
  hiredStatus: 'all',
  missingGps: 'all',
  dateFrom: '',
  dateTo: '',
  sort: 'latest',
}

export default function JobSeekersListPage() {
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
    queryKey: ['admin', 'seekerSummary'],
    queryFn: adminService.getSeekerSummary,
    staleTime: 60_000,
    retry: 1,
  })
  const summary = {
    total: summaryQuery.data?.total ?? 0,
    complete: summaryQuery.data?.complete ?? 0,
    incomplete: summaryQuery.data?.incomplete ?? 0,
    withApplications: summaryQuery.data?.with_applications ?? 0,
    hired: summaryQuery.data?.hired ?? 0,
    missingGps: summaryQuery.data?.missing_gps ?? 0,
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
      const blob = await adminService.exportSeekers(buildParams(filters))
      downloadBlob(blob, `job-seekers-${new Date().toISOString().slice(0, 10)}.csv`)
      toast.success('Export ready.')
    } catch (caught) {
      toast.error(caught?.response?.data?.message ?? 'Unable to export the directory.')
    } finally {
      setExporting(false)
    }
  }

  const seekersQuery = useQuery({
    queryKey: ['admin', 'seekers', queryParams],
    queryFn: () => adminService.getSeekers(queryParams),
    placeholderData: (previous) => previous,
    staleTime: 30_000,
    retry: 1,
  })

  useEffect(() => {
    const result = seekersQuery.data
    if (!result) return
    setPagination({
      total: result.total ?? 0,
      lastPage: result.last_page ?? 1,
      from: result.from ?? 0,
      to: result.to ?? 0,
    })
  }, [seekersQuery.data])

  const seekers = seekersQuery.data?.data ?? []
  const loading = seekersQuery.isLoading
  const error = seekersQuery.isError ? seekersQuery.error?.response?.data?.message ?? 'Unable to load job seekers.' : ''

  const completionRate = summaryQuery.data?.total ? Math.round((summaryQuery.data.complete / summaryQuery.data.total) * 100) : 0

  const filtersActive = Boolean(
    filters.search ||
    filters.profileStatus !== 'all' ||
    filters.employmentStatus ||
    filters.broadField ||
    filters.preferredOccupation ||
    filters.skill ||
    filters.province ||
    filters.city ||
    filters.barangay ||
    filters.hasCertificates !== 'all' ||
    filters.hasApplications !== 'all' ||
    filters.hiredStatus !== 'all' ||
    filters.missingGps !== 'all' ||
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
      key: 'full_name',
      label: 'Job Seeker',
      render: (_, row) => {
        const name = row.full_name || [row.first_name, row.middle_name, row.last_name, row.suffix].filter(Boolean).join(' ')
        const initials = `${row.first_name?.[0] ?? ''}${row.last_name?.[0] ?? ''}`.toUpperCase() || 'JS'
        const location = [row.address_barangay, row.address_municipality_city, row.address_province].filter(Boolean).join(', ')
        return (
          <div className="flex min-w-64 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-navy text-xs font-black text-white">{initials}</span>
            <div className="min-w-0">
              <p className="truncate font-extrabold text-slate-950">{name || 'Unnamed seeker'}</p>
              <p className="truncate text-xs text-slate-500">{row.email || 'No email on file'}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge status={row.profile_completed ? 'verified' : 'pending'}>{row.profile_completed ? 'Complete' : 'Incomplete'}</Badge>
                {row.missing_gps ? <Badge status="warning">Missing GPS</Badge> : null}
              </div>
              {location ? <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" />{location}</p> : null}
            </div>
          </div>
        )
      },
    },
    {
      key: 'contact',
      label: 'Contact',
      render: (_, row) => (
        <div className="text-sm text-slate-700">
          <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" /> <span className="truncate">{row.email || '—'}</span></div>
          <div className="mt-1 flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" /> <span className="truncate">{row.mobile_number || row.contact_number || '—'}</span></div>
        </div>
      ),
    },
    {
      key: 'preferences',
      label: 'Preferences',
      render: (_, row) => <div className="text-sm text-slate-600"><div>{row.preferred_occupation || row.preferred_job_title || '—'}</div><div className="mt-1 text-xs text-slate-500">{row.broad_field || row.broad_occupation || '—'}</div></div>,
    },
    {
      key: 'activity',
      label: 'Activity',
      render: (_, row) => (
        <div className="space-y-1 text-sm text-slate-600">
          <p><span className="font-semibold text-slate-800">{Number(row.skills_count ?? 0)}</span> skills</p>
          <p><span className="font-semibold text-slate-800">{Number(row.certificates_count ?? 0)}</span> certs</p>
          <p><span className="font-semibold text-slate-800">{Number(row.applications_count ?? 0)}</span> apps</p>
          <p><span className="font-semibold text-slate-800">{Number(row.hired_count ?? row.total_hired ?? 0)}</span> hired</p>
        </div>
      ),
    },
    {
      key: 'employment_status',
      label: 'Employment',
      render: (status) => <span className="text-sm font-semibold capitalize text-slate-700">{status?.replaceAll('_', ' ') || 'Not specified'}</span>,
    },
    {
      key: 'created_at',
      label: 'Registered',
      render: (date) => date ? <span className="whitespace-nowrap text-sm text-slate-600">{new Date(date).toLocaleDateString()}</span> : 'N/A',
    },
    {
      key: 'seeker_id',
      label: '',
      render: () => <ArrowRight className="h-4 w-4 text-slate-400" />,
    },
  ], [])

  return (
    <div className="portal-page">
      <PageHeader
        title="Job Seeker Management"
        subtitle="Monitor NSRP profile readiness, search by skills and location, and review each case profile in a defense-ready view."
        eyebrow="Constituent CRM"
        actions={[{
          label: exporting ? 'Preparing…' : 'Export CSV',
          icon: Download,
          variant: 'outline',
          onClick: handleExport,
        }]}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={UsersRound} color="blue" label="Registered seekers" value={num(summary.total)} subtitle="Total accounts in directory" hint="All job-seeker accounts in the directory." />
        <StatCard icon={UserRoundCheck} color="green" label="Complete profiles" value={num(summary.complete)} subtitle={`${completionRate}% completion rate`} hint="Profiles that meet NSRP completeness requirements." />
        <StatCard icon={Clock3} color="amber" label="Needs completion" value={num(summary.incomplete)} subtitle="Profiles requiring follow-up" hint="Profiles still missing required NSRP fields." />
        <StatCard icon={Sparkles} color="slate" label="New this month" value={num(summary.newThisMonth)} subtitle="Recently registered" hint="Seekers registered in the current calendar month." />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={BriefcaseBusiness} color="blue" label="With applications" value={num(summary.withApplications)} subtitle="Linked to a vacancy" hint="Seekers linked to at least one vacancy application." />
        <StatCard icon={CheckCircle2} color="green" label="Hired seekers" value={num(summary.hired)} subtitle="Successful placements" hint="Seekers with a recorded hire." />
        <StatCard icon={Compass} color="amber" label="Missing GPS" value={num(summary.missingGps)} subtitle="Incomplete location data" hint="Profiles without captured location coordinates — a data-quality gap." />
        <StatCard icon={Layers3} color="slate" label="Current results" value={num(pagination.total)} subtitle="Matching active filters" hint="Seekers matching the currently applied filters." />
      </div>

      <Card padding="sm" className="mt-6">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[260px] flex-1">
            <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Search directory</span>
            <div className="relative mt-2">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={filters.search}
                onChange={(event) => updateFilter('search', event.target.value)}
                placeholder="Search name, email, contact, occupation, skill, or location"
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/10"
              />
            </div>
          </label>

          <label className="w-full sm:w-48">
            <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Profile status</span>
            <select
              value={filters.profileStatus}
              onChange={(event) => updateFilter('profileStatus', event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm"
            >
              <option value="all">All profiles</option>
              <option value="complete">NSRP complete</option>
              <option value="incomplete">Needs completion</option>
            </select>
          </label>

          <label className="w-full sm:w-48">
            <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Employment status</span>
            <select
              value={filters.employmentStatus}
              onChange={(event) => updateFilter('employmentStatus', event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm"
            >
              <option value="">All statuses</option>
              <option value="employed">Employed</option>
              <option value="unemployed">Unemployed</option>
              <option value="self_employed">Self-employed</option>
            </select>
          </label>

          <Button variant="outline" icon={SlidersHorizontal} onClick={() => setShowAdvancedFilters((current) => !current)}>
            {showAdvancedFilters ? 'Hide filters' : 'Advanced filters'}
          </Button>
        </div>

        {showAdvancedFilters && (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label>
              <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Broad field</span>
              <input value={filters.broadField} onChange={(event) => updateFilter('broadField', event.target.value)} placeholder="e.g. IT" className="mt-2 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm" />
            </label>
            <label>
              <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Preferred occupation</span>
              <input value={filters.preferredOccupation} onChange={(event) => updateFilter('preferredOccupation', event.target.value)} placeholder="Occupation" className="mt-2 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm" />
            </label>
            <label>
              <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Skill</span>
              <input value={filters.skill} onChange={(event) => updateFilter('skill', event.target.value)} placeholder="Skill" className="mt-2 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm" />
            </label>
            <label>
              <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Province</span>
              <input value={filters.province} onChange={(event) => updateFilter('province', event.target.value)} placeholder="Province" className="mt-2 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm" />
            </label>
            <label>
              <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">City / municipality</span>
              <input value={filters.city} onChange={(event) => updateFilter('city', event.target.value)} placeholder="City" className="mt-2 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm" />
            </label>
            <label>
              <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Barangay</span>
              <input value={filters.barangay} onChange={(event) => updateFilter('barangay', event.target.value)} placeholder="Barangay" className="mt-2 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm" />
            </label>
            <label>
              <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Has certificates</span>
              <select value={filters.hasCertificates} onChange={(event) => updateFilter('hasCertificates', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm">
                <option value="all">All</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
            <label>
              <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Has applications</span>
              <select value={filters.hasApplications} onChange={(event) => updateFilter('hasApplications', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm">
                <option value="all">All</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
            <label>
              <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Hired status</span>
              <select value={filters.hiredStatus} onChange={(event) => updateFilter('hiredStatus', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm">
                <option value="all">All</option>
                <option value="hired">Hired</option>
                <option value="not_hired">Not hired</option>
              </select>
            </label>
            <label>
              <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Missing GPS</span>
              <select value={filters.missingGps} onChange={(event) => updateFilter('missingGps', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm">
                <option value="all">All</option>
                <option value="yes">Missing</option>
                <option value="no">Available</option>
              </select>
            </label>
            <label>
              <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Sort</span>
              <select value={filters.sort} onChange={(event) => updateFilter('sort', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm">
                <option value="latest">Latest registered</option>
                <option value="name">Name A-Z</option>
                <option value="profile_completion">Profile completion</option>
                <option value="application_count">Application count</option>
                <option value="location">Location</option>
              </select>
            </label>
            <label>
              <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Registered from</span>
              <input type="date" value={filters.dateFrom} onChange={(event) => updateFilter('dateFrom', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm" />
            </label>
            <label>
              <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Registered to</span>
              <input type="date" value={filters.dateTo} onChange={(event) => updateFilter('dateTo', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm" />
            </label>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {filtersActive && Object.entries(filters).filter(([, value]) => value && value !== 'all' && value !== 'latest').map(([key, value]) => (
            <button key={key} type="button" onClick={() => updateFilter(key, initialFilters[key])} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
              {labelForFilter(key)}: {String(value)} <X className="h-3.5 w-3.5" />
            </button>
          ))}
          {filtersActive ? (
            <Button variant="outline" size="sm" icon={Filter} onClick={clearFilters}>Reset filters</Button>
          ) : null}
        </div>
      </Card>

      {error && (
        <div className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={() => seekersQuery.refetch()} className="font-extrabold hover:underline">Try again</button>
        </div>
      )}

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={seekers}
          loading={loading}
          onRowClick={(row) => navigate(`/admin/job-seekers/${row.seeker_id}`)}
          emptyTitle={filtersActive ? 'No job seekers match your filters' : 'No job seekers registered yet'}
          emptyDescription={filtersActive ? 'Try clearing or broadening the filters above.' : 'Registered job seekers will appear here.'}
          caption="Job seekers directory. Each row opens the seeker's profile."
          virtualize
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

function buildParams(filters) {
  const params = {
    search: filters.search || undefined,
    profile_status: filters.profileStatus === 'all' ? undefined : filters.profileStatus,
    employment_status: filters.employmentStatus || undefined,
    broad_field: filters.broadField || undefined,
    preferred_occupation: filters.preferredOccupation || undefined,
    skill: filters.skill || undefined,
    province: filters.province || undefined,
    city: filters.city || undefined,
    barangay: filters.barangay || undefined,
    has_certificates: filters.hasCertificates === 'all' ? undefined : filters.hasCertificates === 'yes' ? 1 : 0,
    has_applications: filters.hasApplications === 'all' ? undefined : filters.hasApplications === 'yes' ? 1 : 0,
    hired_status: filters.hiredStatus === 'all' ? undefined : filters.hiredStatus,
    missing_gps: filters.missingGps === 'all' ? undefined : filters.missingGps === 'yes' ? 1 : 0,
    date_from: filters.dateFrom || undefined,
    date_to: filters.dateTo || undefined,
    sort: filters.sort || 'latest',
  }

  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''))
}

function labelForFilter(key) {
  const labels = {
    search: 'Search',
    profileStatus: 'Profile',
    employmentStatus: 'Employment',
    broadField: 'Broad field',
    preferredOccupation: 'Occupation',
    skill: 'Skill',
    province: 'Province',
    city: 'City',
    barangay: 'Barangay',
    hasCertificates: 'Certificates',
    hasApplications: 'Applications',
    hiredStatus: 'Hired',
    missingGps: 'GPS',
    dateFrom: 'From',
    dateTo: 'To',
    sort: 'Sort',
  }

  return labels[key] ?? key
}

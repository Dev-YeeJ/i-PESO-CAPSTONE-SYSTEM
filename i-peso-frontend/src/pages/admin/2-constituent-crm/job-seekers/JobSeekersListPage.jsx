import { createElement, useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  MapPin,
  Search,
  UserRoundCheck,
  UsersRound,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Card } from '@/components/ui'
import DataTable from '@/pages/admin/_components/DataTable'
import PageHeader from '@/pages/admin/_components/PageHeader'
import { adminService } from '@/services/adminService'

const PER_PAGE = 15

export default function JobSeekersListPage() {
  const navigate = useNavigate()
  const [seekers, setSeekers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [completion, setCompletion] = useState('all')
  const [province, setProvince] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, lastPage: 1, from: 0, to: 0 })
  const [summary, setSummary] = useState({ total: 0, complete: 0, incomplete: 0 })

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const loadSummary = useCallback(async () => {
    try {
      const [all, complete, incomplete] = await Promise.all([
        adminService.getSeekers({ per_page: 1 }),
        adminService.getSeekers({ per_page: 1, profile_completed: 1 }),
        adminService.getSeekers({ per_page: 1, profile_completed: 0 }),
      ])
      setSummary({
        total: all.total ?? 0,
        complete: complete.total ?? 0,
        incomplete: incomplete.total ?? 0,
      })
    } catch {
      // The directory remains usable if summary requests fail.
    }
  }, [])

  const loadSeekers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await adminService.getSeekers({
        page,
        per_page: PER_PAGE,
        search: debouncedSearch || undefined,
        province: province.trim() || undefined,
        profile_completed: completion === 'all' ? undefined : completion === 'complete' ? 1 : 0,
      })
      setSeekers(result.data ?? [])
      setPagination({
        total: result.total ?? 0,
        lastPage: result.last_page ?? 1,
        from: result.from ?? 0,
        to: result.to ?? 0,
      })
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? 'Unable to load job seekers.')
    } finally {
      setLoading(false)
    }
  }, [completion, debouncedSearch, page, province])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  useEffect(() => {
    loadSeekers()
  }, [loadSeekers])

  const completionRate = summary.total
    ? Math.round((summary.complete / summary.total) * 100)
    : 0

  const filtersActive = Boolean(search || province || completion !== 'all')
  const clearFilters = () => {
    setSearch('')
    setProvince('')
    setCompletion('all')
    setPage(1)
  }

  const columns = useMemo(() => [
    {
      key: 'first_name',
      label: 'Job Seeker',
      render: (_, row) => {
        const name = [row.first_name, row.middle_name, row.last_name, row.suffix].filter(Boolean).join(' ')
        const initials = `${row.first_name?.[0] ?? ''}${row.last_name?.[0] ?? ''}`.toUpperCase() || 'JS'
        return (
          <div className="flex min-w-56 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-navy text-xs font-black text-white">{initials}</span>
            <div className="min-w-0">
              <p className="truncate font-extrabold text-slate-950">{name || 'Unnamed seeker'}</p>
              <p className="truncate text-xs text-slate-500">{row.email}</p>
            </div>
          </div>
        )
      },
    },
    {
      key: 'profile_completed',
      label: 'Profile Readiness',
      render: (complete) => (
        <Badge status={complete ? 'verified' : 'pending'}>
          {complete ? 'NSRP Complete' : 'Needs Completion'}
        </Badge>
      ),
    },
    {
      key: 'employment_status',
      label: 'Employment',
      render: (status) => (
        <span className="text-sm font-semibold capitalize text-slate-700">
          {status?.replaceAll('_', ' ') || 'Not specified'}
        </span>
      ),
    },
    {
      key: 'educ_attainment',
      label: 'Education',
      render: (education) => <span className="text-sm text-slate-600">{education || 'Not specified'}</span>,
    },
    {
      key: 'address_province',
      label: 'Location',
      render: (provinceName, row) => (
        <div className="flex min-w-40 items-start gap-2 text-sm text-slate-600">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <span>{[row.address_municipality_city, provinceName].filter(Boolean).join(', ') || 'Not specified'}</span>
        </div>
      ),
    },
    {
      key: 'created_at',
      label: 'Registered',
      render: (date) => date
        ? <span className="whitespace-nowrap text-sm text-slate-600">{new Date(date).toLocaleDateString()}</span>
        : 'N/A',
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
        subtitle="Monitor NSRP profile readiness and review registered job seeker information."
        eyebrow="Constituent CRM"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={UsersRound} label="Registered Seekers" value={summary.total} detail="All job seeker accounts" tone="navy" />
        <SummaryCard icon={UserRoundCheck} label="NSRP Complete" value={summary.complete} detail={`${completionRate}% completion rate`} tone="green" />
        <SummaryCard icon={Clock3} label="Needs Completion" value={summary.incomplete} detail="Profiles requiring follow-up" tone="amber" />
        <SummaryCard icon={CheckCircle2} label="Current Results" value={pagination.total} detail="Matching active filters" tone="blue" />
      </div>

      <Card padding="sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_220px_auto] lg:items-end">
          <label>
            <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Search directory</span>
            <div className="relative mt-2">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => { setSearch(event.target.value); setPage(1) }}
                placeholder="Name or email address"
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/10"
              />
            </div>
          </label>

          <label>
            <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Profile status</span>
            <select
              value={completion}
              onChange={(event) => { setCompletion(event.target.value); setPage(1) }}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm"
            >
              <option value="all">All profiles</option>
              <option value="complete">NSRP complete</option>
              <option value="incomplete">Needs completion</option>
            </select>
          </label>

          <label>
            <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Province</span>
            <input
              value={province}
              onChange={(event) => { setProvince(event.target.value); setPage(1) }}
              placeholder="Exact province"
              className="mt-2 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            />
          </label>

          <Button variant="outline" onClick={clearFilters} disabled={!filtersActive}>Clear Filters</Button>
        </div>
      </Card>

      {error && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={loadSeekers} className="font-extrabold hover:underline">Try again</button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={seekers}
        loading={loading}
        onRowClick={(row) => navigate(`/admin/job-seekers/${row.seeker_id}`)}
        emptyMessage={filtersActive ? 'No job seekers match the selected filters.' : 'No job seekers are registered yet.'}
      />

      {!loading && pagination.total > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row">
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

function SummaryCard({ icon, label, value, detail, tone }) {
  const tones = {
    navy: 'bg-slate-100 text-brand-navy',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
  }

  return (
    <Card padding="sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{Number(value ?? 0).toLocaleString()}</p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>
        <span className={`rounded-xl p-2.5 ${tones[tone]}`}>
          {createElement(icon, { className: 'h-5 w-5' })}
        </span>
      </div>
    </Card>
  )
}

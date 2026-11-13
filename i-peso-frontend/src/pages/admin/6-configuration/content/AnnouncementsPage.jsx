import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, ArrowRight, CalendarClock, FilePen, Megaphone, Plus, Radio, Search } from 'lucide-react'
import { Badge, Button, Card } from '@/components/ui'
import DataTable from '@/pages/admin/_components/DataTable'
import PageHeader from '@/pages/admin/_components/PageHeader'
import StatCard from '@/pages/admin/_components/StatCard'
import { adminAnnouncementService } from '@/services/announcementService'
import { useAuthStore } from '@/stores/authStore'
import { canManage } from '@/utils/adminAccess'
import { CategoryChip, PinnedMark, PriorityPill } from '@/components/announcements/AnnouncementPieces'
import { AUDIENCE_SHORT, STATE_BADGE, formatDateTime } from '@/components/announcements/announcementMeta'

const PER_PAGE = 15
const labelClass = 'text-xs font-extrabold uppercase tracking-wide text-slate-500'
const selectClass = 'mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm'

const TABS = [
  { value: 'all', label: 'All', count: (s) => s.total },
  { value: 'live', label: 'Live', count: (s) => s.live },
  { value: 'scheduled', label: 'Scheduled', count: (s) => s.scheduled },
  { value: 'draft', label: 'Drafts', count: (s) => s.draft },
  { value: 'expired', label: 'Ended', count: (s) => s.expired },
  { value: 'archived', label: 'Archived', count: (s) => s.archived },
]

export default function AnnouncementsPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const canEdit = canManage(user, 'configuration')

  const [state, setState] = useState('all')
  const [audience, setAudience] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = window.setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1) }, 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const params = useMemo(() => ({ state, audience, search: debouncedSearch, page, per_page: PER_PAGE }), [state, audience, debouncedSearch, page])
  const listQuery = useQuery({
    queryKey: ['admin', 'announcements', params],
    queryFn: () => adminAnnouncementService.list(params),
    placeholderData: (previous) => previous,
    staleTime: 15_000,
  })
  const rows = listQuery.data?.data ?? []
  const summary = listQuery.data?.summary ?? {}
  const num = (value) => Number(value ?? 0).toLocaleString()

  const columns = useMemo(() => [
    {
      key: 'title',
      label: 'Announcement',
      render: (value, row) => (
        <div className="min-w-56 max-w-md">
          <div className="flex flex-wrap items-center gap-1.5">
            <CategoryChip category={row.category} label={row.category_label} />
            <PriorityPill priority={row.priority} />
            {row.is_pinned && <PinnedMark />}
          </div>
          <p className="mt-1 font-extrabold text-slate-950">{value}</p>
          <p className="line-clamp-1 text-xs text-slate-500">{row.excerpt}</p>
        </div>
      ),
    },
    { key: 'audience', label: 'Audience', render: (value) => <span className="whitespace-nowrap text-sm font-semibold text-slate-700">{AUDIENCE_SHORT[value] ?? value}</span> },
    { key: 'state', label: 'Status', render: (value, row) => <Badge status={STATE_BADGE[value] ?? 'neutral'}>{row.state_label}</Badge> },
    {
      key: 'publish_at',
      label: 'Schedule',
      render: (value, row) => (
        <div className="whitespace-nowrap text-xs text-slate-600">
          <p><span className="font-bold text-slate-500">From</span> {row.state === 'draft' ? (value ? `${formatDateTime(value)} (planned)` : 'Not published') : formatDateTime(value)}</p>
          <p><span className="font-bold text-slate-500">Until</span> {row.expires_at ? formatDateTime(row.expires_at) : 'No end date'}</p>
        </div>
      ),
    },
    {
      key: 'seen',
      label: 'Reach',
      render: (value, row) => {
        if (!row.first_published_at) return <span className="text-xs text-slate-400">—</span>
        const rate = row.targeted ? Math.min(100, Math.round(((value ?? 0) / row.targeted) * 100)) : 0
        return (
          <div className="min-w-28 text-xs">
            <p className="font-bold text-slate-800">Seen by {num(value)} of {num(row.targeted)}</p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={rate} aria-valuemin={0} aria-valuemax={100} aria-label="Share of the audience that opened it">
              <div className="h-full rounded-full bg-slate-500" style={{ width: `${Math.max(rate, 2)}%` }} />
            </div>
          </div>
        )
      },
    },
    { key: 'id', label: '', render: () => <ArrowRight className="h-4 w-4 text-slate-400" /> },
  ], [])

  const error = listQuery.isError ? listQuery.error?.response?.data?.message ?? 'Unable to load announcements.' : ''

  return (
    <div className="portal-page">
      <PageHeader
        title="Announcements"
        subtitle="Publish official notices to job seekers, employers and the public — office advisories, events, programs and system updates."
        eyebrow="Configuration"
        actions={canEdit ? [{ label: 'New announcement', icon: Plus, onClick: () => navigate('/admin/announcements/new') }] : []}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Radio} color="slate" label="Live now" value={num(summary.live)} subtitle="Visible to readers" />
        <StatCard icon={CalendarClock} color="slate" label="Scheduled" value={num(summary.scheduled)} subtitle="Will go live automatically" />
        <StatCard icon={FilePen} color="slate" label="Drafts" value={num(summary.draft)} subtitle="Not visible to anyone yet" />
        <StatCard icon={Megaphone} color="slate" label="Ended & archived" value={num((summary.expired ?? 0) + (summary.archived ?? 0))} subtitle={`${num(summary.expired)} ended · ${num(summary.archived)} archived`} />
      </div>

      <Card padding="sm" className="mt-6">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={state === tab.value}
              onClick={() => { setState(tab.value); setPage(1) }}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                state === tab.value ? 'border-slate-300 bg-slate-100 text-slate-900' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
              }`}
            >
              {tab.label} <span className={state === tab.value ? 'text-blue-100' : 'text-slate-400'}>{num(tab.count(summary))}</span>
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="sm:col-span-2">
            <span className={labelClass}>Search</span>
            <div className="relative mt-2">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Title or message"
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/10"
              />
            </div>
          </label>
          <label>
            <span className={labelClass}>Audience</span>
            <select value={audience} onChange={(event) => { setAudience(event.target.value); setPage(1) }} className={selectClass}>
              <option value="">Any audience</option>
              {Object.entries(AUDIENCE_SHORT).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
      </Card>

      {error && (
        <div className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 p-4 text-sm">
          <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{error}</span>
          <button type="button" onClick={() => listQuery.refetch()} className="font-extrabold hover:underline">Try again</button>
        </div>
      )}

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={rows}
          loading={listQuery.isLoading}
          onRowClick={(row) => navigate(`/admin/announcements/${row.id}`)}
          emptyTitle={state === 'all' && !debouncedSearch && !audience ? 'No announcements yet' : 'No announcements match these filters'}
          emptyDescription={canEdit ? 'Create one to inform job seekers, employers or the public.' : 'Announcements published by PESO will appear here.'}
          emptyAction={canEdit && state === 'all' ? { label: 'New announcement', icon: Plus, onClick: () => navigate('/admin/announcements/new') } : undefined}
          caption="PESO announcements. Each row opens the announcement."
        />
      </div>

      {!listQuery.isLoading && (listQuery.data?.total ?? 0) > 0 && (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row">
          <p className="text-sm text-slate-500">
            Showing <span className="font-bold text-slate-800">{listQuery.data.from}-{listQuery.data.to}</span> of <span className="font-bold text-slate-800">{listQuery.data.total}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" icon={ArrowLeft} disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</Button>
            <span className="px-2 text-xs font-extrabold text-slate-600">Page {page} of {listQuery.data.last_page}</span>
            <Button variant="outline" size="sm" icon={ArrowRight} disabled={page >= listQuery.data.last_page} onClick={() => setPage((current) => current + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}

import { useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Activity, CalendarClock, Download, RefreshCw, RotateCcw, ShieldAlert, Users } from 'lucide-react'
import { Badge, Button, Card, StatCard } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'
import DataTable from '@/pages/admin/_components/DataTable'
import { adminService } from '@/services/adminService'

const emptyFilters = { search: '', action: '', user_type: '', date_from: '', date_to: '' }
const PER_PAGE = 20

// Severity comes from the API so the badge tone matches the backend's own
// classification of the event rather than a second list kept in sync by hand.
const severityBadge = {
  critical: 'rejected',
  security: 'review',
  success: 'approved',
  normal: 'neutral',
}

export default function ActivityLogPage() {
  const [filters, setFilters] = useState(emptyFilters)
  const [draft, setDraft] = useState(emptyFilters)
  const [page, setPage] = useState(1)

  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'activityLogs', filters, page],
    queryFn: () => adminService.getActivityLogs({ ...filters, page, per_page: PER_PAGE }),
    placeholderData: keepPreviousData,
  })

  const paginator = data?.logs
  const logs = paginator?.data ?? []
  const summary = data?.summary ?? {}
  const actionOptions = data?.filters?.actions ?? []
  const userTypeOptions = data?.filters?.user_types ?? []

  const isFiltered = Object.values(filters).some(Boolean)
  const isDirty = useMemo(
    () => Object.keys(emptyFilters).some((key) => draft[key] !== filters[key]),
    [draft, filters],
  )

  const applyFilters = () => {
    setFilters(draft)
    setPage(1)
  }

  const resetFilters = () => {
    setDraft(emptyFilters)
    setFilters(emptyFilters)
    setPage(1)
  }

  const updateDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value }))

  const errorMessage = isError
    ? (error?.response?.data?.message ?? 'Unable to load activity logs.')
    : ''

  return (
    <div className="portal-page">
      <PageHeader
        title="Activity Log"
        subtitle="Monitor system activity, user actions, and security events."
        eyebrow="System & Reports"
        actions={[
          { label: 'Refresh', icon: RefreshCw, variant: 'outline', onClick: () => refetch() },
          { label: 'Export page (CSV)', icon: Download, variant: 'outline', onClick: () => exportCsv(logs) },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Activity}
          color="blue"
          label="Events"
          value={count(summary.total)}
          subtitle={isFiltered ? 'Matching current filters' : 'All recorded events'}
        />
        <StatCard icon={CalendarClock} color="green" label="Today" value={count(summary.today)} />
        <StatCard
          icon={Users}
          color="slate"
          label="Distinct actors"
          value={count(summary.actors)}
          hint="Unique accounts responsible for the events shown."
        />
        <StatCard
          icon={ShieldAlert}
          color="red"
          label="Security & deletions"
          value={count(summary.critical)}
          hint="Failed sign-ins, rejections and deletions."
        />
      </div>

      <Card padding="none" className="mt-6">
        <div className="border-b border-slate-100 p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Security &amp; Audit Logs</h2>
            <p className="text-sm text-slate-500">A chronological record of system events.</p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <Field label="Search" className="xl:col-span-2">
              <input
                type="search"
                value={draft.search}
                onChange={(event) => updateDraft('search', event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && applyFilters()}
                placeholder="Description, action or IP"
                className={inputClass}
              />
            </Field>
            <Field label="Action">
              <select value={draft.action} onChange={(event) => updateDraft('action', event.target.value)} className={inputClass}>
                <option value="">All actions</option>
                {actionOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>
            <Field label="User type">
              <select value={draft.user_type} onChange={(event) => updateDraft('user_type', event.target.value)} className={inputClass}>
                <option value="">All users</option>
                {userTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>
            <Field label="From">
              <input type="date" value={draft.date_from} max={draft.date_to || undefined} onChange={(event) => updateDraft('date_from', event.target.value)} className={inputClass} />
            </Field>
            <Field label="To">
              <input type="date" value={draft.date_to} min={draft.date_from || undefined} onChange={(event) => updateDraft('date_to', event.target.value)} className={inputClass} />
            </Field>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={applyFilters} disabled={!isDirty}>Apply filters</Button>
            <Button size="sm" variant="outline" icon={RotateCcw} onClick={resetFilters} disabled={!isFiltered && !isDirty}>
              Reset
            </Button>
            {isFetching && <span className="text-xs font-semibold text-slate-500">Updating…</span>}
          </div>
        </div>

        <DataTable
          columns={[
            {
              key: 'created_at',
              label: 'Timestamp',
              render: (value) => (
                <div className="whitespace-nowrap">
                  <p className="font-semibold text-slate-900">{formatDate(value)}</p>
                  <p className="text-xs text-slate-500">{relativeTime(value)}</p>
                </div>
              ),
            },
            {
              key: 'actor_name',
              label: 'Actor',
              render: (value, row) => (
                <div>
                  <p className="font-semibold text-slate-900">{value || 'Unknown'}</p>
                  <p className="text-xs text-slate-500">{row.user_type_label}</p>
                </div>
              ),
            },
            {
              key: 'action',
              label: 'Action',
              render: (value, row) => (
                <Badge variant={severityBadge[row.severity] ?? 'neutral'}>{prettify(value)}</Badge>
              ),
            },
            {
              key: 'description',
              label: 'Description',
              render: (value) => <span className="text-slate-700">{value || '—'}</span>,
            },
            {
              key: 'ip_address',
              label: 'IP Address',
              render: (value) => <span className="font-mono text-xs text-slate-500">{value || '—'}</span>,
            },
          ]}
          data={logs}
          loading={isFetching && !data}
          error={errorMessage || null}
          onRetry={refetch}
          caption="System activity and audit log."
          emptyTitle={isFiltered ? 'No events match your filters' : 'No activity logged yet'}
          emptyDescription={
            isFiltered
              ? 'Try widening the date range or clearing the action filter.'
              : 'System events and user actions will appear here.'
          }
        />

        {paginator?.last_page > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 p-4">
            <p className="text-xs text-slate-500">
              Page {paginator.current_page} of {paginator.last_page} · {count(paginator.total)} events
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={isFetching || paginator.current_page <= 1} onClick={() => setPage((current) => current - 1)}>
                Previous
              </Button>
              <Button size="sm" variant="outline" disabled={isFetching || paginator.current_page >= paginator.last_page} onClick={() => setPage((current) => current + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200'

function Field({ label, children, className = '' }) {
  return (
    <label className={`min-w-0 ${className}`}>
      <span className="mb-1 block text-xs font-bold text-slate-600">{label}</span>
      {children}
    </label>
  )
}

function count(value) {
  return Number(value || 0).toLocaleString()
}

function prettify(value = '') {
  return String(value).replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString('en-PH') : '—'
}

function relativeTime(value) {
  if (!value) return ''
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000)
  const units = [
    ['second', 60],
    ['minute', 60],
    ['hour', 24],
    ['day', 30],
    ['month', 12],
    ['year', Infinity],
  ]

  let amount = seconds
  for (const [unit, step] of units) {
    if (Math.abs(amount) < step) {
      return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(-Math.round(amount), unit)
    }
    amount /= step
  }
  return ''
}

function exportCsv(logs) {
  if (!logs.length) return

  const header = ['Timestamp', 'User Type', 'Actor', 'Action', 'Description', 'IP Address']
  const rows = logs.map((log) => [
    formatDate(log.created_at),
    log.user_type_label,
    log.actor_name,
    log.action,
    log.description,
    log.ip_address,
  ])

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(','))
    .join('\r\n')

  // Leading BOM so Excel opens the file as UTF-8.
  const BOM = String.fromCharCode(0xFEFF)
  const url = URL.createObjectURL(new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `activity-log-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

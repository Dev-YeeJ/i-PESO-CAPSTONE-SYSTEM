import { useRef, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  AlertOctagon,
  AlertTriangle,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Megaphone,
  PieChart,
  RefreshCw,
  ScanLine,
  UserPlus,
  UsersRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Button, Card, CardHeader, ErrorState, LoadingSkeleton } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'
import ChartDownloadMenu from '@/components/common/ChartDownloadMenu'
import StatCard from '@/pages/admin/_components/StatCard'
import StatusBadge from '@/pages/admin/_components/StatusBadge'
import { adminService } from '@/services/adminService'
import { formatDistanceToNow } from 'date-fns'
import { useAuthStore } from '@/stores/authStore'
import { canOpenPath } from '@/utils/adminAccess'
import { CHART_AXIS_TEXT, CHART_GRID, CHART_PRIMARY } from '@/design-system/chartColors'

const PRESETS = [
  { key: 'this_month', label: 'This month' },
  { key: 'last_30', label: 'Last 30 days' },
  { key: 'quarter', label: 'Last 90 days' },
  { key: 'year', label: 'This year' },
]

export default function DashboardPage() {
  const [preset, setPreset] = useState('this_month')
  const [range, setRange] = useState(presetRange('this_month'))
  const trendChartRef = useRef(null)
  const [chartView, setChartView] = useState('chart')
  const user = useAuthStore((state) => state.user)
  const canSeeFairs = canOpenPath(user, '/admin/job-fairs')

  // "Today" card: the job fair happening today, or the next one coming up.
  const { data: fairsPage } = useQuery({
    queryKey: ['admin', 'dashboard-next-fair'],
    queryFn: () => adminService.getJobFairsList({ sort: 'oldest', per_page: 50 }),
    enabled: canSeeFairs,
    staleTime: 5 * 60_000,
    retry: 1,
  })
  const nextFair = pickNextFair(fairsPage?.data ?? [])

  const { data: stats, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'dashboard-stats', range],
    queryFn: () => adminService.getDashboardStats(range),
    placeholderData: keepPreviousData,
  })
  const errorMessage = error?.response?.data?.message ?? 'Failed to load dashboard statistics.'

  const applyPreset = (key) => {
    setPreset(key)
    setRange(presetRange(key))
  }

  const setCustomRange = (field, value) => {
    setPreset('custom')
    setRange((current) => ({ ...current, [field]: value }))
  }

  const trends = stats?.trends ?? {}
  const period = stats?.period ?? {}
  const attention = stats?.attention ?? []
  const comparisonLabel = 'vs previous period'

  if (isLoading) return (
    <div className="portal-page space-y-6">
      <LoadingSkeleton variant="text" rows={2} className="max-w-md" />
      <LoadingSkeleton variant="card" rows={1} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><LoadingSkeleton variant="card" /><LoadingSkeleton variant="card" /><LoadingSkeleton variant="card" /><LoadingSkeleton variant="card" /></div>
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]"><LoadingSkeleton variant="card" /><LoadingSkeleton variant="card" /></div>
    </div>
  )

  if (isError && !stats) return (
    <div className="portal-page">
      <PageHeader title="Operations Dashboard" subtitle="Monitor employment services, accreditation workload, and platform activity." />
      <Card><ErrorState description={errorMessage} onRetry={refetch} /></Card>
    </div>
  )

  const quickActions = [
    { to: '/admin/verification-queue', label: 'Verify employers', icon: ClipboardCheck },
    { to: '/admin/job-postings', label: 'Review postings', icon: BriefcaseBusiness },
    { to: '/admin/announcements/new', label: 'New announcement', icon: Megaphone },
    { to: '/admin/labor-analytics', label: 'Labor analytics', icon: PieChart },
  ].filter((action) => canOpenPath(user, action.to))
  const fairIsToday = nextFair && isTodayWithin(nextFair)

  return (
    <div className="portal-page space-y-6">
      <PageHeader
        eyebrow=""
        title="Operations dashboard"
        subtitle="Employment services, verification workload and platform activity at a glance."
        actions={[{ label: 'Refresh', icon: RefreshCw, variant: 'outline', onClick: () => refetch() }]}
      />

      {isError && stats && (
        <div className="rounded-xl border border-warning bg-warning-bg px-4 py-3 text-sm text-amber-800" role="status">
          Showing the last loaded data — refreshing failed. {errorMessage}
        </div>
      )}

      {/* Range control */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex flex-wrap rounded-xl border border-slate-200 bg-white p-1 shadow-card" role="group" aria-label="Date range">
            {PRESETS.map((option) => (
              <button
                key={option.key}
                type="button"
                aria-pressed={preset === option.key}
                onClick={() => applyPreset(option.key)}
                className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${preset === option.key ? 'bg-brand-navy text-white' : 'text-slate-600 hover:text-brand-navy'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2" aria-label="Custom range">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              From
              <input type="date" value={range.date_from} max={range.date_to} onChange={(event) => setCustomRange('date_from', event.target.value)} className={dateInputClass} />
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              To
              <input type="date" value={range.date_to} min={range.date_from} onChange={(event) => setCustomRange('date_to', event.target.value)} className={dateInputClass} />
            </label>
          </div>
        </div>
        {stats?.range && (
          <p className="text-sm text-slate-500">
            {stats.range.date_from} – {stats.range.date_to} ({stats.range.days} day{stats.range.days === 1 ? '' : 's'}), compared with {stats.range.compared_to.date_from} – {stats.range.compared_to.date_to}
          </p>
        )}
      </div>

      {/* KPIs */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={UsersRound} color="blue" label="Registered job seekers" value={Number(stats?.total_seekers ?? 0).toLocaleString()}
          subtitle={`${stats?.profile_completion_rate?.toFixed(1) ?? 0}% profiles complete`}
          hint="Total job-seeker accounts to date."
          trend={trendFor(trends.new_seekers, comparisonLabel)}
          to="/admin/job-seekers" linkLabel="View job seekers"
        />
        <StatCard
          icon={Building2} color="blue" label="Registered employers" value={Number(stats?.total_employers ?? 0).toLocaleString()}
          subtitle={`${Number(period.new_employers ?? 0).toLocaleString()} new in range`}
          hint="Employer accounts to date, across all verification statuses."
          trend={trendFor(trends.new_employers, comparisonLabel)}
          to="/admin/employers" linkLabel="View employers"
        />
        <StatCard
          icon={BriefcaseBusiness} color="blue" label="Active vacancies" value={Number(stats?.active_vacancies ?? 0).toLocaleString()}
          subtitle={`${Number(period.new_vacancies ?? 0).toLocaleString()} posted in range`}
          hint="Vacancies currently published and open."
          trend={trendFor(trends.new_vacancies, comparisonLabel)}
          to="/admin/job-postings" linkLabel="View job postings"
        />
        <StatCard
          icon={CheckCircle2} color="blue" label="Applications" value={Number(stats?.applications_this_month ?? 0).toLocaleString()}
          subtitle={<span className="flex gap-1.5"><span className="font-semibold text-success">{stats?.hired_this_month ?? 0} hired,</span> <span className="font-semibold text-danger">{stats?.rejected_this_month ?? 0} rejected</span></span>}
          hint="Applications submitted within the selected date range."
          trend={trendFor(trends.applications, comparisonLabel)}
          to="/admin/labor-analytics" linkLabel="Open analytics"
        />
      </div>

      {/* Trends + needs attention */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <div ref={trendChartRef} className="bg-white">
            <CardHeader
              title="Application trends"
              subtitle="Applications received across all employers in the selected range."
              action={(
                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-lg border border-slate-200 p-0.5 text-xs font-semibold" role="group" aria-label="Show as">
                    {['chart', 'table'].map((view) => (
                      <button
                        key={view}
                        type="button"
                        aria-pressed={chartView === view}
                        onClick={() => setChartView(view)}
                        className={`rounded-md px-2.5 py-1 capitalize ${chartView === view ? 'bg-[#e8f0fc] text-brand-navy' : 'text-slate-500 hover:text-brand-navy'}`}
                      >
                        {view}
                      </button>
                    ))}
                  </div>
                  <ChartDownloadMenu targetRef={trendChartRef} title="Application Trends" footnote={`I-PESO Operations Dashboard, ${range.date_from} to ${range.date_to}`} disabled={!stats?.chart_data?.length} />
                </div>
              )}
            />
            {!stats?.chart_data?.length ? (
              <div className="flex h-[300px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-brand-canvas text-sm text-slate-500">No applications in this range yet.</div>
            ) : chartView === 'table' ? (
              <div className="max-h-[300px] overflow-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <caption className="sr-only">Applications per day</caption>
                  <thead className="sticky top-0 bg-brand-canvas text-left text-xs font-semibold text-slate-500">
                    <tr><th scope="col" className="px-4 py-2">Date</th><th scope="col" className="px-4 py-2 text-right">Applications</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stats.chart_data.map((row) => (
                      <tr key={row.date}><td className="px-4 py-2 text-slate-700">{row.date}</td><td className="px-4 py-2 text-right font-semibold tabular-nums text-slate-900">{row.count}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-[300px] w-full" role="img" aria-label={`Line chart of applications per day from ${range.date_from} to ${range.date_to}. Switch to Table for the exact values.`}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.chart_data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: CHART_AXIS_TEXT }} dy={10} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: CHART_AXIS_TEXT }} dx={-10} />
                    <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 18px 45px rgba(15,23,42,.12)' }} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                    <Line type="monotone" dataKey="count" name="Applications" stroke={CHART_PRIMARY} strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: CHART_PRIMARY, stroke: '#fff', strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </Card>

        <Card className="flex flex-col">
          <CardHeader title="Needs attention" subtitle="Work waiting on PESO staff." />
          {attention.length > 0 ? (
            <ul className="grid gap-2.5">
              {attention.map((item) => {
                const critical = item.severity === 'critical'
                return (
                  <li key={item.key}>
                    <Link
                      to={item.link}
                      className={`flex items-center gap-3 rounded-xl border p-3.5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${critical ? 'border-red-200 bg-red-50 hover:border-red-300' : 'border-amber-200 bg-[#fffbeb] hover:border-amber-300'}`}
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white ${critical ? 'text-red-700' : 'text-[#d97706]'}`}>
                        {critical ? <AlertOctagon className="h-[18px] w-[18px]" aria-hidden="true" /> : <AlertTriangle className="h-[18px] w-[18px]" aria-hidden="true" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-slate-900">{item.label}</span>
                        <span className={`block text-xs ${critical ? 'text-red-800' : 'text-amber-800'}`}>{critical ? 'Critical' : 'Needs review'}{item.detail ? `: ${item.detail}` : ''}</span>
                      </span>
                      <span className="font-display text-2xl tabular-nums text-slate-900">{item.count}</span>
                      <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-brand-canvas p-6 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-5 w-5" aria-hidden="true" /></span>
              <h2 className="mt-3 font-semibold text-slate-900">All review queues are clear</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">No accreditations or reports are waiting on staff right now.</p>
            </div>
          )}
        </Card>
      </div>

      {/* Recent activity + today */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="flex flex-col">
          <CardHeader
            title="Recent activity"
            subtitle="Latest registrations and applications."
            action={canOpenPath(user, '/admin/activity-logs')
              ? <Link to="/admin/activity-logs" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-navy hover:underline">Open activity log</Link>
              : null}
          />
          <ul className="divide-y divide-slate-100">
            {stats?.recent_registrations?.slice(0, 3).map((r, i) => (
              <li key={`reg-${i}`} className="flex items-center gap-4 py-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><UserPlus className="h-[18px] w-[18px]" aria-hidden="true" /></span>
                <p className="min-w-0 flex-1 text-sm"><span className="font-semibold text-slate-900">{r.name}</span> <span className="text-slate-600">registered as {String(r.role).toLowerCase() === 'employer' ? 'an' : 'a'} <span className="capitalize">{r.role}</span></span></p>
                <span className="hidden text-xs text-slate-500 sm:block">{formatDistanceToNow(new Date(r.registered_at), { addSuffix: true })}</span>
                <StatusBadge status={r.role.toLowerCase()} />
              </li>
            ))}
            {stats?.recent_applications?.slice(0, 3).map((a, i) => (
              <li key={`app-${i}`} className="flex items-center gap-4 py-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e8f0fc] text-brand-navy"><BriefcaseBusiness className="h-[18px] w-[18px]" aria-hidden="true" /></span>
                <p className="min-w-0 flex-1 text-sm"><span className="font-semibold text-slate-900">{a.seeker_name}</span> <span className="text-slate-600">applied for</span> <span className="font-semibold text-slate-900">{a.job_title}</span></p>
                <StatusBadge status={a.status} />
              </li>
            ))}
          </ul>
          {(!stats?.recent_registrations?.length && !stats?.recent_applications?.length) && (
            <div className="rounded-xl border border-dashed border-slate-200 bg-brand-canvas p-8 text-center"><UsersRound className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" /><p className="mt-3 font-semibold text-slate-800">No recent activity</p></div>
          )}
        </Card>

        <div className="space-y-6">
          {canSeeFairs && (
            <Card>
              <CardHeader
                title={fairIsToday ? 'Today' : 'Next job fair'}
                action={fairIsToday ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-600" aria-hidden="true" />Happening today</span> : null}
              />
              {nextFair ? (
                <>
                  <div className="flex items-center gap-4">
                    <div className="w-14 shrink-0 rounded-xl bg-brand-navy py-2 text-center text-white">
                      <p className="text-[10px] font-semibold text-white/70">{monthOf(nextFair.start_date)}</p>
                      <p className="font-display text-2xl leading-none">{dayOf(nextFair.start_date)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{nextFair.title}</p>
                      <p className="truncate text-sm text-slate-500">{[nextFair.venue, `${nextFair.participating_employers?.length ?? 0} employers`].filter(Boolean).join(', ')}</p>
                    </div>
                  </div>
                  <Button
                    to={fairIsToday ? `/admin/job-fairs/${nextFair.job_fair_id}/check-in` : `/admin/job-fairs/${nextFair.job_fair_id}`}
                    icon={fairIsToday ? ScanLine : CalendarDays}
                    className="mt-4 w-full"
                  >
                    {fairIsToday ? 'Open check-in' : 'Open job fair'}
                  </Button>
                </>
              ) : (
                <p className="text-sm leading-6 text-slate-500">No job fairs are scheduled. <Link to="/admin/job-fairs/create" className="font-semibold text-brand-navy hover:underline">Plan one</Link>.</p>
              )}
            </Card>
          )}

          {quickActions.length > 0 && (
            <Card>
              <CardHeader title="Quick actions" />
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((action) => (
                  <Link key={action.to} to={action.to} className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3.5 transition hover:border-brand-navy hover:bg-[#e8f0fc] focus:outline-none focus-visible:ring-2 focus-visible:ring-focus">
                    <action.icon className="h-5 w-5 text-brand-navy" aria-hidden="true" />
                    <span className="text-sm font-semibold text-slate-900">{action.label}</span>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

const dateInputClass = 'rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none focus:border-[#2563b8] focus:ring-2 focus:ring-[#c4d9f7]'

const todayIso = () => new Date().toISOString().slice(0, 10)
const ACTIVE_FAIR_STATUSES = ['published', 'accepting_employers', 'upcoming', 'ongoing', 'closed']

/** The fair happening today, else the soonest upcoming one (list is sorted oldest-first). */
function pickNextFair(fairs) {
  const today = todayIso()
  return fairs.find((fair) => ACTIVE_FAIR_STATUSES.includes(fair.status) && String(fair.end_date ?? fair.start_date ?? '') >= today) ?? null
}

function isTodayWithin(fair) {
  const today = todayIso()
  return String(fair.start_date ?? '') <= today && today <= String(fair.end_date ?? fair.start_date ?? '')
}

function parseDay(value) {
  const date = value ? new Date(`${String(value).slice(0, 10)}T00:00:00`) : null
  return date && !Number.isNaN(date.getTime()) ? date : null
}
const monthOf = (value) => parseDay(value)?.toLocaleDateString('en-PH', { month: 'short' }) ?? '—'
const dayOf = (value) => { const date = parseDay(value); return date ? String(date.getDate()).padStart(2, '0') : '—' }

function trendFor(value, label) {
  return typeof value === 'number' ? { value, label } : undefined
}

function presetRange(key) {
  const today = new Date()
  const iso = (date) => date.toISOString().slice(0, 10)

  switch (key) {
    case 'last_30':
      return { date_from: iso(new Date(today.getTime() - 29 * 86_400_000)), date_to: iso(today) }
    case 'quarter':
      return { date_from: iso(new Date(today.getTime() - 89 * 86_400_000)), date_to: iso(today) }
    case 'year':
      return { date_from: iso(new Date(today.getFullYear(), 0, 1)), date_to: iso(today) }
    case 'this_month':
    default:
      return { date_from: iso(new Date(today.getFullYear(), today.getMonth(), 1)), date_to: iso(today) }
  }
}

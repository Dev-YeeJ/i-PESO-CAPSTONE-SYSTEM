import { createElement, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  RefreshCw,
  UsersRound,
  FileChartColumn,
  PieChart,
  UserPlus
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Badge, Button, Card, CardHeader, ErrorState, LoadingSkeleton } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'
import StatCard from '@/pages/admin/_components/StatCard'
import StatusBadge from '@/pages/admin/_components/StatusBadge'
import { adminService } from '@/services/adminService'
import { formatDistanceToNow } from 'date-fns'

const PRESETS = [
  { key: 'this_month', label: 'This month' },
  { key: 'last_30', label: 'Last 30 days' },
  { key: 'quarter', label: 'Last 90 days' },
  { key: 'year', label: 'This year' },
]

export default function DashboardPage() {
  const [preset, setPreset] = useState('this_month')
  const [range, setRange] = useState(presetRange('this_month'))

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

  return (
    <div className="portal-page space-y-6">
      <PageHeader
        title="Operations Dashboard"
        subtitle="Monitor employment services, accreditation workload, and platform activity."
        actions={[{ label: 'Refresh Data', icon: RefreshCw, variant: 'outline', onClick: () => refetch() }]}
      />
      
      {isError && stats && (
        <div className="rounded-xl border border-warning bg-warning-bg px-4 py-3 text-sm text-amber-800" role="status">
          Showing the last loaded data — refreshing failed. {errorMessage}
        </div>
      )}

      {/* Range Controls */}
      <Card padding="sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((option) => (
              <Button
                key={option.key}
                size="sm"
                variant={preset === option.key ? 'navy' : 'outline'}
                onClick={() => applyPreset(option.key)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-0">
              <span className="mb-1 block text-xs font-bold text-slate-600">From</span>
              <input type="date" value={range.date_from} max={range.date_to} onChange={(event) => setCustomRange('date_from', event.target.value)} className={dateInputClass} />
            </label>
            <label className="min-w-0">
              <span className="mb-1 block text-xs font-bold text-slate-600">To</span>
              <input type="date" value={range.date_to} min={range.date_from} onChange={(event) => setCustomRange('date_to', event.target.value)} className={dateInputClass} />
            </label>
          </div>
        </div>
        {stats?.range && (
          <p className="mt-3 text-xs text-slate-500">
            Showing {stats.range.days} day{stats.range.days === 1 ? '' : 's'} ({stats.range.date_from} → {stats.range.date_to}), compared with {stats.range.compared_to.date_from} → {stats.range.compared_to.date_to}.
          </p>
        )}
      </Card>

      {/* Top Row: KPIs - What is happening? */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={UsersRound} color="blue" label="Registered Seekers" value={Number(stats?.total_seekers ?? 0).toLocaleString()}
          subtitle={`${stats?.profile_completion_rate?.toFixed(1) ?? 0}% profile completion`}
          hint="Total job-seeker accounts to date."
          trend={trendFor(trends.new_seekers, comparisonLabel)}
          to="/admin/job-seekers" linkLabel="Browse job seekers"
        />
        <StatCard
          icon={Building2} color="slate" label="Registered Employers" value={Number(stats?.total_employers ?? 0).toLocaleString()}
          subtitle={`${Number(period.new_employers ?? 0).toLocaleString()} new in range`}
          hint="Employer accounts to date, across all verification statuses."
          trend={trendFor(trends.new_employers, comparisonLabel)}
          to="/admin/employers" linkLabel="Browse employers"
        />
        <StatCard
          icon={BriefcaseBusiness} color="green" label="Active Vacancies" value={Number(stats?.active_vacancies ?? 0).toLocaleString()}
          subtitle={`${Number(period.new_vacancies ?? 0).toLocaleString()} posted in range`}
          hint="Vacancies currently published and open."
          trend={trendFor(trends.new_vacancies, comparisonLabel)}
          to="/admin/job-postings" linkLabel="View job postings"
        />
        <StatCard
          icon={CheckCircle2} color="amber" label="Total Applications" value={Number(stats?.applications_this_month ?? 0).toLocaleString()}
          subtitle={<span className="flex gap-2"><span className="font-semibold text-success">{stats?.hired_this_month ?? 0} hired</span> &bull; <span className="font-semibold text-danger">{stats?.rejected_this_month ?? 0} rejected</span></span>}
          hint="Applications submitted within the selected date range."
          trend={trendFor(trends.applications, comparisonLabel)}
        />
      </div>

      {/* Middle Row: Trends & Tasks/Alerts */}
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        {/* Trends - What changed? */}
        <Card>
          <CardHeader title="Application Trends" subtitle="Volume of applications received across the platform in the selected range." />
          <div className="mt-6 h-[320px] w-full">
            {stats?.chart_data?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.chart_data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Line type="monotone" dataKey="count" name="Applications" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, fill: '#0ea5e9', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, fill: '#0284c7', stroke: '#fff', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-400">No trend data available for this range.</div>
            )}
          </div>
        </Card>

        {/* Alerts/Tasks - What needs attention? */}
        <Card className="flex flex-col">
          <CardHeader title="Needs Attention" subtitle="Work currently waiting on an administrator." />
          <div className="mt-4 flex-1">
            {attention.length > 0 ? (
              <ul className="grid gap-3">
                {attention.map((item) => (
                  <li key={item.key}>
                    <Link to={item.link} className={`flex items-center justify-between gap-3 rounded-xl border p-4 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${item.severity === 'critical' ? 'border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-300' : 'border-amber-200 bg-amber-50 hover:bg-amber-100 hover:border-amber-300'}`}>
                      <div className="flex items-start gap-3 min-w-0">
                        <span className={`rounded-xl p-2.5 ${item.severity === 'critical' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}><AlertTriangle className="h-5 w-5" /></span>
                        <div>
                          <span className="block font-bold text-slate-900">{item.label}</span>
                          <span className="mt-0.5 block text-xs text-slate-600">{item.detail}</span>
                        </div>
                      </div>
                      <Badge variant={item.severity === 'critical' ? 'rejected' : 'pending'}>{item.count}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex h-[200px] flex-col items-center justify-center rounded-xl border border-blue-900 bg-brand-navy p-6 text-center text-white shadow-inner sm:p-8">
                <Badge variant="verified" className="border-white/10 mb-4 bg-brand-600">Inbox Zero</Badge>
                <h2 className="text-xl font-bold">All review queues are clear</h2>
                <p className="mt-2 text-sm leading-6 text-brand-200">No accreditations, program applications, or reports are waiting on an admin right now.</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Bottom Row: Activity Feed & Quick Actions */}
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        {/* Activity - What happened recently? */}
        <Card className="flex flex-col">
          <CardHeader 
            title="Activity Feed" 
            subtitle="Latest system events including registrations and applications." 
            action={<Button to="/admin/job-seekers" variant="secondary" size="sm" icon={ArrowRight}>View All Seekers</Button>}
          />
          <div className="mt-4 flex-1">
            <div className="divide-y divide-slate-100">
              {stats?.recent_registrations?.slice(0, 3).map((r, i) => (
                <div key={`reg-${i}`} className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><UserPlus className="h-5 w-5" /></div>
                    <div><p className="text-sm font-bold text-slate-900">{r.name}</p><p className="text-xs text-slate-500">Registered as <span className="font-medium text-slate-700 capitalize">{r.role}</span></p></div>
                  </div>
                  <div className="flex items-center gap-4"><span className="text-xs text-slate-400">{formatDistanceToNow(new Date(r.registered_at), { addSuffix: true })}</span><StatusBadge status={r.role.toLowerCase()} /></div>
                </div>
              ))}
              {stats?.recent_applications?.slice(0, 3).map((a, i) => (
                <div key={`app-${i}`} className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600"><BriefcaseBusiness className="h-5 w-5" /></div>
                    <div><p className="text-sm font-bold text-slate-900">{a.seeker_name}</p><p className="text-xs text-slate-500">Applied for <span className="font-medium text-slate-700">{a.job_title}</span></p></div>
                  </div>
                  <div className="flex items-center gap-4"><span className="text-xs text-slate-400">recently</span><StatusBadge status={a.status} /></div>
                </div>
              ))}
            </div>
            {(!stats?.recent_registrations?.length && !stats?.recent_applications?.length) && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center"><UsersRound className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 font-bold text-slate-800">No recent activity</p></div>
            )}
          </div>
        </Card>

        {/* Quick Actions - What can I do now? */}
        <Card>
          <CardHeader title="Quick Actions" subtitle="Fast links to common administrator tasks." />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-1">
            <Link to="/admin/verification-queue" className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition-colors hover:border-brand-navy hover:bg-blue-50/50">
              <div className="rounded-lg bg-amber-100 p-2 text-amber-600"><ClipboardCheck className="h-5 w-5" /></div>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-900">Verify Employers</p>
                <p className="hidden text-xs text-slate-500 sm:block">Review pending accreditations</p>
              </div>
            </Link>
            <Link to="/admin/job-postings" className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition-colors hover:border-brand-navy hover:bg-blue-50/50">
              <div className="rounded-lg bg-blue-100 p-2 text-blue-600"><BriefcaseBusiness className="h-5 w-5" /></div>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-900">Review Job Postings</p>
                <p className="hidden text-xs text-slate-500 sm:block">Monitor platform vacancies</p>
              </div>
            </Link>
            <Link to="/admin/government-programs" className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition-colors hover:border-brand-navy hover:bg-blue-50/50">
              <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600"><Building2 className="h-5 w-5" /></div>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-900">Manage Programs</p>
                <p className="hidden text-xs text-slate-500 sm:block">DOLE programs & SPES</p>
              </div>
            </Link>
            <Link to="/admin/analytics" className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition-colors hover:border-brand-navy hover:bg-blue-50/50">
              <div className="rounded-lg bg-violet-100 p-2 text-violet-600"><PieChart className="h-5 w-5" /></div>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-900">Labor Analytics</p>
                <p className="hidden text-xs text-slate-500 sm:block">View system-wide reports</p>
              </div>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}

const dateInputClass = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200'

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

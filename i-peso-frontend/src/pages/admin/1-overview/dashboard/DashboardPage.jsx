import { createElement, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileChartColumn,
  RefreshCw,
  UsersRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, LoadingSkeleton } from '@/components/ui'
import DataTable from '@/pages/admin/_components/DataTable'
import PageHeader from '@/pages/admin/_components/PageHeader'
import StatCard from '@/pages/admin/_components/StatCard'
import StatusBadge from '@/pages/admin/_components/StatusBadge'
import { adminService } from '@/services/adminService'

export default function DashboardPage() {
  const { data: stats, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'dashboard-stats'],
    queryFn: () => adminService.getDashboardStats(),
  })
  const errorMessage = error?.response?.data?.message ?? 'Failed to load dashboard statistics.'

  const handleExportCSV = () => {
    if (!stats?.recent_registrations?.length) return
    const headers = ['Constituent', 'Role', 'Email', 'Registered At']
    const csvContent = [
      headers.join(','),
      ...stats.recent_registrations.map((r) =>
        `"${r.name}","${r.role}","${r.email}","${new Date(r.registered_at).toLocaleDateString()}"`
      ),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `recent_registrations_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const composition = useMemo(() => {
    const seekers = Number(stats?.total_seekers ?? 0)
    const employers = Number(stats?.total_employers ?? 0)
    const total = Math.max(1, seekers + employers)
    return [
      { label: 'Job Seekers', value: seekers, percentage: (seekers / total) * 100, color: 'bg-brand-700' },
      { label: 'Employers', value: employers, percentage: (employers / total) * 100, color: 'bg-accent-400' },
    ]
  }, [stats])

  if (isLoading) return (
    <div className="portal-page">
      <LoadingSkeleton variant="text" rows={2} className="max-w-md" />
      <LoadingSkeleton variant="stat" rows={4} />
      <LoadingSkeleton variant="card" rows={2} />
    </div>
  )

  if (isError && !stats) return (
    <div className="portal-page">
      <PageHeader title="Operations Dashboard" subtitle="Monitor employment services, accreditation workload, and platform activity." />
      <Card><ErrorState description={errorMessage} onRetry={refetch} /></Card>
    </div>
  )

  return (
    <div className="portal-page">
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

      <section className="portal-card-hero relative overflow-hidden rounded-xl border border-blue-900 bg-brand-navy px-6 py-7 text-white shadow-elevated sm:px-8">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <Badge variant={(stats?.pending_verifications ?? 0) > 0 ? 'pending' : 'verified'} className="border-white/10">
              {stats?.pending_verifications ?? 0} pending employer accreditation{stats?.pending_verifications === 1 ? '' : 's'}
            </Badge>
            <h2 className="mt-4 text-2xl font-bold">Employer accreditation reviews are ready</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Review employer registration details and legal documents before allowing vacancy publication.</p>
          </div>
          <Button to="/admin/verification-queue" variant="accent" icon={ClipboardCheck}>Open Employer Queue</Button>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={UsersRound}
          color="blue"
          label="Registered Seekers"
          value={Number(stats?.total_seekers ?? 0).toLocaleString()}
          subtitle={`${stats?.profile_completion_rate?.toFixed(1) ?? 0}% profile completion`}
          hint="Distinct job-seeker accounts registered to date."
        />
        <StatCard
          icon={Building2}
          color="slate"
          label="Registered Employers"
          value={Number(stats?.total_employers ?? 0).toLocaleString()}
          subtitle="Constituent employer accounts"
          hint="Employer accounts registered to date, across all verification statuses."
        />
        <StatCard
          icon={BriefcaseBusiness}
          color="green"
          label="Active Vacancies"
          value={Number(stats?.active_vacancies ?? 0).toLocaleString()}
          subtitle="Published, not expired"
          hint="Vacancies currently published and open. Excludes drafts and expired postings."
        />
        <StatCard
          icon={CheckCircle2}
          color="amber"
          label="Monthly Applications"
          value={Number(stats?.applications_this_month ?? 0).toLocaleString()}
          subtitle={
            <span className="flex gap-2">
              <span className="font-semibold text-success">{stats?.hired_this_month ?? 0} hired</span> &bull;
              <span className="font-semibold text-danger">{stats?.rejected_this_month ?? 0} rejected</span>
            </span>
          }
          hint="Applications submitted this calendar month."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Platform Composition" subtitle="Current registered constituent mix." />
            <div className="space-y-5">
              {composition.map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm"><span className="font-bold text-slate-800">{item.label}</span><span className="font-black text-slate-950">{item.value.toLocaleString()}</span></div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.percentage}%` }} /></div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Service Indicators" subtitle="Programs and upcoming PESO activities." />
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <Indicator icon={FileChartColumn} label="Open Programs" value={stats?.open_programs ?? 0} />
              <Indicator icon={CalendarDays} label="Upcoming Job Fairs" value={stats?.upcoming_job_fairs ?? 0} />
              <Indicator icon={ClipboardCheck} label="Pending Employers" value={stats?.pending_verifications ?? 0} warning />
            </div>
          </Card>
        </div>

        <Card padding="none">
          <div className="p-5 sm:p-6">
            <CardHeader
              title="Recent Registrations"
              subtitle="Newest job seeker and employer accounts."
              action={
                <div className="flex gap-2">
                  <Button onClick={handleExportCSV} variant="outline" size="sm" icon={Download}>Export</Button>
                  <Button to="/admin/job-seekers" variant="secondary" size="sm" icon={ArrowRight}>View All</Button>
                </div>
              }
            />
          </div>
          <DataTable
            columns={[
              { key: 'name', label: 'Constituent' },
              { key: 'role', label: 'Role', render: (role) => <StatusBadge status={role.toLowerCase()} /> },
              { key: 'email', label: 'Email' },
              { key: 'registered_at', label: 'Registered', render: (date) => new Date(date).toLocaleDateString() },
            ]}
            data={stats?.recent_registrations ?? []}
          />
        </Card>
      </div>

      <Card>
        <CardHeader title="Recent Application Activity" subtitle="Latest seeker-to-vacancy movement and match quality." />
        {stats?.recent_applications?.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {stats.recent_applications.map((application) => (
              <Link 
                key={application.id} 
                to="/admin/job-postings"
                className="rounded-2xl border border-slate-200 p-4 transition hover:border-brand-300 hover:bg-brand-50/50 block focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-bold text-slate-950">{application.seeker_name}</p><p className="mt-1 text-sm text-slate-600">{application.job_title} at {application.company_name}</p></div>
                  <StatusBadge status={application.status} />
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.min(100, application.match_percentage ?? 0)}%` }} /></div>
                  <span className="text-xs font-black text-brand-800">{application.match_percentage ?? 0}% match</span>
                </div>
              </Link>
            ))}
          </div>
        ) : <EmptyState size="sm" title="No recent application activity" description="New applications from job seekers will appear here as they come in." />}
      </Card>
    </div>
  )
}

function Indicator({ icon, label, value, warning }) {
  return <div className={`flex items-center gap-4 rounded-2xl p-4 ${warning ? 'bg-accent-50' : 'bg-slate-50'}`}><span className={`rounded-xl p-2 ${warning ? 'bg-white text-accent-700' : 'bg-white text-brand-700'}`}>{createElement(icon, { className: 'h-5 w-5' })}</span><div><p className="text-xl font-black text-slate-950">{value}</p><p className="text-xs font-semibold text-slate-500">{label}</p></div></div>
}

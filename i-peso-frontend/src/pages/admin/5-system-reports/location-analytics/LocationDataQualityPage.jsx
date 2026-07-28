import { createElement } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import {
  MapPin,
  MapPinned,
  ShieldAlert,
  ShieldCheck,
  Building2,
  Users,
  BriefcaseBusiness,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts'
import { ErrorState, LoadingSkeleton } from '@/components/ui'
import { CHART_COLORS } from '@/design-system/chartColors'

export default function LocationDataQualityPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'locationDataQuality'],
    queryFn: async () => {
      const [metricsRes, analyticsRes] = await Promise.all([
        api.get('/admin/location-data-quality/metrics'),
        api.get('/admin/location-data-quality/analytics'),
      ])
      return { metrics: metricsRes.data, analytics: analyticsRes.data }
    },
  })

  const metrics = data?.metrics
  const analytics = data?.analytics

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="text" rows={2} className="max-w-md" />
        <LoadingSkeleton variant="stat" rows={3} />
        <LoadingSkeleton variant="chart" />
      </div>
    )
  }

  if (isError) {
    return (
      <ErrorState
        description={error?.response?.data?.message ?? 'Unable to load location analytics.'}
        onRetry={refetch}
      />
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Location Data Quality</h1>
        <p className="mt-1 text-sm text-slate-500">
          Monitor the completeness and accuracy of GPS coordinates and PSGC address codes across the system.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <MetricCard title="Job Seekers" data={metrics?.job_seekers} icon={Users} colorClass="bg-blue-50 text-blue-600" />
        <MetricCard title="Employers" data={metrics?.employers} icon={Building2} colorClass="bg-indigo-50 text-indigo-600" />
        <MetricCard title="Job Vacancies" data={metrics?.job_vacancies} icon={BriefcaseBusiness} colorClass="bg-emerald-50 text-emerald-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-6 font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-slate-400" />
            Top Cities for Job Seekers
          </h3>
          <div className="h-[300px] w-full" role="img" aria-label={`Bar chart: top cities for job seekers. ${(analytics?.seekers_by_city || []).map((row) => `${row.city}: ${row.count}`).join(', ') || 'no data'}.`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.seekers_by_city || []} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis type="category" dataKey="city" width={100} tick={{ fontSize: 12 }} />
                <RechartsTooltip />
                <Bar dataKey="count" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} name="Seekers" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-6 font-bold text-slate-900 flex items-center gap-2">
            <MapPinned className="h-5 w-5 text-slate-400" />
            Top Cities for Job Vacancies
          </h3>
          <div className="h-[300px] w-full" role="img" aria-label={`Bar chart: top cities for job vacancies. ${(analytics?.vacancies_by_city || []).map((row) => `${row.city}: ${row.count}`).join(', ') || 'no data'}.`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.vacancies_by_city || []} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis type="category" dataKey="city" width={100} tick={{ fontSize: 12 }} />
                <RechartsTooltip />
                <Bar dataKey="count" fill={CHART_COLORS[2]} radius={[0, 4, 4, 0]} name="Vacancies" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ title, data, icon: Icon, colorClass }) {
  if (!data) return null
  const completePercent = ((data.with_coordinates / data.total) * 100).toFixed(1)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className={`rounded-lg p-2.5 ${colorClass}`}>
          {createElement(Icon, { className: 'h-5 w-5' })}
        </div>
        <div>
          <h3 className="font-bold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500">{data.total.toLocaleString()} Total Records</p>
        </div>
      </div>

      <div className="mb-5 relative h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`absolute left-0 top-0 h-full transition-all ${
            completePercent > 80 ? 'bg-emerald-500' : completePercent > 50 ? 'bg-amber-500' : 'bg-red-500'
          }`}
          style={{ width: `${completePercent}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-slate-500">Has Coordinates</p>
          <p className="font-semibold text-slate-900">{data.with_coordinates.toLocaleString()} ({completePercent}%)</p>
        </div>
        <div>
          <p className="text-slate-500">Verified Location</p>
          <p className="font-semibold text-emerald-600 flex items-center gap-1">
            {data.verified_location.toLocaleString()}
            <ShieldCheck className="h-3.5 w-3.5" />
          </p>
        </div>
        <div>
          <p className="text-slate-500">Missing Coordinates</p>
          <p className="font-semibold text-red-600 flex items-center gap-1">
            {data.missing_coordinates.toLocaleString()}
            {data.missing_coordinates > 0 && <ShieldAlert className="h-3.5 w-3.5" />}
          </p>
        </div>
        <div>
          <p className="text-slate-500">Missing PSGC Code</p>
          <p className="font-semibold text-amber-600">
            {data.missing_psgc.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  )
}

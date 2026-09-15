import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Card, CardHeader } from '@/components/ui'

const COLORS = ['#1e293b', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white/95 p-3 font-semibold text-slate-700 shadow-xl backdrop-blur-sm">
        {label ? <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">{label}</p> : null}
        <div className="space-y-1">
          {payload.map((p, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="font-bold">{p.name}:</span>
              <span>{p.value}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
}

export default function JobFairReportsChart({ metrics, reports }) {
  // Aggregate data for Pie Chart
  const pieData = [
    { name: 'Approved Employers', value: metrics?.approved ?? 0 },
    { name: 'Attended', value: metrics?.attended ?? 0 },
    { name: 'No Show', value: (metrics?.approved ?? 0) - (metrics?.attended ?? 0) }
  ].filter(d => d.value > 0)

  // Aggregate reports data for Bar Chart
  const barData = reports?.map(r => ({
    name: r.company_name,
    Applicants: r.total_applicants ?? 0,
    Hired: r.total_hots ?? 0,
    NearHired: r.total_near_hired ?? 0,
    Rejected: r.total_rejected ?? 0
  })) || []

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader title="Employer Participation" subtitle="Approved vs Attended" />
        <div className="h-72 w-full p-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <CardHeader title="Top Employers by Outcomes" subtitle="Applicants and HOTS by Employer" />
        <div className="h-72 w-full p-4">
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData.slice(0, 5)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} tickLine={false} axisLine={false} dy={10} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} dx={-10} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, paddingTop: '10px' }} />
                <Bar dataKey="Applicants" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Hired" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="NearHired" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm font-medium text-slate-400">
              No employer reports available.
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

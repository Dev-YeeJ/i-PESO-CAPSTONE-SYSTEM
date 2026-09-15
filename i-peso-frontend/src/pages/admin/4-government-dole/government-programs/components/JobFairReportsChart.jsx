import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Card, CardHeader } from '@/components/ui'

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9']

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
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
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
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Applicants" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Hired" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="NearHired" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              No employer reports available.
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

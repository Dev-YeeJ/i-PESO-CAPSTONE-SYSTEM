// i-peso-frontend/src/pages/admin/DashboardPage.jsx

import { useEffect, useState, useCallback } from 'react'
import PageHeader from '@/components/admin/PageHeader'
import StatCard from '@/components/admin/StatCard'
import StatusBadge from '@/components/admin/StatusBadge'
import DataTable from '@/components/admin/DataTable'
import { adminService } from '@/services/adminService'

// Icons
const UserIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
)

const BriefcaseIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
)

const DocumentIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const CheckIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m7 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        const data = await adminService.getDashboardStats()
        setStats(data)
        setError(null)
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load dashboard stats')
        console.error('Dashboard error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <h3 className="font-semibold text-red-900">Error</h3>
        <p className="text-red-700 text-sm mt-1">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        subtitle="System overview and key metrics"
      />

      {/* KPI Cards - 2x2 Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard
          icon={UserIcon}
          label="Total Job Seekers"
          value={stats?.total_seekers?.toLocaleString() || 0}
          color="blue"
        />
        <StatCard
          icon={BriefcaseIcon}
          label="Total Employers"
          value={stats?.total_employers?.toLocaleString() || 0}
          color="indigo"
        />
        <StatCard
          icon={DocumentIcon}
          label="Active Vacancies"
          value={stats?.active_vacancies?.toLocaleString() || 0}
          color="green"
        />
        <StatCard
          icon={CheckIcon}
          label="Applications (This Month)"
          value={stats?.applications_this_month?.toLocaleString() || 0}
          color="amber"
        />
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
          <p className="text-xs font-medium text-slate-600">Profile Completion</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {stats?.profile_completion_rate?.toFixed(1) || 0}%
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
          <p className="text-xs font-medium text-slate-600">Open Programs</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {stats?.open_programs || 0}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
          <p className="text-xs font-medium text-slate-600">Upcoming Job Fairs</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {stats?.upcoming_job_fairs || 0}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
          <p className="text-xs font-medium text-slate-600">Pending Verifications</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-block w-6 h-6 bg-amber-100 text-amber-700 rounded-full text-xs font-bold flex items-center justify-center">
              {stats?.pending_verifications || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Registrations Table */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Recent Registrations</h2>
        <DataTable
          columns={[
            { key: 'name', label: 'Name' },
            {
              key: 'role',
              label: 'Role',
              render: (role) => <StatusBadge status={role.toLowerCase()} />,
            },
            { key: 'email', label: 'Email' },
            {
              key: 'registered_at',
              label: 'Registered',
              render: (date) => new Date(date).toLocaleDateString(),
            },
          ]}
          data={stats?.recent_registrations || []}
        />
      </div>

      {/* Recent Applications Feed */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Recent Applications</h2>
        <div className="space-y-3">
          {stats?.recent_applications && stats.recent_applications.length > 0 ? (
            stats.recent_applications.map((app) => (
              <div
                key={app.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">
                    {app.seeker_name} → {app.job_title}
                  </p>
                  <p className="text-sm text-slate-600">{app.company_name}</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="inline-flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full">
                      <span className="text-xs font-semibold text-blue-700">
                        {app.match_percentage}% match
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={app.status} />
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-600">
              No recent applications
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
import { useAdminAuthStore } from '@/stores/authStore'
import Sidebar from '@/components/Sidebar'

export default function DashboardPage() {
  const user = useAdminAuthStore((s) => s.user)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8f9fb' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '40px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '24px', color: '#0f172a' }}>
          Dashboard
        </h1>
        <p style={{ color: '#64748b', marginBottom: '32px' }}>
          Welcome, {user?.name}!
        </p>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          {[
            { label: 'Total Job Seekers', value: '1,234' },
            { label: 'Total Employers', value: '56' },
            { label: 'Active Jobs', value: '342' },
            { label: 'This Month Hires', value: '89' },
          ].map((stat) => (
            <div key={stat.label} style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 8px' }}>{stat.label}</p>
              <p style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: 0 }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Placeholder sections */}
        <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: '#0f172a' }}>
            Recent Activity
          </h2>
          <p style={{ color: '#94a3b8' }}>Dashboard content coming soon...</p>
        </div>
      </div>
    </div>
  )
}

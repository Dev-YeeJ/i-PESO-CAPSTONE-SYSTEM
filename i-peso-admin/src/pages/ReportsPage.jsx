import Sidebar from '@/components/Sidebar'

export default function ReportsPage() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8f9fb' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '40px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '24px', color: '#0f172a' }}>
          Reports
        </h1>
        <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <p style={{ color: '#94a3b8' }}>Reports coming soon...</p>
        </div>
      </div>
    </div>
  )
}

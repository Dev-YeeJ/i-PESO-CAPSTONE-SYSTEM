import { Link, useLocation } from 'react-router-dom'
import { useAdminAuthStore } from '@/stores/authStore'

export default function Sidebar() {
  const location = useLocation()
  const logout = useAdminAuthStore((s) => s.logout)

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/users', label: 'Users' },
    { path: '/jobs', label: 'Jobs' },
    { path: '/reports', label: 'Reports' },
  ]

  return (
    <div style={{
      width: '280px',
      background: '#1e293b',
      color: '#f1f5f9',
      padding: '24px',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '32px', margin: '0 0 32px' }}>
        i-PESO Admin
      </h2>

      <nav style={{ flex: 1, marginBottom: '32px' }}>
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            style={{
              display: 'block',
              padding: '12px 16px',
              marginBottom: '8px',
              borderRadius: '8px',
              color: location.pathname === item.path ? '#fff' : '#cbd5e1',
              background: location.pathname === item.path ? '#334155' : 'transparent',
              textDecoration: 'none',
              fontSize: '14px',
              transition: 'all 0.2s',
            }}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <button
        onClick={logout}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: '#ef4444',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '600',
        }}
      >
        Logout
      </button>
    </div>
  )
}

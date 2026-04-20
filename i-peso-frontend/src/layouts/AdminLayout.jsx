// src/layouts/AdminLayout.jsx
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useState } from 'react'

const NAV = [
  { to: '/admin/dashboard', label: 'Dashboard',  icon: '⊞' },
  { to: '/admin/employers', label: 'Employers',  icon: '🏢', disabled: true },
  { to: '/admin/seekers',   label: 'Job Seekers', icon: '👤', disabled: true },
  { to: '/admin/programs',  label: 'Programs',   icon: '📌', disabled: true },
  { to: '/admin/analytics', label: 'Analytics',  icon: '📊', disabled: true },
]

export default function AdminLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const sidebarBg = '#2d1b69' // deep purple for admin

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)' }}>
      <aside style={{
        width: sidebarOpen ? 240 : 64,
        background: sidebarBg,
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
        flexShrink: 0,
        position: 'sticky', top: 0, height: '100vh', overflow: 'hidden',
      }}>
        <div style={{
          padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', gap: 10, minHeight: 64,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: '#7c3aed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, color: '#fff', fontSize: 14,
          }}>iP</div>
          {sidebarOpen && (
            <div>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: 14, lineHeight: 1.2 }}>i-PESO</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Admin Dashboard</div>
            </div>
          )}
        </div>

        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {NAV.map(({ to, label, icon, disabled }) => (
            <NavLink
              key={to}
              to={disabled ? '#' : to}
              onClick={e => disabled && e.preventDefault()}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 10px', borderRadius: 8, marginBottom: 2,
                color: disabled ? 'rgba(255,255,255,0.25)'
                     : isActive ? '#fff' : 'rgba(255,255,255,0.65)',
                background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                textDecoration: 'none', fontSize: 14, fontWeight: 500,
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap', overflow: 'hidden',
              })}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
              {sidebarOpen && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {sidebarOpen && user && (
            <div style={{ padding: '8px 10px', marginBottom: 4 }}>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.first_name} {user.last_name}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>PESO Administrator</div>
            </div>
          )}
          <button
            onClick={handleLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 10px', borderRadius: 8,
              background: 'transparent', border: 'none',
              color: 'rgba(255,255,255,0.5)', fontSize: 14, cursor: 'pointer',
              whiteSpace: 'nowrap', overflow: 'hidden',
            }}
            onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff' }}
            onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>→</span>
            {sidebarOpen && <span>Log out</span>}
          </button>
        </div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{
          height: 64, background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center',
          padding: '0 24px', gap: 16,
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <button
            onClick={() => setSidebarOpen(o => !o)}
            style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--color-text-2)', padding: 4, borderRadius: 6, cursor: 'pointer' }}
          >☰</button>
          <span style={{ flex: 1 }} />
          <span style={{
            padding: '4px 12px', borderRadius: 20,
            background: '#ede9fe', color: '#5b21b6',
            fontSize: 12, fontWeight: 600,
          }}>PESO Admin</span>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: '#ede9fe',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 600, fontSize: 14, color: '#5b21b6',
          }}>
            {user?.first_name?.[0] || 'A'}
          </div>
        </header>

        <main style={{ flex: 1, padding: 32, overflow: 'auto' }} className="page-enter">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
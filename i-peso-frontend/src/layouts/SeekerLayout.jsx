// src/layouts/SeekerLayout.jsx
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useState } from 'react'

const NAV = [
  { to: '/seeker/dashboard',    label: 'Dashboard' },
  { to: '/seeker/jobs',         label: 'Find Jobs',     disabled: true },
  { to: '/seeker/applications', label: 'Applications',  disabled: true },
  { to: '/seeker/profile',      label: 'My Profile',    disabled: true },
]

export default function SeekerLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)' }}>
      {/* Top navbar */}
      <header style={{
        background: 'var(--color-primary-dark)',
        position: 'sticky', top: 0, zIndex: 20,
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto',
          padding: '0 24px',
          display: 'flex', alignItems: 'center', gap: 16,
          height: 64,
        }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 16 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--color-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, color: '#fff', fontSize: 14, flexShrink: 0,
            }}>iP</div>
            <span style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>i-PESO</span>
          </div>

          {/* Desktop nav */}
          <nav style={{ display: 'flex', gap: 4, flex: 1 }}>
            {NAV.map(({ to, label, disabled }) => (
              <NavLink
                key={to}
                to={disabled ? '#' : to}
                onClick={e => disabled && e.preventDefault()}
                style={({ isActive }) => ({
                  padding: '6px 14px', borderRadius: 8,
                  color: disabled ? 'rgba(255,255,255,0.3)'
                       : isActive ? '#fff' : 'rgba(255,255,255,0.7)',
                  background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                  fontSize: 14, fontWeight: 500,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  textDecoration: 'none', transition: 'all 0.15s',
                })}
              >{label}</NavLink>
            ))}
          </nav>

          {/* User menu */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8,
                padding: '6px 12px', cursor: 'pointer', color: '#fff',
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--color-accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 600, fontSize: 13,
              }}>
                {user?.first_name?.[0] || 'S'}
              </div>
              <span style={{ fontSize: 14 }}>{user?.first_name || 'Seeker'}</span>
            </button>

            {menuOpen && (
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                background: 'var(--color-surface)',
                borderRadius: 10, border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-lg)',
                minWidth: 180, overflow: 'hidden', zIndex: 100,
              }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{user?.first_name} {user?.last_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-2)' }}>{user?.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%', padding: '10px 16px',
                    background: 'none', border: 'none',
                    textAlign: 'left', cursor: 'pointer',
                    fontSize: 14, color: 'var(--color-error)',
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--color-error-bg)'}
                  onMouseOut={e => e.currentTarget.style.background = 'none'}
                >Log out</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main style={{ flex: 1, maxWidth: 1200, width: '100%', margin: '0 auto', padding: '32px 24px' }} className="page-enter">
        <Outlet />
      </main>
    </div>
  )
}
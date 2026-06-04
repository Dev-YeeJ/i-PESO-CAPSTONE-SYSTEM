import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

const navGroups = [
  // ========== CATEGORY 1: OVERVIEW ==========
  {
    name: 'OVERVIEW',
    items: [
      {
        to: '/admin/dashboard',
        label: 'Dashboard',
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
      },
    ]
  },

  // ========== CATEGORY 2: CONSTITUENT CRM ==========
  {
    name: 'CONSTITUENT CRM',
    items: [
      {
        to: '/admin/verification-queue',
        label: 'Verification Queue',
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        badge: 'pending',
      },
      {
        to: '/admin/job-seekers',
        label: 'Job Seekers',
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
      },
      {
        to: '/admin/employers',
        label: 'Employers',
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
      },
    ]
  },

  // ========== CATEGORY 3: EMPLOYMENT HUB ==========
  {
    name: 'EMPLOYMENT HUB',
    items: [
      {
        to: '/admin/job-postings',
        label: 'Job Postings',
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
      },
    ]
  },

  // ========== CATEGORY 4: GOVERNMENT & DOLE ==========
  {
    name: 'GOVERNMENT & DOLE',
    items: [
      {
        to: '/admin/government-programs',
        label: 'Gov Programs',
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
      },
      {
        to: '/admin/job-fairs',
        label: 'Job Fairs',
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
      },
    ]
  },

  // ========== CATEGORY 5: SYSTEM & REPORTS ==========
  {
    name: 'SYSTEM & REPORTS',
    items: [
      {
        to: '/admin/labor-analytics',
        label: 'Labor Analytics',
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
      },
      {
        to: '/admin/activity-logs',
        label: 'Activity Logs',
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      },
    ]
  },
]

const AdminLayout = () => {
  const navigate  = useNavigate()
  const logout    = useAuthStore((s) => s.logout)
  const user      = useAuthStore((s) => s.user)
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? 'AD'

  return (
    <div className="min-h-screen bg-slate-50 flex">

      {/* SIDEBAR */}
      <aside className={`hidden md:flex flex-col bg-[#1a2234] text-slate-300 transition-all duration-200 ${collapsed ? 'w-16' : 'w-60'}`}>

        {/* Logo */}
        <div className={`h-16 flex items-center border-b border-slate-700/50 ${collapsed ? 'justify-center px-4' : 'px-5 gap-3'}`}>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          {!collapsed && (
            <div>
              <p className="font-bold text-white text-sm leading-none">i-PESO</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Admin Portal</p>
            </div>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 p-3 space-y-6 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.name}>
              {!collapsed && (
                <p className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  {group.name}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map(({ to, label, icon, badge }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/admin/dashboard'}
                    title={collapsed ? label : undefined}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors relative ${
                        isActive
                          ? 'bg-blue-600/20 text-blue-400'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      } ${collapsed ? 'justify-center' : ''}`
                    }
                  >
                    <span className="flex-shrink-0">{icon}</span>
                    {!collapsed && label}
                    {badge && !collapsed && (
                      <span className="ml-auto inline-block px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-800 rounded-full">
                        {badge}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Collapse toggle */}
        <div className="p-3 border-t border-slate-700/50">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors"
          >
            <svg className={`w-5 h-5 flex-shrink-0 transition-transform ${collapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 9l-3 3m0 0l3 3m-3-3h7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <div>
            <p className="text-sm font-semibold text-slate-800">{user?.name || 'Administrator'}</p>
            <p className="text-xs text-slate-500">System Admin</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
              <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {initials}
              </div>
              <button onClick={handleLogout} className="text-xs font-medium text-red-600 hover:text-red-700">
                Sign out
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout

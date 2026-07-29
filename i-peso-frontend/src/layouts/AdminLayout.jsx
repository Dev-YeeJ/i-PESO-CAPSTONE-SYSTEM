import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { ChevronLeft, LogOut, Menu, X } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import IPesoLogo from '@/components/branding/IPesoLogo'

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
        label: 'Employer Verification',
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
      {
        to: '/admin/employer-reports',
        label: 'Employer Reports',
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.28a1 1 0 01.948.684l.544 1.632a1 1 0 00.948.684H19a2 2 0 012 2v6a2 2 0 01-2 2h-6.28a1 1 0 01-.948-.684l-.544-1.632A1 1 0 009.28 15H3z" /></svg>,
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
      {
        to: '/admin/smart-matches',
        label: 'Smart Matches',
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5.36 4.364l-.707.707M9 12a3 3 0 11 6 0 3 3 0 01-6 0z" /></svg>,
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
      {
        to: '/admin/dole-reporting',
        label: 'DOLE Reporting',
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
      },
      {
        to: '/admin/placement-report',
        label: 'Placement Reports',
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
      },
      {
        to: '/admin/peis-export',
        label: 'PEIS Export',
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>,
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
        to: '/admin/sms-notifications',
        label: 'SMS Notifications',
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>,
      },
      {
        to: '/admin/activity-logs',
        label: 'Activity Logs',
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      },
    ]
  },

  // ========== CATEGORY 6: CONFIGURATION ==========
  {
    name: 'CONFIGURATION',
    items: [
      {
        to: '/admin/staff',
        label: 'Staff Management',
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0zM15 20H9m6 0h6v-2a9 9 0 00-9-9H6a9 9 0 00-9 9v2h6" /></svg>,
      },
      {
        to: '/admin/role-permissions',
        label: 'Roles & Permissions',
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>,
      },
      {
        to: '/admin/announcements',
        label: 'Announcements',
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.961 1.961 0 01-2.756 1.753L5.002 20.424a1.961 1.961 0 01-.757-1.753V5.882m0 0h.008v-.5a2 2 0 012-2h15.964m0 0v.5a2 2 0 01-2 2H3.25a2 2 0 01-2-2v-.5m19.964 0a2 2 0 00-1.965-2.693H6.965a2 2 0 00-1.965 2.693m17.928 2.693a1.961 1.961 0 00-1.207-1.753l-2.757-1.753a1.961 1.961 0 00-2.757 1.753m0 0v4.318a1.961 1.961 0 001.207 1.753l2.757 1.753a1.961 1.961 0 002.757-1.753m0-4.318v-2.5" /></svg>,
      },
      {
        to: '/admin/content-modules',
        label: 'Content Modules',
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
      },
      {
        to: '/admin/settings',
        label: 'System Settings',
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
      },
    ]
  },
]

const AdminLayout = () => {
  const navigate  = useNavigate()
  const logout    = useAuthStore((s) => s.logout)
  const user      = useAuthStore((s) => s.user)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? 'AD'

  const sidebar = (
    <>
        <div className={`flex h-[76px] items-center border-b border-white/10 ${collapsed ? 'justify-center px-4' : 'gap-3 px-5'}`}>
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm"><IPesoLogo className="h-full w-full" /></div>
          {!collapsed && (
            <div>
              <p className="text-lg font-extrabold leading-none text-white">i-PESO</p>
              <p className="mt-1 text-xs text-blue-200">PESO Admin Portal</p>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto p-3">
          {navGroups.map((group) => (
            <div key={group.name}>
              {!collapsed && (
                <p className="portal-sidebar-eyebrow mb-2 px-3 py-2">
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
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `relative flex min-h-11 items-center rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
                        isActive
                          ? 'portal-sidebar-link-active'
                          : 'portal-sidebar-link'
                      } ${collapsed ? 'justify-center' : 'gap-3'}`
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

        <div className="border-t border-white/10 p-3">
          <div className={`mb-2 flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-2 py-2'}`}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-gold text-xs font-black text-brand-navy">{initials}</span>
            {!collapsed && <div className="min-w-0"><p className="truncate text-sm font-bold text-white">{user?.name}</p><p className="text-xs text-blue-200">Administrator Account</p></div>}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`portal-sidebar-action hidden md:flex ${collapsed ? 'justify-center' : 'gap-3 px-3'}`}
          >
            <ChevronLeft className={`h-5 w-5 transition ${collapsed ? 'rotate-180' : ''}`} />{!collapsed && 'Collapse sidebar'}
          </button>
          <button onClick={handleLogout} className={`flex w-full items-center rounded-lg py-2.5 text-sm font-semibold text-red-200 hover:bg-red-500/10 hover:text-red-100 ${collapsed ? 'justify-center' : 'gap-3 px-3'}`}>
            <LogOut className="h-4 w-4" />{!collapsed && 'Sign out'}
          </button>
        </div>
    </>
  )

  return (
    <div className="portal-shell flex min-h-screen bg-brand-canvas">

      <aside className={`portal-sidebar sticky top-0 hidden h-screen flex-col transition-all duration-200 md:flex ${collapsed ? 'w-20' : 'w-[280px]'}`}>
        {sidebar}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button className="absolute inset-0 bg-slate-950/50" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />
          <aside className="portal-sidebar relative flex h-full w-[280px] flex-col shadow-2xl">{sidebar}</aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">

        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-slate-200 bg-white px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => { setCollapsed(false); setMobileOpen(true) }} className="rounded-lg border border-slate-200 p-2 text-slate-700 md:hidden" aria-label="Open navigation">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="flex items-center gap-2 text-sm font-bold">
              <span className="text-brand-navy">i-PESO</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-600">PESO Administration</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700 sm:inline-flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Live System
            </span>
            <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
              <div className="w-9 h-9 bg-brand-800 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {initials}
              </div>
              <span className="hidden text-xs font-bold text-slate-600 sm:inline">{user?.name}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout


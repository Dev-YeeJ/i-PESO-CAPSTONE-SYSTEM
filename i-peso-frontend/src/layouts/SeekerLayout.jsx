import { createElement, useState } from 'react'
import { BookOpenCheck, CalendarDays, ChevronLeft, CircleCheck, ClipboardList, GraduationCap, LayoutDashboard, LogOut, Menu, UserRound, X, MapPin } from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import NotificationBell from '@/pages/seeker/components/NotificationBell'
import IPesoLogo from '@/components/branding/IPesoLogo'

const navLinks = [
  { to: '/seeker/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/seeker/job-fairs', label: 'Job Fairs', icon: CalendarDays },
  { to: '/seeker/job-map', label: 'AI Job Map', icon: MapPin },
  { to: '/seeker/applications', label: 'My Applications', icon: ClipboardList },
  { to: '/seeker/government-programs', label: 'Government Programs', icon: GraduationCap },
  { to: '/seeker/program-applications', label: 'Program Applications', icon: BookOpenCheck },
  { to: '/seeker/profile', label: 'My Profile', icon: UserRound },
]

const pageNames = {
  '/seeker/dashboard': 'Dashboard',
  '/seeker/job-fairs': 'Job Fairs',
  '/seeker/job-map': 'AI Job Map',
  '/seeker/applications': 'My Applications',
  '/seeker/government-programs': 'Government Programs',
  '/seeker/program-applications': 'Program Applications',
  '/seeker/profile': 'My Profile',
  '/seeker/profile/edit': 'Update Profile',
}

export default function SeekerLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const logout = useAuthStore((state) => state.logout)
  const user = useAuthStore((state) => state.user)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const initials = user?.name?.split(' ').map((name) => name[0]).join('').slice(0, 2).toUpperCase() ?? 'JS'
  const pageName = pageNames[location.pathname] ?? 'Job Seeker Portal'

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const sidebar = (
    <>
      <div className={`flex h-[76px] items-center border-b border-white/10 ${collapsed ? 'justify-center px-3' : 'gap-3 px-5'}`}>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm"><IPesoLogo className="h-full w-full" /></span>
        {!collapsed && <div><p className="text-lg font-extrabold leading-none text-white">i-PESO</p><p className="mt-1 text-xs font-medium text-blue-200">Job Seeker Portal</p></div>}
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {!collapsed && <p className="portal-sidebar-eyebrow px-3 pb-3">My Employment</p>}
        <div className="space-y-1.5">
          {navLinks.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to.endsWith('dashboard')}
              title={collapsed ? label : undefined}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `flex min-h-12 items-center rounded-xl text-sm font-bold transition ${
                collapsed ? 'justify-center px-2' : 'gap-3 px-4'
              } ${
                isActive ? 'portal-sidebar-link-active' : 'portal-sidebar-link'
              }`}
            >
              {createElement(icon, { className: 'h-5 w-5 shrink-0' })}{!collapsed && label}
            </NavLink>
          ))}
        </div>
      </nav>
      <div className="border-t border-white/10 p-3">
        <div className={`mb-2 flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-2 py-2'}`}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-gold text-xs font-black text-brand-navy">{initials}</span>
          {!collapsed && <div className="min-w-0"><p className="truncate text-sm font-bold text-white">{user?.name}</p><p className="text-xs text-blue-200">Job Seeker Account</p></div>}
        </div>
        <button onClick={() => setCollapsed(!collapsed)} className={`portal-sidebar-action hidden md:flex ${collapsed ? 'justify-center' : 'gap-3 px-3'}`}>
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
      <aside className={`portal-sidebar sticky top-0 hidden h-screen shrink-0 flex-col transition-all duration-200 md:flex ${collapsed ? 'w-20' : 'w-[280px]'}`}>{sidebar}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button className="absolute inset-0 bg-slate-950/50" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />
          <aside className="portal-sidebar relative flex h-full w-[280px] flex-col shadow-2xl">{sidebar}</aside>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => { setCollapsed(false); setMobileOpen(true) }} className="rounded-lg border border-slate-200 p-2 text-slate-700 md:hidden" aria-label="Open navigation">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="hidden items-center gap-2 text-sm font-bold sm:flex"><span className="text-brand-navy">i-PESO</span><span className="text-slate-300">/</span><span className="text-slate-600">{pageName}</span></div>
            <p className="font-extrabold text-brand-navy sm:hidden">{pageName}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700 sm:inline-flex">
              <CircleCheck className="h-3.5 w-3.5" /> Profile Active
            </span>
            <NotificationBell />
            <span className="hidden h-9 w-px bg-slate-200 sm:block" />
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-navy text-xs font-black text-white">{initials}</span>
            <div className="hidden lg:block"><p className="max-w-40 truncate text-sm font-bold text-slate-800">{user?.name}</p><p className="text-xs text-slate-500">Job Seeker</p></div>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8"><Outlet /></main>
      </div>
    </div>
  )
}

import { createElement, useState, useEffect } from 'react'
import {
  BriefcaseBusiness,
  Building2,
  Calendar as CalendarIcon,
  FileBarChart,
  FileSpreadsheet,
  ChevronLeft,
  CircleCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  PlusCircle,
  UsersRound,
  X,
} from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import NotificationBell from '@/pages/employer/components/NotificationBell'
import { useAuthStore } from '@/stores/authStore'
import IPesoLogo from '@/components/branding/IPesoLogo'

const navItems = [
  { to: '/employer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/employer/post-job', label: 'Create Job Post', icon: PlusCircle, protected: true },
  { to: '/employer/vacancies', label: 'My Vacancies', icon: BriefcaseBusiness, protected: true },
  { to: '/employer/ats', label: 'Applicants', icon: UsersRound, protected: true },
  { to: '/employer/job-fairs', label: 'Job Fairs', icon: CalendarIcon, protected: true },
  { to: '/employer/reports/establishment-report', label: 'Establishment Report', icon: FileBarChart, protected: true },
  { to: '/employer/reports/placement-report', label: 'Placement Report', icon: FileSpreadsheet, protected: true },
  { to: '/employer/calendar', label: 'Calendar', icon: CalendarIcon, protected: true },
]

const pageNames = {
  '/employer/dashboard': 'Dashboard',
  '/employer/post-job': 'Create Job Post',
  '/employer/vacancies': 'My Vacancies',
  '/employer/ats': 'Applicants',
  '/employer/job-fairs': 'Job Fairs',
  '/employer/reports/establishment-report': 'Establishment Report / RO1-JF Form 3',
  '/employer/reports/placement-report': 'Placement Report',
  '/employer/calendar': 'Interview Calendar',
}

export default function EmployerLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const logout = useAuthStore((state) => state.logout)
  const user = useAuthStore((state) => state.user)
  const updateUser = useAuthStore((state) => state.updateUser)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const approved = user?.verification_status === 'verified'
  const visibleItems = navItems.filter((item) => !item.protected || approved)
  
  const logoUrl = user?.employer?.logo_url
  const companyName = user?.employer?.company_name || user?.name
  const initials = companyName?.split(' ').map((name) => name[0]).join('').slice(0, 2).toUpperCase() ?? 'EM'
  
  const pageName = pageNames[location.pathname] ?? 'Employer Portal'

  useEffect(() => {
    if (!approved) {
      const checkStatus = async () => {
        try {
          const { authService } = await import('@/services/authService')
          const updatedUser = await authService.getAuthenticatedUser()
          updateUser(updatedUser)
        } catch {
          // silently fail
        }
      }
      const interval = setInterval(checkStatus, 30000)
      window.addEventListener('focus', checkStatus)
      return () => {
        clearInterval(interval)
        window.removeEventListener('focus', checkStatus)
      }
    }
  }, [approved, updateUser])

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const sidebar = (
    <>
      <div className={`flex h-[76px] items-center border-b border-white/10 ${collapsed ? 'justify-center px-3' : 'gap-3 px-5'}`}>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm"><IPesoLogo className="h-full w-full" /></span>
        {!collapsed && (
          <div>
            <p className="text-lg font-extrabold leading-none text-white">i-PESO</p>
            <p className="mt-1 text-xs font-medium text-blue-200">Employer Portal</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {!collapsed && <p className="px-3 pb-3 text-[11px] font-extrabold uppercase tracking-[0.16em] text-blue-300/70">My Company</p>}
        <div className="space-y-1.5">
          {visibleItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to.endsWith('dashboard')}
              title={collapsed ? label : undefined}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `flex min-h-12 items-center rounded-xl text-sm font-bold transition ${
                collapsed ? 'justify-center px-2' : 'gap-3 px-4'
              } ${isActive
                ? 'portal-sidebar-link-active'
                : 'portal-sidebar-link'
              }`}
            >
              {createElement(icon, { className: 'h-5 w-5 shrink-0' })}
              {!collapsed && label}
            </NavLink>
          ))}
        </div>

        {!approved && !collapsed && (
          <div className="mt-6 rounded-xl border border-amber-300/20 bg-amber-300/10 p-4">
            <p className="text-xs font-extrabold text-amber-200">Accreditation pending</p>
            <p className="mt-1 text-xs leading-5 text-blue-100/75">Hiring tools unlock after PESO approves your documents.</p>
          </div>
        )}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className={`mb-2 flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-2 py-2'}`}>
          {logoUrl ? (
            <img src={logoUrl} alt="Company Logo" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full object-cover shadow-sm bg-white" />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-gold text-xs font-black text-brand-navy">{initials}</span>
          )}
          {!collapsed && <div className="min-w-0"><p className="truncate text-sm font-bold text-white">{companyName}</p><p className="text-xs text-blue-200">Employer Account</p></div>}
        </div>
        <button onClick={() => setCollapsed(!collapsed)} className={`hidden w-full items-center rounded-lg py-2.5 text-sm font-semibold text-blue-200 hover:bg-white/10 hover:text-white md:flex ${collapsed ? 'justify-center' : 'gap-3 px-3'}`}>
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
      <aside className={`portal-sidebar sticky top-0 hidden h-screen shrink-0 flex-col transition-all duration-200 md:flex ${collapsed ? 'w-20' : 'w-[280px]'}`}>
        {sidebar}
      </aside>

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
            <div className="hidden items-center gap-2 text-sm font-bold sm:flex">
              <span className="text-brand-navy">i-PESO</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-600">{pageName}</span>
            </div>
            <div className="sm:hidden"><p className="font-extrabold text-brand-navy">{pageName}</p></div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700 sm:inline-flex">
              <CircleCheck className="h-3.5 w-3.5" /> Live System
            </span>
            <NotificationBell />
            <span className="hidden h-9 w-px bg-slate-200 sm:block" />
            <div className="hidden items-center gap-2 lg:flex">
              <Building2 className="h-4 w-4 text-slate-400" />
              <span className="max-w-44 truncate text-sm font-bold text-slate-700">{user?.name}</span>
            </div>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8"><Outlet /></main>
      </div>
    </div>
  )
}

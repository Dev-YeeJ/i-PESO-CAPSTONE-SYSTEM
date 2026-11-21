import { createElement, useState, useEffect } from 'react'
import {
  BriefcaseBusiness,
  Building2,
  Calendar as CalendarIcon,
  FileBarChart,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,

  Menu,
  PlusCircle,
  ShieldAlert,
  Star,
  UsersRound,
  X,
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getApplicantCounts } from '@/services/employerService'
import { APPLICANTS_CHANGED_EVENT } from '@/services/employerApplicationService'
import NotificationBell from '@/components/shell/NotificationBell'
import { useAuthStore } from '@/stores/authStore'
import IPesoLogo from '@/components/branding/IPesoLogo'
import SignOutConfirmDialog from '@/components/common/SignOutConfirmDialog'
import ShellSearch from '@/components/shell/ShellSearch'

// `protected` items unlock once PESO verifies the employer.
const navGroups = [
  {
    heading: 'Hiring',
    items: [
      { to: '/employer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/employer/post-job', label: 'Post a job', icon: PlusCircle, protected: true },
      { to: '/employer/vacancies', label: 'Vacancies', icon: BriefcaseBusiness, protected: true },
      { to: '/employer/ats', label: 'Applicants', icon: UsersRound, protected: true },
      { to: '/employer/calendar', label: 'Interview calendar', icon: CalendarIcon, protected: true },
    ],
  },
  {
    heading: 'Events and reports',
    items: [
      { to: '/employer/job-fairs', label: 'Job fairs', icon: CalendarIcon, protected: true },
      { to: '/employer/reports/establishment-report', label: 'Establishment report', icon: FileBarChart, protected: true },
      { to: '/employer/reports/placement-report', label: 'Placement report', icon: FileSpreadsheet, protected: true },
    ],
  },
  {
    heading: 'Company',
    items: [
      { to: '/employer/profile', label: 'Company profile', icon: Building2, protected: true },
      { to: '/employer/reviews', label: 'Reviews', icon: Star, protected: true },
      { to: '/employer/safety-reports', label: 'Safety reports', icon: ShieldAlert, protected: true },
    ],
  },
]

const pageNames = {
  '/employer/dashboard': 'Dashboard',
  '/employer/profile': 'Company profile',
  '/employer/post-job': 'Post a job',
  '/employer/vacancies': 'Vacancies',
  '/employer/ats': 'Applicants',
  '/employer/job-fairs': 'Job fairs',
  '/employer/reports/establishment-report': 'Establishment report',
  '/employer/reports/placement-report': 'Placement report',
  '/employer/calendar': 'Interview calendar',
  '/employer/reviews': 'Reviews',
  '/employer/safety-reports': 'Safety reports',
}

export default function EmployerLayout() {
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const updateUser = useAuthStore((state) => state.updateUser)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [signOutOpen, setSignOutOpen] = useState(false)
  const approved = user?.verification_status === 'verified'
  const visibleGroups = navGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => !item.protected || approved) }))
    .filter((group) => group.items.length > 0)

  // "Applicants" badge: applicants nobody has reviewed yet. Polled like the bell.
  const applicantCounts = useQuery({
    queryKey: ['employer', 'applicantCounts'],
    queryFn: getApplicantCounts,
    enabled: approved,
    refetchInterval: 30000,
    staleTime: 15000,
  })
  const refetchApplicantCounts = applicantCounts.refetch
  useEffect(() => {
    if (!approved) return undefined
    const refresh = () => refetchApplicantCounts()
    window.addEventListener(APPLICANTS_CHANGED_EVENT, refresh)
    return () => window.removeEventListener(APPLICANTS_CHANGED_EVENT, refresh)
  }, [approved, refetchApplicantCounts])
  const newApplicants = applicantCounts.data?.new ?? 0
  const badgeFor = (to) => (to === '/employer/ats' && newApplicants > 0 ? newApplicants : 0)
  const badgeTitle = applicantCounts.data
    ? `${newApplicants} new applicant${newApplicants === 1 ? '' : 's'} waiting for review · ${applicantCounts.data.total} in total`
    : undefined
  
  const logoUrl = user?.employer?.logo_url
  const companyName = user?.employer?.company_name || user?.name
  const initials = companyName?.split(' ').map((name) => name[0]).join('').slice(0, 2).toUpperCase() ?? 'EM'
  
  // Resolve page name — handle dynamic ATS route /employer/ats/:vacancyId
  const pageName = pageNames[location.pathname]
    ?? (location.pathname.startsWith('/employer/ats/') ? 'Applicant Tracking' : 'Employer Portal')


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

  const sidebar = (
    <>
      <div className={`flex h-[72px] items-center border-b border-white/10 ${collapsed ? 'justify-center px-3' : 'gap-3 px-5'}`}>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white"><IPesoLogo className="h-full w-full" /></span>
        {!collapsed && (
          <div className="leading-tight">
            <p className="text-base font-bold tracking-tight text-white">i-PESO</p>
            <p className="text-xs text-white/60">Employer</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <div className="space-y-6">
        {visibleGroups.map((group) => (
        <div key={group.heading}>
        {!collapsed && <p className="portal-sidebar-eyebrow px-3 pb-2">{group.heading}</p>}
        <div className="space-y-0.5">
          {group.items.map(({ to, label, icon }) => {
            const badge = badgeFor(to)
            return (
            <NavLink
              key={to}
              to={to}
              end={to.endsWith('dashboard')}
              title={badge ? `${label} — ${badgeTitle}` : collapsed ? label : undefined}
              aria-label={badge ? `${label}, ${badge} new` : undefined}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `min-h-10 py-2.5 ${
                collapsed ? 'justify-center px-2' : 'gap-3 px-3'
              } ${isActive
                ? 'portal-sidebar-link-active'
                : 'portal-sidebar-link'
              }`}
            >
              <span className="relative shrink-0">
                {createElement(icon, { className: 'h-[18px] w-[18px]', 'aria-hidden': true })}
                {badge > 0 && collapsed && (
                  <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-gold px-1 text-[10px] font-bold leading-none text-brand-navy ring-2 ring-brand-navy">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </span>
              {!collapsed && label}
              {badge > 0 && !collapsed && (
                <span className="portal-sidebar-badge">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </NavLink>
            )
          })}
        </div>
        </div>
        ))}
        </div>

        {!approved && !collapsed && (
          <div className="mt-6 rounded-xl border border-amber-300/20 bg-amber-300/10 p-4">
            <p className="text-sm font-semibold text-brand-gold">Accreditation pending</p>
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
        <button onClick={() => { setMobileOpen(false); setSignOutOpen(true) }} className={`flex w-full items-center rounded-lg py-2.5 text-sm font-semibold text-red-200 hover:bg-red-500/10 hover:text-red-100 ${collapsed ? 'justify-center' : 'gap-3 px-3'}`}>
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
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => { setCollapsed(false); setMobileOpen(true) }} className="rounded-lg border border-slate-200 p-2 text-slate-700 md:hidden" aria-label="Open navigation">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <nav className="hidden items-center gap-2 text-sm text-slate-500 sm:flex" aria-label="Breadcrumb">
              <NavLink to="/employer/dashboard" className="hover:text-brand-navy">Home</NavLink>
              <ChevronRight className="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />
              <span className="truncate font-semibold text-slate-900" aria-current="page">{pageName}</span>
            </nav>
            <p className="truncate font-bold text-slate-900 sm:hidden">{pageName}</p>
          </div>
          <div className="flex flex-1 justify-end md:justify-center">
            <ShellSearch groups={visibleGroups} recordPortal={approved ? 'employer' : undefined} placeholder={approved ? 'Search vacancies, applicants, pages…' : 'Search pages…'} />
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell portal="employer" />
            <div className="hidden items-center gap-3 lg:flex">
              <Building2 className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <span className="max-w-44 truncate text-sm font-semibold text-slate-800">{user?.name}</span>
            </div>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8"><Outlet /></main>
      </div>
      <SignOutConfirmDialog open={signOutOpen} onOpenChange={setSignOutOpen} />
    </div>
  )
}

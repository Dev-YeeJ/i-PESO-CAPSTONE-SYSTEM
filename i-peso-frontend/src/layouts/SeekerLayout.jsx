import { createElement, useState } from 'react'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, Landmark, LayoutDashboard, LogOut, Map as MapIcon, Menu, UserRound, X, ShieldAlert, Star } from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import NotificationBell from '@/components/shell/NotificationBell'
import IPesoLogo from '@/components/branding/IPesoLogo'
import MobileBottomNav from '@/pages/seeker/components/MobileBottomNav'
import SignOutConfirmDialog from '@/components/common/SignOutConfirmDialog'
import { useSeekerPhotoUrl } from '@/hooks/useSeekerPhotoUrl'
import ShellSearch from '@/components/shell/ShellSearch'

// Grouped by what the seeker is doing: finding work, following up, managing the account.
const navGroups = [
  {
    heading: 'Find work',
    items: [
      { to: '/seeker/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/seeker/job-map', label: 'Job Map', icon: MapIcon },
      { to: '/seeker/job-fairs', label: 'Job Fairs', icon: CalendarDays },
      { to: '/seeker/government-programs', label: 'Government Programs', icon: Landmark },
    ],
  },
  {
    heading: 'My activity',
    items: [
      { to: '/seeker/applications', label: 'Applications', icon: ClipboardList },
      { to: '/seeker/reviews', label: 'Reviews', icon: Star },
      { to: '/seeker/safety-reports', label: 'Safety Reports', icon: ShieldAlert },
    ],
  },
  {
    heading: 'Account',
    items: [
      { to: '/seeker/profile', label: 'Profile', icon: UserRound },
    ],
  },
]

const allLinks = navGroups.flatMap((group) => group.items)
// Bottom tab bar on phones: the five places a seeker goes most.
const mobileLinks = ['/seeker/dashboard', '/seeker/job-map', '/seeker/job-fairs', '/seeker/applications', '/seeker/profile']
  .map((to) => allLinks.find((link) => link.to === to))

const pageNames = {
  '/seeker/dashboard': 'Dashboard',
  '/seeker/job-fairs': 'Job Fairs',
  '/seeker/job-map': 'Job Map',
  '/seeker/applications': 'Applications',
  '/seeker/government-programs': 'Government Programs',
  '/seeker/reviews': 'Reviews',
  '/seeker/safety-reports': 'Safety Reports',
  '/seeker/profile': 'Profile',
  '/seeker/profile/edit': 'Update Profile',
}

function pageNameFor(pathname) {
  if (pageNames[pathname]) return pageNames[pathname]
  if (pathname.startsWith('/seeker/job-map')) return 'Job Map'
  if (pathname.startsWith('/seeker/job-fairs')) return 'Job Fairs'
  if (pathname.startsWith('/seeker/government-programs')) return 'Government Programs'
  if (pathname.startsWith('/seeker/employers')) return 'Employer Profile'
  return 'Job Seeker Portal'
}

export default function SeekerLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [signOutOpen, setSignOutOpen] = useState(false)
  const initials = user?.name?.split(' ').map((name) => name[0]).join('').slice(0, 2).toUpperCase() ?? 'JS'
  const photoUrl = useSeekerPhotoUrl()
  const avatarContent = photoUrl
    ? <img src={photoUrl} alt="" className="h-full w-full object-cover" />
    : initials
  const pageName = pageNameFor(location.pathname)

  const sidebar = (
    <>
      <div className={`flex h-[72px] items-center border-b border-white/10 ${collapsed ? 'justify-center px-3' : 'gap-3 px-5'}`}>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white"><IPesoLogo className="h-full w-full" /></span>
        {!collapsed && <div className="leading-tight"><p className="text-base font-bold tracking-tight text-white">i-PESO</p><p className="text-xs text-white/60">Job Seeker</p></div>}
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Job seeker">
        {navGroups.map((group) => (
          <div key={group.heading}>
            {!collapsed && <p className="portal-sidebar-eyebrow px-3 pb-2">{group.heading}</p>}
            <div className="space-y-0.5">
              {group.items.map(({ to, label, icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to.endsWith('dashboard')}
                  title={collapsed ? label : undefined}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => `min-h-10 py-2.5 ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} ${
                    isActive ? 'portal-sidebar-link-active' : 'portal-sidebar-link'
                  }`}
                >
                  {createElement(icon, { className: 'h-[18px] w-[18px] shrink-0', 'aria-hidden': true })}{!collapsed && label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="space-y-0.5 border-t border-white/10 p-3">
        <button onClick={() => setCollapsed(!collapsed)} className={`portal-sidebar-action hidden md:flex ${collapsed ? 'justify-center' : 'gap-3 px-3'}`}>
          <ChevronLeft className={`h-[18px] w-[18px] transition ${collapsed ? 'rotate-180' : ''}`} />{!collapsed && 'Collapse sidebar'}
        </button>
        <button onClick={() => { setMobileOpen(false); setSignOutOpen(true) }} className={`portal-sidebar-action ${collapsed ? 'justify-center' : 'gap-3 px-3'}`}>
          <LogOut className="h-[18px] w-[18px]" />{!collapsed && 'Sign out'}
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
        <header className="sticky top-0 z-30 flex h-[64px] items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:h-[72px] sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => { setCollapsed(false); setMobileOpen(true) }} className="rounded-lg border border-slate-200 p-2 text-slate-700 md:hidden" aria-label="Open navigation">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <nav className="hidden items-center gap-2 text-sm text-slate-500 sm:flex" aria-label="Breadcrumb">
              <NavLink to="/seeker/dashboard" className="hover:text-brand-navy">Home</NavLink>
              <ChevronRight className="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />
              <span className="truncate font-semibold text-slate-900" aria-current="page">{pageName}</span>
            </nav>
            <p className="truncate text-base font-bold text-slate-900 sm:hidden">{pageName}</p>
          </div>
          <div className="flex flex-1 justify-end md:justify-center">
            <ShellSearch groups={navGroups} recordPortal="seeker" placeholder="Search jobs, programs, pages…" />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationBell portal="seeker" />
            <button
              type="button"
              onClick={() => navigate('/seeker/profile')}
              className="flex items-center gap-3 rounded-xl p-1.5 transition hover:bg-slate-100 lg:pr-3"
              title="Go to my profile"
            >
              <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#e8f0fc] text-xs font-bold text-brand-navy">{avatarContent}</span>
              <span className="hidden text-left leading-tight lg:block"><span className="block max-w-40 truncate text-sm font-semibold text-slate-900">{user?.name}</span><span className="block text-xs text-slate-500">Job seeker</span></span>
              <ChevronDown className="hidden h-4 w-4 text-slate-400 lg:block" aria-hidden="true" />
            </button>
          </div>
        </header>
        <main className="px-3 pb-28 pt-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8"><Outlet /></main>
      </div>
      <MobileBottomNav links={mobileLinks} />
      <SignOutConfirmDialog open={signOutOpen} onOpenChange={setSignOutOpen} />
    </div>
  )
}

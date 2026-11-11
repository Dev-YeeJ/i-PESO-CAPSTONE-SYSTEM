// What a signed-in staff account may open in the admin console.
//
// The API is the real gate (every admin endpoint checks the module); this only
// keeps the sidebar and pages from offering what would come back "no access".
// Module keys and levels mirror App\Models\AdminRole on the backend.

export const MODULE_LABELS = {
  constituent_crm: 'Constituent CRM',
  employment_hub: 'Employment Hub',
  government_dole: 'Government & DOLE',
  system_reports: 'System & Reports',
  activity_logs: 'Activity Logs',
  configuration: 'Configuration',
}

export const ACCESS_LABELS = {
  none: 'No access',
  view: 'View only',
  manage: 'Full access',
}

// Longest prefix wins. Paths not listed (the dashboard, set-password) are open
// to every staff account.
const PATH_MODULES = [
  ['/admin/verification-queue', 'constituent_crm'],
  ['/admin/job-seekers', 'constituent_crm'],
  ['/admin/employers', 'constituent_crm'],
  ['/admin/safety-reports', 'constituent_crm'],
  ['/admin/employer-reports', 'constituent_crm'],
  ['/admin/reviews', 'constituent_crm'],
  ['/admin/occupation-mapping', 'constituent_crm'],
  ['/admin/job-postings', 'employment_hub'],
  ['/admin/government-programs', 'government_dole'],
  ['/admin/job-fairs', 'government_dole'],
  ['/admin/dole-reporting', 'government_dole'],
  ['/admin/placement-report', 'government_dole'],
  ['/admin/establishment-report', 'government_dole'],
  ['/admin/labor-analytics', 'system_reports'],
  ['/admin/analytics', 'system_reports'],
  ['/admin/sms-notifications', 'system_reports'],
  ['/admin/sms-templates', 'system_reports'],
  ['/admin/location-data-quality', 'system_reports'],
  ['/admin/activity-logs', 'activity_logs'],
  ['/admin/staff', 'configuration'],
  ['/admin/role-permissions', 'configuration'],
  ['/admin/ojt-interns', 'configuration'],
  ['/admin/announcements', 'configuration'],
  ['/admin/content-modules', 'configuration'],
  ['/admin/settings', 'configuration'],
]

export function moduleForPath(pathname = '') {
  let match = null
  for (const [prefix, module] of PATH_MODULES) {
    if ((pathname === prefix || pathname.startsWith(`${prefix}/`)) && (!match || prefix.length > match[0].length)) {
      match = [prefix, module]
    }
  }
  return match?.[1] ?? null
}

export function accessLevel(user, module) {
  if (!module) return 'manage'
  if (user?.is_system_administrator) return 'manage'
  // Sessions from before access levels existed carry no map: don't hide
  // anything — the API still enforces access.
  if (!user?.access) return 'manage'
  return user.access[module] ?? 'none'
}

export const canOpen = (user, module) => accessLevel(user, module) !== 'none'

export const canManage = (user, module) => accessLevel(user, module) === 'manage'

export const isSystemAdministrator = (user) => !!user?.is_system_administrator

export const canOpenPath = (user, pathname) => canOpen(user, moduleForPath(pathname))

export const isIntern = (user) => user?.position === 'ojt_intern'

/** Where a staff member lands after signing in: interns start on their time record. */
export const adminHomePath = (user) => (isIntern(user) ? '/admin/my-ojt' : '/admin/dashboard')

/**
 * Where to go after signing in, given the login page's ?redirect=. The guard writes the
 * page that was open when the last session ended (expired, or signed out) into ?redirect=,
 * so it can belong to a DIFFERENT account — e.g. an intern's My OJT Hours page followed by
 * the Office Manager signing in. Only honour it when it's an in-app admin page that THIS
 * account may open; otherwise use their normal home (the dashboard, or My OJT for interns).
 */
export function adminLandingPath(user, redirect) {
  const home = adminHomePath(user)
  if (typeof redirect !== 'string') return home

  // In-app admin pages only: no other origins ("//host", "https://…"), no other portals.
  if (!/^\/admin(\/|$|\?|#)/.test(redirect) || redirect.startsWith('//') || redirect.includes('://')) return home

  const pathname = redirect.split(/[?#]/)[0].replace(/\/+$/, '') || '/admin'
  if (pathname === '/admin' || pathname === '/admin/set-password') return home
  if (pathname === '/admin/my-ojt' && !isIntern(user)) return home
  if (!canOpenPath(user, pathname)) return home

  return redirect
}

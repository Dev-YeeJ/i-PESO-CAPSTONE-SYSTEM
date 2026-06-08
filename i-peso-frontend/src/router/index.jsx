import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

import GuestLayout    from '@/layouts/GuestLayout'
import EmployerLayout from '@/layouts/EmployerLayout'
import SeekerLayout   from '@/layouts/SeekerLayout'
import AdminLayout    from '@/layouts/AdminLayout'
import App            from '@/App'

// --- LAZY LOADED PAGES ---
const LandingPage        = lazy(() => import('@/pages/landing/LandingPage'))
const LoginPage          = lazy(() => import('@/pages/auth/LoginPage'))
const VerifyEmailPage    = lazy(() => import('@/pages/auth/VerifyEmailPage'))
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'))
const ResetPasswordPage  = lazy(() => import('@/pages/auth/ResetPasswordPage'))

// Split Registration Pages
const RegisterGateway      = lazy(() => import('@/pages/auth/register/RegisterGateway'))
const SeekerRegistration   = lazy(() => import('@/pages/auth/register/SeekerRegistration'))
const EmployerRegistration = lazy(() => import('@/pages/auth/register/EmployerRegistration'))
const EmployerOnboarding   = lazy(() => import('@/pages/employer/EmployerRegistration'))

// Dashboards
const EmployerDashboard = lazy(() => import('@/pages/employer/DashboardPage'))
const EmployerPostJob   = lazy(() => import('@/pages/employer/PostJobPage'))
const EmployerVacancies = lazy(() => import('@/pages/employer/VacanciesPage'))
const SeekerDashboard   = lazy(() => import('@/pages/seeker/DashboardPage'))
const SeekerProfile     = lazy(() => import('@/pages/seeker/SeekerProfile'))
const SeekerOnboarding  = lazy(() => import('@/pages/auth/onboarding/SeekerOnboarding'))

// Admin Pages - CATEGORY 1: OVERVIEW
const AdminDashboard = lazy(() => import('@/pages/admin/1-overview/dashboard/DashboardPage'))

// Admin Pages - CATEGORY 2: CONSTITUENT CRM
const AdminVerificationQueue = lazy(() => import('@/pages/admin/2-constituent-crm/job-seekers/VerificationQueuePage'))
const AdminJobSeekersList    = lazy(() => import('@/pages/admin/2-constituent-crm/job-seekers/JobSeekersListPage'))
const AdminJobSeekerDetail   = lazy(() => import('@/pages/admin/2-constituent-crm/job-seekers/JobSeekerDetailPage'))
const AdminEmployersList     = lazy(() => import('@/pages/admin/2-constituent-crm/employers/EmployersListPage'))
const AdminEmployerDetail    = lazy(() => import('@/pages/admin/2-constituent-crm/employers/EmployerDetailPage'))

// Admin Pages - CATEGORY 3: EMPLOYMENT HUB
const AdminJobPostingsList = lazy(() => import('@/pages/admin/3-employment-hub/job-postings/JobPostingsListPage'))
const AdminSmartMatches = lazy(() => import('@/pages/admin/3-employment-hub/smart-matches/SmartMatchesPage'))
const AdminMatchResults = lazy(() => import('@/pages/admin/3-employment-hub/smart-matches/MatchResultsPage'))

// Admin Pages - CATEGORY 4: GOVERNMENT & DOLE
const AdminGovernmentProgramsList = lazy(() => import('@/pages/admin/4-government-dole/government-programs/GovernmentProgramsListPage'))
const AdminGovernmentProgramForm = lazy(() => import('@/pages/admin/4-government-dole/government-programs/GovernmentProgramFormPage'))
const AdminProgramApplicants    = lazy(() => import('@/pages/admin/4-government-dole/government-programs/ProgramApplicantsPage'))
const AdminJobFairsList         = lazy(() => import('@/pages/admin/4-government-dole/government-programs/JobFairsListPage'))
const AdminJobFairForm          = lazy(() => import('@/pages/admin/4-government-dole/government-programs/JobFairFormPage'))
const AdminDOLEReporting       = lazy(() => import('@/pages/admin/4-government-dole/dole-reporting/DOLEReportingPage'))
const AdminPEISExport          = lazy(() => import('@/pages/admin/4-government-dole/dole-reporting/PEISExportPage'))

// Admin Pages - CATEGORY 5: SYSTEM & REPORTS
const AdminLaborAnalytics = lazy(() => import('@/pages/admin/5-system-reports/labor-analytics/LaborAnalyticsPage'))
const AdminAnalyticsDetail = lazy(() => import('@/pages/admin/5-system-reports/labor-analytics/AnalyticsDetailPage'))
const AdminActivityLogs    = lazy(() => import('@/pages/admin/5-system-reports/activity-logs/ActivityLogsPage'))
const AdminSMSNotifications = lazy(() => import('@/pages/admin/5-system-reports/sms-notifications/SMSNotificationsPage'))
const AdminSMSTemplates = lazy(() => import('@/pages/admin/5-system-reports/sms-notifications/SMSTemplatesPage'))

// Admin Pages - CATEGORY 6: CONFIGURATION
const AdminStaffList = lazy(() => import('@/pages/admin/6-configuration/staff/StaffListPage'))
const AdminRolePermissions = lazy(() => import('@/pages/admin/6-configuration/staff/RolePermissionsPage'))
const AdminAnnouncements = lazy(() => import('@/pages/admin/6-configuration/content/AnnouncementsPage'))
const AdminContentModules = lazy(() => import('@/pages/admin/6-configuration/content/ContentModuleListPage'))
const AdminSystemSettings = lazy(() => import('@/pages/admin/6-configuration/settings/SystemSettingsPage'))

// --- LOADER & SUSPENSE ---
function PageLoader() {
  const spinnerStyle = {
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: '3px solid #e2e8f0',
    borderTopColor: '#1a4b8c',
    animation: 'spin 0.7s linear infinite',
  }

  const wrapperStyle = {
    display: 'flex',
    height: '100vh',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f8f9fb',
  }

  return (
    <div style={wrapperStyle}>
      <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg); } }' }} />
      <div style={spinnerStyle} />
    </div>
  )
}

const S = (Component) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
)

// --- ROUTE GUARDS ---
function RequireAuth() {
  const isInitialized   = useAuthStore((s) => s.isInitialized)
  const token           = useAuthStore((s) => s.token)
  const user            = useAuthStore((s) => s.user)
  const isAuthenticated = !!token && !!user

  if (!isInitialized) return <PageLoader />

  if (!isAuthenticated) {
    const redirect = window.location.pathname + window.location.search
    return <Navigate to={'/login?redirect=' + encodeURIComponent(redirect)} replace />
  }

  return <Outlet />
}

function RequireVerified() {
  const user = useAuthStore((s) => s.user)
  if (!user?.email_verified_at) return <Navigate to="/verify-email" replace />
  return <Outlet />
}

function RequireProfileComplete() {
  const user = useAuthStore((s) => s.user)
  if (user?.role === 'seeker' && !user?.profile_completed) {
    return <Navigate to="/seeker/onboarding" replace />
  }
  return <Outlet />
}

function RequireApprovedEmployer() {
  const user = useAuthStore((s) => s.user)
  if (user?.role !== 'employer' || user?.verification_status !== 'verified') {
    return <Navigate to="/employer/dashboard" replace />
  }
  return <Outlet />
}

function RequireRole({ role }) {
  const isInitialized = useAuthStore((s) => s.isInitialized)
  const user     = useAuthStore((s) => s.user)
  const userRole = user?.role

  if (!isInitialized) return <PageLoader />

  if (userRole !== role) {
    if (!userRole) return <Navigate to="/login" replace />
    return <Navigate to={`/${userRole}/dashboard`} replace />
  }
  
  return <Outlet />
}

function GuestOnly() {
  const isInitialized   = useAuthStore((s) => s.isInitialized)
  const token           = useAuthStore((s) => s.token)
  const user            = useAuthStore((s) => s.user)
  const isAuthenticated = !!token && !!user
  const userRole        = user?.role

  if (!isInitialized) return <PageLoader />
  
  if (isAuthenticated) {
    if (!userRole) {
        return <Navigate to="/login" replace />
    }
    return <Navigate to={`/${userRole}/dashboard`} replace />
  }
  
  return <Outlet />
}

// --- ROUTER CONFIGURATION ---
export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      
      {
        element: <GuestLayout />,
        children: [
          { path: '/', element: S(LandingPage) },
          { path: '/verify-email', element: S(VerifyEmailPage) },
          {
            element: <GuestOnly />,
            children: [
              { path: '/login',             element: S(LoginPage) },
              { path: '/register',          element: S(RegisterGateway) },
              { path: '/register/seeker',   element: S(SeekerRegistration) },
              { path: '/register/employer', element: S(EmployerRegistration) },
              { path: '/forgot-password',   element: S(ForgotPasswordPage) },
              { path: '/reset-password',    element: S(ResetPasswordPage) },
            ],
          },
        ],
      },

      {
        element: <RequireAuth />,
        children: [
          { path: '/seeker/onboarding', element: S(SeekerOnboarding) },

          {
            element: <RequireVerified />,
            children: [
              {
                path: '/employer',
                element: <RequireRole role="employer" />,
                children: [
                  { path: 'onboarding', element: S(EmployerOnboarding) },
                  {
                    element: <EmployerLayout />,
                    children: [
                      { index: true, element: <Navigate to="dashboard" replace /> },
                      { path: 'dashboard', element: S(EmployerDashboard) },
                      {
                        element: <RequireApprovedEmployer />,
                        children: [
                          { path: 'post-job', element: S(EmployerPostJob) },
                          { path: 'vacancies', element: S(EmployerVacancies) },
                        ],
                      },
                    ],
                  }
                ],
              },
              {
                path: '/admin',
                element: <RequireRole role="administrator" />,
                children: [
                  {
                    element: <AdminLayout />,
                    children: [
                      { index: true, element: <Navigate to="dashboard" replace /> },
                      
                      // CATEGORY 1: OVERVIEW
                      { path: 'dashboard', element: S(AdminDashboard) },
                      
                      // CATEGORY 2: CONSTITUENT CRM
                      { path: 'verification-queue', element: S(AdminVerificationQueue) },
                      { path: 'job-seekers', element: S(AdminJobSeekersList) },
                      { path: 'job-seekers/:id', element: S(AdminJobSeekerDetail) },
                      { path: 'employers', element: S(AdminEmployersList) },
                      { path: 'employers/:id', element: S(AdminEmployerDetail) },
                      
                      // CATEGORY 3: EMPLOYMENT HUB
                      { path: 'job-postings', element: S(AdminJobPostingsList) },
                      { path: 'smart-matches', element: S(AdminSmartMatches) },
                      { path: 'smart-matches/:matchId', element: S(AdminMatchResults) },
                      
                      // CATEGORY 4: GOVERNMENT & DOLE
                      { path: 'government-programs', element: S(AdminGovernmentProgramsList) },
                      { path: 'government-programs/create', element: S(AdminGovernmentProgramForm) },
                      { path: 'government-programs/:id/edit', element: S(AdminGovernmentProgramForm) },
                      { path: 'government-programs/:id/applicants', element: S(AdminProgramApplicants) },
                      { path: 'job-fairs', element: S(AdminJobFairsList) },
                      { path: 'job-fairs/create', element: S(AdminJobFairForm) },
                      { path: 'job-fairs/:id/edit', element: S(AdminJobFairForm) },
                      { path: 'dole-reporting', element: S(AdminDOLEReporting) },
                      { path: 'peis-export', element: S(AdminPEISExport) },
                      
                      // CATEGORY 5: SYSTEM & REPORTS
                      { path: 'labor-analytics', element: S(AdminLaborAnalytics) },
                      { path: 'labor-analytics/:id', element: S(AdminAnalyticsDetail) },
                      { path: 'activity-logs', element: S(AdminActivityLogs) },
                      { path: 'sms-notifications', element: S(AdminSMSNotifications) },
                      { path: 'sms-templates', element: S(AdminSMSTemplates) },
                      
                      // CATEGORY 6: CONFIGURATION
                      { path: 'staff', element: S(AdminStaffList) },
                      { path: 'role-permissions', element: S(AdminRolePermissions) },
                      { path: 'announcements', element: S(AdminAnnouncements) },
                      { path: 'content-modules', element: S(AdminContentModules) },
                      { path: 'settings', element: S(AdminSystemSettings) },
                    ],
                  }
                ],
              },
              {
                path: '/seeker',
                element: <RequireRole role="seeker" />,
                children: [
                  {
                    element: <RequireProfileComplete />,
                    children: [
                      {
                        element: <SeekerLayout />,
                        children: [
                          { index: true, element: <Navigate to="dashboard" replace /> },
                          { path: 'dashboard', element: S(SeekerDashboard) },
                          { path: 'profile', element: S(SeekerProfile) },
                        ],
                      }
                    ],
                  }
                ],
              },
            ],
          },
        ],
      },

      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

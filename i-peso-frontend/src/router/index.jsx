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

// Dashboards
const EmployerDashboard = lazy(() => import('@/pages/employer/DashboardPage'))
const SeekerDashboard   = lazy(() => import('@/pages/seeker/DashboardPage'))
const SeekerOnboarding  = lazy(() => import('@/pages/auth/onboarding/SeekerOnboarding'))

// Admin Pages
const AdminDashboard        = lazy(() => import('@/pages/admin/DashboardPage'))
const AdminVerificationQueue = lazy(() => import('@/pages/admin/seekers/VerificationQueuePage'))
const AdminSeekersList      = lazy(() => import('@/pages/admin/seekers/SeekersListPage'))
const AdminSeekerDetail     = lazy(() => import('@/pages/admin/seekers/SeekerDetailPage'))
const AdminEmployersList    = lazy(() => import('@/pages/admin/employers/EmployersListPage'))
const AdminEmployerDetail   = lazy(() => import('@/pages/admin/employers/EmployerDetailPage'))
const AdminVacanciesList    = lazy(() => import('@/pages/admin/vacancies/VacanciesListPage'))
const AdminProgramsList     = lazy(() => import('@/pages/admin/programs/ProgramsListPage'))
const AdminProgramForm      = lazy(() => import('@/pages/admin/programs/ProgramFormPage'))
const AdminProgramApplicants = lazy(() => import('@/pages/admin/programs/ProgramApplicantsPage'))
const AdminJobFairsList     = lazy(() => import('@/pages/admin/job-fairs/JobFairsListPage'))
const AdminJobFairForm      = lazy(() => import('@/pages/admin/job-fairs/JobFairFormPage'))
const AdminReports          = lazy(() => import('@/pages/admin/reports/ReportsPage'))
const AdminReportDetail     = lazy(() => import('@/pages/admin/reports/ReportDetailPage'))
const AdminActivityLog      = lazy(() => import('@/pages/admin/activity/ActivityLogPage'))

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
                  {
                    element: <EmployerLayout />,
                    children: [
                      { index: true, element: <Navigate to="dashboard" replace /> },
                      { path: 'dashboard', element: S(EmployerDashboard) },
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
                      { path: 'dashboard', element: S(AdminDashboard) },
                      { path: 'verification-queue', element: S(AdminVerificationQueue) },
                      
                      // Seekers
                      { path: 'seekers', element: S(AdminSeekersList) },
                      { path: 'seekers/:id', element: S(AdminSeekerDetail) },
                      
                      // Employers
                      { path: 'employers', element: S(AdminEmployersList) },
                      { path: 'employers/:id', element: S(AdminEmployerDetail) },
                      
                      // Vacancies
                      { path: 'vacancies', element: S(AdminVacanciesList) },
                      
                      // Programs
                      { path: 'programs', element: S(AdminProgramsList) },
                      { path: 'programs/new', element: S(AdminProgramForm) },
                      { path: 'programs/:id/edit', element: S(AdminProgramForm) },
                      { path: 'programs/:id/applicants', element: S(AdminProgramApplicants) },
                      
                      // Job Fairs
                      { path: 'job-fairs', element: S(AdminJobFairsList) },
                      { path: 'job-fairs/new', element: S(AdminJobFairForm) },
                      { path: 'job-fairs/:id/edit', element: S(AdminJobFairForm) },
                      
                      // Reports
                      { path: 'reports', element: S(AdminReports) },
                      { path: 'reports/:id', element: S(AdminReportDetail) },
                      
                      // Activity Log
                      { path: 'activity-log', element: S(AdminActivityLog) },
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
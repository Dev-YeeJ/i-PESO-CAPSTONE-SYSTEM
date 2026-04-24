import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

import GuestLayout    from '@/layouts/GuestLayout'
import EmployerLayout from '@/layouts/EmployerLayout'
import AdminLayout    from '@/layouts/AdminLayout'
import SeekerLayout   from '@/layouts/SeekerLayout'
import App            from '@/App'
// Add with the other lazy imports
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'))
const ResetPasswordPage  = lazy(() => import('@/pages/auth/ResetPasswordPage'))

const LandingPage       = lazy(() => import('@/pages/landing/LandingPage'))
const LoginPage         = lazy(() => import('@/pages/auth/LoginPage'))
const RegisterPage      = lazy(() => import('@/pages/auth/RegisterPage'))
const VerifyEmailPage   = lazy(() => import('@/pages/auth/VerifyEmailPage'))
const EmployerDashboard = lazy(() => import('@/pages/employer/DashboardPage'))
const AdminDashboard    = lazy(() => import('@/pages/admin/DashboardPage'))
const SeekerDashboard   = lazy(() => import('@/pages/seeker/DashboardPage'))

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

function RequireRole({ role }) {
  const user     = useAuthStore((s) => s.user)
  const userRole = user?.role ?? null
  if (userRole !== role) return <Navigate to={'/' + userRole + '/dashboard'} replace />
  return <Outlet />
}

function GuestOnly() {
  const isInitialized   = useAuthStore((s) => s.isInitialized)
  const token           = useAuthStore((s) => s.token)
  const user            = useAuthStore((s) => s.user)
  const isAuthenticated = !!token && !!user
  const userRole        = user?.role ?? null

  if (!isInitialized) return <PageLoader />
  if (isAuthenticated && userRole) return <Navigate to={'/' + userRole + '/dashboard'} replace />
  return <Outlet />
}

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [

      {
        element: <GuestLayout />,
        children: [
          { path: '/',             element: S(LandingPage) },
          { path: '/verify-email', element: S(VerifyEmailPage) },

          {
            element: <GuestOnly />,
            children: [
              { path: '/login',    element: S(LoginPage) },
              { path: '/register', element: S(RegisterPage) },
              { path: '/forgot-password', element: S(ForgotPasswordPage) },
              { path: '/reset-password', element: S(ResetPasswordPage) },
            ],
          },
        ],
      },

      {
        element: <RequireAuth />,
        children: [{
          element: <RequireVerified />,
          children: [{
            element: <RequireRole role="employer" />,
            children: [{
              path: '/employer',
              element: <EmployerLayout />,
              children: [
                { index: true, element: <Navigate to="dashboard" replace /> },
                { path: 'dashboard', element: S(EmployerDashboard) },
              ],
            }],
          }],
        }],
      },

      {
        element: <RequireAuth />,
        children: [{
          element: <RequireVerified />,
          children: [{
            element: <RequireRole role="admin" />,
            children: [{
              path: '/admin',
              element: <AdminLayout />,
              children: [
                { index: true, element: <Navigate to="dashboard" replace /> },
                { path: 'dashboard', element: S(AdminDashboard) },
              ],
            }],
          }],
        }],
      },

      {
        element: <RequireAuth />,
        children: [{
          element: <RequireVerified />,
          children: [{
            element: <RequireRole role="seeker" />,
            children: [{
              path: '/seeker',
              element: <SeekerLayout />,
              children: [
                { index: true, element: <Navigate to="dashboard" replace /> },
                { path: 'dashboard', element: S(SeekerDashboard) },
              ],
            }],
          }],
        }],
      },

      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
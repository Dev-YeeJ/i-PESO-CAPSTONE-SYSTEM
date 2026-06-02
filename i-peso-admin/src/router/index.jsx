import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { useAdminAuthStore } from '@/stores/authStore'

// Lazy pages
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const UsersPage = lazy(() => import('@/pages/UsersPage'))
const JobsPage = lazy(() => import('@/pages/JobsPage'))
const ReportsPage = lazy(() => import('@/pages/ReportsPage'))

// Page loader
function PageLoader() {
  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f8f9fb' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#1a4b8c', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

const S = (Component) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
)

// Auth guards
function RequireAdminAuth() {
  const isInitialized = useAdminAuthStore((s) => s.isInitialized)
  const token = useAdminAuthStore((s) => s.token)
  const user = useAdminAuthStore((s) => s.user)
  const isAuthenticated = !!token && !!user && user.role === 'admin'

  if (!isInitialized) return <PageLoader />
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

function GuestOnly() {
  const isInitialized = useAdminAuthStore((s) => s.isInitialized)
  const token = useAdminAuthStore((s) => s.token)
  const user = useAdminAuthStore((s) => s.user)
  const isAuthenticated = !!token && !!user

  if (!isInitialized) return <PageLoader />
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

// Router
export const router = createBrowserRouter([
  {
    path: '/login',
    element: <GuestOnly />,
    children: [
      { index: true, element: S(LoginPage) },
    ],
  },
  {
    path: '/',
    element: <RequireAdminAuth />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: S(DashboardPage) },
      { path: 'users', element: S(UsersPage) },
      { path: 'jobs', element: S(JobsPage) },
      { path: 'reports', element: S(ReportsPage) },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
])

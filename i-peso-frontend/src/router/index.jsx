// src/router/index.jsx
// ============================================================
// i-PESO React Router — Route tree + Navigation Guards
// ============================================================

import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

// Layouts (eagerly loaded — always needed)
import GuestLayout    from '@/layouts/GuestLayout'
import EmployerLayout from '@/layouts/EmployerLayout'
import AdminLayout    from '@/layouts/AdminLayout'
import SeekerLayout   from '@/layouts/SeekerLayout'
import App            from '@/App'

// Pages (lazily loaded)
const LandingPage      = lazy(() => import('@/pages/landing/LandingPage'))
const LoginPage        = lazy(() => import('@/pages/auth/LoginPage'))
const RegisterPage     = lazy(() => import('@/pages/auth/RegisterPage'))
const VerifyEmailPage  = lazy(() => import('@/pages/auth/VerifyEmailPage'))
const EmployerDashboard = lazy(() => import('@/pages/employer/DashboardPage'))
const AdminDashboard    = lazy(() => import('@/pages/admin/DashboardPage'))
const SeekerDashboard   = lazy(() => import('@/pages/seeker/DashboardPage'))

// ── Suspense wrapper ─────────────────────────────────────────
function PageLoader() {
  return (
    <div style={{
      display: 'flex', height: '100vh',
      alignItems: 'center', justifyContent: 'center',
      background: '#f8f9fb'
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        border: '3px solid #e2e8f0',
        borderTopColor: '#1a4b8c',
        animation: 'spin 0.7s linear infinite'
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

const S = (Component) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
)

// ── GUARD COMPONENTS ────────────────────────────────────────

/** Block unauthenticated users. Saves intended URL for post-login redirect. */
function RequireAuth() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())
  const isInitialized   = useAuthStore((s) => s.isInitialized)

  if (!isInitialized) return <PageLoader />

  if (!isAuthenticated) {
    const redirect = window.location.pathname + window.location.search
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />
  }

  return <Outlet />
}

/** Block authenticated but unverified users. Must sit inside RequireAuth. */
function RequireVerified() {
  const user = useAuthStore((s) => s.user)
  const isVerified = !!user?.email_verified_at

  if (!isVerified) return <Navigate to="/verify-email" replace />
  return <Outlet />
}

/** RBAC: wrong role → redirect to correct dashboard. */
function RequireRole({ role }) {
  const userRole = useAuthStore((s) => s.userRole())
  if (userRole !== role) return <Navigate to={`/${userRole}/dashboard`} replace />
  return <Outlet />
}

/** Kick authenticated users away from /login and /register. */
function GuestOnly() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())
  const userRole        = useAuthStore((s) => s.userRole())
  const isInitialized   = useAuthStore((s) => s.isInitialized)

  if (!isInitialized) return <PageLoader />
  if (isAuthenticated && userRole) return <Navigate to={`/${userRole}/dashboard`} replace />
  return <Outlet />
}

// ── ROUTE TREE ───────────────────────────────────────────────
export const router = createBrowserRouter([
  {
    element: <App />,
    children: [

      // ── Public / Guest ──────────────────────────────────
      {
        element: <GuestLayout />,
        children: [
          { path: '/', element: S(LandingPage) },

          // Guest-only routes (redirect away if already logged in)
          {
            element: <GuestOnly />,
            children: [
              { path: '/login',    element: S(LoginPage) },
              { path: '/register', element: S(RegisterPage) },
            ],
          },

          // Requires auth but NOT verification (avoids loop)
          {
            element: <RequireAuth />,
            children: [
              { path: '/verify-email', element: S(VerifyEmailPage) },
            ],
          },
        ],
      },

      // ── Employer ────────────────────────────────────────
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

      // ── Admin ────────────────────────────────────────────
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

      // ── Seeker ───────────────────────────────────────────
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

      // ── Catch-all ────────────────────────────────────────
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
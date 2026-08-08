// Route guard components, split out of router/index.jsx on purpose.
//
// createBrowserRouter() runs once at module load, building a plain JS route
// tree — not something React's Fast Refresh can patch in place. A file that
// mixes that config with component definitions loses Fast Refresh entirely:
// editing anything in it forces a full module re-eval, which can leave an
// already-open browser tab holding a stale router object (symptoms: routes
// falling through to the `*` wildcard, or `useContext` throwing on null).
// Keeping every component here — and nothing else — means edits to guard
// logic hot-reload cleanly; only an actual route-tree change in index.jsx
// still needs a hard refresh, which is unavoidable with createBrowserRouter.
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export function PageLoader() {
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

export function RequireAuth() {
  const isInitialized   = useAuthStore((s) => s.isInitialized)
  const token           = useAuthStore((s) => s.token)
  const user            = useAuthStore((s) => s.user)
  const isAuthenticated = !!token && !!user

  if (!isInitialized) return <PageLoader />

  if (!isAuthenticated) {
    const redirect = window.location.pathname + window.location.search
    const signInPath = redirect.startsWith('/admin') ? '/administrator' : '/login'
    return <Navigate to={signInPath + '?redirect=' + encodeURIComponent(redirect)} replace />
  }

  return <Outlet />
}

export function RequireVerified() {
  const user = useAuthStore((s) => s.user)
  if (!user?.email_verified_at) return <Navigate to="/verify-email" replace />
  return <Outlet />
}

export function RequireProfileComplete() {
  const user = useAuthStore((s) => s.user)
  if (user?.role === 'seeker' && !user?.profile_completed) {
    return <Navigate to="/seeker/onboarding" replace />
  }
  return <Outlet />
}

export function RequireApprovedEmployer() {
  const user = useAuthStore((s) => s.user)
  if (user?.role !== 'employer' || user?.verification_status !== 'verified') {
    return <Navigate to="/employer/dashboard" replace />
  }
  return <Outlet />
}

export function RequireRole({ role }) {
  const isInitialized = useAuthStore((s) => s.isInitialized)
  const user     = useAuthStore((s) => s.user)
  const userRole = user?.role

  if (!isInitialized) return <PageLoader />

  if (userRole !== role) {
    if (!userRole) return <Navigate to={role === 'administrator' ? '/administrator' : '/login'} replace />
    return <Navigate to={`/${userRole}/dashboard`} replace />
  }

  return <Outlet />
}

export function GuestOnly() {
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

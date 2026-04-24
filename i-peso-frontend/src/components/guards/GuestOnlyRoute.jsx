// i-peso-frontend/src/components/guards/GuestOnlyRoute.jsx
// ============================================================
// GuestOnlyRoute — Redirects authenticated users away from
//                  /login and /register.
//
// If a logged-in employer manually types /login in the browser,
// they get sent straight to /employer/dashboard instead.
// ============================================================

import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

const ROLE_HOME = {
  employer : '/employer/dashboard',
  seeker   : '/seeker/dashboard',
  admin    : '/admin/dashboard',
}

const GuestOnlyRoute = ({ children }) => {
  const isInitialized   = useAuthStore((s) => s.isInitialized)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const userRole        = useAuthStore((s) => s.user?.role)

  // Still loading — don't flash a redirect prematurely
  if (!isInitialized) return null

  if (isAuthenticated && userRole) {
    return <Navigate to={ROLE_HOME[userRole] ?? '/'} replace />
  }

  return children
}

export default GuestOnlyRoute
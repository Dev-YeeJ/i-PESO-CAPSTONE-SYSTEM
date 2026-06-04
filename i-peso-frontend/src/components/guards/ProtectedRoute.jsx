// src/components/guards/ProtectedRoute.jsx
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

const ROLE_HOME = {
  employer      : '/employer/dashboard',
  seeker        : '/seeker/dashboard',
  administrator : '/admin/dashboard',
}

const ProtectedRoute = ({ children, allowedRole, requiresVerified = true }) => {
  const location      = useLocation()
  const isInitialized = useAuthStore((s) => s.isInitialized)
  const token         = useAuthStore((s) => s.token)
  const user          = useAuthStore((s) => s.user)

  // Derive directly — no reliance on store-level isAuthenticated property
  const isAuthenticated = !!token && !!user

  if (!isInitialized) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', fontSize: '14px', color: '#888'
      }}>
        Authenticating...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requiresVerified && !user?.email_verified_at) {
    return <Navigate to="/verify-email" replace />
  }

  if (allowedRole && user?.role !== allowedRole) {
    const correctHome = ROLE_HOME[user?.role] ?? '/'
    return <Navigate to={correctHome} replace />
  }

  return children ?? null
}

export default ProtectedRoute
// src/App.jsx
// Root component — initializes auth once on mount, then renders child routes.

import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export default function App() {
  const initializeAuth = useAuthStore((s) => s.initializeAuth)

  useEffect(() => {
    initializeAuth()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <Outlet />
}
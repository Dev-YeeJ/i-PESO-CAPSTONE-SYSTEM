import { useEffect, useRef } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export default function App() {
  const initializeAuth = useAuthStore((s) => s.initializeAuth)
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true
      initializeAuth()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <Outlet />
}
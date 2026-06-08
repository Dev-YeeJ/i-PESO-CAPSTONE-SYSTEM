import { useEffect, useRef } from 'react'
import { Outlet } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
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

  return (
    <>
      <Outlet />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '12px',
            color: '#0f172a',
          },
        }}
      />
    </>
  )
}

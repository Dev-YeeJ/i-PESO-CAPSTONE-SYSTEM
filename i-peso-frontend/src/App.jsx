import { useEffect, useRef } from 'react'
import { Outlet } from 'react-router-dom'
import { Toaster, toast } from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'
import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

window.Pusher = Pusher

// Initialize Echo only if Reverb key is available
let echo = null
if (import.meta.env.VITE_REVERB_APP_KEY) {
  echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
    wssPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
    enabledTransports: ['ws', 'wss'],
  })
}

export default function App() {
  const initializeAuth = useAuthStore((s) => s.initializeAuth)
  const hasInitialized = useRef(false)

  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true
      initializeAuth()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (echo && user?.role === 'seeker') {
      const channel = echo.private(`seeker.${user.seeker_id}`)
      channel.listen('ApplicationStatusChanged', (e) => {
        toast.success(
          `Your application for ${e.job_title} at ${e.company_name} is now ${e.status}!`,
          { duration: 6000, icon: '🎉' }
        )
      })

      return () => {
        channel.stopListening('ApplicationStatusChanged')
      }
    }
  }, [user])

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

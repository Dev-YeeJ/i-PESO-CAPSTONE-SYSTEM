import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Toaster, toast } from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'
import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import UnifiedChatWidget from '@/components/chatbot/UnifiedChatWidget'
import CookieConsent from '@/components/common/CookieConsent'
import { MaintenanceScreen } from '@/components/system/SystemNotices'
import { useSystemStatus } from '@/components/system/useSystemStatus'
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
  const location = useLocation()

  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const systemStatus = useSystemStatus()

  // The API answers 503 {maintenance: true} once maintenance starts: re-check the status.
  useEffect(() => {
    const onMaintenance = () => queryClient.invalidateQueries({ queryKey: ['system-status'] })
    window.addEventListener('ipeso:maintenance', onMaintenance)
    return () => window.removeEventListener('ipeso:maintenance', onMaintenance)
  }, [queryClient])

  // Staff pages (and staff accounts) keep working during maintenance.
  const isStaffArea = location.pathname.startsWith('/admin') || location.pathname.startsWith('/administrator')
  const underMaintenance = systemStatus.maintenance.enabled && !isStaffArea && user?.role !== 'administrator'

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
      {underMaintenance ? <MaintenanceScreen message={systemStatus.maintenance.message} /> : <Outlet />}
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
      {!isStaffArea && !underMaintenance && systemStatus.chatbot_enabled && <UnifiedChatWidget />}
      <CookieConsent />
    </>
  )
}

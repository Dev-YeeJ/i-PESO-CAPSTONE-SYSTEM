import { useQuery } from '@tanstack/react-query'
import { create } from 'zustand'
import apiClient from '@/services/api'

// Maintenance, registration and assistant switches from System Settings (admin → Configuration →
// System Settings). Mirrors i-peso-frontend's components/system/useSystemStatus.js.

export interface SystemStatus {
  maintenance: { enabled: boolean; message: string | null }
  registration: { seekers_open: boolean; employers_open: boolean; closed_message: string }
  chatbot_enabled: boolean
}

/** Everything is open/on until the server says otherwise, so an API hiccup never locks people out. */
export const OPEN_STATUS: SystemStatus = {
  maintenance: { enabled: false, message: null },
  registration: { seekers_open: true, employers_open: true, closed_message: '' },
  chatbot_enabled: true,
}

export const SYSTEM_STATUS_KEY = ['system-status'] as const

/**
 * Set by the API client when any request answers 503 { maintenance: true } — the website's
 * 'ipeso:maintenance' event. The maintenance screen then rechecks the status until it's lifted.
 */
export const useMaintenanceSignal = create<{ message: string | null; hit: boolean; signal: (message: string | null) => void; clear: () => void }>((set) => ({
  message: null,
  hit: false,
  signal: (message) => set({ hit: true, message }),
  clear: () => set({ hit: false, message: null }),
}))

export function useSystemStatus(): SystemStatus & { isLoading: boolean } {
  const maintenanceHit = useMaintenanceSignal((state) => state.hit)
  const query = useQuery({
    queryKey: SYSTEM_STATUS_KEY,
    queryFn: async (): Promise<SystemStatus> => (await apiClient.get('/public/system-status')).data,
    staleTime: 60 * 1000,
    // While maintenance is on, recheck every minute so the app reopens on its own.
    refetchInterval: (q) => (q.state.data?.maintenance?.enabled || maintenanceHit ? 60 * 1000 : false),
    retry: 1,
  })

  const data = query.data
  return {
    maintenance: { ...OPEN_STATUS.maintenance, ...(data?.maintenance ?? {}) },
    registration: { ...OPEN_STATUS.registration, ...(data?.registration ?? {}) },
    chatbot_enabled: data?.chatbot_enabled ?? OPEN_STATUS.chatbot_enabled,
    isLoading: query.isLoading,
  }
}

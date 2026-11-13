import { useQuery } from '@tanstack/react-query'
import { publicSystemStatusService } from '@/services/systemSettingsService'

/** Everything is open/on until the server says otherwise (so an API hiccup never locks people out). */
export const OPEN_STATUS = {
  maintenance: { enabled: false, message: null },
  registration: { seekers_open: true, employers_open: true, closed_message: '' },
  chatbot_enabled: true,
}

/** Maintenance, registration and assistant switches from System Settings. */
export function useSystemStatus() {
  const query = useQuery({
    queryKey: ['system-status'],
    queryFn: publicSystemStatusService.get,
    staleTime: 60 * 1000,
    refetchInterval: (q) => (q.state.data?.maintenance?.enabled ? 60 * 1000 : false),
    retry: 1,
  })

  return { ...OPEN_STATUS, ...(query.data ?? {}), isLoading: query.isLoading }
}

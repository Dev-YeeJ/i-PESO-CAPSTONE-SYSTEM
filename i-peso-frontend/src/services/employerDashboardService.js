import { api } from '@/config/axios'

/**
 * Fetch aggregated statistics and recent activity for the Employer Dashboard.
 * @returns {Promise<Object>}
 */
export const getDashboardStats = async () => {
  const response = await api.get('/employer/dashboard-stats')
  return response.data
}

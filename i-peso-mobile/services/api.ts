import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

const BASE_URL = 'http://10.0.2.2:8000/api'

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept'      : 'application/json',
  },
  timeout: 15000,
})

apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('ipeso_token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('ipeso_token')
      // Dynamic import avoids circular dependency
      const { useAuthStore } = await import('@/stores/authStore')
      useAuthStore.getState().clearAuth()
    }
    return Promise.reject(error)
  }
)

export default apiClient
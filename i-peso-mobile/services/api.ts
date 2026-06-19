import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'

const DEFAULT_API_PORT = 8001
const DEFAULT_FALLBACK_HOST = '127.0.0.1'

function computeBaseUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL
  }

  try {
    const hostUri = Constants.expoConfig?.hostUri
    const debuggerHost = Constants.manifest?.debuggerHost || Constants.manifest?.packagerOpts?.host
    const candidate = hostUri || debuggerHost
    if (candidate) {
      const host = String(candidate).split(':')[0]
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        return `http://${host}:${DEFAULT_API_PORT}/api`
      }
    }
  } catch (e) {
    // ignore and fall through to fallback host
  }

  return `http://${DEFAULT_FALLBACK_HOST}:${DEFAULT_API_PORT}/api`
}

const BASE_URL = computeBaseUrl()

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

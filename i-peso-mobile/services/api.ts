import axios from 'axios'
import * as SecureStore from 'expo-secure-store'
import Constants from 'expo-constants'

const DEFAULT_API_PORT = 8000
const DEFAULT_FALLBACK_HOST = '192.168.0.190' // ← your LAN IP as fallback
const DEFAULT_ANDROID_EMULATOR_HOST = '10.0.2.2'

function apiUrlForHost(host: string) {
  return `http://${host}:${DEFAULT_API_PORT}/api`
}

function extractHost(value: string) {
  const candidate = value.trim()

  try {
    if (candidate.includes('://')) {
      return new URL(candidate).hostname
    }
  } catch {
    return ''
  }

  return candidate.split(':')[0]
}

function computeBaseUrl() {
  const configuredApiUrl =
    Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL ||
    Constants.expoConfig?.extra?.apiBaseUrl ||
    (Constants as any).manifest2?.extra?.EXPO_PUBLIC_API_URL ||
    (Constants as any).manifest2?.extra?.apiBaseUrl ||
    (Constants as any).manifest?.extra?.EXPO_PUBLIC_API_URL ||
    (Constants as any).manifest?.extra?.apiBaseUrl ||
    process.env.EXPO_PUBLIC_API_URL

  if (configuredApiUrl) {
    return String(configuredApiUrl).replace(/\/$/, '')
  }

  try {
    // expoConfig?.hostUri is the most reliable in modern Expo SDK
    const hostUri =
      Constants.expoConfig?.hostUri ||
      (Constants as any).manifest2?.launchAsset?.url ||
      (Constants as any).manifest?.debuggerHost

    if (hostUri) {
      const host = extractHost(String(hostUri))
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        return apiUrlForHost(host)
      }
    }
  } catch (e) {
    // ignore and fall through to fallback host
  }

  if ((Constants as any).platform?.android) {
    return apiUrlForHost(DEFAULT_ANDROID_EMULATOR_HOST)
  }

  return apiUrlForHost(DEFAULT_FALLBACK_HOST)
}

const BASE_URL = computeBaseUrl()
console.log('🔍 API BASE_URL:', BASE_URL)
export { BASE_URL as API_BASE_URL }

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
    const token = await SecureStore.getItemAsync('ipeso_token')
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
      await SecureStore.deleteItemAsync('ipeso_token')
      const { useAuthStore } = await import('@/stores/authStore')
      useAuthStore.getState().clearAuth()
    }
    return Promise.reject(error)
  }
)

export default apiClient

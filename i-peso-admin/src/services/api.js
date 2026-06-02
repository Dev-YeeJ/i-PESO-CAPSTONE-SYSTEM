import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
})

// ── REQUEST INTERCEPTOR ──────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    let token = null
    try {
      const stored = localStorage.getItem('ipeso-admin-auth')
      if (stored) {
        const { state } = JSON.parse(stored)
        if (state?.token) {
          token = state.token
        }
      }
    } catch {
      // Malformed storage — ignore
    }
    
    if (!token) {
      token = localStorage.getItem('ipeso_admin_token')
    }
    
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── RESPONSE INTERCEPTOR ─────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ipeso_admin_token')
      localStorage.removeItem('ipeso-admin-auth')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient

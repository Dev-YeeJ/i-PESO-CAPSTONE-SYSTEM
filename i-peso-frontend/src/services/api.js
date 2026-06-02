// src/services/api.js
// ============================================================
// SINGLETON Axios Instance — i-PESO API Client
// ============================================================

import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // Required for Laravel Sanctum CSRF
})

// ── REQUEST INTERCEPTOR ──────────────────────────────────────
// Attach token from localStorage — we read localStorage directly
// here because this runs outside React's component/hook system.
apiClient.interceptors.request.use(
  (config) => {
    // Try Zustand persist format first ('ipeso-auth')
    let token = null
    try {
      const stored = localStorage.getItem('ipeso-auth')
      if (stored) {
        const { state } = JSON.parse(stored)
        if (state?.token) {
          token = state.token
        }
      }
    } catch {
      // Malformed storage — ignore
    }
    
    // Fall back to direct 'ipeso_token' key (used by VerifyEmailPage)
    if (!token) {
      token = localStorage.getItem('ipeso_token')
    }
    
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── RESPONSE INTERCEPTOR ─────────────────────────────────────
// 401 anywhere = token dead → clear auth (but let component handle navigation)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear invalid token from localStorage
      localStorage.removeItem('ipeso_token')
      localStorage.removeItem('ipeso-auth')
      
      // Let the error propagate so components can handle it gracefully
      // Router guards will naturally redirect to login if needed
    }
    return Promise.reject(error)
  }
)

export default apiClient
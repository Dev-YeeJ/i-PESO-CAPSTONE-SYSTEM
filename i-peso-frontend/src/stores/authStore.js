import { create } from 'zustand'
import { authService } from '@/services/authService'

export const useAuthStore = create((set, get) => ({

  // ── STATE ─────────────────────────────────────────────────
  user            : null,
  token           : null,
  isAuthenticated : false,
  isInitialized   : false,

  // ── ACTIONS ───────────────────────────────────────────────

  initializeAuth: async () => {
    if (get().isInitialized) return

    // ✅ If setAuth was already called (e.g. just verified OTP), skip the /me call
    if (get().isAuthenticated && get().user) {
      set({ isInitialized: true })
      return
    }

    const storedToken = localStorage.getItem('ipeso_token')

    if (storedToken) {
      set({ token: storedToken })
      try {
        const user = await authService.getAuthenticatedUser()
        set({ user, isAuthenticated: true })
      } catch {
        get().clearAuth()
      }
    }

    set({ isInitialized: true })
  },

  setAuth: (user, token) => {
    localStorage.setItem('ipeso_token', token)
    set({ user, token, isAuthenticated: true, isInitialized: true })
  },

  logout: async () => {
    try {
      await authService.logout()
    } finally {
      get().clearAuth()
    }
  },

  clearAuth: () => {
    localStorage.removeItem('ipeso_token')
    set({ user: null, token: null, isAuthenticated: false })
  },

  updateUser: (updatedUser) => {
    set({ user: { ...get().user, ...updatedUser } })
  },
}))
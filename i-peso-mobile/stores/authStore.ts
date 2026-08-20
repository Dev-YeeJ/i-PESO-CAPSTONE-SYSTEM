import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'

const TOKEN_KEY = 'ipeso_token'

interface User {
  id: number
  name: string
  email: string
  role: 'seeker' | 'employer' | 'administrator' | 'admin'
  email_verified_at: string | null
  profile_completed?: boolean
  first_name?: string
  last_name?: string
  mobile_number?: string
  educ_attainment?: string | null
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isInitialized: boolean
  sessionMessage: string | null
  setAuth: (user: User, token: string) => Promise<void>
  updateUser: (user: Partial<User>) => void
  initializeAuth: () => Promise<void>
  logout: () => Promise<void>
  clearAuth: (message?: string) => Promise<void>
  clearSessionMessage: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isInitialized: false,
  sessionMessage: null,

  setAuth: async (user, token) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token)
    set({ user, token, isAuthenticated: true, isInitialized: true })
  },

  updateUser: (user) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...user } : null,
    }))
  },

  initializeAuth: async () => {
    if (get().isInitialized) return
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY)
      if (token) {
        set({ token })
        const { authService } = await import('@/services/authService')
        const user = await authService.getAuthenticatedUser()
        set({ user, isAuthenticated: true })
      }
    } catch (error: any) {
      // A 401 here was already handled by the response interceptor (token
      // deleted, sessionMessage set for remote eviction) — clearing again
      // would race with that and could wipe the message before login reads
      // it. Anything else (network failure, 5xx) still needs a manual clear
      // since the interceptor only reacts to 401s.
      if (error?.response?.status !== 401) {
        await get().clearAuth()
      }
    } finally {
      set({ isInitialized: true })
    }
  },

  logout: async () => {
    try {
      const { authService } = await import('@/services/authService')
      await authService.logout()
    } finally {
      await get().clearAuth()
    }
  },

  clearAuth: async (message) => {
    await SecureStore.deleteItemAsync(TOKEN_KEY)
    set({ user: null, token: null, isAuthenticated: false, sessionMessage: message ?? null })
  },

  clearSessionMessage: () => set({ sessionMessage: null }),
}))

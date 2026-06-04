import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

const TOKEN_KEY = 'ipeso_token'

interface User {
  id: number
  name: string
  email: string
  role: 'seeker' | 'employer' | 'admin'
  email_verified_at: string | null
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isInitialized: boolean
  setAuth: (user: User, token: string) => Promise<void>
  initializeAuth: () => Promise<void>
  logout: () => Promise<void>
  clearAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isInitialized: false,

  setAuth: async (user, token) => {
    await AsyncStorage.setItem(TOKEN_KEY, token)
    set({ user, token, isAuthenticated: true, isInitialized: true })
  },

  initializeAuth: async () => {
    if (get().isInitialized) return
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY)
      if (token) {
        set({ token })
        const { authService } = await import('@/services/authService')
        const user = await authService.getAuthenticatedUser()
        set({ user, isAuthenticated: true })
      }
    } catch {
      await get().clearAuth()
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

  clearAuth: async () => {
    await AsyncStorage.removeItem(TOKEN_KEY)
    set({ user: null, token: null, isAuthenticated: false })
  },
}))
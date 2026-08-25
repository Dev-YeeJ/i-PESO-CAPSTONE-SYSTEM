import { useEffect } from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { colors } from '@/theme'
import { router } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { useAuthStore } from '@/stores/authStore'
import { WELCOME_SEEN_KEY } from './welcome'


interface AuthState {
  isInitialized: boolean
  isAuthenticated: boolean
  user: { role: string; profile_completed?: boolean } | null
}

export default function IndexScreen() {
  const isInitialized   = useAuthStore((s: AuthState) => s.isInitialized)
  const isAuthenticated = useAuthStore((s: AuthState) => s.isAuthenticated)
  const user            = useAuthStore((s: AuthState) => s.user)

  useEffect(() => {
    if (!isInitialized) return

    let cancelled = false

    const route = async () => {
      if (isAuthenticated && user?.role === 'seeker') {
        router.replace(user.profile_completed ? '/(seeker)' : '/onboarding')
        return
      }

      // First launch on this device gets the intro carousel; afterwards it goes straight to
      // sign-in. A read failure falls through to login rather than trapping the user.
      let seen = 'true'
      try {
        seen = (await SecureStore.getItemAsync(WELCOME_SEEN_KEY)) ?? 'false'
      } catch {
        seen = 'true'
      }

      if (cancelled) return
      router.replace(seen === 'true' ? '/(auth)/login' : '/welcome')
    }

    route()

    return () => {
      cancelled = true
    }
  }, [isInitialized, isAuthenticated, user])

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.secondary} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex            : 1,
    justifyContent  : 'center',
    alignItems      : 'center',
    backgroundColor : colors.surface,
  },
})

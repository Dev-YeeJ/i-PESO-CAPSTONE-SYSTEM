import { useEffect } from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '@/stores/authStore'


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

    if (isAuthenticated && user?.role === 'seeker') {
      router.replace(user.profile_completed ? '/(seeker)' : '/onboarding')
    } else {
      router.replace('/(auth)/login')
    }
  }, [isInitialized, isAuthenticated, user])

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#1d4ed8" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex            : 1,
    justifyContent  : 'center',
    alignItems      : 'center',
    backgroundColor : '#f8fafc',
  },
})

import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { useAuthStore } from '@/stores/authStore'

interface AuthState {
  initializeAuth: () => Promise<void>
}

export default function RootLayout() {
  const initializeAuth = useAuthStore((s: AuthState) => s.initializeAuth)

  useEffect(() => {
    initializeAuth()
  }, [])

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(seeker)" />
    </Stack>
  )
}
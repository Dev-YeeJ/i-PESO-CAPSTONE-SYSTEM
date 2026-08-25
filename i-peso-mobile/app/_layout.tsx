import { useEffect } from 'react'
import { Stack, router } from 'expo-router'
import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans'
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display'
import * as SplashScreen from 'expo-splash-screen'
import * as Notifications from 'expo-notifications'
import { useAuthStore } from '@/stores/authStore'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { syncPushToken, routeForPushData } from '@/services/pushNotifications'

const queryClient = new QueryClient()
SplashScreen.preventAutoHideAsync()

interface AuthState {
  initializeAuth: () => Promise<void>
  isAuthenticated: boolean
}

export default function RootLayout() {
  const initializeAuth = useAuthStore((s: AuthState) => s.initializeAuth)
  const isAuthenticated = useAuthStore((s: AuthState) => s.isAuthenticated)

  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    DMSerifDisplay_400Regular,
  })

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded])

  // Registers/refreshes this device's push token whenever a session becomes
  // active (app boot with an existing session, or a fresh login) — the
  // backend upserts on token, so this is safe to call repeatedly.
  useEffect(() => {
    if (isAuthenticated) {
      syncPushToken()
    }
  }, [isAuthenticated])

  // Handles a tap on a push notification (foreground, background, or from a
  // killed state) using the same routing rules as the in-app notifications
  // list, so both entry points land on the same screen.
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>
      const destination = routeForPushData(data)
      if (destination) {
        router.push(destination as any)
      }
    })

    return () => subscription.remove()
  }, [])

  if (!fontsLoaded) return null

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(seeker)" />
      </Stack>
    </QueryClientProvider>
  )
}

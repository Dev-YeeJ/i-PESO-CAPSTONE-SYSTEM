import { useEffect } from 'react'
import { Tabs, router } from 'expo-router'
import { useAuthStore } from '@/stores/authStore'
import { AnimatedTabBar } from '@/components/ui/AnimatedTabBar'

export default function SeekerLayout() {
  const isAuthenticated = useAuthStore((s: AuthState) => s.isAuthenticated)
  const isInitialized = useAuthStore((s: AuthState) => s.isInitialized)
  const user = useAuthStore((s: AuthState) => s.user)

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.replace('/(auth)/login')
      return
    }

    if (isInitialized && isAuthenticated && user?.role === 'seeker' && !user?.profile_completed) {
      router.replace('/onboarding')
    }
  }, [isInitialized, isAuthenticated, user])

  return (
    <Tabs
      // Icons, colours, and the sliding pill all live in AnimatedTabBar — the navigator only
      // supplies titles and which routes are destinations.
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="jobs" options={{ title: 'Jobs' }} />
      <Tabs.Screen name="applications" options={{ title: 'Applied' }} />
      <Tabs.Screen name="government-programs" options={{ title: 'Programs' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      <Tabs.Screen name="jobs/[id]" options={{ href: null }} />
      <Tabs.Screen name="applications/[id]" options={{ href: null }} />
      <Tabs.Screen name="profile/edit" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="job-fairs" options={{ href: null }} />
      <Tabs.Screen name="job-fairs/[id]" options={{ href: null }} />
      <Tabs.Screen name="government-programs/[id]" options={{ href: null }} />
      <Tabs.Screen name="employers/[id]" options={{ href: null }} />
      <Tabs.Screen name="assistant" options={{ href: null }} />
      <Tabs.Screen name="job-map" options={{ href: null }} />
      <Tabs.Screen name="citizen-charter" options={{ href: null }} />
    </Tabs>
  )
}

interface AuthState {
  isAuthenticated: boolean
  isInitialized: boolean
  user: { role?: string; profile_completed?: boolean } | null
}

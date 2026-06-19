import { useEffect } from 'react'
import { Text } from 'react-native'
import { Tabs, router } from 'expo-router'
import { useAuthStore } from '@/stores/authStore'

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
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1d4ed8',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0',
          borderTopWidth: 0.5,
          paddingBottom: 10,
          paddingTop: 8,
          height: 65,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }: { color: string }) => <TabCode color={color} label="HM" />,
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Find Jobs',
          tabBarIcon: ({ color }: { color: string }) => <TabCode color={color} label="JOB" />,
        }}
      />
      <Tabs.Screen
        name="applications"
        options={{
          title: 'Applied',
          tabBarIcon: ({ color }: { color: string }) => <TabCode color={color} label="APP" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }: { color: string }) => <TabCode color={color} label="ME" />,
        }}
      />
    </Tabs>
  )
}

function TabCode({ color, label }: { color: string; label: string }) {
  return <Text style={{ fontSize: 12, color, fontWeight: '800' }}>{label}</Text>
}

interface AuthState {
  isAuthenticated: boolean
  isInitialized: boolean
  user: { role?: string; profile_completed?: boolean } | null
}

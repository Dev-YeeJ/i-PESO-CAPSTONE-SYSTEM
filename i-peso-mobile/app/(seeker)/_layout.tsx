import { useEffect } from 'react'
import { Text } from 'react-native'
import { Tabs, router } from 'expo-router'
import { useAuthStore } from '@/stores/authStore'

export default function SeekerLayout() {
  const isAuthenticated = useAuthStore((s: AuthState) => s.isAuthenticated)
  const isInitialized   = useAuthStore((s: AuthState) => s.isInitialized)

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.replace('/(auth)/login')
    }
  }, [isInitialized, isAuthenticated])

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
          tabBarIcon: ({ color }: { color: string }) => (
            <Text style={{ fontSize: 20, color }}>🏠</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Find Jobs',
          tabBarIcon: ({ color }: { color: string }) => (
            <Text style={{ fontSize: 20, color }}>🔍</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="applications"
        options={{
          title: 'Applied',
          tabBarIcon: ({ color }: { color: string }) => (
            <Text style={{ fontSize: 20, color }}>📋</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }: { color: string }) => (
            <Text style={{ fontSize: 20, color }}>👤</Text>
          ),
        }}
      />
    </Tabs>
  )
}

interface AuthState {
  isAuthenticated: boolean
  isInitialized: boolean
}
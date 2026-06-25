import { useEffect } from 'react'
import { Tabs, router } from 'expo-router'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useAuthStore } from '@/stores/authStore'
import { colors, spacing } from '@/theme'

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
        tabBarActiveTintColor: colors.info,
        tabBarInactiveTintColor: colors.subtle,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: spacing.sm,
          paddingTop: spacing.sm,
          height: 70,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: -1 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ color }) => <TabIcon name="search" color={color} />,
        }}
      />
      <Tabs.Screen
        name="applications"
        options={{
          title: 'Applied',
          tabBarIcon: ({ color }) => <TabIcon name="task" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabIcon name="person" color={color} />,
        }}
      />
    </Tabs>
  )
}

function TabIcon({ name, color }: { name: React.ComponentProps<typeof MaterialIcons>['name']; color: string }) {
  return <MaterialIcons name={name} size={22} color={color} />
}

interface AuthState {
  isAuthenticated: boolean
  isInitialized: boolean
  user: { role?: string; profile_completed?: boolean } | null
}

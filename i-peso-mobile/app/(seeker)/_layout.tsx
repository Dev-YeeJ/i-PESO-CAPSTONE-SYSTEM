import { useEffect } from 'react'
import { Tabs, router } from 'expo-router'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { StyleSheet, View } from 'react-native'
import { useAuthStore } from '@/stores/authStore'
import { colors, radii, shadows, spacing, typography } from '@/theme'

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
        tabBarActiveTintColor: colors.secondary,
        tabBarInactiveTintColor: colors.subtle,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          height: 82,
          paddingTop: spacing.sm,
          paddingBottom: spacing.md,
          paddingHorizontal: spacing.sm,
          ...shadows.elevated,
        },
        tabBarLabelStyle: {
          fontSize: typography.label,
          fontFamily: typography.family.bold,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => <TabIcon name="home" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ color, focused }) => <TabIcon name="search" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="applications"
        options={{
          title: 'Applied',
          tabBarIcon: ({ color, focused }) => <TabIcon name="task" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="upskill-hub"
        options={{
          title: 'Programs',
          tabBarIcon: ({ color, focused }) => <TabIcon name="school" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => <TabIcon name="person" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen name="jobs/[id]" options={{ href: null }} />
      <Tabs.Screen name="applications/[id]" options={{ href: null }} />
      <Tabs.Screen name="profile/edit" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="job-fairs" options={{ href: null }} />
      <Tabs.Screen name="job-fairs/[id]" options={{ href: null }} />
      <Tabs.Screen name="upskill-hub/[id]" options={{ href: null }} />
      <Tabs.Screen name="program-applications" options={{ href: null }} />
      <Tabs.Screen name="citizen-charter" options={{ href: null }} />
    </Tabs>
  )
}

function TabIcon({ name, color, focused }: { name: React.ComponentProps<typeof MaterialIcons>['name']; color: string; focused: boolean }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <MaterialIcons name={name} size={22} color={color} />
    </View>
  )
}

interface AuthState {
  isAuthenticated: boolean
  isInitialized: boolean
  user: { role?: string; profile_completed?: boolean } | null
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 38,
    height: 30,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: colors.infoBackground,
  },
})

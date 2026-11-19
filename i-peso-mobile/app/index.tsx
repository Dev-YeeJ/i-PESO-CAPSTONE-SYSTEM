import { useEffect } from 'react'
import { View, ActivityIndicator, Image, StyleSheet, Text } from 'react-native'
import { colors, radii, shadows, spacing, textStyles } from '@/theme'
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

  // Branded gate (redesign "Auth 1 — Splash"): the real i-PESO logo and wordmark while the
  // session is checked, instead of a bare spinner.
  return (
    <View style={styles.container} accessible accessibilityLabel="i-PESO is loading">
      <View style={styles.logoTile}>
        <Image source={require('@/assets/images/ipeso-logo.png')} style={styles.logo} />
      </View>
      <Text style={styles.wordmark}>i-PESO</Text>
      <Text style={styles.sub}>PESO · URDANETA CITY</Text>
      <ActivityIndicator size="small" color={colors.link} style={styles.spinner} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex            : 1,
    justifyContent  : 'center',
    alignItems      : 'center',
    backgroundColor : colors.tint,
  },
  logoTile: {
    padding         : 8,
    borderRadius    : radii.xl + 4,
    backgroundColor : colors.surface,
    ...shadows.lg,
  },
  logo: {
    width           : 104,
    height          : 104,
    borderRadius    : radii.xl - 2,
  },
  wordmark: {
    marginTop       : spacing.xl,
    ...textStyles.display,
    color           : colors.primary,
  },
  sub: {
    marginTop       : spacing.xs,
    ...textStyles.label,
    letterSpacing   : 3,
    color           : colors.textSecondary,
  },
  spinner: {
    marginTop       : spacing.xxl,
  },
})

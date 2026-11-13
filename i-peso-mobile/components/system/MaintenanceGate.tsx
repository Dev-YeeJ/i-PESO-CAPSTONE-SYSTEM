import { useEffect } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useQueryClient } from '@tanstack/react-query'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { SYSTEM_STATUS_KEY, useMaintenanceSignal, useSystemStatus } from '@/hooks/useSystemStatus'
import { colors, radii, spacing, textStyles } from '@/theme'

// Rebuilt from MaintenanceScreen in i-peso-frontend/src/components/system/SystemNotices.jsx.
// The website's "PESO staff sign-in" link is left out: the app is for job seekers only.

/**
 * Full-screen notice while System Settings → Maintenance mode is on. Shown when the status says
 * so, or as soon as any request answers 503 { maintenance: true }; it rechecks every minute
 * and lifts itself when the portal is back.
 */
export function MaintenanceGate() {
  const queryClient = useQueryClient()
  const status = useSystemStatus()
  const hit = useMaintenanceSignal((state) => state.hit)
  const hitMessage = useMaintenanceSignal((state) => state.message)
  const clear = useMaintenanceSignal((state) => state.clear)

  // A 503 from some request: confirm with the status endpoint right away.
  useEffect(() => {
    if (hit) queryClient.invalidateQueries({ queryKey: SYSTEM_STATUS_KEY })
  }, [hit, queryClient])

  // The status says maintenance is over: drop the 503 signal so the notice lifts.
  const statusLoaded = !status.isLoading
  useEffect(() => {
    if (hit && statusLoaded && !status.maintenance.enabled) {
      const timer = setTimeout(clear, 0)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [hit, statusLoaded, status.maintenance.enabled, clear])

  if (!status.maintenance.enabled && !hit) return null

  const message = status.maintenance.message || hitMessage || 'i-PESO is being updated right now. Please try again in a little while.'

  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      <LinearGradient colors={[colors.primaryDark, colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.screen}>
        <View style={styles.iconWrap}>
          <MaterialIcons name="build" size={26} color={colors.white} />
        </View>
        <Text style={styles.title} accessibilityRole="header">i-PESO is under maintenance</Text>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.inline}>
          <ActivityIndicator size="small" color={colors.blue200} />
          <Text style={styles.hint}>This page refreshes on its own when the portal is back.</Text>
        </View>
        <Text style={styles.footer}>Public Employment Service Office · Urdaneta City</Text>
      </LinearGradient>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxl },
  iconWrap: { width: 56, height: 56, borderRadius: radii.pill, backgroundColor: colors.heroChip, alignItems: 'center', justifyContent: 'center' },
  title: { ...textStyles.heading, color: colors.white, textAlign: 'center', marginTop: spacing.lg },
  message: { ...textStyles.body, color: colors.blue100, textAlign: 'center', lineHeight: 22, marginTop: spacing.md },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl },
  hint: { ...textStyles.small, color: colors.blue200, flexShrink: 1 },
  footer: { ...textStyles.label, color: colors.blue300, position: 'absolute', bottom: spacing.xxxl },
})

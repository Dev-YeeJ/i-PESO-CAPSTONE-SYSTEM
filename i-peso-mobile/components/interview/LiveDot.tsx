import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'
import { useMotion } from '@/hooks/useMotion'
import { colors } from '@/theme'

const SIZE = 8

/**
 * Pulsing dot for "Happening now" (mirrors i-peso-frontend/src/components/interview/LiveDot.jsx).
 * Decorative: the label next to it says the same thing, so screen readers skip it. The pulse
 * stops when the OS "Reduce Motion" setting is on.
 */
export function LiveDot({ color = colors.success }: { color?: string }) {
  const m = useMotion()
  const pulse = useSharedValue(0)

  useEffect(() => {
    if (!m.enabled) {
      pulse.value = 0
      return undefined
    }
    pulse.value = withRepeat(withTiming(1, { duration: 1000 }), -1, false)
    return () => cancelAnimation(pulse)
  }, [m.enabled, pulse])

  const ring = useAnimatedStyle(() => ({
    opacity: 0.75 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value }],
  }))

  return (
    <View style={styles.wrap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[styles.dot, styles.ring, { backgroundColor: color }, ring]} />
      <View style={[styles.dot, { backgroundColor: color }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  dot: { width: SIZE, height: SIZE, borderRadius: SIZE / 2 },
  ring: { position: 'absolute' },
})

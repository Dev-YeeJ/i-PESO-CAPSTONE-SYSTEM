import { StyleSheet, View } from 'react-native'
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated'
import { useEffect } from 'react'
import { useMotion } from '@/hooks/useMotion'
import { colors } from '@/theme'

/**
 * Three-dot "Ace is typing" indicator — each dot bounces in sequence, mirroring the
 * web widget's `.is-typing` bubble (three CSS-animated spans) rather than a plain spinner.
 *
 * With the OS "Reduce Motion" setting on, the endless bounce is replaced by three still dots
 * at stepped opacity: the indicator still reads as "typing", without looping movement.
 */
export function TypingDots() {
  return (
    <View style={styles.row} accessible accessibilityLabel="ACE is typing">
      <Dot index={0} />
      <Dot index={1} />
      <Dot index={2} />
    </View>
  )
}

function Dot({ index }: { index: number }) {
  const m = useMotion()
  const progress = useSharedValue(0)

  useEffect(() => {
    if (!m.enabled) {
      cancelAnimation(progress)
      progress.value = 1 - index * 0.3
      return
    }
    progress.value = withDelay(
      index * 140,
      withRepeat(withSequence(withTiming(1, { duration: 360 }), withTiming(0, { duration: 360 })), -1, false)
    )
    return () => cancelAnimation(progress)
  }, [index, progress, m.enabled])

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: m.enabled ? -4 * progress.value : 0 }],
    opacity: 0.4 + 0.6 * progress.value,
  }))

  return <Animated.View style={[styles.dot, style]} />
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.info },
})

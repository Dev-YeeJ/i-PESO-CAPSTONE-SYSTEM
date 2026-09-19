import { StyleSheet, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated'
import { useEffect } from 'react'
import { colors } from '@/theme'

/**
 * Three-dot "Ace is typing" indicator — each dot bounces in sequence, mirroring the
 * web widget's `.is-typing` bubble (three CSS-animated spans) rather than a plain spinner.
 */
export function TypingDots() {
  return (
    <View style={styles.row}>
      <Dot delay={0} />
      <Dot delay={140} />
      <Dot delay={280} />
    </View>
  )
}

function Dot({ delay }: { delay: number }) {
  const progress = useSharedValue(0)

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(withSequence(withTiming(1, { duration: 360 }), withTiming(0, { duration: 360 })), -1, false)
    )
  }, [delay, progress])

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -4 * progress.value }],
    opacity: 0.4 + 0.6 * progress.value,
  }))

  return <Animated.View style={[styles.dot, style]} />
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.info },
})

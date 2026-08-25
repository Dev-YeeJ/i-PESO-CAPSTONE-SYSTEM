import { useEffect } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import { Button } from './Button'
import { useMotion } from '@/hooks/useMotion'
import { colors, gradients, radii, shadows, spacing, textStyles } from '@/theme'

const AnimatedPath = Animated.createAnimatedComponent(Path)

/** Path length of the checkmark below, used to draw it on stroke-by-stroke. */
const CHECK_LENGTH = 60

interface SuccessSheetProps {
  visible: boolean
  title: string
  message?: string
  primaryLabel?: string
  onPrimary: () => void
  secondaryLabel?: string
  onSecondary?: () => void
}

/**
 * Confirmation for actions worth celebrating — submitting an application, reserving a job
 * fair slot.
 *
 * Replaces `Alert.alert` for these moments: a system alert is the same object the OS uses to
 * report errors, so it reads as an interruption rather than a reward. The checkmark draws
 * itself in, which is the one place in the app where a flourish is the point.
 */
export function SuccessSheet({
  visible,
  title,
  message,
  primaryLabel = 'Done',
  onPrimary,
  secondaryLabel,
  onSecondary,
}: SuccessSheetProps) {
  const m = useMotion()
  const pop = useSharedValue(0)
  const draw = useSharedValue(CHECK_LENGTH)

  useEffect(() => {
    if (!visible) {
      pop.value = 0
      draw.value = CHECK_LENGTH
      return
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    pop.value = withSpring(1, m.spring('bouncy'))
    draw.value = withDelay(160, withTiming(0, { duration: m.duration('slow') }))
  }, [visible, pop, draw, m])

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
    opacity: pop.value,
  }))

  const checkProps = useAnimatedProps(() => ({
    strokeDashoffset: draw.value,
  }))

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onPrimary} statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onPrimary} accessibilityRole="button" accessibilityLabel="Dismiss" />

        <View style={styles.card} accessibilityViewIsModal accessibilityLiveRegion="polite">
          <Animated.View style={[styles.badge, badgeStyle]}>
            <LinearGradient
              colors={[...gradients.cta]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Svg width={56} height={56} viewBox="0 0 56 56">
              <Circle cx="28" cy="28" r="26" stroke="rgba(255,255,255,0.35)" strokeWidth="2" fill="none" />
              <AnimatedPath
                d="M17 29 L25 37 L40 20"
                stroke={colors.white}
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray={CHECK_LENGTH}
                animatedProps={checkProps}
              />
            </Svg>
          </Animated.View>

          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.actions}>
            {secondaryLabel && onSecondary ? (
              <Button variant="outline" size="lg" onPress={onSecondary} style={styles.action}>
                {secondaryLabel}
              </Button>
            ) : null}
            <Button size="lg" onPress={onPrimary} style={styles.action}>
              {primaryLabel}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    ...shadows.elevated,
  },
  badge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  title: {
    ...textStyles.heading,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  message: {
    ...textStyles.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 21,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xxl,
    alignSelf: 'stretch',
  },
  action: {
    flex: 1,
  },
})

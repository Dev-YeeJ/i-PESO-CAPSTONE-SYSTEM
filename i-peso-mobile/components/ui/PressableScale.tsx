import { ReactNode } from 'react'
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { useMotion } from '@/hooks/useMotion'
import { colors } from '@/theme'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  /** How far to compress on press. `card` is subtler — larger values look cheap at card size. */
  scaleTo?: 'cardPress' | 'buttonPress'
  haptics?: boolean
  /** Android ripple colour; pass null to disable the ripple entirely. */
  ripple?: string | null
}

/**
 * Press feedback that runs on the UI thread.
 *
 * Replaces the `style={({ pressed }) => ...}` pattern, which re-renders on every press and
 * snaps between two static transforms. Driving the scale through a shared value keeps the
 * whole interaction off the JS thread, so it stays smooth while a list is still fetching —
 * which is exactly when a mid-range Android device would otherwise drop the frame.
 */
export function PressableScale({
  children,
  style,
  scaleTo = 'cardPress',
  haptics = false,
  ripple = colors.overlay,
  onPressIn,
  onPressOut,
  onPress,
  ...rest
}: PressableScaleProps) {
  const m = useMotion()
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return (
    <AnimatedPressable
      {...rest}
      android_ripple={ripple ? { color: ripple } : undefined}
      onPressIn={(event) => {
        scale.value = withSpring(m.pressScale(scaleTo), m.spring('press'))
        onPressIn?.(event)
      }}
      onPressOut={(event) => {
        scale.value = withSpring(1, m.spring('press'))
        onPressOut?.(event)
      }}
      onPress={(event) => {
        if (haptics) Haptics.selectionAsync()
        onPress?.(event)
      }}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  )
}

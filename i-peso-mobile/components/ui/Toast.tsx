import { ComponentProps, useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useToastStore, type ToastVariant } from '@/stores/toastStore'
import { useMotion } from '@/hooks/useMotion'
import { colors, radii, shadows, spacing, textStyles } from '@/theme'

type IconName = ComponentProps<typeof MaterialIcons>['name']

const VARIANT_ICON: Record<ToastVariant, IconName> = {
  success: 'check-circle',
  error: 'error',
  info: 'info',
}

const VARIANT_COLOR: Record<ToastVariant, { background: string; border: string; text: string }> = {
  success: { background: colors.successBackground, border: colors.successBorder, text: colors.success },
  error: { background: colors.errorBackground, border: colors.errorBorder, text: colors.error },
  info: { background: colors.infoBackground, border: colors.infoBorder, text: colors.info },
}

/**
 * App-wide transient notification — mounted once in the root layout as a sibling of the
 * navigator, so any screen can trigger it via `useToast()` without prop drilling.
 *
 * Auto-dismisses (timer lives in the store, see `stores/toastStore.ts`) or dismisses on tap
 * or an upward swipe. Deliberately not a replacement for `AlertBox` (persistent, in-layout)
 * or `SuccessSheet` (modal celebration) — this owns the third case, a quick status ping that
 * shouldn't block or require a decision, which the app currently has no way to show besides
 * the OS-level `Alert.alert`.
 */
export function Toast() {
  const message = useToastStore((s) => s.message)
  const variant = useToastStore((s) => s.variant)
  const hideToast = useToastStore((s) => s.hideToast)
  const insets = useSafeAreaInsets()
  const m = useMotion()

  // Lags one animation behind the store's `message` so the exit slide/fade has something to
  // animate — clearing `rendered` immediately on `message: null` would just make it vanish.
  const [rendered, setRendered] = useState<{ message: string; variant: ToastVariant } | null>(null)
  const translateY = useSharedValue(-60)
  const opacity = useSharedValue(0)

  useEffect(() => {
    if (message) {
      setRendered({ message, variant })
      translateY.value = withSpring(0, m.spring('snappy'))
      opacity.value = withTiming(1, { duration: m.duration('quick') })
    } else {
      translateY.value = withTiming(-60, { duration: m.duration('quick') })
      opacity.value = withTiming(0, { duration: m.duration('quick') }, (finished) => {
        if (finished) runOnJS(setRendered)(null)
      })
    }
  }, [message, variant, translateY, opacity, m])

  const swipeUp = Gesture.Pan()
    .onChange((event) => {
      if (event.changeY < 0) translateY.value += event.changeY
    })
    .onEnd((event) => {
      if (event.translationY < -20 || event.velocityY < -500) {
        runOnJS(hideToast)()
      } else {
        translateY.value = withSpring(0, m.spring('snappy'))
      }
    })

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }))

  if (!rendered) return null

  const v = VARIANT_COLOR[rendered.variant]

  return (
    <GestureDetector gesture={swipeUp}>
      <Animated.View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + spacing.sm }, style]}>
        <Pressable
          onPress={hideToast}
          style={[styles.card, { backgroundColor: v.background, borderColor: v.border }]}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          <MaterialIcons name={VARIANT_ICON[rendered.variant]} size={20} color={v.text} />
          <Text style={[styles.message, { color: v.text }]} numberOfLines={2}>
            {rendered.message}
          </Text>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 1000,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    ...shadows.lg,
  },
  message: {
    ...textStyles.smallBold,
    flex: 1,
  },
})

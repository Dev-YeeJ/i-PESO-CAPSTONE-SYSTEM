import { ReactNode, useCallback, useEffect } from 'react'
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler'
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useMotion } from '@/hooks/useMotion'
import { colors, radii, shadows, spacing, textStyles } from '@/theme'

interface BottomSheetProps {
  visible: boolean
  onClose: () => void
  title?: string
  /** Fraction of screen height the sheet occupies. Content scrolls inside if it overflows. */
  heightRatio?: number
  /** Pinned to the bottom, outside the scroll area — for "Apply filters"-style actions. */
  footer?: ReactNode
  children: ReactNode
}

/**
 * Drag-dismissable bottom sheet.
 *
 * Hand-rolled on gesture-handler + Reanimated rather than pulling in a sheet library: the
 * app needs one sheet shape (filters), and the drag/snap logic below is small enough that
 * owning it avoids a dependency whose Reanimated 4 support is still settling.
 *
 * The pan gesture is clamped to downward travel only — allowing upward drag on a sheet that
 * has nowhere further to go produces a rubber-band that reads as broken.
 */
export function BottomSheet({
  visible,
  onClose,
  title,
  heightRatio = 0.72,
  footer,
  children,
}: BottomSheetProps) {
  const m = useMotion()
  const insets = useSafeAreaInsets()
  const { height: screenHeight } = useWindowDimensions()
  const sheetHeight = screenHeight * heightRatio

  const translateY = useSharedValue(sheetHeight)
  const backdropOpacity = useSharedValue(0)

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, m.spring('gentle'))
      backdropOpacity.value = withTiming(1, { duration: m.duration('quick') })
    } else {
      translateY.value = sheetHeight
      backdropOpacity.value = 0
    }
  }, [visible, sheetHeight, translateY, backdropOpacity, m])

  const dismiss = useCallback(() => {
    backdropOpacity.value = withTiming(0, { duration: m.duration('instant') })
    translateY.value = withTiming(sheetHeight, { duration: m.duration('quick') }, (finished) => {
      if (finished) runOnJS(onClose)()
    })
  }, [backdropOpacity, translateY, sheetHeight, onClose, m])

  const panGesture = Gesture.Pan()
    .onChange((event) => {
      // Downward only. Negative translation would drag the sheet past its own top edge.
      translateY.value = Math.max(0, translateY.value + event.changeY)
    })
    .onEnd((event) => {
      // Dismiss on either a decisive flick or a drag past a third of the sheet — velocity
      // alone misses slow deliberate drags, distance alone misses fast flicks.
      const shouldDismiss = event.velocityY > 900 || translateY.value > sheetHeight * 0.33
      if (shouldDismiss) {
        runOnJS(dismiss)()
      } else {
        translateY.value = withSpring(0, m.spring('gentle'))
      }
    })

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }))

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismiss} statusBarTranslucent>
      {/* gesture-handler needs its own root inside an RN Modal or pans never fire on Android. */}
      <GestureHandlerRootView style={styles.flex}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={dismiss}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
        </Animated.View>

        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.sheet,
              { height: sheetHeight, paddingBottom: insets.bottom || spacing.lg },
              sheetStyle,
            ]}
            accessibilityViewIsModal
          >
            <View style={styles.grabberWrap}>
              <View style={styles.grabber} />
            </View>

            {title ? (
              <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
                <Pressable
                  onPress={dismiss}
                  hitSlop={12}
                  style={styles.closeButton}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <MaterialIcons name="close" size={20} color={colors.textSecondary} />
                </Pressable>
              </View>
            ) : null}

            <View style={styles.body}>{children}</View>

            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backdrop: {
    backgroundColor: colors.scrim,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    ...shadows.elevated,
  },
  grabberWrap: {
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.borderStrong,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...textStyles.title,
    color: colors.textPrimary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.sunken,
  },
  body: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
})

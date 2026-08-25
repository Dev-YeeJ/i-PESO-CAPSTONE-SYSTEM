import { useEffect } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle, type DimensionValue } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { useMotion } from '@/hooks/useMotion'
import { colors, radii, spacing } from '@/theme'

interface SkeletonProps {
  width?: DimensionValue
  height?: number
  radius?: number
  style?: StyleProp<ViewStyle>
}

/**
 * A single shimmering placeholder block.
 *
 * The pulse is a plain opacity loop rather than a translating gradient sweep — a sweep needs
 * a gradient node per block, which on a list of skeleton cards means dozens of extra layers
 * on exactly the mid-range Android devices this app targets. Opacity animates on the UI
 * thread for free and reads just as clearly as "content is coming".
 */
export function Skeleton({ width = '100%', height = 12, radius = radii.pill, style }: SkeletonProps) {
  const m = useMotion()
  const pulse = useSharedValue(1)

  useEffect(() => {
    if (!m.enabled) {
      pulse.value = 1
      return
    }

    pulse.value = withRepeat(
      withSequence(
        withTiming(0.45, { duration: 650 }),
        withTiming(1, { duration: 650 }),
      ),
      -1,
      false,
    )
  }, [m.enabled, pulse])

  const animatedStyle = useAnimatedStyle(() => ({ opacity: pulse.value }))

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: colors.sunken },
        animatedStyle,
        style,
      ]}
    />
  )
}

/**
 * Wrapper that marks a group of skeletons as one loading region for screen readers. Without
 * it, TalkBack/VoiceOver announce nothing at all while a screen is fetching.
 */
export function SkeletonGroup({
  children,
  label = 'Loading',
  style,
}: {
  children: React.ReactNode
  label?: string
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View style={style} accessibilityRole="progressbar" accessibilityLabel={label} accessible>
      {children}
    </View>
  )
}

/** Skeleton shaped like a JobFeedCard, so the swap to real content doesn't shift layout. */
export function JobCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Skeleton width={48} height={48} radius={radii.md} />
        <View style={styles.flex}>
          <Skeleton width="82%" height={16} />
          <Skeleton width="52%" height={12} style={styles.gapSm} />
        </View>
        <Skeleton width={52} height={52} radius={26} />
      </View>
      <Skeleton width="92%" height={12} style={styles.gapLg} />
      <Skeleton width="68%" height={12} style={styles.gapSm} />
      <View style={styles.chips}>
        <Skeleton width={108} height={26} />
        <Skeleton width={68} height={26} />
        <Skeleton width={68} height={26} />
      </View>
      <View style={styles.footer}>
        <Skeleton width={92} height={40} />
        <Skeleton width={128} height={40} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  gapSm: {
    marginTop: spacing.sm,
  },
  gapLg: {
    marginTop: spacing.lg,
  },
  chips: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  footer: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
})

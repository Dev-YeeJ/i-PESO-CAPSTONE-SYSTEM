import { StyleSheet, View } from 'react-native'
import { Skeleton, SkeletonGroup } from './Skeleton'
import { colors, radii, spacing } from '@/theme'

/**
 * Full-screen loading placeholder for detail screens.
 *
 * Replaces the centred `ActivityIndicator` that every detail screen used: a spinner says
 * "something is happening", a shaped skeleton says "a header and two cards are coming", and
 * it holds the layout so content doesn't jump in when it lands.
 */
export function ScreenSkeleton({ label = 'Loading' }: { label?: string }) {
  return (
    <SkeletonGroup label={label} style={styles.wrap}>
      <Skeleton width="65%" height={24} />
      <Skeleton width="40%" height={14} style={styles.gap} />

      <View style={styles.card}>
        <View style={styles.row}>
          <Skeleton width={48} height={48} radius={radii.md} />
          <View style={styles.flex}>
            <Skeleton width="80%" height={14} />
            <Skeleton width="55%" height={11} style={styles.gapSm} />
          </View>
        </View>
        <Skeleton width="92%" height={11} style={styles.gap} />
        <Skeleton width="70%" height={11} style={styles.gapSm} />
      </View>

      <View style={styles.card}>
        <Skeleton width="45%" height={14} />
        <Skeleton width="100%" height={11} style={styles.gap} />
        <Skeleton width="88%" height={11} style={styles.gapSm} />
        <Skeleton width="62%" height={11} style={styles.gapSm} />
      </View>
    </SkeletonGroup>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    padding: spacing.lg,
  },
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  card: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  gap: {
    marginTop: spacing.md,
  },
  gapSm: {
    marginTop: spacing.sm,
  },
})

import { StyleSheet, View } from 'react-native'
import { JobCardSkeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { spacing } from '@/theme'

/**
 * Loading placeholder for the job feed. Shape matches JobFeedCard so the swap to real content
 * doesn't shift the list. The shimmer itself lives in the shared Skeleton primitive.
 */
export function JobFeedSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <SkeletonGroup label="Loading jobs" style={styles.stack}>
      {Array.from({ length: rows }).map((_, index) => (
        <View key={index}>
          <JobCardSkeleton />
        </View>
      ))}
    </SkeletonGroup>
  )
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },
})

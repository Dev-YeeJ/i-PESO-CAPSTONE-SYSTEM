import { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { AlertBox } from './AlertBox'
import { EmptyState } from './EmptyState'
import { Skeleton, SkeletonGroup } from './Skeleton'
import { apiErrorMessage } from '@/utils/apiError'
import { colors, radii, spacing } from '@/theme'

interface QueryStateProps {
  isLoading: boolean
  error?: unknown
  errorFallback?: string
  isEmpty?: boolean
  emptyIcon?: React.ComponentProps<typeof MaterialIcons>['name']
  emptyTitle?: string
  emptyMessage?: string
  emptyAction?: ReactNode
  /** Custom loading placeholder. Defaults to three generic card skeletons. */
  skeleton?: ReactNode
  /** How many default skeleton cards to show when no custom `skeleton` is given. */
  skeletonRows?: number
  children: ReactNode
}

export function QueryState({
  isLoading,
  error,
  errorFallback = 'Something went wrong. Please try again.',
  isEmpty = false,
  emptyIcon,
  emptyTitle = 'Nothing here yet',
  emptyMessage,
  emptyAction,
  skeleton,
  skeletonRows = 3,
  children,
}: QueryStateProps) {
  if (isLoading) {
    // A shaped placeholder rather than a spinner: it tells the seeker what is arriving and
    // keeps the layout from jumping when it does.
    if (skeleton) return <>{skeleton}</>

    return (
      <SkeletonGroup label="Loading" style={styles.skeletonStack}>
        {Array.from({ length: skeletonRows }).map((_, index) => (
          <View key={index} style={styles.skeletonCard}>
            <View style={styles.skeletonRow}>
              <Skeleton width={44} height={44} radius={radii.md} />
              <View style={styles.skeletonFlex}>
                <Skeleton width="75%" height={14} />
                <Skeleton width="45%" height={11} style={styles.skeletonGap} />
              </View>
            </View>
            <Skeleton width="90%" height={11} style={styles.skeletonLine} />
          </View>
        ))}
      </SkeletonGroup>
    )
  }

  if (error) {
    return (
      <AlertBox variant="danger" style={styles.alert}>
        {apiErrorMessage(error, errorFallback)}
      </AlertBox>
    )
  }

  if (isEmpty) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} message={emptyMessage} action={emptyAction} />
  }

  return <>{children}</>
}

const styles = StyleSheet.create({
  alert: {
    margin: spacing.xl,
  },
  skeletonStack: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  skeletonCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  skeletonFlex: {
    flex: 1,
  },
  skeletonGap: {
    marginTop: spacing.sm,
  },
  skeletonLine: {
    marginTop: spacing.md,
  },
})

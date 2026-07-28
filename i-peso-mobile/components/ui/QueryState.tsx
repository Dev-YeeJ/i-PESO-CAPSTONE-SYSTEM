import { ReactNode } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { AlertBox } from './AlertBox'
import { EmptyState } from './EmptyState'
import { apiErrorMessage } from '@/utils/apiError'
import { colors, spacing } from '@/theme'

interface QueryStateProps {
  isLoading: boolean
  error?: unknown
  errorFallback?: string
  isEmpty?: boolean
  emptyIcon?: React.ComponentProps<typeof MaterialIcons>['name']
  emptyTitle?: string
  emptyMessage?: string
  emptyAction?: ReactNode
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
  children,
}: QueryStateProps) {
  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.info} />
      </View>
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
  center: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  alert: {
    margin: spacing.xl,
  },
})

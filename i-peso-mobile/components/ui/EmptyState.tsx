import { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { colors, radii, spacing, typography } from '@/theme'

interface EmptyStateProps {
  icon?: React.ComponentProps<typeof MaterialIcons>['name']
  title: string
  message?: string
  action?: ReactNode
}

export function EmptyState({ icon = 'inbox', title, message, action }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <MaterialIcons name={icon} size={28} color={colors.subtle} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.title,
    fontFamily: typography.family.bold,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  message: {
    fontSize: typography.body,
    fontFamily: typography.family.regular,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 20,
  },
  action: {
    marginTop: spacing.lg,
    alignSelf: 'stretch',
  },
})

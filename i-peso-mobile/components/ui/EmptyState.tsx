import { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { EmptyArt, type EmptyArtKind } from './EmptyArt'
import { colors, radii, spacing, textStyles } from '@/theme'

interface EmptyStateProps {
  icon?: React.ComponentProps<typeof MaterialIcons>['name']
  /** Bespoke line-art illustration (redesign). Takes precedence over `icon`. */
  art?: EmptyArtKind
  title: string
  message?: string
  action?: ReactNode
}

/** Empty state: illustration + title + one line + (at most) one clear action. */
export function EmptyState({ icon = 'inbox', art, title, message, action }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      {art ? (
        <View style={styles.artCircle}>
          <EmptyArt kind={art} />
        </View>
      ) : (
        <View style={styles.iconCircle}>
          <MaterialIcons name={icon} size={28} color={colors.iconBlue} />
        </View>
      )}
      <Text style={styles.title} accessibilityRole="header">{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xxl,
  },
  artCircle: {
    width: 140,
    height: 140,
    borderRadius: radii.pill,
    backgroundColor: colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...textStyles.title,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  message: {
    ...textStyles.body,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
  },
  action: {
    marginTop: spacing.xl,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
})

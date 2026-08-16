import { StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native'
import { colors, radii, spacing, typography } from '@/theme'

const badgeStyles = {
  neutral: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    textColor: colors.textPrimary,
  },
  info: {
    backgroundColor: colors.infoBackground,
    borderColor: colors.infoBorder,
    textColor: colors.secondary,
  },
  success: {
    backgroundColor: colors.successBackground,
    borderColor: colors.successBorder,
    textColor: colors.success,
  },
  warning: {
    backgroundColor: colors.warningBackground,
    borderColor: colors.warningBorder,
    textColor: colors.warning,
  },
  danger: {
    backgroundColor: colors.errorBackground,
    borderColor: colors.errorBorder,
    textColor: colors.error,
  },
}

type BadgeVariant = keyof typeof badgeStyles

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  dot?: boolean
  style?: ViewStyle
  textStyle?: TextStyle
}

export function Badge({
  children,
  variant = 'neutral',
  dot = false,
  style,
  textStyle,
}: BadgeProps) {
  const current = badgeStyles[variant]

  return (
    <View style={[styles.badge, { backgroundColor: current.backgroundColor, borderColor: current.borderColor }, style]}>
      {dot ? <View style={[styles.dot, { backgroundColor: current.textColor }]} /> : null}
      <Text style={[styles.label, { color: current.textColor }, textStyle]}>{children}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  label: {
    fontSize: typography.small,
    fontWeight: typography.semibold,
  },
})

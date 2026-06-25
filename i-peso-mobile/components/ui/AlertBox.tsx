import { StyleSheet, Text, View, type ViewStyle } from 'react-native'
import { colors, radii, spacing, typography } from '@/theme'

const alertConfig = {
  info: {
    backgroundColor: colors.infoBackground,
    borderColor: colors.infoBorder,
    textColor: colors.primary,
  },
  success: {
    backgroundColor: colors.successBackground,
    borderColor: colors.successBorder,
    textColor: colors.primary,
  },
  warning: {
    backgroundColor: colors.warningBackground,
    borderColor: colors.warningBorder,
    textColor: colors.warning,
  },
  danger: {
    backgroundColor: colors.dangerBackground,
    borderColor: colors.dangerBorder,
    textColor: colors.danger,
  },
}

type AlertVariant = keyof typeof alertConfig

interface AlertBoxProps {
  title?: string
  children: React.ReactNode
  variant?: AlertVariant
  action?: React.ReactNode
  style?: ViewStyle
}

export function AlertBox({ title, children, variant = 'warning', action, style }: AlertBoxProps) {
  const current = alertConfig[variant]
  return (
    <View style={[styles.container, { backgroundColor: current.backgroundColor, borderColor: current.borderColor }, style]}>
      <View style={styles.textColumn}>
        {title ? <Text style={[styles.title, { color: current.textColor }]}>{title}</Text> : null}
        <Text style={[styles.body, { color: current.textColor }]}>{children}</Text>
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  textColumn: {
    flex: 1,
  },
  title: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    marginBottom: spacing.xs,
  },
  body: {
    fontSize: typography.body,
    lineHeight: 20,
  },
  action: {
    marginTop: spacing.sm,
  },
})

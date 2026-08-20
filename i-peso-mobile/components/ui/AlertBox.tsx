import { StyleSheet, Text, View, type ViewStyle } from 'react-native'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { colors, radii, spacing, textStyles } from '@/theme'

const alertConfig = {
  info: {
    backgroundColor: colors.infoBackground,
    borderColor: colors.infoBorder,
    textColor: colors.info,
    icon: 'info' as const,
  },
  success: {
    backgroundColor: colors.successBackground,
    borderColor: colors.successBorder,
    textColor: colors.success,
    icon: 'check-circle' as const,
  },
  warning: {
    backgroundColor: colors.warningBackground,
    borderColor: colors.warningBorder,
    textColor: colors.warning,
    icon: 'warning' as const,
  },
  danger: {
    backgroundColor: colors.dangerBackground,
    borderColor: colors.dangerBorder,
    textColor: colors.danger,
    icon: 'error' as const,
  },
}

type AlertVariant = keyof typeof alertConfig

interface AlertBoxProps {
  title?: string
  children: React.ReactNode
  variant?: AlertVariant
  action?: React.ReactNode
  icon?: boolean
  style?: ViewStyle
}

export function AlertBox({ title, children, variant = 'warning', action, icon = true, style }: AlertBoxProps) {
  const current = alertConfig[variant]
  return (
    <View style={[styles.container, { backgroundColor: current.backgroundColor, borderColor: current.borderColor }, style]}>
      {icon ? (
        <MaterialIcons name={current.icon} size={18} color={current.textColor} style={styles.icon} />
      ) : null}
      <View style={styles.textColumn}>
        {title ? <Text style={[styles.title, { color: current.textColor }]}>{title}</Text> : null}
        <Text style={[styles.body, { color: current.textColor }]}>{children}</Text>
        {action ? <View style={styles.action}>{action}</View> : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  icon: {
    marginTop: 1,
  },
  textColumn: {
    flex: 1,
  },
  title: {
    ...textStyles.bodyBold,
    marginBottom: spacing.xs,
  },
  body: {
    ...textStyles.body,
  },
  action: {
    marginTop: spacing.sm,
  },
})

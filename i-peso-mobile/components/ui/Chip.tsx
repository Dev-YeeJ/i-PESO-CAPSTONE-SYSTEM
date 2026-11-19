import { StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import * as Haptics from 'expo-haptics'
import { PressableScale } from './PressableScale'
import { colors, radii, spacing, typography } from '@/theme'

type IconName = React.ComponentProps<typeof MaterialIcons>['name']

interface ChipProps {
  label: string
  /** Selected filter: solid blue. */
  selected?: boolean
  /** Soft blue fill — an active filter shown as a removable token. */
  soft?: boolean
  icon?: IconName
  /** Shows an × and makes the whole chip a remove action. */
  onRemove?: () => void
  onPress?: () => void
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
}

/** Filter / choice chip (redesign components page). 36pt tall, 44pt hit area via hitSlop. */
export function Chip({ label, selected = false, soft = false, icon, onRemove, onPress, style, accessibilityLabel }: ChipProps) {
  const fg = selected ? colors.white : colors.iconBlue
  const handlePress = () => {
    Haptics.selectionAsync().catch(() => undefined)
    if (onRemove) onRemove()
    else onPress?.()
  }

  return (
    <PressableScale
      scaleTo="buttonPress"
      ripple={null}
      haptics={false}
      onPress={handlePress}
      hitSlop={4}
      style={[styles.chip, soft && styles.soft, selected && styles.selected, style]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? (onRemove ? `Remove filter ${label}` : label)}
    >
      {icon ? <MaterialIcons name={icon} size={16} color={fg} /> : null}
      <Text style={[styles.label, (selected || soft) && styles.labelStrong, { color: fg }]} numberOfLines={1}>{label}</Text>
      {onRemove ? <MaterialIcons name="close" size={16} color={fg} style={styles.remove} /> : null}
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.tintBorder,
    backgroundColor: colors.surface,
  },
  soft: {
    backgroundColor: colors.tint,
    borderColor: colors.tintBorder,
  },
  selected: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  label: {
    fontSize: 13,
    fontFamily: typography.family.medium,
  },
  labelStrong: {
    fontFamily: typography.family.bold,
  },
  remove: {
    marginRight: -4,
  },
})

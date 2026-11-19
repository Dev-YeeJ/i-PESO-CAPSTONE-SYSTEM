import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native'
import { colors, radii, shadows, spacing, typography } from '@/theme'

interface SegmentedControlOption<T extends string> {
  label: string
  value: T
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[]
  value: T
  onChange: (value: T) => void
  style?: StyleProp<ViewStyle>
}

export function SegmentedControl<T extends string>({ options, value, onChange, style }: SegmentedControlProps<T>) {
  return (
    <View style={[styles.track, style]}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.segment, active && styles.segmentActive]}
            onPress={() => onChange(option.value)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

// Redesign: a sunken track with a white "lifted" segment — reads as a view switch, distinct
// from the solid-blue filter chips and the gradient primary button.
const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.sunken,
    borderRadius: radii.pill,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
  },
  segmentActive: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  label: {
    fontSize: 13,
    fontFamily: typography.family.bold,
    color: colors.textSecondary,
  },
  labelActive: {
    color: colors.figure,
  },
})

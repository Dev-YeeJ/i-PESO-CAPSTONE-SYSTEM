import { ReactNode } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { colors, spacing, typography } from '@/theme'

interface ScreenHeaderProps {
  title: string
  onBack?: () => void
  backLabel?: string
  right?: ReactNode
}

export function ScreenHeader({ title, onBack, backLabel = 'Back', right }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
      <View style={styles.side}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={backLabel}
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={[styles.title, !onBack && styles.titleNoBack]} numberOfLines={1} accessibilityRole="header">{title}</Text>
      <View style={[styles.side, styles.sideRight]}>{right}</View>
    </View>
  )
}

// Redesign: 44pt back button (was 36 — under the touch-target minimum) and a left-aligned
// title next to it, like the drafts' detail headers.
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 56,
    paddingBottom: spacing.sm,
    paddingLeft: spacing.sm,
    paddingRight: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  side: {
    alignItems: 'flex-start',
  },
  sideRight: {
    alignItems: 'flex-end',
    flexDirection: 'row',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: typography.title,
    lineHeight: 24,
    fontFamily: typography.family.bold,
    color: colors.textPrimary,
  },
  titleNoBack: {
    marginLeft: spacing.sm,
  },
})

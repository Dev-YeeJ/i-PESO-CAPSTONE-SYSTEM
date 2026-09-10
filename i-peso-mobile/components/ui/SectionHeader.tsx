import { StyleSheet, View, Text, type StyleProp, type ViewStyle } from 'react-native'
import { colors, spacing, typography } from '@/theme'

interface SectionHeaderProps {
  title: string
  action?: React.ReactNode
  /** Extra styling for the outer row — e.g. matching horizontal spacing on a screen whose
   * ScrollView content is deliberately unpadded (a full-bleed hero image) so the header still
   * lines up with the padded cards below it. */
  style?: StyleProp<ViewStyle>
}

export function SectionHeader({ title, action, style }: SectionHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
      {action}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.xl,
  },
  title: {
    fontSize: typography.title,
    fontFamily: typography.family.bold,
    color: colors.textPrimary,
  },
})

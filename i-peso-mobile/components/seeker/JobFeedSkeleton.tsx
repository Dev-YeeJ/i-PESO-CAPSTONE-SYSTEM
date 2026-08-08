import { StyleSheet, View } from 'react-native'
import { colors, radii, shadows, spacing } from '@/theme'

export function JobFeedSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <View style={styles.stack} accessibilityRole="progressbar" accessibilityLabel="Loading jobs">
      {Array.from({ length: rows }).map((_, index) => (
        <View key={index} style={styles.card}>
          <View style={styles.topRow}>
            <View style={styles.logo} />
            <View style={styles.flex}>
              <View style={[styles.bar, styles.title]} />
              <View style={[styles.bar, styles.company]} />
            </View>
            <View style={styles.ring} />
          </View>
          <View style={[styles.bar, styles.lineFull]} />
          <View style={[styles.bar, styles.lineMid]} />
          <View style={styles.chips}>
            <View style={[styles.chip, styles.chipWide]} />
            <View style={styles.chip} />
            <View style={styles.chip} />
          </View>
          <View style={styles.footer}>
            <View style={styles.footerPill} />
            <View style={[styles.footerPill, styles.footerCta]} />
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },
  card: {
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: radii.sm,
    backgroundColor: colors.border,
  },
  ring: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.border,
  },
  bar: {
    height: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    opacity: 0.85,
  },
  title: {
    width: '82%',
    height: 16,
  },
  company: {
    marginTop: spacing.sm,
    width: '52%',
  },
  lineFull: {
    marginTop: spacing.lg,
    width: '92%',
  },
  lineMid: {
    marginTop: spacing.sm,
    width: '68%',
  },
  chips: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    width: 68,
    height: 26,
    borderRadius: radii.pill,
    backgroundColor: colors.background,
  },
  chipWide: {
    width: 108,
  },
  footer: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerPill: {
    width: 82,
    height: 38,
    borderRadius: radii.pill,
    backgroundColor: colors.background,
  },
  footerCta: {
    width: 118,
    backgroundColor: colors.border,
  },
})

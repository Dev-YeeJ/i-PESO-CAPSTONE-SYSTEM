import { StyleSheet, View, Text } from 'react-native'
import { Card, CardHeader } from './Card'
import { colors, spacing, typography, radii } from '@/theme'

interface ProgressCardProps {
  title: string
  subtitle?: string
  progress: number // 0 to 100
  color?: string
}

export function ProgressCard({ title, subtitle, progress, color = colors.accent }: ProgressCardProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 100)

  return (
    <Card padding="md">
      <CardHeader title={title} subtitle={subtitle} />
      <View style={styles.progressContainer}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${clampedProgress}%`, backgroundColor: color }]} />
        </View>
        <Text style={styles.percentage}>{clampedProgress}%</Text>
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  progressContainer: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  track: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
  },
  percentage: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.primary,
    width: 40,
    textAlign: 'right',
  },
})

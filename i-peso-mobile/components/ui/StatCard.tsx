import { StyleSheet, View, Text } from 'react-native'
import { Card } from './Card'
import { colors, spacing, typography, radii } from '@/theme'

interface StatCardProps {
  title: string
  value: string | number
  icon?: React.ReactNode
  trend?: {
    value: string
    isPositive: boolean
  }
}

export function StatCard({ title, value, icon, trend }: StatCardProps) {
  return (
    <Card padding="md" style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
      </View>
      <View style={styles.content}>
        <Text style={styles.value}>{value}</Text>
        {trend && (
          <View style={[styles.trendBadge, trend.isPositive ? styles.trendPositive : styles.trendNegative]}>
            <Text style={[styles.trendText, trend.isPositive ? styles.trendTextPositive : styles.trendTextNegative]}>
              {trend.value}
            </Text>
          </View>
        )}
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.small,
    color: colors.textSecondary,
    fontFamily: typography.family.medium,
  },
  iconContainer: {
    padding: spacing.xs,
    backgroundColor: colors.blue50,
    borderRadius: radii.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  value: {
    fontSize: typography.display,
    color: colors.textPrimary,
    fontFamily: typography.family.bold,
  },
  trendBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  trendPositive: {
    backgroundColor: colors.successBackground,
  },
  trendNegative: {
    backgroundColor: colors.errorBackground,
  },
  trendText: {
    fontSize: typography.small,
    fontFamily: typography.family.medium,
  },
  trendTextPositive: {
    color: colors.success,
  },
  trendTextNegative: {
    color: colors.error,
  },
})

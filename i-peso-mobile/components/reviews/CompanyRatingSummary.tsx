import { StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import type { ReviewType } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { PressableScale } from '@/components/ui/PressableScale'
import { Skeleton } from '@/components/ui/Skeleton'
import { colors, radii, spacing, textStyles } from '@/theme'

// Rebuilt from i-peso-frontend/src/components/reviews/EmployerRatingSummary.jsx (shown in the
// Smart Job Map's job details on the website; on the phone the map opens the job screen).
const SECTIONS: { type: ReviewType; label: string; who: string }[] = [
  { type: 'recruitment', label: 'Hiring process', who: 'applicants' },
  { type: 'employment', label: 'Working here', who: 'employees' },
]

/**
 * Compact company ratings: hiring and workplace averages, how many verified people they're
 * based on, and % who recommend. Below 3 reviewers it says so instead. Renders nothing if
 * the ratings can't be loaded, so it never blocks the job screen.
 */
export function CompanyRatingSummary({ employerId, onSeeAll }: { employerId: number | string; onSeeAll?: () => void }) {
  const { data, isLoading, isError } = useQuery({
    // Own key: CompanyReviews keeps paged (infinite) data under its key, a different shape.
    // Still under ['seeker', 'employer-reviews'], so saving a review refreshes it.
    queryKey: ['seeker', 'employer-reviews', String(employerId), 'summary'],
    queryFn: () => seekerService.getEmployerReviews(employerId, { type: 'recruitment', page: 1 }),
    enabled: Boolean(employerId),
    staleTime: 5 * 60 * 1000,
  })

  if (!employerId || isError) return null
  const summary = data?.summary

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">Company ratings</Text>
        {onSeeAll ? (
          <PressableScale scaleTo="buttonPress" ripple={null} onPress={onSeeAll} hitSlop={8} accessibilityRole="button">
            <Text style={styles.link}>See all reviews</Text>
          </PressableScale>
        ) : null}
      </View>

      {isLoading ? (
        <View style={styles.loading} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Skeleton width="75%" height={14} />
          <Skeleton width="65%" height={14} />
        </View>
      ) : (
        <View style={styles.rows}>
          {SECTIONS.map(({ type, label, who }) => {
            const section = summary?.[type]
            const enough = section?.enough ? section : null
            return (
              <View
                key={type}
                style={styles.row}
                accessible
                accessibilityLabel={enough
                  ? `${label}: rated ${enough.average?.toFixed(1)} out of 5 by ${enough.reviewers} verified ${who}, ${enough.recommend_percent}% recommend`
                  : `${label}: not enough verified reviews yet`}
              >
                <Text style={styles.rowLabel}>{label}</Text>
                {enough ? (
                  <View style={styles.value}>
                    <MaterialIcons name="star" size={14} color={colors.accent} />
                    <Text style={styles.average}>{enough.average?.toFixed(1)}</Text>
                    <Text style={styles.meta}>({enough.reviewers}) · {enough.recommend_percent}% recommend</Text>
                  </View>
                ) : (
                  <Text style={styles.meta}>
                    Not enough verified reviews yet{section?.reviewers ? ` (${section.reviewers} so far)` : ''}
                  </Text>
                )}
              </View>
            )
          })}
        </View>
      )}

      <View style={styles.footer}>
        <MaterialIcons name="verified-user" size={14} color={colors.success} />
        <Text style={[styles.meta, styles.flex]}>From people who applied or worked here through i-PESO.</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface, padding: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  title: { ...textStyles.smallBold, color: colors.textPrimary },
  link: { ...textStyles.smallBold, color: colors.secondary },
  loading: { gap: spacing.sm, marginTop: spacing.md },
  rows: { gap: spacing.sm, marginTop: spacing.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', columnGap: spacing.md, rowGap: 2 },
  rowLabel: { ...textStyles.small, color: colors.textSecondary },
  value: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 },
  average: { ...textStyles.smallBold, color: colors.textPrimary },
  meta: { ...textStyles.small, color: colors.textSecondary },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md },
  flex: { flex: 1 },
})

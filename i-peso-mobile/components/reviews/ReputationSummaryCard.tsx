import { StyleSheet, Text, View } from 'react-native'
import type { ReputationSection } from '@/services/seekerService'
import { colors, radii, spacing, textStyles } from '@/theme'
import { Stars } from './StarRating'

// Rebuilt from i-peso-frontend/src/components/reviews/ReputationSummaryCard.jsx.

interface ReputationSummaryCardProps {
  section: ReputationSection | undefined
  minReviews?: number
}

/**
 * A company's one reputation summary: average, how many verified people it's based on, a
 * bar per aspect, strengths and areas to improve. Below the minimum number of reviewers it
 * says there aren't enough yet.
 */
export function ReputationSummaryCard({ section, minReviews = 3 }: ReputationSummaryCardProps) {
  if (!section) return null
  const who = section.reviewers === 1 ? 'person' : 'people'

  if (!section.enough) {
    return (
      <View style={[styles.card, styles.cardMuted]}>
        <Text style={styles.notEnoughTitle}>Not enough verified reviews yet</Text>
        <Text style={styles.bodyText}>
          A summary appears once {minReviews} verified people have reviewed this company
          {section.reviewers > 0 ? ` (${section.reviewers} so far)` : ''}.
        </Text>
      </View>
    )
  }

  const aspects = Object.entries(section.aspects ?? {})
  const label = (key: string) => section.aspects?.[key]?.label ?? key
  const average = section.average ?? 0

  return (
    <View style={styles.card}>
      <View style={styles.headline}>
        <View>
          <Text style={styles.bigAverage}>{average.toFixed(1)}</Text>
          <Stars value={average} size="lg" />
        </View>
        <View style={styles.headlineText}>
          <Text style={styles.bodyText}>
            Based on <Text style={styles.strong}>{section.reviewers}</Text> verified {who}
          </Text>
          <Text style={styles.bodyText}>
            <Text style={styles.strong}>{section.recommend_percent}%</Text> would recommend this company
          </Text>
        </View>
      </View>

      <View style={styles.aspects}>
        {aspects.map(([key, aspect]) => (
          <View
            key={key}
            style={styles.aspectRow}
            accessible
            accessibilityLabel={`${aspect.label}, ${aspect.average.toFixed(1)} out of 5`}
          >
            <Text style={styles.aspectLabel} numberOfLines={1}>{aspect.label}</Text>
            <View style={styles.barTrack}>
              {/* Amber marks the earned score, per the theme's accent rule. */}
              <View style={[styles.barFill, { width: `${(aspect.average / 5) * 100}%` }]} />
            </View>
            <Text style={styles.aspectValue}>{aspect.average.toFixed(1)}</Text>
          </View>
        ))}
      </View>

      {(section.strengths?.length ?? 0) > 0 || (section.to_improve?.length ?? 0) > 0 ? (
        <View style={styles.chips}>
          {section.strengths?.map((key) => (
            <View key={`s-${key}`} style={[styles.chip, styles.chipStrong]}>
              <Text style={[styles.chipText, styles.chipTextStrong]}>Strong: {label(key)}</Text>
            </View>
          ))}
          {section.to_improve?.map((key) => (
            <View key={`i-${key}`} style={[styles.chip, styles.chipImprove]}>
              <Text style={[styles.chipText, styles.chipTextImprove]}>Could improve: {label(key)}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface, padding: spacing.lg },
  cardMuted: { backgroundColor: colors.sunken },
  notEnoughTitle: { ...textStyles.smallBold, color: colors.textPrimary, marginBottom: spacing.xs },
  bodyText: { ...textStyles.small, color: colors.textSecondary, lineHeight: 18 },
  strong: { ...textStyles.smallBold, color: colors.textPrimary },
  headline: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', columnGap: spacing.xl, rowGap: spacing.sm },
  headlineText: { flexShrink: 1 },
  bigAverage: { ...textStyles.display, color: colors.textPrimary },
  aspects: { marginTop: spacing.lg, gap: spacing.sm },
  aspectRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  aspectLabel: { ...textStyles.small, color: colors.textPrimary, width: 128 },
  barTrack: { flex: 1, height: 8, borderRadius: radii.pill, backgroundColor: colors.border, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.accent },
  aspectValue: { ...textStyles.smallBold, color: colors.textPrimary, width: 32, textAlign: 'right', fontVariant: ['tabular-nums'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
  chip: { borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  chipStrong: { borderColor: colors.successBorder, backgroundColor: colors.successBackground },
  chipImprove: { borderColor: colors.infoBorder, backgroundColor: colors.infoBackground },
  chipText: { ...textStyles.smallBold },
  chipTextStrong: { color: colors.success },
  chipTextImprove: { color: colors.iconBlue },
})

import { useState } from 'react'
import { Linking, StyleSheet, Text, View } from 'react-native'
import { useInfiniteQuery } from '@tanstack/react-query'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import type { PublicReview, ReviewType } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { REVIEW_GUIDELINES_URL } from '@/utils/reviews'
import { Button } from '@/components/ui/Button'
import { PressableScale } from '@/components/ui/PressableScale'
import { QueryState } from '@/components/ui/QueryState'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { colors, radii, spacing, textStyles } from '@/theme'
import { ReportReviewSheet } from './ReportReviewSheet'
import { ReputationSummaryCard } from './ReputationSummaryCard'
import { Stars } from './StarRating'

// Rebuilt from i-peso-frontend/src/components/reviews/CompanyReviews.jsx. The website pages
// with Newer/Older; on a phone the list grows with "Show more" instead.
const TABS: { type: ReviewType; label: string; who: string }[] = [
  { type: 'recruitment', label: 'Hiring process', who: 'applicants' },
  { type: 'employment', label: 'Working here', who: 'employees' },
]

/**
 * A company's reputation on its profile: hiring and working there shown separately, a
 * summary only once 3 people have reviewed, then the reviews themselves — anonymous, with
 * no job titles — and the employer's reply.
 */
export function CompanyReviews({ employerId }: { employerId: number | string }) {
  const [type, setType] = useState<ReviewType>('recruitment')
  const [reporting, setReporting] = useState<PublicReview | null>(null)

  const query = useInfiniteQuery({
    queryKey: ['seeker', 'employer-reviews', String(employerId), type],
    queryFn: ({ pageParam }) => seekerService.getEmployerReviews(employerId, { type, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.reviews.current_page < last.reviews.last_page ? last.reviews.current_page + 1 : undefined),
    enabled: Boolean(employerId),
  })

  const firstPage = query.data?.pages[0]
  const summary = firstPage?.summary
  const reviews = query.data?.pages.flatMap((page) => page.reviews.data) ?? []
  const tab = TABS.find((item) => item.type === type) ?? TABS[0]

  return (
    <View>
      <SegmentedControl
        options={TABS.map((item) => ({
          value: item.type,
          label: summary?.[item.type] ? `${item.label} (${summary[item.type].reviewers})` : item.label,
        }))}
        value={type}
        onChange={setType}
      />

      <View style={styles.panel}>
        <QueryState
          isLoading={query.isLoading}
          error={query.error}
          errorFallback="Reviews could not be loaded."
          onRetry={() => query.refetch()}
          skeletonRows={2}
        >
          <ReputationSummaryCard section={summary?.[type]} type={type} minReviews={summary?.min_reviews ?? 3} />

          {reviews.length > 0 ? (
            reviews.map((review) => <PublicReviewCard key={review.id} review={review} onReport={() => setReporting(review)} />)
          ) : (
            <View style={styles.dashedBox}>
              <Text style={styles.mutedText}>No reviews from verified {tab.who} yet.</Text>
            </View>
          )}

          {query.hasNextPage ? (
            <Button variant="outline" size="sm" onPress={() => query.fetchNextPage()} loading={query.isFetchingNextPage} style={styles.showMore}>
              Show more
            </Button>
          ) : null}

          <Text style={styles.footer}>
            Only people who applied or worked here through i-PESO can review. Names are never shown.{' '}
            <Text
              style={styles.link}
              onPress={() => { Linking.openURL(REVIEW_GUIDELINES_URL).catch(() => undefined) }}
              accessibilityRole="link"
            >
              Review guidelines
            </Text>
          </Text>
        </QueryState>
      </View>

      {reporting ? <ReportReviewSheet key={reporting.id} review={reporting} onClose={() => setReporting(null)} /> : null}
    </View>
  )
}

function PublicReviewCard({ review, onReport }: { review: PublicReview; onReport: () => void }) {
  const average = review.average ?? 0

  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewTop}>
        <View style={styles.inline}>
          <MaterialIcons name="verified-user" size={14} color={colors.success} />
          <Text style={styles.reviewer}>{review.reviewer}</Text>
        </View>
        <Text style={styles.meta}>{review.month}{review.edited ? ' · edited' : ''}</Text>
      </View>

      <View style={styles.ratingRow}>
        <View style={styles.inline}>
          <Stars value={average} />
          <Text style={styles.average}>{average.toFixed(1)}</Text>
        </View>
        <View style={styles.inline}>
          <MaterialIcons name={review.recommend ? 'thumb-up' : 'thumb-down'} size={14} color={review.recommend ? colors.success : colors.textSecondary} />
          <Text style={[styles.recommend, { color: review.recommend ? colors.success : colors.textSecondary }]}>
            {review.recommend ? 'Recommends' : "Doesn't recommend"}
          </Text>
        </View>
      </View>
      {review.limited ? <Text style={styles.limited}>Employer didn&apos;t respond to their application</Text> : null}

      <View style={styles.aspectList}>
        {review.ratings.map((rating) => (
          <Text key={rating.key} style={styles.meta}>
            {rating.label}: <Text style={styles.aspectValue}>{rating.value}</Text>/5
          </Text>
        ))}
      </View>
      {review.comment ? <Text style={styles.comment}>{review.comment}</Text> : null}

      {review.reply ? (
        <View style={styles.reply}>
          <View style={styles.inline}>
            <MaterialIcons name="reply" size={14} color={colors.blue700} />
            <Text style={styles.replyTitle}>Employer&apos;s reply{review.reply.edited ? ' · edited' : ''}</Text>
          </View>
          <Text style={styles.replyBody}>{review.reply.body}</Text>
        </View>
      ) : null}

      <PressableScale
        scaleTo="buttonPress"
        ripple={null}
        onPress={onReport}
        style={styles.reportBtn}
        accessibilityRole="button"
        accessibilityLabel="Report this review"
      >
        <MaterialIcons name="flag" size={14} color={colors.textSecondary} />
        <Text style={styles.reportText}>Report</Text>
      </PressableScale>
    </View>
  )
}

const styles = StyleSheet.create({
  panel: { marginTop: spacing.md, gap: spacing.md },
  dashedBox: { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong, borderRadius: radii.lg, padding: spacing.lg, backgroundColor: colors.surface },
  mutedText: { ...textStyles.small, color: colors.textSecondary },
  showMore: { alignSelf: 'center' },
  footer: { ...textStyles.small, color: colors.textSecondary, lineHeight: 18 },
  link: { ...textStyles.smallBold, color: colors.secondary, textDecorationLine: 'underline' },
  reviewCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface, padding: spacing.lg },
  reviewTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  reviewer: { ...textStyles.smallBold, color: colors.success },
  meta: { ...textStyles.small, color: colors.textSecondary },
  ratingRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: spacing.lg, rowGap: spacing.xs, marginTop: spacing.sm },
  average: { ...textStyles.smallBold, color: colors.textPrimary },
  recommend: { ...textStyles.smallBold },
  limited: { ...textStyles.small, color: colors.textSecondary, marginTop: spacing.xs },
  aspectList: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.lg, rowGap: spacing.xs, marginTop: spacing.sm },
  aspectValue: { ...textStyles.smallBold, color: colors.textPrimary },
  comment: { ...textStyles.body, color: colors.textPrimary, lineHeight: 20, marginTop: spacing.sm },
  reply: { marginTop: spacing.md, borderLeftWidth: 4, borderLeftColor: colors.blue200, backgroundColor: colors.blue50, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  replyTitle: { ...textStyles.smallBold, color: colors.blue900 },
  replyBody: { ...textStyles.small, color: colors.textPrimary, lineHeight: 18, marginTop: spacing.xs },
  reportBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-end', minHeight: 44, paddingHorizontal: spacing.sm, marginBottom: -spacing.sm },
  reportText: { ...textStyles.smallBold, color: colors.textSecondary },
})

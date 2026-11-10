import { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import type { ReviewOpportunity } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { formatReviewDate, MY_REVIEWS_KEY, openActions, type ReviewAction } from '@/utils/reviews'
import { Button } from '@/components/ui/Button'
import { colors, spacing, textStyles } from '@/theme'
import { ReviewFormSheet } from './ReviewFormSheet'

// Rebuilt from i-peso-frontend/src/pages/seeker/MyApplications.jsx (reviewActionsFor and
// ReviewNote). Every card shares the one cached MY_REVIEWS_KEY query, like the website.

/** Which reviews each application allows, keyed by application id. */
export function useReviewOpportunities() {
  const { data } = useQuery({
    queryKey: MY_REVIEWS_KEY,
    queryFn: () => seekerService.getMyReviews(),
    staleTime: 60_000,
  })
  return useMemo(() => Object.fromEntries(
    (data?.opportunities ?? []).filter((item) => item.source === 'application').map((item) => [String(item.source_id), item]),
  ) as Record<string, ReviewOpportunity>, [data])
}

/** Rate buttons for one application, plus "You reviewed this employer" / when a review opens up. */
export function ApplicationReviewActions({ applicationId }: { applicationId: number | string }) {
  const router = useRouter()
  const byApplication = useReviewOpportunities()
  const [writing, setWriting] = useState<ReviewAction | null>(null)

  const item = byApplication[String(applicationId)]
  const actions = item ? openActions([item]) : []

  return (
    <View>
      {actions.length > 0 ? (
        <View style={styles.buttons}>
          {actions.map((action) => (
            <Button key={action.key} variant="outline" size="sm" onPress={() => setWriting(action)}>
              {action.type === 'employment' ? 'Rate the workplace' : 'Rate this employer'}
            </Button>
          ))}
        </View>
      ) : null}
      <ReviewNote item={item} onSeeReviews={() => router.push({ pathname: '/(seeker)/reviews', params: { from: 'applications' } })} />

      {writing ? <ReviewFormSheet key={writing.key} target={writing} onClose={() => setWriting(null)} /> : null}
    </View>
  )
}

/** Under each application: "You reviewed this" or when a review opens up. */
function ReviewNote({ item, onSeeReviews }: { item: ReviewOpportunity | undefined; onSeeReviews: () => void }) {
  if (!item) return null
  const reviewed = (['recruitment', 'employment'] as const).some((type) => item[type]?.review_id)
  if (reviewed) {
    return (
      <Text style={styles.note}>
        You reviewed this employer.{' '}
        <Text style={styles.link} onPress={onSeeReviews} accessibilityRole="link">See or edit your review</Text>
      </Text>
    )
  }
  const upcoming = item.recruitment && !item.recruitment.allowed && item.recruitment.available_from
  if (upcoming && item.recruitment?.available_from) {
    return (
      <Text style={styles.noteMuted}>
        You can rate this employer once they respond, or from {formatReviewDate(item.recruitment.available_from, false)} if they don&apos;t.
      </Text>
    )
  }
  return null
}

const styles = StyleSheet.create({
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  note: { ...textStyles.smallBold, color: colors.textSecondary, marginTop: spacing.sm },
  noteMuted: { ...textStyles.small, color: colors.textSecondary, marginTop: spacing.sm },
  link: { ...textStyles.smallBold, color: colors.secondary },
})

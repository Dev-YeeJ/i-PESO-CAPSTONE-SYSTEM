import { useMemo, useState } from 'react'
import { Alert, Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import type { EmployerFeedbackItem, OwnReview, ReviewStatus } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { apiErrorMessage } from '@/utils/apiError'
import { formatReviewDate, MY_REVIEWS_KEY, openActions, resolveReviewKey, REVIEW_GUIDELINES_URL, type ReviewAction } from '@/utils/reviews'
import { useToast } from '@/stores/toastStore'
import { ReviewFormSheet } from '@/components/reviews/ReviewFormSheet'
import { Stars } from '@/components/reviews/StarRating'
import { AlertBox } from '@/components/ui/AlertBox'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { QueryState } from '@/components/ui/QueryState'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { colors, radii, spacing, textStyles } from '@/theme'

// Rebuilt from i-peso-frontend/src/pages/seeker/MyReviewsPage.jsx (incl. EmployerFeedbackSection).
const STATUS: Record<ReviewStatus, { label: string; variant: 'success' | 'warning' | 'danger' }> = {
  published: { label: 'Published', variant: 'success' },
  held: { label: 'Waiting for PESO', variant: 'warning' },
  hidden: { label: 'Hidden by PESO', variant: 'danger' },
}

// reviews is a flat sibling in the Tabs navigator, so router.back() has no real history.
function backTargetFor(from: string | undefined): string {
  if (from === 'notifications') return '/(seeker)/notifications'
  if (from === 'applications') return '/(seeker)/applications'
  return '/(seeker)/profile'
}

const openGuidelines = () => { Linking.openURL(REVIEW_GUIDELINES_URL).catch(() => undefined) }

export default function MyReviewsScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  // A notification links here as review=application-12-recruitment (the website's ?review=).
  const { review: wanted, from } = useLocalSearchParams<{ review?: string; from?: string }>()

  const [writing, setWriting] = useState<ReviewAction | null>(null)
  const [editing, setEditing] = useState<OwnReview | null>(null)

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: MY_REVIEWS_KEY,
    queryFn: () => seekerService.getMyReviews(),
  })
  const actions = useMemo(() => openActions(data?.opportunities), [data])
  const reviews = useMemo(() => data?.reviews ?? [], [data])

  // Open that form (or their existing review) straight away, like the website does.
  const requested = useMemo(() => (data ? resolveReviewKey(wanted, actions, reviews) : {}), [wanted, data, actions, reviews])
  const clearRequest = () => { if (wanted) router.setParams({ review: undefined }) }

  const writingTarget = writing ?? requested.action ?? null
  const editingReview = editing ?? requested.review ?? null

  const closeForms = () => {
    setWriting(null)
    setEditing(null)
    clearRequest()
  }

  const remove = useMutation({
    mutationFn: (id: number) => seekerService.removeReview(id),
    onSuccess: (res) => {
      showToast(res.message, 'success')
      queryClient.invalidateQueries({ queryKey: MY_REVIEWS_KEY })
      queryClient.invalidateQueries({ queryKey: ['seeker', 'employer-reviews'] })
      queryClient.invalidateQueries({ queryKey: ['seeker', 'employer-ratings'] })
    },
    onError: (caught) => showToast(apiErrorMessage(caught, 'The review could not be removed.'), 'error'),
  })

  const confirmRemove = (review: OwnReview) => {
    Alert.alert(
      'Take back this review?',
      `Your review of ${review.employer?.name ?? 'this employer'} will be removed from the company profile. You can write a new one later.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take back review', style: 'destructive', onPress: () => remove.mutate(review.id) },
      ],
    )
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title="My Reviews" onBack={() => router.replace(backTargetFor(from) as never)} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.info} />}
      >
        <Text style={styles.kicker}>Verified reviews</Text>
        <Text style={styles.intro}>
          Help other job seekers by rating employers you&apos;ve applied to or worked for. Only people with a real application or job through i-PESO can review, and your name is never shown.
        </Text>

        <QueryState
          isLoading={isLoading}
          error={error}
          errorFallback="Your reviews could not be loaded."
          onRetry={() => refetch()}
        >
          <Text style={styles.sectionTitle} accessibilityRole="header">
            Ready to review <Text style={styles.count}>({actions.length})</Text>
          </Text>
          {actions.length === 0 ? (
            <View style={styles.dashedBox}>
              <Text style={styles.mutedText}>
                Nothing to review right now. You can rate an employer once they respond to your application, or once you start a job you got through i-PESO.
              </Text>
            </View>
          ) : (
            actions.map((action) => (
              <Card key={action.key} padding="md" style={styles.itemCard}>
                <View style={styles.actionRow}>
                  <View style={styles.iconBadge}>
                    <MaterialIcons name="business" size={20} color={colors.blue700} />
                  </View>
                  <View style={styles.flexText}>
                    <Text style={styles.employerName} numberOfLines={1}>{action.employerName}</Text>
                    <Text style={styles.meta} numberOfLines={2}>
                      {action.jobTitle} · {action.type === 'employment' ? 'Employment experience' : action.limited ? 'No response from employer' : 'Recruitment experience'}
                    </Text>
                  </View>
                </View>
                <Button size="sm" onPress={() => setWriting(action)} style={styles.rateButton}>
                  {action.type === 'employment' ? 'Rate workplace' : 'Rate hiring'}
                </Button>
              </Card>
            ))
          )}

          <EmployerFeedbackSection items={data?.employer_feedback ?? []} />

          <Text style={[styles.sectionTitle, styles.sectionGap]} accessibilityRole="header">
            Your reviews <Text style={styles.count}>({reviews.length})</Text>
          </Text>
          {reviews.length === 0 ? (
            <EmptyState icon="star-outline" title="No reviews yet" message="Reviews you write will appear here. You can edit or take them back anytime." />
          ) : (
            reviews.map((review) => (
              <OwnReviewCard
                key={review.id}
                review={review}
                removing={remove.isPending && remove.variables === review.id}
                onEdit={() => setEditing(review)}
                onRemove={() => confirmRemove(review)}
              />
            ))
          )}
        </QueryState>
      </ScrollView>

      {writingTarget ? (
        <ReviewFormSheet key={`write-${writingTarget.key}`} target={writingTarget} onClose={closeForms} />
      ) : editingReview ? (
        <ReviewFormSheet key={`edit-${editingReview.id}`} existing={editingReview} onClose={closeForms} />
      ) : null}
    </View>
  )
}

function OwnReviewCard({ review, removing, onEdit, onRemove }: { review: OwnReview; removing: boolean; onEdit: () => void; onRemove: () => void }) {
  const status = STATUS[review.status] ?? STATUS.published
  const average = review.average ?? 0

  return (
    <Card padding="md" style={styles.itemCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.flexText}>
          <Text style={styles.employerName}>{review.employer?.name}</Text>
          <Text style={styles.meta}>
            {review.job_title ? `${review.job_title} · ` : ''}{review.type === 'employment' ? 'Employment experience' : 'Recruitment experience'} · {review.month}{review.edited ? ' · edited' : ''}
          </Text>
        </View>
        <Badge variant={status.variant}>{status.label}</Badge>
      </View>

      <View style={styles.ratingRow}>
        <View style={styles.inline}>
          <Stars value={average} />
          <Text style={styles.average}>{average.toFixed(1)}</Text>
        </View>
        <Text style={styles.bodyText}>{review.recommend ? 'Would recommend' : "Wouldn't recommend"}</Text>
      </View>
      {review.comment ? <Text style={[styles.bodyText, styles.comment]}>{review.comment}</Text> : null}

      {review.status === 'held' && review.hold_reason ? (
        <AlertBox variant="info" icon={false} style={styles.note}>
          PESO will check this review before it appears: {review.hold_reason.toLowerCase()}.
        </AlertBox>
      ) : null}
      {review.status === 'hidden' ? (
        <AlertBox variant="danger" icon={false} style={styles.note}>
          PESO hid this review{review.moderation_note ? `: ${review.moderation_note}` : '.'} You can edit it and PESO will check it again.
        </AlertBox>
      ) : null}
      {review.reply ? (
        <View style={styles.reply}>
          <View style={styles.inline}>
            <MaterialIcons name="reply" size={14} color={colors.textSecondary} />
            <Text style={styles.replyTitle}>Reply from {review.employer?.name}</Text>
          </View>
          <Text style={[styles.bodyText, styles.replyBody]}>{review.reply.body}</Text>
        </View>
      ) : null}

      <View style={styles.reviewActions}>
        <Button size="sm" variant="outline" onPress={onEdit} disabled={removing}>Edit</Button>
        <Button size="sm" variant="ghost" onPress={onRemove} loading={removing} textStyle={styles.takeBack}>
          Take back
        </Button>
      </View>
    </Card>
  )
}

/**
 * What employers privately said about this job seeker. Only they and PESO can read it,
 * and it opens once they've reviewed that workplace (or after the waiting period).
 */
function EmployerFeedbackSection({ items }: { items: EmployerFeedbackItem[] }) {
  if (!items.length) return null

  return (
    <View>
      <Text style={[styles.sectionTitle, styles.sectionGap]} accessibilityRole="header">Feedback from employers</Text>
      <View style={[styles.inline, styles.privateNote]}>
        <MaterialIcons name="lock" size={16} color={colors.textSecondary} />
        <Text style={[styles.bodyText, styles.flexText]}>Private: only you and PESO can see this. It is never shown to other employers.</Text>
      </View>
      {items.map((item) => (
        <Card key={item.id} padding="md" style={styles.itemCard}>
          <Text style={styles.employerName}>{item.employer?.name}</Text>
          {item.job_title ? <Text style={styles.meta}>{item.job_title}</Text> : null}
          {item.locked ? (
            <View style={styles.lockedBox}>
              <Text style={styles.bodyText}>
                {item.employer?.name} left feedback about you. Review this workplace to read it now, or it opens on {formatReviewDate(item.visible_from)}.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.feedbackRatings}>
                {item.ratings?.map((rating) => (
                  <View key={rating.key} style={styles.feedbackRating}>
                    <Text style={[styles.bodyText, styles.flexText]}>{rating.label}</Text>
                    <View style={styles.inline}>
                      <Stars value={rating.value} />
                      <Text style={styles.average}>{rating.value}</Text>
                    </View>
                  </View>
                ))}
              </View>
              <Text style={[styles.bodyText, styles.comment]}>
                Would hire you again: <Text style={styles.strong}>{item.would_rehire}</Text>
              </Text>
              {item.comment ? <Text style={[styles.bodyText, styles.comment]}>{item.comment}</Text> : null}
              <Text style={[styles.meta, styles.comment]}>
                Think something here is unfair or not about your work? Tell PESO at the office; staff can remove feedback that breaks the{' '}
                <Text style={styles.link} onPress={openGuidelines} accessibilityRole="link">guidelines</Text>.
              </Text>
            </>
          )}
        </Card>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  kicker: { ...textStyles.label, color: colors.secondary, textTransform: 'uppercase', letterSpacing: 1 },
  intro: { ...textStyles.small, color: colors.textSecondary, lineHeight: 18, marginTop: spacing.xs, marginBottom: spacing.lg },
  sectionTitle: { ...textStyles.title, color: colors.textPrimary, marginBottom: spacing.md },
  sectionGap: { marginTop: spacing.xl },
  count: { color: colors.subtle },
  dashedBox: { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong, borderRadius: radii.lg, padding: spacing.lg, backgroundColor: colors.surface },
  mutedText: { ...textStyles.small, color: colors.textSecondary, lineHeight: 18 },
  itemCard: { marginBottom: spacing.md },
  actionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  iconBadge: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.blue50, alignItems: 'center', justifyContent: 'center' },
  flexText: { flex: 1 },
  employerName: { ...textStyles.bodyBold, color: colors.textPrimary },
  meta: { ...textStyles.small, color: colors.textSecondary, marginTop: 2 },
  rateButton: { marginTop: spacing.md, alignSelf: 'flex-start' },
  reviewHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  ratingRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: spacing.xl, rowGap: spacing.xs, marginTop: spacing.md },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  average: { ...textStyles.smallBold, color: colors.textPrimary },
  bodyText: { ...textStyles.small, color: colors.textPrimary, lineHeight: 18 },
  comment: { marginTop: spacing.sm },
  strong: { ...textStyles.smallBold, color: colors.textPrimary },
  note: { marginTop: spacing.md, padding: spacing.md },
  reply: { marginTop: spacing.md, borderLeftWidth: 4, borderLeftColor: colors.borderStrong, backgroundColor: colors.sunken, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  replyTitle: { ...textStyles.smallBold, color: colors.textSecondary },
  replyBody: { marginTop: spacing.xs },
  reviewActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  takeBack: { ...textStyles.smallBold, color: colors.error },
  privateNote: { alignItems: 'flex-start', marginBottom: spacing.md },
  lockedBox: { marginTop: spacing.md, backgroundColor: colors.sunken, borderRadius: radii.md, padding: spacing.md },
  feedbackRatings: { marginTop: spacing.md, gap: spacing.sm },
  feedbackRating: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  link: { ...textStyles.smallBold, color: colors.secondary, textDecorationLine: 'underline' },
})

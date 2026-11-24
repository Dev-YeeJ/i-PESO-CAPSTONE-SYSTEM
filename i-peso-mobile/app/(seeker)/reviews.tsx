import { useMemo, useState } from 'react'
import { Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import type { EmployerFeedbackItem, OwnReview, ReviewStatus } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { apiErrorMessage } from '@/utils/apiError'
import { groupActionsByCompany, MY_REVIEWS_KEY, openActions, resolveReviewKey, REVIEW_GUIDELINES_URL, type ReviewAction } from '@/utils/reviews'
import { companyLogoUrl } from '@/utils/companyLogoUrl'
import { CompanyLogo } from '@/components/seeker/CompanyLogo'
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

const COMPANIES_SHOWN = 4

const formatDate = (value: string) => new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })

/** The average of an employer's star ratings, or null when there are none. */
const overall = (ratings: { value: number | null }[] = []) => {
  const values = ratings.map((rating) => Number(rating.value)).filter(Boolean)
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
}

/** A company's name that opens its page (plain text when the id is unknown), as on the website. */
function CompanyName({ employer, numberOfLines = 1 }: { employer: { id?: number | null; name?: string | null } | null | undefined; numberOfLines?: number }) {
  const router = useRouter()
  const name = employer?.name ?? 'Company'
  if (!employer?.id) return <Text style={styles.employerName} numberOfLines={numberOfLines}>{name}</Text>
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/(seeker)/employers/[id]', params: { id: String(employer.id), from: 'reviews' } })}
      accessibilityRole="link"
      accessibilityLabel={`${name}, open company page`}
      hitSlop={6}
    >
      <Text style={[styles.employerName, styles.companyLink]} numberOfLines={numberOfLines}>{name}</Text>
    </Pressable>
  )
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
  const insets = useSafeAreaInsets()
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
        contentContainerStyle={[styles.content, { paddingBottom: spacing.xxxl + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.info} />}
      >
        <Text style={styles.kicker}>Verified reviews</Text>
        <Text style={styles.intro}>
          Review a company&apos;s hiring process once you apply, one review per job. Only people with a real application through i-PESO can review, and your name is never shown.
        </Text>

        <QueryState
          isLoading={isLoading}
          error={error}
          errorFallback="Your reviews could not be loaded."
          onRetry={() => refetch()}
        >
          <ReadyToReview actions={actions} onReview={setWriting} />

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
        <CompanyLogo uri={companyLogoUrl(review.employer?.logo)} name={review.employer?.name} size={40} />
        <View style={styles.flexText}>
          <CompanyName employer={review.employer} numberOfLines={2} />
          <Text style={styles.meta}>
            {review.job_title ? `${review.job_title} · ` : ''}{review.type === 'employment' ? 'Working here' : 'Hiring process'} · {review.month}{review.edited ? ' · edited' : ''}
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

/** What employers privately said about this job seeker. Only they and PESO can read it, and it shows straight away. */
function EmployerFeedbackSection({ items }: { items: EmployerFeedbackItem[] }) {
  if (!items.length) return null

  return (
    <View>
      <Text style={[styles.sectionTitle, styles.sectionGap]} accessibilityRole="header">Feedback from employers</Text>
      <View style={[styles.inline, styles.privateNote]}>
        <MaterialIcons name="lock" size={16} color={colors.textSecondary} />
        <Text style={[styles.bodyText, styles.flexText]}>Only you and PESO can read the comments. Employers you apply to see only your average rating.</Text>
      </View>
      {items.map((item) => {
        const score = overall(item.ratings ?? [])
        return (
        <Card key={item.id} padding="md" style={styles.itemCard}>
          <View style={styles.reviewHeader}>
            <CompanyLogo uri={companyLogoUrl(item.employer?.logo)} name={item.employer?.name} size={40} />
            <View style={styles.flexText}>
              <CompanyName employer={item.employer} />
              <Text style={styles.meta}>{[item.job_title, item.updated_at ? formatDate(item.updated_at) : null].filter(Boolean).join(' · ')}</Text>
            </View>
            {score ? (
              <View style={styles.inline} accessibilityLabel={`Overall ${score.toFixed(1)} out of 5`}>
                <Stars value={score} />
                <Text style={styles.scoreText}>{score.toFixed(1)}</Text>
              </View>
            ) : null}
          </View>
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
          {item.comment ? <Text style={[styles.bodyText, styles.quote]}>{item.comment}</Text> : null}
        </Card>
        )
      })}
      <Text style={styles.meta}>
        Think something here is unfair or not about your work? Tell PESO at the office; staff can remove feedback that breaks the{' '}
        <Text style={styles.link} onPress={openGuidelines} accessibilityRole="link">guidelines</Text>.
      </Text>
    </View>
  )
}

/** Jobs the seeker can review, one card per company with each job under it (mirrors the website). */
function ReadyToReview({ actions, onReview }: { actions: ReviewAction[]; onReview: (action: ReviewAction) => void }) {
  const [showAll, setShowAll] = useState(false)
  const companies = useMemo(() => groupActionsByCompany(actions), [actions])
  const shown = showAll ? companies : companies.slice(0, COMPANIES_SHOWN)

  return (
    <View>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        Ready to review <Text style={styles.count}>({actions.length})</Text>
      </Text>
      {companies.length === 0 ? (
        <View style={styles.dashedBox}>
          <Text style={styles.mutedText}>
            Nothing to review right now. Every company you apply to through i-PESO appears here.
          </Text>
        </View>
      ) : (
        <>
          <Text style={[styles.mutedText, styles.readyIntro]}>PESO confirmed you applied to these employers. Rate how they handled your application.</Text>
          {shown.map((company) => (
            <Card key={String(company.employerId ?? company.employerName)} padding="md" style={styles.itemCard}>
              <View style={styles.actionRow}>
                <CompanyLogo uri={companyLogoUrl(company.employerLogo)} name={company.employerName} size={40} />
                <View style={styles.flexText}>
                  <CompanyName employer={{ id: company.employerId, name: company.employerName }} />
                  <Text style={styles.meta}>{company.jobs.length === 1 ? '1 job' : `${company.jobs.length} jobs`} to review</Text>
                </View>
              </View>
              {company.jobs.map((job) => (
                <View key={job.key} style={styles.jobRow}>
                  <Text style={[styles.bodyText, styles.flexText]} numberOfLines={2}>
                    {job.jobTitle ?? 'Job'} <Text style={styles.count}>· hiring process</Text>
                  </Text>
                  <Button size="sm" onPress={() => onReview(job)} accessibilityLabel={`Review ${company.employerName ?? 'company'}, ${job.jobTitle ?? 'job'}`}>
                    Review
                  </Button>
                </View>
              ))}
            </Card>
          ))}
          {companies.length > COMPANIES_SHOWN ? (
            <Button size="sm" variant="ghost" onPress={() => setShowAll((value) => !value)} style={styles.showAll}>
              {showAll ? 'Show fewer' : `Show all (${companies.length})`}
            </Button>
          ) : null}
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  kicker: { ...textStyles.label, color: colors.link, textTransform: 'uppercase', letterSpacing: 1 },
  intro: { ...textStyles.small, color: colors.textSecondary, lineHeight: 18, marginTop: spacing.xs, marginBottom: spacing.lg },
  sectionTitle: { ...textStyles.title, color: colors.textPrimary, marginBottom: spacing.md },
  sectionGap: { marginTop: spacing.xl },
  count: { color: colors.subtle },
  dashedBox: { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong, borderRadius: radii.lg, padding: spacing.lg, backgroundColor: colors.surface },
  mutedText: { ...textStyles.small, color: colors.textSecondary, lineHeight: 18 },
  itemCard: { marginBottom: spacing.md },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  readyIntro: { marginTop: -spacing.sm, marginBottom: spacing.md },
  jobRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  showAll: { alignSelf: 'flex-start', marginBottom: spacing.md },
  companyLink: { color: colors.link },
  scoreText: { ...textStyles.bodyBold, color: colors.textPrimary },
  quote: { marginTop: spacing.md, paddingLeft: spacing.md, borderLeftWidth: 4, borderLeftColor: colors.borderStrong, fontStyle: 'italic' },
  iconBadge: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
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
  feedbackRatings: { marginTop: spacing.md, gap: spacing.sm },
  feedbackRating: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  link: { ...textStyles.smallBold, color: colors.link, textDecorationLine: 'underline' },
})

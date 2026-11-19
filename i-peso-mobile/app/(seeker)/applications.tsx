import { useCallback, useMemo, useState } from 'react'
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { SeekerApplication, SeekerApplicationsResponse } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { apiErrorMessage } from '@/utils/apiError'
import { applicationNextStep, applicationStatusVariant, formatDate, formatInterviewMode, formatInterviewTime, interviewPhase, interviewPhaseText, jobCompany, jobLocation, textFrom, titleCase } from '@/utils/seekerView'
import { useMotion } from '@/hooks/useMotion'
import { useToast } from '@/stores/toastStore'
import { AlertBox } from '@/components/ui/AlertBox'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { EmptyState } from '@/components/ui/EmptyState'
import { PressableScale } from '@/components/ui/PressableScale'
import { JobCardSkeleton } from '@/components/ui/Skeleton'
import { CompanyLogo } from '@/components/seeker/CompanyLogo'
import { ApplicationReviewActions } from '@/components/reviews/ApplicationReviewActions'
import { colors, radii, shadows, spacing, textStyles, typography } from '@/theme'

// Redesigned Applied tab (Superdesign drafts "14 — Applied", "14b — Applied · Empty").

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'reviewed', label: 'Reviewed' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'interview', label: 'Interview' },
  { key: 'hired', label: 'Hired' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'withdrawn', label: 'Withdrawn' },
]

/** Four-step progress per status: Applied → Reviewed → Interview → Decision. */
const PROGRESS: Record<string, { steps: number; tone: 'blue' | 'ok' | 'closed'; label: string }> = {
  pending: { steps: 1, tone: 'blue', label: 'Applied · waiting for the employer to review' },
  reviewed: { steps: 2, tone: 'blue', label: 'Reviewed by the employer' },
  shortlisted: { steps: 2, tone: 'blue', label: 'Reviewed · you made the shortlist' },
  interview: { steps: 3, tone: 'blue', label: 'Interview stage' },
  hired: { steps: 4, tone: 'ok', label: 'Hired' },
  rejected: { steps: 4, tone: 'closed', label: 'Closed · not selected this time' },
  withdrawn: { steps: 0, tone: 'closed', label: 'You withdrew this application' },
}

const EMPTY_APPLICATIONS: SeekerApplication[] = []

export default function ApplicationsScreen() {
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [withdrawError, setWithdrawError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const {
    data: applicationsData,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useQuery({ queryKey: ['applications'], queryFn: () => seekerService.getApplications() })

  const applications = applicationsData?.applications ?? EMPTY_APPLICATIONS

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    applications.forEach((application) => {
      counts[application.status] = (counts[application.status] ?? 0) + 1
    })
    return counts
  }, [applications])

  const visibleApplications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return applications.filter((application) => {
      if (statusFilter && application.status !== statusFilter) return false
      if (!query) return true
      const title = textFrom(application.job?.job_title, '')
      const company = application.job ? jobCompany(application.job) : ''
      const location = application.job ? jobLocation(application.job) : ''
      return [title, company, location].some((value) => value.toLowerCase().includes(query))
    })
  }, [applications, statusFilter, searchQuery])

  const onRefresh = useCallback(() => { refetch() }, [refetch])

  const patchApplication = (applyId: number | string, patch: (a: SeekerApplication) => SeekerApplication) => {
    queryClient.setQueryData<SeekerApplicationsResponse>(['applications'], (current) =>
      current
        ? { ...current, applications: (current.applications ?? []).map((a) => (a.apply_id === applyId ? patch(a) : a)) }
        : current
    )
  }

  // Optimistic: the card shows "Withdrawn" at once; the server's copy replaces it on success,
  // and the previous list comes back if the request fails.
  const withdrawMutation = useMutation({
    mutationFn: (id: number | string) => seekerService.withdrawApplication(id),
    onMutate: async (id) => {
      setWithdrawError('')
      await queryClient.cancelQueries({ queryKey: ['applications'] })
      const previous = queryClient.getQueryData<SeekerApplicationsResponse>(['applications'])
      patchApplication(id, (a) => ({ ...a, status: 'withdrawn', status_label: 'Withdrawn', can_withdraw: false }))
      return { previous }
    },
    onSuccess: ({ application: withdrawn }) => {
      patchApplication(withdrawn.apply_id, () => withdrawn)
      queryClient.setQueryData(['application', String(withdrawn.apply_id)], withdrawn)
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      showToast('Application withdrawn.', 'success')
    },
    onError: (caught: unknown, _id, context) => {
      if (context?.previous) queryClient.setQueryData(['applications'], context.previous)
      setWithdrawError(apiErrorMessage(caught, 'Unable to withdraw this application.'))
    },
  })

  const confirmWithdraw = (application: SeekerApplication) => {
    Alert.alert(
      'Withdraw application?',
      `This will withdraw your application for ${textFrom(application.job?.job_title, 'this job')}. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Withdraw', style: 'destructive', onPress: () => withdrawMutation.mutate(application.apply_id) },
      ]
    )
  }

  const activeApplications = applications.filter((application) => !['hired', 'rejected', 'withdrawn'].includes(application.status)).length
  const hasApplications = applications.length > 0

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xs }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.secondary} colors={[colors.secondary]} />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.kicker}>APPLIED</Text>
        <Text style={styles.title} accessibilityRole="header">My applications</Text>
        {hasApplications ? (
          <Text style={styles.subtitle}>
            <Text style={styles.subtitleStrong}>{activeApplications} active</Text> of {applications.length} sent
          </Text>
        ) : null}

        {hasApplications ? (
          <>
            <View style={styles.search}>
              <MaterialIcons name="search" size={22} color={colors.subtle} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by job, company or place"
                placeholderTextColor={colors.subtle}
                accessibilityLabel="Search applications"
              />
              {searchQuery ? (
                <PressableScale scaleTo="buttonPress" ripple={null} onPress={() => setSearchQuery('')} style={styles.clearBtn} accessibilityRole="button" accessibilityLabel="Clear search">
                  <MaterialIcons name="close" size={18} color={colors.subtle} />
                </PressableScale>
              ) : null}
            </View>
            <ScrollView
              horizontal
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              showsHorizontalScrollIndicator={false}
              style={styles.chipScroll}
              contentContainerStyle={styles.chipRow}
            >
              {STATUS_TABS.map((tab) => {
                const count = tab.key === '' ? applications.length : (statusCounts[tab.key] ?? 0)
                if (tab.key && count === 0) return null
                return (
                  <Chip key={tab.key || 'all'} label={`${tab.label} · ${count}`} selected={statusFilter === tab.key} onPress={() => setStatusFilter(tab.key)} />
                )
              })}
            </ScrollView>
          </>
        ) : null}

        {withdrawError ? <AlertBox variant="danger" style={styles.alertBox}>{withdrawError}</AlertBox> : null}

        {isLoading ? (
          <View style={styles.list}>
            <JobCardSkeleton />
            <JobCardSkeleton />
            <JobCardSkeleton />
          </View>
        ) : error && !hasApplications ? (
          <EmptyState
            art="cloud"
            title="Couldn't load your applications"
            message="Check your connection, then try again."
            action={<Button variant="outline" size="sm" icon="refresh" onPress={() => refetch()}>Try again</Button>}
          />
        ) : !hasApplications ? (
          <EmptyState
            art="folder"
            title="Start applying"
            message="Pick a job that matches you and tap Apply now. You can follow every step from here."
            action={<Button size="md" icon="search" onPress={() => router.push('/(seeker)/jobs')}>Browse jobs</Button>}
          />
        ) : visibleApplications.length === 0 ? (
          <EmptyState
            art="search"
            title="No matching applications"
            message="Nothing matches this search or status."
            action={<Button variant="outline" size="sm" onPress={() => { setStatusFilter(''); setSearchQuery('') }}>Clear filters</Button>}
          />
        ) : (
          <View style={styles.list}>
            {visibleApplications.map((application, index) => (
              <ApplicationCard
                key={String(application.apply_id)}
                application={application}
                index={index}
                onWithdraw={() => confirmWithdraw(application)}
                withdrawing={withdrawMutation.isPending && withdrawMutation.variables === application.apply_id}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

function Progress({ status }: { status: string }) {
  const p = PROGRESS[status] ?? { steps: 1, tone: 'blue' as const, label: titleCase(status) }
  const fill = p.tone === 'ok' ? colors.successBorder : p.tone === 'closed' ? colors.borderStrong : colors.secondary
  return (
    <View style={styles.progress} accessible accessibilityLabel={`Progress: ${p.label}`}>
      <View style={styles.progressBars}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.progressBar, { backgroundColor: i < p.steps ? fill : colors.tintStrong }]} />
        ))}
      </View>
      <Text style={styles.progressLabel}>{p.label}</Text>
    </View>
  )
}

function ApplicationCard({
  application,
  index,
  onWithdraw,
  withdrawing,
}: {
  application: SeekerApplication
  index: number
  onWithdraw: () => void
  withdrawing: boolean
}) {
  const job = application.job
  const m = useMotion()
  const interview = application.interview
  const interviewEnded = interview ? interviewPhase(interview) === 'ended' : false
  const nextStep = applicationNextStep(application.status, interview)
  const match = Math.round(Number(application.match_percentage ?? 0))
  const open = () => router.push(`/(seeker)/applications/${application.apply_id}`)

  return (
    <Animated.View entering={m.enabled ? FadeInUp.delay(m.stagger(index)).duration(m.duration('normal')) : undefined}>
      <PressableScale
        scaleTo="cardPress"
        ripple={null}
        onPress={open}
        style={styles.card}
        accessibilityRole="button"
        accessibilityLabel={`${textFrom(job?.job_title, 'Application')}, ${application.status_label ?? titleCase(application.status)}. View details`}
      >
        <View style={styles.cardHead}>
          <CompanyLogo uri={job?.employer?.company_logo_url} name={job ? jobCompany(job) : null} size={44} />
          <View style={styles.flexOne}>
            <Text style={styles.jobTitle} numberOfLines={2}>{textFrom(job?.job_title, 'Untitled job')}</Text>
            <Text style={styles.company} numberOfLines={1}>{job ? jobCompany(job) : 'Employer not listed'}</Text>
          </View>
          <Badge variant={applicationStatusVariant(application.status)}>{application.status_label ?? titleCase(application.status)}</Badge>
        </View>

        <Progress status={application.status} />

        {interview && application.status === 'interview' && !interviewEnded ? (
          <View style={styles.interviewBox}>
            <MaterialIcons name="event-available" size={20} color={colors.link} />
            <View style={styles.flexOne}>
              <Text style={styles.interviewWhen}>{formatInterviewTime(interview.schedule)} · {interviewPhaseText(interview)}</Text>
              <Text style={styles.interviewWhere} numberOfLines={2}>
                {formatInterviewMode(interview.mode_of_interview)} · {textFrom(interview.venue_or_link, 'Venue or link to follow')}
              </Text>
            </View>
          </View>
        ) : null}

        {interview && interviewEnded ? (
          <AlertBox variant="info" title={interviewPhaseText(interview)} style={styles.inlineAlert}>
            {`${formatInterviewMode(interview.mode_of_interview)} on ${formatInterviewTime(interview.schedule)}\nThe employer will update this application with their decision.`}
          </AlertBox>
        ) : nextStep && application.status !== 'interview' ? (
          <Text style={styles.nextStep}>{nextStep}</Text>
        ) : null}

        {application.placement ? (
          <AlertBox variant="success" title="Placement recorded" style={styles.inlineAlert}>
            {`Start date: ${formatDate(application.placement.start_date)}\nSalary: ₱${Number(application.placement.salary ?? 0).toLocaleString()}`}
          </AlertBox>
        ) : null}

        {application.employer_remarks ? (
          <View style={styles.remarks}>
            <Text style={styles.remarksLabel}>EMPLOYER REMARKS</Text>
            <Text style={styles.remarksText}>{application.employer_remarks}</Text>
          </View>
        ) : null}

        <View style={styles.cardFoot}>
          <Text style={styles.meta}>
            Applied {formatDate(application.applied_at)} · Match <Text style={styles.matchFigure}>{match}%</Text>
          </Text>
          <MaterialIcons name="chevron-right" size={22} color={colors.subtle} />
        </View>

        {application.can_withdraw ? (
          <Button variant="outline" size="sm" onPress={onWithdraw} disabled={withdrawing} style={styles.withdrawBtn} textStyle={styles.withdrawText}>
            {withdrawing ? 'Withdrawing…' : 'Withdraw application'}
          </Button>
        ) : null}
        <ApplicationReviewActions applicationId={application.apply_id} />
      </PressableScale>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  flexOne: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl },
  kicker: { ...textStyles.label, color: colors.link },
  title: { ...textStyles.display, color: colors.textPrimary, marginTop: 2 },
  subtitle: { ...textStyles.body, color: colors.textSecondary, marginTop: spacing.xs },
  subtitleStrong: { fontFamily: typography.family.bold, color: colors.textPrimary },

  search: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.sunken,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    marginTop: spacing.lg,
  },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 15, fontFamily: typography.family.medium, paddingVertical: 0 },
  clearBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  chipScroll: { marginHorizontal: -spacing.lg, marginTop: spacing.md },
  chipRow: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  alertBox: { marginTop: spacing.md },

  list: { gap: spacing.md, marginTop: spacing.lg },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: spacing.lg, ...shadows.sm },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  jobTitle: { ...textStyles.bodyBold, fontSize: 16, lineHeight: 22, color: colors.textPrimary },
  company: { ...textStyles.small, fontSize: 13, lineHeight: 18, color: colors.textSecondary, marginTop: 2 },

  progress: { marginTop: spacing.md },
  progressBars: { flexDirection: 'row', gap: spacing.xs },
  progressBar: { flex: 1, height: 5, borderRadius: radii.pill },
  progressLabel: { ...textStyles.small, color: colors.textSecondary, marginTop: spacing.xs + 2 },

  interviewBox: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm + 2, marginTop: spacing.md, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.tint },
  interviewWhen: { ...textStyles.smallBold, color: colors.textPrimary },
  interviewWhere: { ...textStyles.small, color: colors.textSecondary, marginTop: 2 },
  nextStep: { ...textStyles.small, lineHeight: 18, color: colors.textSecondary, marginTop: spacing.sm },
  inlineAlert: { marginTop: spacing.md },
  remarks: { marginTop: spacing.md, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.sunken },
  remarksLabel: { ...textStyles.label, color: colors.subtle },
  remarksText: { ...textStyles.small, lineHeight: 18, color: colors.textPrimary, marginTop: spacing.xs },

  cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  meta: { ...textStyles.small, color: colors.subtle, flexShrink: 1 },
  matchFigure: { fontFamily: typography.family.display, fontSize: 14, color: colors.figure },
  withdrawBtn: { marginTop: spacing.md, borderColor: colors.errorBorder },
  withdrawText: { color: colors.error },
})

import { useCallback, useMemo, useState } from 'react'
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import type { SeekerApplication, SeekerApplicationsResponse } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { apiErrorMessage } from '@/utils/apiError'
import { applicationNextStep, applicationStatusVariant, formatDate, formatInterviewMode, formatInterviewTime, formatSalary, interviewPhase, interviewPhaseText, jobCompany, jobLocation, seekerName, textFrom, titleCase } from '@/utils/seekerView'
import { useMotion } from '@/hooks/useMotion'
import { useToast } from '@/stores/toastStore'
import { AlertBox } from '@/components/ui/AlertBox'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PressableScale } from '@/components/ui/PressableScale'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton'
import { ApplicationReviewActions } from '@/components/reviews/ApplicationReviewActions'
import { colors, radii, spacing, typography } from '@/theme'

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

const EMPTY_APPLICATIONS: SeekerApplication[] = []

export default function ApplicationsScreen() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [withdrawError, setWithdrawError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const { data: profile } = useQuery({ queryKey: ['seekerProfile'], queryFn: () => seekerService.getProfile() })
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

  const withdrawMutation = useMutation({
    mutationFn: (id: number | string) => seekerService.withdrawApplication(id),
    onSuccess: ({ application: withdrawn }) => {
      setWithdrawError('')
      queryClient.setQueryData<SeekerApplicationsResponse>(['applications'], (current) =>
        current
          ? {
              ...current,
              applications: (current.applications ?? []).map((application) =>
                application.apply_id === withdrawn.apply_id ? withdrawn : application
              ),
            }
          : current
      )
      queryClient.setQueryData(['application', String(withdrawn.apply_id)], withdrawn)
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      showToast('Application withdrawn.', 'success')
    },
    onError: (caught: unknown) => {
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

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.info} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>Application Activity</Text>
        <Text style={styles.title}>My Applications</Text>
        <Text style={styles.subtitle}>
          Track submitted jobs, employer updates, interviews, and placements from i-PESO.
        </Text>

        {isLoading ? (
          <ScreenSkeleton label="Loading activity" />
        ) : null}

        {error ? (
          <AlertBox variant="danger" style={styles.alertBox}>
            Unable to load application activity. Check the backend connection.
          </AlertBox>
        ) : null}

        {withdrawError ? (
          <AlertBox variant="danger" style={styles.alertBox}>
            {withdrawError}
          </AlertBox>
        ) : null}

        <Card style={styles.summaryCard} padding="md">
          <Text style={styles.summaryLabel}>{seekerName(profile)}</Text>
          <Text style={styles.summaryTitle}>
            {applications.length
              ? `${activeApplications} active of ${applications.length} submitted`
              : 'No applications submitted yet'}
          </Text>
          <Text style={styles.summaryText}>
            Employers can move your application from pending review to interview, hired, or rejected.
          </Text>
        </Card>

        {applications.length > 0 ? (
          <>
            <TextInput
              style={styles.search}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by job title, company, or location..."
              placeholderTextColor={colors.subtle}
              accessibilityLabel="Search applications"
            />
            <View style={styles.chipWrapper}>
              <ScrollView
                horizontal
                nestedScrollEnabled
                directionalLockEnabled
                keyboardShouldPersistTaps="handled"
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipScrollContent}
              >
                {STATUS_TABS.map((tab) => {
                  const count = tab.key === '' ? applications.length : (statusCounts[tab.key] ?? 0)
                  if (tab.key && count === 0) return null
                  const active = statusFilter === tab.key
                  return (
                    <PressableScale
                      key={tab.key || 'all'}
                      onPress={() => setStatusFilter(tab.key)}
                      style={[styles.chip, active && styles.chipActive]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                        {tab.label} ({count})
                      </Text>
                    </PressableScale>
                  )
                })}
              </ScrollView>
            </View>
          </>
        ) : null}

        <SectionHeader title="Application History" />

        {!isLoading && !applications.length ? (
          <EmptyState
            icon="work-outline"
            title="Start Applying"
            message="Open Find Jobs, choose a matching vacancy, and tap Apply now. Your application will appear here and on the employer ATS board."
            action={
              <Button variant="outline" fullWidth onPress={() => router.push('/(seeker)/jobs')}>
                Find jobs
              </Button>
            }
          />
        ) : null}

        {!isLoading && applications.length > 0 && visibleApplications.length === 0 ? (
          <EmptyState
            icon="search-off"
            title="No Matching Applications"
            message="No applications match your current filter or search criteria."
            action={
              <Button variant="outline" fullWidth onPress={() => { setStatusFilter(''); setSearchQuery('') }}>
                Clear filters
              </Button>
            }
          />
        ) : null}

        {visibleApplications.map((application, index) => (
          <ApplicationCard
            key={String(application.apply_id)}
            application={application}
            index={index}
            onWithdraw={() => confirmWithdraw(application)}
            withdrawing={withdrawMutation.isPending && withdrawMutation.variables === application.apply_id}
          />
        ))}
      </ScrollView>
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

  return (
    <Animated.View entering={m.enabled ? FadeInUp.delay(m.stagger(index)).duration(240) : undefined}>
      <PressableScale
        scaleTo="cardPress"
        ripple={null}
        onPress={() => router.push(`/(seeker)/applications/${application.apply_id}`)}
        accessibilityRole="button"
        accessibilityLabel={`View details for ${textFrom(job?.job_title, 'this application')}`}
      >
        <Card style={styles.applicationCard} padding="md">
          <View style={styles.applicationHeader}>
            {job?.employer?.company_logo_url ? (
              <Image source={{ uri: job.employer.company_logo_url }} style={styles.employerLogo} />
            ) : null}
            <View style={styles.applicationTitleWrap}>
              <Text style={styles.jobTitle}>{textFrom(job?.job_title, 'Untitled job')}</Text>
              <Text style={styles.company}>{job ? jobCompany(job) : 'Employer not listed'}</Text>
            </View>
            <Badge variant={applicationStatusVariant(application.status)} style={styles.statusBadge}>
              {application.status_label ?? titleCase(application.status)}
            </Badge>
          </View>

          <View style={styles.jobMetaContainer}>
            {job ? <Text style={styles.meta}>{jobLocation(job)}</Text> : null}
            {job ? <Text style={styles.meta}>•</Text> : null}
            {job ? <Text style={styles.meta}>{formatSalary(job)}</Text> : null}
          </View>

          <View style={styles.detailGrid}>
            <Detail label="Applied" value={formatDate(application.applied_at)} />
            <Detail label="Match" value={`${Math.round(Number(application.match_percentage ?? 0))}%`} />
          </View>

          {applicationNextStep(application.status, application.interview) ? (
            <View style={styles.nextStepBox}>
              <Text style={styles.nextStepTitle}>What&apos;s next</Text>
              <Text style={styles.nextStepText}>{applicationNextStep(application.status, application.interview)}</Text>
            </View>
          ) : null}

          {application.interview && interviewPhase(application.interview) === 'ended' ? (
            <AlertBox variant="info" title={interviewPhaseText(application.interview)} style={styles.infoAlert}>
              {`${formatInterviewMode(application.interview.mode_of_interview)} on ${formatInterviewTime(application.interview.schedule)}\nThe employer will update this application with their decision.`}
            </AlertBox>
          ) : application.interview && application.status === 'interview' ? (
            <AlertBox variant="warning" title={`Interview Schedule · ${interviewPhaseText(application.interview)}`} style={styles.infoAlert}>
              {`${formatInterviewMode(application.interview.mode_of_interview)}\n${formatInterviewTime(application.interview.schedule)}\n${textFrom(application.interview.venue_or_link, 'Venue or link to follow')}`}
            </AlertBox>
          ) : null}

          {application.placement ? (
            <AlertBox variant="success" title="Placement Captured" style={styles.infoAlert}>
              {`Start date: ${formatDate(application.placement.start_date)}\nSalary: PHP ${Number(application.placement.salary ?? 0).toLocaleString()}`}
            </AlertBox>
          ) : null}

          {application.employer_remarks ? (
            <View style={styles.noteBox}>
              <Text style={styles.noteTitle}>Employer Remarks</Text>
              <Text style={styles.noteText}>{application.employer_remarks}</Text>
            </View>
          ) : null}

          <View style={styles.cardActions}>
            <Button variant="outline" size="sm" onPress={() => router.push(`/(seeker)/applications/${application.apply_id}`)} style={styles.cardActionBtn}>
              View details
            </Button>
            {application.can_withdraw ? (
              <Button variant="danger" size="sm" onPress={onWithdraw} disabled={withdrawing} style={styles.cardActionBtn}>
                {withdrawing ? 'Withdrawing...' : 'Withdraw'}
              </Button>
            ) : null}
          </View>
          <ApplicationReviewActions applicationId={application.apply_id} />
        </Card>
      </PressableScale>
    </Animated.View>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxxl },
  kicker: { color: colors.secondary, fontSize: typography.small, fontFamily: typography.family.bold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.xs },
  title: { color: colors.textPrimary, fontSize: typography.heading, fontFamily: typography.family.medium, marginBottom: spacing.xs },
  subtitle: { color: colors.textSecondary, fontSize: typography.body, lineHeight: 20, marginBottom: spacing.lg },
  statusCard: { marginBottom: spacing.lg, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  statusMessageCard: { borderColor: colors.border, backgroundColor: colors.surface },
  loadingText: { color: colors.textSecondary, fontSize: typography.small, fontFamily: typography.family.medium, marginTop: spacing.xs },
  alertBox: { marginBottom: spacing.lg },
  summaryCard: { marginBottom: spacing.lg },
  summaryLabel: { color: colors.secondary, fontSize: typography.small, fontFamily: typography.family.bold, marginBottom: spacing.xs },
  summaryTitle: { color: colors.textPrimary, fontSize: typography.heading, fontFamily: typography.family.bold, marginBottom: spacing.xs },
  summaryText: { color: colors.textSecondary, fontSize: typography.body, lineHeight: 20 },
  applicationCard: { marginBottom: spacing.sm },
  applicationHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  employerLogo: { width: 48, height: 48, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, resizeMode: 'contain' },
  applicationTitleWrap: { flex: 1 },
  jobTitle: { color: colors.textPrimary, fontSize: typography.title, lineHeight: 22, fontFamily: typography.family.bold },
  company: { color: colors.textSecondary, fontSize: typography.small, fontFamily: typography.family.medium, marginTop: spacing.xs },
  statusBadge: { alignSelf: 'flex-start', paddingVertical: 0, paddingHorizontal: spacing.sm },
  jobMetaContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  meta: { color: colors.textSecondary, fontSize: typography.small, lineHeight: 18 },
  detailGrid: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  detailItem: { flex: 1, backgroundColor: colors.background, borderRadius: radii.md, padding: spacing.sm },
  detailLabel: { color: colors.textSecondary, fontSize: typography.small, fontFamily: typography.family.bold, textTransform: 'uppercase', marginBottom: spacing.xs },
  detailValue: { color: colors.textPrimary, fontSize: typography.body, fontFamily: typography.family.medium },
  infoAlert: { marginTop: spacing.md },
  nextStepBox: { backgroundColor: colors.infoBackground, borderWidth: 1, borderColor: colors.infoBorder, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.md },
  nextStepTitle: { color: colors.info, fontSize: typography.small, fontFamily: typography.family.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  nextStepText: { color: colors.textPrimary, fontSize: typography.small, lineHeight: 20, marginTop: spacing.xs },
  noteBox: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.md },
  noteTitle: { color: colors.textPrimary, fontSize: typography.body, fontFamily: typography.family.bold, marginBottom: spacing.xs },
  noteText: { color: colors.textSecondary, fontSize: typography.small, lineHeight: 20 },
  cardActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  cardActionBtn: { flex: 1, marginBottom: 0 },
  search: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  chipWrapper: { marginHorizontal: -spacing.lg, marginBottom: spacing.sm },
  chipScrollContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, gap: spacing.xs, flexDirection: 'row', alignItems: 'center' },
  chip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: typography.small,
    fontFamily: typography.family.medium,
  },
  chipTextActive: {
    color: colors.surface,
    fontFamily: typography.family.bold,
  },
})

import { useCallback, useState } from 'react'
import {  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import type { SeekerApplication, SeekerApplicationsResponse } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { apiErrorMessage } from '@/utils/apiError'
import { applicationStatusVariant, formatDate, formatSalary, jobCompany, jobLocation, seekerName, textFrom, titleCase } from '@/utils/seekerView'
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
import { colors, radii, spacing, typography } from '@/theme'

export default function ApplicationsScreen() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [withdrawError, setWithdrawError] = useState('')

  const { data: profile } = useQuery({ queryKey: ['seekerProfile'], queryFn: () => seekerService.getProfile() })
  const {
    data: applicationsData,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useQuery({ queryKey: ['applications'], queryFn: () => seekerService.getApplications() })

  const applications = applicationsData?.applications ?? []

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

        {applications.map((application, index) => (
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

          {application.interview ? (
            <AlertBox variant="warning" title="Interview Schedule" style={styles.infoAlert}>
              {`${titleCase(application.interview.mode_of_interview, 'Interview')}\n${formatDate(application.interview.schedule)}\n${textFrom(application.interview.venue_or_link, 'Venue or link to follow')}`}
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
  noteBox: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.md },
  noteTitle: { color: colors.textPrimary, fontSize: typography.body, fontFamily: typography.family.bold, marginBottom: spacing.xs },
  noteText: { color: colors.textSecondary, fontSize: typography.small, lineHeight: 20 },
  cardActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  cardActionBtn: { flex: 1, marginBottom: 0 },
})

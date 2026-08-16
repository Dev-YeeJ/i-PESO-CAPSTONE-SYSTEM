import { useCallback } from 'react'
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { SeekerApplication } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { formatDate, formatSalary, jobCompany, jobLocation, seekerName, textFrom, titleCase } from '@/utils/seekerView'
import { AlertBox } from '@/components/ui/AlertBox'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { colors, radii, spacing, typography } from '@/theme'

type StatusBadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

export default function ApplicationsScreen() {
  const queryClient = useQueryClient()

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
    onError: () => Alert.alert('Unable to withdraw', 'Please check your connection and try again.'),
  })

  const confirmWithdraw = (application: SeekerApplication) => {
    Alert.alert(
      'Withdraw application?',
      `This will withdraw your application for ${textFrom(application.job?.job_title, 'this job')}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Withdraw', style: 'destructive', onPress: () => withdrawMutation.mutate(application.apply_id) },
      ]
    )
  }

  const activeApplications = applications.filter((application) => !['hired', 'rejected', 'withdrawn'].includes(application.status)).length
  const hiredApplications = applications.filter((application) => application.status === 'hired').length
  const savedCount = profile?.dashboard_stats?.saved_jobs?.length ?? 0
  const strength = profile?.profile_strength?.percentage ?? 0

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
          <Card style={[styles.statusCard, styles.statusMessageCard]} padding="md">
            <ActivityIndicator color={colors.info} />
            <Text style={styles.loadingText}>Loading activity...</Text>
          </Card>
        ) : null}

        {error ? (
          <AlertBox variant="danger" style={styles.alertBox}>
            Unable to load application activity. Check the backend connection.
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

        <SectionHeader title="Overview" />
        <View style={styles.statsRow}>
          <StatCard title="Active" value={activeApplications} />
          <StatCard title="Hired" value={hiredApplications} />
        </View>
        <View style={[styles.statsRow, { marginTop: spacing.sm }]}>
          <StatCard title="Saved Jobs" value={savedCount} />
          <StatCard title="Profile" value={`${strength}%`} />
        </View>

        <SectionHeader title="Application History" />

        {!isLoading && !applications.length ? (
          <Card style={styles.emptyStateCard} padding="md">
            <Text style={styles.sectionTitle}>Start Applying</Text>
            <Text style={styles.bodyText}>
              Open Find Jobs, choose a matching vacancy, and tap Apply now. Your application will appear here and on the employer ATS board.
            </Text>
            <Button variant="outline" fullWidth onPress={() => router.push('/(seeker)/jobs')} style={styles.emptyButton}>
              Find jobs
            </Button>
          </Card>
        ) : null}

        {applications.map((application) => (
          <ApplicationCard
            key={String(application.apply_id)}
            application={application}
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
  onWithdraw,
  withdrawing,
}: {
  application: SeekerApplication
  onWithdraw: () => void
  withdrawing: boolean
}) {
  const job = application.job

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={() => router.push(`/(seeker)/applications/${application.apply_id}`)}>
      <Card style={styles.applicationCard} padding="md">
        <View style={styles.applicationHeader}>
          <View style={styles.applicationTitleWrap}>
            <Text style={styles.jobTitle}>{textFrom(job?.job_title, 'Untitled job')}</Text>
            <Text style={styles.company}>{job ? jobCompany(job) : 'Employer not listed'}</Text>
          </View>
          <Badge variant={statusVariant(application.status)} style={styles.statusBadge}>
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
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Interview Schedule</Text>
            <Text style={styles.infoText}>{titleCase(application.interview.mode_of_interview, 'Interview')}</Text>
            <Text style={styles.infoText}>{formatDate(application.interview.schedule)}</Text>
            <Text style={styles.infoText}>{textFrom(application.interview.venue_or_link, 'Venue or link to follow')}</Text>
          </View>
        ) : null}

        {application.placement ? (
          <View style={styles.successBox}>
            <Text style={styles.successTitle}>Placement Captured</Text>
            <Text style={styles.successText}>Start date: {formatDate(application.placement.start_date)}</Text>
            <Text style={styles.successText}>Salary: PHP {Number(application.placement.salary ?? 0).toLocaleString()}</Text>
          </View>
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
    </TouchableOpacity>
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

function statusVariant(status: string): StatusBadgeVariant {
  if (status === 'hired') return 'success'
  if (status === 'rejected' || status === 'withdrawn') return 'danger'
  if (status === 'interview' || status === 'shortlisted') return 'warning'
  if (status === 'pending' || status === 'reviewed') return 'info'
  return 'neutral'
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
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  emptyStateCard: { marginBottom: spacing.lg },
  sectionTitle: { color: colors.textPrimary, fontSize: typography.title, fontFamily: typography.family.bold, marginBottom: spacing.sm },
  bodyText: { color: colors.textSecondary, fontSize: typography.body, lineHeight: 20, marginBottom: spacing.lg },
  emptyButton: { marginTop: spacing.md, borderColor: colors.secondary },
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
  infoBox: { backgroundColor: colors.warningBackground, borderWidth: 1, borderColor: colors.warningBorder, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.md },
  infoTitle: { color: colors.warning, fontSize: typography.body, fontFamily: typography.family.bold, marginBottom: spacing.xs },
  infoText: { color: colors.warning, fontSize: typography.small, lineHeight: 20 },
  successBox: { backgroundColor: colors.successBackground, borderWidth: 1, borderColor: colors.successBorder, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.md },
  successTitle: { color: colors.success, fontSize: typography.body, fontFamily: typography.family.bold, marginBottom: spacing.xs },
  successText: { color: colors.success, fontSize: typography.small, lineHeight: 20 },
  noteBox: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.md },
  noteTitle: { color: colors.textPrimary, fontSize: typography.body, fontFamily: typography.family.bold, marginBottom: spacing.xs },
  noteText: { color: colors.textSecondary, fontSize: typography.small, lineHeight: 20 },
  cardActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  cardActionBtn: { flex: 1, marginBottom: 0 },
})

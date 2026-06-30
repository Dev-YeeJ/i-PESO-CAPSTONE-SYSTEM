import AsyncStorage from '@react-native-async-storage/async-storage'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { router } from 'expo-router'
import type { SeekerApplication, SeekerProfile } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { arrayFrom, formatDate, formatSalary, jobCompany, jobLocation, seekerName, textFrom, titleCase } from '@/utils/seekerView'
import { AlertBox } from '@/components/ui/AlertBox'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { colors, radii, spacing, typography } from '@/theme'

const SAVED_JOBS_KEY = 'ipeso_mobile_saved_jobs'

type StatusBadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

export default function ApplicationsScreen() {
  const [profile, setProfile] = useState<SeekerProfile | null>(null)
  const [applications, setApplications] = useState<SeekerApplication[]>([])
  const [savedCount, setSavedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')

    try {
      const [profileData, applicationsData, rawSaved] = await Promise.all([
        seekerService.getProfile(),
        seekerService.getApplications(),
        AsyncStorage.getItem(SAVED_JOBS_KEY),
      ])

      setProfile(profileData)
      setApplications(applicationsData.applications ?? [])
      setSavedCount(arrayFrom(rawSaved ? JSON.parse(rawSaved) : []).length)
    } catch {
      setError('Unable to load application activity. Check the backend connection.')
    }
  }, [])

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  const activeApplications = useMemo(
    () => applications.filter((application) => !['hired', 'rejected'].includes(application.status)).length,
    [applications]
  )
  const hiredApplications = applications.filter((application) => application.status === 'hired').length
  const strength = profile?.profile_strength?.percentage ?? 0

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.info} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>Application Activity</Text>
        <Text style={styles.title}>My Applications</Text>
        <Text style={styles.subtitle}>
          Track submitted jobs, employer updates, interviews, and placements from i-PESO.
        </Text>

        {loading ? (
          <Card style={[styles.statusCard, styles.statusMessageCard]} padding="md">
            <ActivityIndicator color={colors.info} />
            <Text style={styles.loadingText}>Loading activity...</Text>
          </Card>
        ) : null}

        {error ? (
          <AlertBox variant="danger" style={styles.alertBox}>
            {error}
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
            Employers can now move your application from pending review to interview, hired, or rejected.
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

        {!loading && !applications.length ? (
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
          <ApplicationCard key={String(application.apply_id)} application={application} />
        ))}
      </ScrollView>
    </View>
  )
}

function ApplicationCard({ application }: { application: SeekerApplication }) {
  const job = application.job

  return (
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
          {application.interview.instructions ? <Text style={styles.infoText}>{application.interview.instructions}</Text> : null}
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
    </Card>
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
  if (status === 'rejected') return 'danger'
  if (status === 'interview' || status === 'shortlisted') return 'warning'
  if (status === 'pending' || status === 'review' || status === 'interviewed') return 'info'
  return 'neutral'
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, paddingTop: 56, paddingBottom: spacing.xxxl },
  kicker: { color: colors.info, fontSize: typography.small, fontWeight: typography.bold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.xs },
  title: { color: colors.primary, fontSize: typography.display, fontWeight: typography.bold, marginBottom: spacing.xs },
  subtitle: { color: colors.secondaryText, fontSize: typography.body, lineHeight: 20, marginBottom: spacing.lg },
  statusCard: { marginBottom: spacing.lg, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  statusMessageCard: { borderColor: colors.border, backgroundColor: colors.surface },
  loadingText: { color: colors.secondaryText, fontSize: typography.small, fontWeight: typography.semibold, marginTop: spacing.xs },
  alertBox: { marginBottom: spacing.lg },
  summaryCard: { marginBottom: spacing.lg },
  summaryLabel: { color: colors.info, fontSize: typography.small, fontWeight: typography.bold, marginBottom: spacing.xs },
  summaryTitle: { color: colors.primary, fontSize: typography.heading, fontWeight: typography.bold, marginBottom: spacing.xs },
  summaryText: { color: colors.secondaryText, fontSize: typography.body, lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  emptyStateCard: { marginBottom: spacing.lg },
  sectionTitle: { color: colors.primary, fontSize: typography.title, fontWeight: typography.bold, marginBottom: spacing.sm },
  bodyText: { color: colors.secondaryText, fontSize: typography.body, lineHeight: 20, marginBottom: spacing.lg },
  emptyButton: { marginTop: spacing.md, borderColor: colors.info },
  applicationCard: { marginBottom: spacing.sm },
  applicationHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  applicationTitleWrap: { flex: 1 },
  jobTitle: { color: colors.primary, fontSize: typography.title, lineHeight: 22, fontWeight: typography.bold },
  company: { color: colors.secondaryText, fontSize: typography.small, fontWeight: typography.semibold, marginTop: spacing.xs },
  statusBadge: { alignSelf: 'flex-start', paddingVertical: 0, paddingHorizontal: spacing.sm },
  jobMetaContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  meta: { color: colors.secondaryText, fontSize: typography.small, lineHeight: 18 },
  detailGrid: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  detailItem: { flex: 1, backgroundColor: colors.background, borderRadius: radii.md, padding: spacing.sm },
  detailLabel: { color: colors.secondaryText, fontSize: typography.small, fontWeight: typography.semibold, textTransform: 'uppercase', marginBottom: spacing.xs },
  detailValue: { color: colors.primary, fontSize: typography.body, fontWeight: typography.semibold },
  infoBox: { backgroundColor: colors.warningBackground, borderWidth: 1, borderColor: colors.warningBorder, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.md },
  infoTitle: { color: colors.warning, fontSize: typography.body, fontWeight: typography.semibold, marginBottom: spacing.xs },
  infoText: { color: colors.warning, fontSize: typography.small, lineHeight: 20 },
  successBox: { backgroundColor: colors.successBackground, borderWidth: 1, borderColor: colors.successBorder, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.md },
  successTitle: { color: colors.success, fontSize: typography.body, fontWeight: typography.semibold, marginBottom: spacing.xs },
  successText: { color: colors.success, fontSize: typography.small, lineHeight: 20 },
  noteBox: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.md },
  noteTitle: { color: colors.primary, fontSize: typography.body, fontWeight: typography.semibold, marginBottom: spacing.xs },
  noteText: { color: colors.secondaryText, fontSize: typography.small, lineHeight: 20 },
})

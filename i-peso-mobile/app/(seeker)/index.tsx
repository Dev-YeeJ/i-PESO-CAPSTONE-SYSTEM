import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { router } from 'expo-router'
import type { NearbyJob, SeekerProfile } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { useAuthStore } from '@/stores/authStore'
import {
  firstName,
  formatSalary,
  jobCompany,
  jobLocation,
  seekerName,
  textFrom,
  titleCase,
} from '@/utils/seekerView'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { AlertBox } from '@/components/ui/AlertBox'
import { ProgressCard } from '@/components/ui/ProgressCard'
import { StatCard } from '@/components/ui/StatCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { colors, radii, spacing, typography } from '@/theme'

export default function SeekerHomeScreen() {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  const [profile, setProfile] = useState<SeekerProfile | null>(null)
  const [jobs, setJobs] = useState<NearbyJob[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [jobsMessage, setJobsMessage] = useState('')

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const loadDashboard = useCallback(async () => {
    setError('')
    setJobsMessage('')

    const [profileResult, jobsResult] = await Promise.allSettled([
      seekerService.getProfile(),
      seekerService.getNearbyJobs({ radiusKm: 20, limit: 8 }),
    ])

    if (profileResult.status === 'fulfilled') {
      setProfile(profileResult.value)
    } else {
      setError('Unable to load your profile. Check the backend connection.')
    }

    if (jobsResult.status === 'fulfilled') {
      setJobs(jobsResult.value.jobs ?? [])
    } else {
      setJobs([])
      setJobsMessage('Nearby jobs need your saved address location. Update onboarding if jobs do not load.')
    }
  }, [])

  useEffect(() => {
    loadDashboard().finally(() => setLoading(false))
  }, [loadDashboard])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadDashboard()
    setRefreshing(false)
  }, [loadDashboard])

  const handleLogout = async () => {
    await logout()
    router.replace('/(auth)/login')
  }

  const activeProfile = profile ?? user
  const strength = profile?.profile_strength?.percentage ?? 0
  const stats = profile?.dashboard_stats
  const topJobs = jobs.slice(0, 3)

  const readinessStatus = strength >= 80 ? 'Ready' : (strength >= 40 ? 'In Progress' : 'Needs Attention')

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.info} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{firstName(activeProfile).charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.greetingText}>{greeting}</Text>
              <Text style={styles.nameText} numberOfLines={1}>{firstName(activeProfile)}</Text>
            </View>
          </View>
          <Button variant="ghost" size="sm" onPress={handleLogout} style={styles.logoutBtn} textStyle={styles.logoutText}>
            Sign out
          </Button>
        </View>

        {loading ? (
          <Card style={styles.loadingCard} padding="md">
            <ActivityIndicator color={colors.info} />
            <Text style={styles.loadingText}>Loading your job seeker dashboard...</Text>
          </Card>
        ) : null}

        {error ? (
          <AlertBox variant="danger" style={styles.alertBox}>
            {error}
          </AlertBox>
        ) : null}

        {/* Welcome Card & Profile Completion */}
        <ProgressCard 
          title="Profile Completion" 
          subtitle={strength < 100 ? "Complete your profile to get better matches." : "Your profile is fully updated!"}
          progress={strength}
          color={colors.info}
        />
        {strength < 100 && (
          <Button variant="outline" onPress={() => router.push('/(seeker)/profile')} style={styles.completeProfileBtn} fullWidth>
            Complete Profile
          </Button>
        )}

        {/* Employment Readiness */}
        <SectionHeader title="Employment Readiness" />
        <Card padding="md" style={styles.readinessCard}>
          <View style={styles.readinessHeader}>
            <Badge variant={readinessStatus === 'Ready' ? 'success' : (readinessStatus === 'In Progress' ? 'info' : 'danger')}>
              {readinessStatus}
            </Badge>
          </View>
          <Text style={styles.readinessDesc}>
            {readinessStatus === 'Ready' 
              ? 'You have a high profile strength. Employers are more likely to notice you.'
              : 'Add more details to your NSRP registration to improve your readiness score.'}
          </Text>
        </Card>

        {/* Quick Statistics */}
        <SectionHeader title="Quick Statistics" />
        <View style={styles.statsRow}>
          <StatCard title="Applications" value={stats?.active_applications ?? 0} />
          <StatCard title="Matches" value={jobs.length} />
        </View>
        <View style={[styles.statsRow, { marginTop: spacing.sm }]}>
          <StatCard title="Saved Jobs" value={0} />
          <StatCard title="Skills" value={stats?.skills ?? 0} />
        </View>

        {/* Quick Actions */}
        <SectionHeader title="Quick Actions" />
        <View style={styles.actionsGrid}>
          <QuickAction label="Browse Jobs" onPress={() => router.push('/(seeker)/jobs')} />
          <QuickAction label="Applications" onPress={() => router.push('/(seeker)/applications')} />
          <QuickAction label="Upload Resume" onPress={() => router.push('/(seeker)/profile')} />
          <QuickAction label="Complete Profile" onPress={() => router.push('/onboarding')} />
        </View>

        <SectionHeader 
          title="Nearby Matches" 
          action={
            <Button variant="ghost" size="sm" onPress={() => router.push('/(seeker)/jobs')} textStyle={styles.viewAllText}>
              View all
            </Button>
          }
        />

        {jobsMessage ? (
          <AlertBox variant="warning" style={styles.alertBox}>
            {jobsMessage}
          </AlertBox>
        ) : null}

        {topJobs.length ? topJobs.map((job) => (
          <Card key={String(job.post_id)} padding="md" style={styles.jobCard}>
            <View style={styles.jobCardHeaderRow}>
              <View style={styles.jobTitleWrap}>
                <Text style={styles.jobTitle} numberOfLines={2}>{textFrom(job.job_title, 'Untitled job')}</Text>
                <Text style={styles.jobCompany}>{jobCompany(job)}</Text>
              </View>
              <Badge variant="success" style={styles.matchBadge}> {job.match?.percentage ?? 0}% </Badge>
            </View>
            <View style={styles.jobMetaContainer}>
              <Text style={styles.jobMeta}>{jobLocation(job)}</Text>
              <Text style={styles.jobMeta}>•</Text>
              <Text style={styles.jobMeta}>{formatSalary(job)}</Text>
            </View>
            <Badge variant="neutral" style={styles.employmentBadge}>
              {titleCase(job.employment_type, 'Employment type not listed')}
            </Badge>
            <Button variant="outline" size="sm" onPress={() => router.push('/(seeker)/jobs')} style={styles.cardActionButton}>
              View details
            </Button>
          </Card>
        )) : (
          <Card padding="md" style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No nearby jobs yet</Text>
            <Text style={styles.emptySub}>
              Jobs will appear here when employers post active vacancies near your saved address.
            </Text>
          </Card>
        )}
      </ScrollView>
    </View>
  )
}

function QuickAction({
  label,
  onPress,
}: {
  label: string
  onPress: () => void
}) {
  return (
    <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, paddingTop: 56, paddingBottom: spacing.xxxl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  headerText: { flex: 1 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: colors.surface, fontSize: typography.title, fontWeight: typography.bold },
  greetingText: { fontSize: typography.small, color: colors.secondaryText, fontWeight: typography.semibold },
  nameText: { fontSize: typography.title, color: colors.primary, fontWeight: typography.bold },
  logoutBtn: { paddingHorizontal: 12, paddingVertical: 10 },
  logoutText: { color: colors.secondaryText, fontSize: typography.small, fontWeight: typography.semibold },
  loadingCard: { marginBottom: spacing.lg, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  loadingText: { color: colors.secondaryText, fontSize: typography.small, fontWeight: typography.medium, marginTop: spacing.xs },
  alertBox: { marginBottom: spacing.lg },
  completeProfileBtn: { marginTop: spacing.md, borderColor: colors.info },
  readinessCard: { backgroundColor: colors.surface },
  readinessHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  readinessDesc: { color: colors.secondaryText, fontSize: typography.body, lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionCard: { width: '48%', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { color: colors.primary, fontSize: typography.small, fontWeight: typography.semibold, textAlign: 'center' },
  viewAllText: { color: colors.info, fontSize: typography.small, fontWeight: typography.bold },
  jobCard: { marginBottom: spacing.sm },
  jobCardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  jobTitleWrap: { flex: 1 },
  jobTitle: { color: colors.primary, fontSize: typography.title, fontWeight: typography.bold, lineHeight: 22 },
  jobCompany: { color: colors.secondaryText, fontSize: typography.small, fontWeight: typography.semibold, marginTop: spacing.xs },
  matchBadge: { alignSelf: 'flex-start', paddingVertical: 0, paddingHorizontal: spacing.sm },
  jobMetaContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm, marginBottom: spacing.sm },
  jobMeta: { color: colors.secondaryText, fontSize: typography.small, lineHeight: 18 },
  employmentBadge: { alignSelf: 'flex-start', marginBottom: spacing.md },
  cardActionButton: { borderColor: colors.border, backgroundColor: colors.background },
  emptyCard: { marginBottom: spacing.lg },
  emptyTitle: { color: colors.primary, fontSize: typography.title, fontWeight: typography.bold, marginBottom: spacing.sm },
  emptySub: { color: colors.secondaryText, fontSize: typography.body, lineHeight: 20, textAlign: 'center' },
})

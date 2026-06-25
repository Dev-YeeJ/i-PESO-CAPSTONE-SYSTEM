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
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { AlertBox } from '@/components/ui/AlertBox'
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
          <Button variant="outline" size="sm" onPress={handleLogout} style={styles.logoutBtn} textStyle={styles.logoutText}>
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

        <Card style={styles.heroCard} contentStyle={styles.heroContent}>
          <Text style={styles.heroKicker}>i-PESO Job Seeker</Text>
          <Text style={styles.heroTitle}>Find work that matches your profile.</Text>
          <Text style={styles.heroSub}>
            Keep your NSRP profile updated so PESO can match you with nearby opportunities.
          </Text>
          <Button variant="secondary" onPress={() => router.push('/(seeker)/jobs')} style={styles.heroButton} textStyle={styles.heroButtonText}>
            Browse jobs
          </Button>
        </Card>

        <View style={styles.statsRow}>
          <Stat label="Applications" value={stats?.active_applications ?? 0} />
          <Stat label="Skills" value={stats?.skills ?? 0} />
          <Stat label="Matches" value={jobs.length} />
        </View>

        <Card padding="md" style={styles.profileCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.sectionTitle}>Profile Strength</Text>
              <Text style={styles.muted}>{seekerName(profile, textFrom(user?.name, 'Job Seeker'))}</Text>
            </View>
            <Text style={styles.strengthText}>{strength}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(100, strength)}%` }]} />
          </View>
          <Text style={styles.profileHint}>
            {strength >= 80
              ? 'Your profile is strong. Keep it current when your skills change.'
              : 'Add skills, education, work experience, and documents to improve matches.'}
          </Text>
          <Button variant="outline" onPress={() => router.push('/(seeker)/profile')} style={styles.secondaryBtn} textStyle={styles.secondaryBtnText}>
            Review profile
          </Button>
        </Card>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <QuickAction label="Find Jobs" description="Nearby and matching jobs" onPress={() => router.push('/(seeker)/jobs')} />
          <QuickAction label="Applications" description="Track PESO activity" onPress={() => router.push('/(seeker)/applications')} />
          <QuickAction label="Onboarding" description="Update NSRP answers" onPress={() => router.push('/onboarding')} />
          <QuickAction label="Profile" description="Skills and documents" onPress={() => router.push('/(seeker)/profile')} />
        </View>

        <View style={styles.cardHeader}>
          <Text style={styles.sectionTitle}>Nearby Matches</Text>
          <Button variant="ghost" size="sm" onPress={() => router.push('/(seeker)/jobs')} textStyle={styles.viewAllText}>
            View all
          </Button>
        </View>

        {jobsMessage ? (
          <AlertBox variant="warning" style={styles.alertBox}>
            {jobsMessage}
          </AlertBox>
        ) : null}

        {topJobs.length ? topJobs.map((job) => (
          <Card key={String(job.post_id)} padding="md" style={styles.jobCard}>
            <View style={styles.cardHeader}>
              <View style={styles.jobTitleWrap}>
                <Text style={styles.jobTitle} numberOfLines={2}>{textFrom(job.job_title, 'Untitled job')}</Text>
                <Text style={styles.jobCompany}>{jobCompany(job)}</Text>
              </View>
              <Badge variant="success" style={styles.matchBadge}> {job.match?.percentage ?? 0}% </Badge>
            </View>
            <Text style={styles.jobMeta}>{jobLocation(job)}</Text>
            <Text style={styles.jobMeta}>{formatSalary(job)}</Text>
            <Text style={styles.jobMeta}>{titleCase(job.employment_type, 'Employment type not listed')}</Text>
            <Button variant="ghost" size="sm" onPress={() => router.push('/(seeker)/jobs')} style={styles.cardActionButton} textStyle={styles.cardActionText}>
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function QuickAction({
  label,
  description,
  onPress,
}: {
  label: string
  description: string
  onPress: () => void
}) {
  return (
    <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.actionLabel}>{label}</Text>
      <Text style={styles.actionDescription}>{description}</Text>
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
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.info, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: colors.surface, fontSize: typography.title, fontWeight: typography.bold },
  greetingText: { fontSize: typography.small, color: colors.secondaryText, fontWeight: typography.semibold },
  nameText: { fontSize: typography.title, color: colors.primary, fontWeight: typography.bold },
  logoutBtn: { borderWidth: 0, paddingHorizontal: 12, paddingVertical: 10 },
  logoutText: { color: colors.danger, fontSize: typography.small, fontWeight: typography.semibold },
  loadingCard: { marginBottom: spacing.lg, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  loadingText: { color: colors.secondaryText, fontSize: typography.small, fontWeight: typography.medium, marginTop: spacing.xs },
  alertBox: { marginBottom: spacing.lg },
  heroCard: { backgroundColor: colors.info, borderRadius: radii.lg, padding: spacing.xl, marginBottom: spacing.xl },
  heroContent: { gap: spacing.sm },
  heroKicker: { color: colors.surface, fontSize: typography.small, fontWeight: typography.bold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  heroTitle: { color: colors.surface, fontSize: typography.display, lineHeight: 34, fontWeight: typography.bold, marginBottom: spacing.sm },
  heroSub: { color: '#Dbeafe', fontSize: typography.body, lineHeight: 20, marginBottom: spacing.lg },
  heroButton: { backgroundColor: colors.surface, borderColor: colors.surface, width: 140 },
  heroButtonText: { color: colors.info },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  statCard: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.lg, alignItems: 'center' },
  statValue: { color: colors.primary, fontSize: typography.heading, fontWeight: typography.bold },
  statLabel: { color: colors.secondaryText, fontSize: typography.small, fontWeight: typography.semibold, marginTop: spacing.xs, textAlign: 'center' },
  profileCard: { marginBottom: spacing.xl },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  sectionTitle: { fontSize: typography.title, fontWeight: typography.bold, color: colors.primary, marginBottom: spacing.sm },
  muted: { color: colors.secondaryText, fontSize: typography.small, lineHeight: 18 },
  strengthText: { color: colors.info, fontSize: typography.heading, fontWeight: typography.bold },
  progressTrack: { height: 8, backgroundColor: colors.border, borderRadius: radii.sm, overflow: 'hidden', marginTop: spacing.sm, marginBottom: spacing.sm },
  progressFill: { height: '100%', backgroundColor: colors.info, borderRadius: radii.sm },
  profileHint: { color: colors.muted, fontSize: typography.body, lineHeight: 20, marginBottom: spacing.md },
  secondaryBtn: { width: '100%', borderColor: colors.info, backgroundColor: colors.surface },
  secondaryBtnText: { color: colors.info },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  actionCard: { width: '48%', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.lg },
  actionLabel: { color: colors.primary, fontSize: typography.body, fontWeight: typography.bold, marginBottom: spacing.xs },
  actionDescription: { color: colors.secondaryText, fontSize: typography.small, lineHeight: 18 },
  viewAllText: { color: colors.info, fontSize: typography.small, fontWeight: typography.bold },
  jobCard: { marginBottom: spacing.sm },
  jobTitleWrap: { flex: 1 },
  jobTitle: { color: colors.primary, fontSize: typography.title, fontWeight: typography.bold, lineHeight: 22 },
  jobCompany: { color: colors.muted, fontSize: typography.small, fontWeight: typography.semibold, marginTop: spacing.xs },
  matchBadge: { alignSelf: 'flex-start', paddingVertical: 0, paddingHorizontal: spacing.sm },
  jobMeta: { color: colors.secondaryText, fontSize: typography.small, lineHeight: 18, marginTop: spacing.xs },
  cardActionButton: { marginTop: spacing.md, borderColor: colors.border, backgroundColor: colors.background },
  cardActionText: { color: colors.info, fontSize: typography.small, fontWeight: typography.semibold },
  emptyCard: { marginBottom: spacing.lg },
  emptyTitle: { color: colors.primary, fontSize: typography.title, fontWeight: typography.bold, marginBottom: spacing.sm },
  emptySub: { color: colors.secondaryText, fontSize: typography.body, lineHeight: 20, textAlign: 'center' },
})

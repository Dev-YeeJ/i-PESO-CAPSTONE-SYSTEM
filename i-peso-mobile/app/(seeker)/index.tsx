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
import { useQuery } from '@tanstack/react-query'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import type { NearbyJob, ProfileStrengthItem, SeekerProfile } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { useAuthStore } from '@/stores/authStore'
import {
  firstName,
  formatSalary,
  jobCompany,
  jobLocation,
  textFrom,
  titleCase,
} from '@/utils/seekerView'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { AlertBox } from '@/components/ui/AlertBox'
import { StatCard } from '@/components/ui/StatCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { MatchRing } from '@/components/ui/MatchRing'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { colors, radii, spacing, typography } from '@/theme'

type QuickActionIcon = React.ComponentProps<typeof MaterialIcons>['name']
type FeedMode = 'recommended' | 'nearby' | 'latest'

const FEED_MODE_OPTIONS: Array<{ label: string; value: FeedMode }> = [
  { label: 'Recommended', value: 'recommended' },
  { label: 'Nearby', value: 'nearby' },
  { label: 'Latest', value: 'latest' },
]

const FEED_MODE_TITLES: Record<FeedMode, string> = {
  recommended: 'Recommended Jobs',
  nearby: 'Nearby Matches',
  latest: 'Latest Vacancies',
}

// "Next Best Action" — each incomplete profile-strength item maps to one concrete
// suggestion. Section numbers match the tabs in app/(seeker)/profile/edit.tsx.
const NEXT_ACTION_COPY: Record<string, { message: string; section?: number }> = {
  photo: { message: 'Add a professional photo so employers recognize you.' },
  personal_information: { message: 'Finish your personal information for a stronger profile.', section: 1 },
  address: { message: 'Add your complete address so nearby jobs can find you.', section: 1 },
  occupations: { message: 'Tell us your preferred occupations to get better matches.', section: 3 },
  skills: { message: 'Add at least three skills employers can search for.', section: 5 },
  education: { message: 'Add your education background.', section: 5 },
  work_experience: { message: 'Add your work experience.', section: 7 },
  training: { message: 'Add any trainings or eligibilities you have.', section: 6 },
  languages: { message: 'Add the languages you can read, write, or speak.', section: 4 },
}

function pickNextBestAction(items?: ProfileStrengthItem[]) {
  const incomplete = (items ?? []).filter((item) => !item.complete && item.key && NEXT_ACTION_COPY[item.key])
  if (!incomplete.length) return null
  incomplete.sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
  const top = incomplete[0]
  return { ...NEXT_ACTION_COPY[top.key as string], label: top.label }
}

export default function SeekerHomeScreen() {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  const [profile, setProfile] = useState<SeekerProfile | null>(null)
  const [jobs, setJobs] = useState<NearbyJob[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [jobsMessage, setJobsMessage] = useState('')
  const [feedMode, setFeedMode] = useState<FeedMode>('nearby')

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notificationsUnreadCount'],
    queryFn: () => seekerService.getUnreadNotificationCount(),
    refetchInterval: 30000,
  })

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const loadDashboard = useCallback(async (mode: FeedMode) => {
    setError('')
    setJobsMessage('')

    const [profileResult, jobsResult] = await Promise.allSettled([
      seekerService.getProfile(),
      seekerService.searchJobs({ radiusKm: 20, limit: 8, feedMode: mode }),
    ])

    if (profileResult.status === 'fulfilled') {
      setProfile(profileResult.value)
    } else {
      setError('Unable to load your profile. Check the backend connection.')
    }

    if (jobsResult.status === 'fulfilled') {
      let resultJobs = jobsResult.value.jobs ?? []

      // Mirrors the website's feed fallback: if "Recommended" comes back empty
      // (e.g. profile too new for the matching engine), fall back to the latest
      // active vacancies instead of showing a bare empty state.
      if (mode === 'recommended' && resultJobs.length === 0) {
        try {
          const fallback = await seekerService.searchJobs({ radiusKm: 20, limit: 8, feedMode: 'latest' })
          resultJobs = fallback.jobs ?? []
          if (resultJobs.length) {
            setJobsMessage('No personalized recommendations yet — showing the latest active vacancies instead.')
          }
        } catch {
          // Keep the empty recommended result; the empty state below still renders.
        }
      }

      setJobs(resultJobs)
    } else {
      setJobs([])
      setJobsMessage('Nearby jobs need your saved address location. Update onboarding if jobs do not load.')
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    loadDashboard(feedMode).finally(() => setLoading(false))
  }, [loadDashboard, feedMode])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadDashboard(feedMode)
    setRefreshing(false)
  }, [loadDashboard, feedMode])

  const handleLogout = async () => {
    await logout()
    router.replace('/(auth)/login')
  }

  const activeProfile = profile ?? user
  const strength = profile?.profile_strength?.percentage ?? 0
  const stats = profile?.dashboard_stats
  const topJobs = jobs.slice(0, 3)
  const nextAction = pickNextBestAction(profile?.profile_strength?.items)

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
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => router.push('/(seeker)/notifications')} style={styles.bellBtn} hitSlop={8}>
              <MaterialIcons name="notifications" size={22} color={colors.primary} />
              {unreadCount > 0 ? (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
            <Button variant="ghost" size="sm" onPress={handleLogout} style={styles.logoutBtn} textStyle={styles.logoutText}>
              Sign out
            </Button>
          </View>
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

        {/* Profile Strength — "Next Best Action" nudge */}
        <Card padding="md" style={styles.strengthCard}>
          <MatchRing percentage={strength} size={84} strokeWidth={7} />
          <View style={styles.strengthText}>
            <Text style={styles.strengthTitle}>Profile Strength</Text>
            <Text style={styles.strengthSub}>
              {nextAction
                ? nextAction.message
                : strength < 100
                ? 'Complete your profile to get better matches.'
                : 'Your profile is fully updated! Check out your top matches below.'}
            </Text>
            <TouchableOpacity
              onPress={() =>
                nextAction
                  ? router.push(
                      nextAction.section
                        ? { pathname: '/(seeker)/profile/edit', params: { section: String(nextAction.section) } }
                        : '/(seeker)/profile'
                    )
                  : router.push(strength < 100 ? '/(seeker)/profile' : '/(seeker)/jobs')
              }
              style={styles.strengthCta}
            >
              <Text style={styles.strengthCtaText}>
                {nextAction ? `Update ${nextAction.label}` : strength < 100 ? 'Complete Profile' : 'Browse Jobs'}
              </Text>
              <MaterialIcons name="arrow-forward" size={14} color={colors.info} />
            </TouchableOpacity>
          </View>
        </Card>

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
          <StatCard title="Saved Jobs" value={stats?.saved_jobs?.length ?? 0} />
          <StatCard title="Skills" value={stats?.skills ?? 0} />
        </View>

        {/* Quick Actions */}
        <SectionHeader title="Quick Actions" />
        <View style={styles.actionsGrid}>
          <QuickAction icon="work" label="Browse Jobs" onPress={() => router.push('/(seeker)/jobs')} />
          <QuickAction icon="assignment" label="Applications" onPress={() => router.push('/(seeker)/applications')} />
          <QuickAction icon="event" label="Job Fairs" onPress={() => router.push('/(seeker)/job-fairs')} />
          <QuickAction icon="school" label="Upskill Hub" onPress={() => router.push('/(seeker)/upskill-hub')} />
          <QuickAction icon="person" label="My Profile" onPress={() => router.push('/(seeker)/profile')} />
          <QuickAction icon="edit-note" label="Complete Profile" onPress={() => router.push('/onboarding')} />
        </View>

        <SegmentedControl options={FEED_MODE_OPTIONS} value={feedMode} onChange={setFeedMode} style={styles.feedModeControl} />

        <SectionHeader
          title={FEED_MODE_TITLES[feedMode]}
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
              <MatchRing percentage={job.match?.percentage ?? 0} size={44} strokeWidth={4} />
            </View>
            <View style={styles.jobMetaContainer}>
              <Text style={styles.jobMeta}>{jobLocation(job)}</Text>
              <Text style={styles.jobMeta}>•</Text>
              <Text style={styles.jobMeta}>{formatSalary(job)}</Text>
            </View>
            <Badge variant="neutral" style={styles.employmentBadge}>
              {titleCase(job.employment_type, 'Employment type not listed')}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onPress={() => router.push(`/(seeker)/jobs/${job.post_id}`)}
              style={styles.cardActionButton}
            >
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
  icon,
  label,
  onPress,
}: {
  icon: QuickActionIcon
  label: string
  onPress: () => void
}) {
  return (
    <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.actionIconCircle}>
        <MaterialIcons name={icon} size={20} color={colors.info} />
      </View>
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  bellBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  bellBadge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  bellBadgeText: { color: colors.white, fontSize: 10, fontFamily: typography.family.bold },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: colors.surface, fontSize: typography.title, fontFamily: typography.family.bold },
  greetingText: { fontSize: typography.small, color: colors.secondaryText, fontFamily: typography.family.medium },
  nameText: { fontSize: typography.heading, color: colors.primary, fontFamily: typography.family.display },
  logoutBtn: { paddingHorizontal: 12, paddingVertical: 10 },
  logoutText: { color: colors.secondaryText, fontSize: typography.small, fontFamily: typography.family.bold },
  loadingCard: { marginBottom: spacing.lg, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  loadingText: { color: colors.secondaryText, fontSize: typography.small, fontFamily: typography.family.medium, marginTop: spacing.xs },
  alertBox: { marginBottom: spacing.lg },
  strengthCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, backgroundColor: colors.surface, marginBottom: spacing.lg },
  strengthText: { flex: 1 },
  strengthTitle: { fontSize: typography.title, fontFamily: typography.family.bold, color: colors.primary, marginBottom: spacing.xs },
  strengthSub: { fontSize: typography.small, color: colors.secondaryText, lineHeight: 18 },
  strengthCta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  strengthCtaText: { fontSize: typography.small, fontFamily: typography.family.bold, color: colors.info },
  readinessCard: { backgroundColor: colors.surface },
  readinessHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  readinessDesc: { color: colors.secondaryText, fontSize: typography.body, lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionCard: { width: '48%', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.lg, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  actionIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.infoBackground, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { color: colors.primary, fontSize: typography.small, fontFamily: typography.family.bold, textAlign: 'center' },
  viewAllText: { color: colors.info, fontSize: typography.small, fontFamily: typography.family.bold },
  feedModeControl: { marginTop: spacing.xl },
  jobCard: { marginBottom: spacing.sm },
  jobCardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  jobTitleWrap: { flex: 1 },
  jobTitle: { color: colors.primary, fontSize: typography.title, fontFamily: typography.family.bold, lineHeight: 22 },
  jobCompany: { color: colors.secondaryText, fontSize: typography.small, fontFamily: typography.family.bold, marginTop: spacing.xs },
  jobMetaContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm, marginBottom: spacing.sm },
  jobMeta: { color: colors.secondaryText, fontSize: typography.small, lineHeight: 18 },
  employmentBadge: { alignSelf: 'flex-start', marginBottom: spacing.md },
  cardActionButton: { borderColor: colors.border, backgroundColor: colors.background },
  emptyCard: { marginBottom: spacing.lg },
  emptyTitle: { color: colors.primary, fontSize: typography.title, fontFamily: typography.family.bold, marginBottom: spacing.sm },
  emptySub: { color: colors.secondaryText, fontSize: typography.body, lineHeight: 20, textAlign: 'center' },
})

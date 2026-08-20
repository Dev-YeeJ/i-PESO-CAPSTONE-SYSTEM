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
import { colors, radii, shadows, spacing, textStyles } from '@/theme'

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

const PRIMARY_ACTIONS: Array<{ icon: QuickActionIcon; label: string; path: string }> = [
  { icon: 'work', label: 'Browse Jobs', path: '/(seeker)/jobs' },
  { icon: 'map', label: 'Job Map', path: '/(seeker)/job-map' },
  { icon: 'assignment', label: 'Applications', path: '/(seeker)/applications' },
]

const MORE_ACTIONS: Array<{ icon: QuickActionIcon; label: string; path: string }> = [
  { icon: 'event', label: 'Job Fairs', path: '/(seeker)/job-fairs' },
  { icon: 'chat', label: 'Ask i-PESO', path: '/(seeker)/assistant' },
  { icon: 'school', label: 'Gov. Programs', path: '/(seeker)/government-programs' },
  { icon: 'person', label: 'My Profile', path: '/(seeker)/profile' },
  { icon: 'edit-note', label: 'Complete Profile', path: '/onboarding' },
]

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

  const activeProfile = profile ?? user
  const strength = profile?.profile_strength?.percentage ?? 0
  const stats = profile?.dashboard_stats
  const topJobs = jobs.slice(0, 3)
  const nextAction = pickNextBestAction(profile?.profile_strength?.items)

  const readinessStatus = strength >= 80 ? 'Ready' : (strength >= 40 ? 'In Progress' : 'Needs Attention')
  const readinessVariant = readinessStatus === 'Ready' ? 'success' : readinessStatus === 'In Progress' ? 'info' : 'warning'

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} progressViewOffset={140} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero — brand-navy header, gives the screen an immediate focal point instead
            of an all-white page. Profile Strength floats over its bottom edge. */}
        <View style={styles.hero}>
          <View style={styles.heroDecor} pointerEvents="none" />
          <View style={styles.heroTop}>
            <View style={styles.headerLeft}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{firstName(activeProfile).charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.headerText}>
                <Text style={styles.greetingText}>{greeting}</Text>
                <Text style={styles.nameText} numberOfLines={1}>{firstName(activeProfile)}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => router.push('/(seeker)/notifications')} style={styles.bellBtn} hitSlop={8}>
              <MaterialIcons name="notifications" size={22} color={colors.white} />
              {unreadCount > 0 ? (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>
        </View>

        <Card padding="md" style={styles.strengthCard}>
          <View style={styles.strengthRow}>
            <MatchRing percentage={strength} size={72} strokeWidth={6} />
            <View style={styles.strengthText}>
              <View style={styles.strengthTitleRow}>
                <Text style={styles.strengthTitle}>Profile Strength</Text>
                <Badge variant={readinessVariant}>{readinessStatus}</Badge>
              </View>
              <Text style={styles.strengthSub} numberOfLines={2}>
                {nextAction
                  ? nextAction.message
                  : strength < 100
                  ? 'Complete your profile to get better matches.'
                  : 'Your profile is fully updated! Check your top matches below.'}
              </Text>
            </View>
          </View>
          <Button
            variant="ghost"
            size="sm"
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
            textStyle={styles.strengthCtaText}
          >
            {(nextAction ? `Update ${nextAction.label}` : strength < 100 ? 'Complete Profile' : 'Browse Jobs') + '  →'}
          </Button>
        </Card>

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

        {/* Quick Actions — the 3 most-used flows get full-weight cards; the rest sit in a
            denser secondary row so the hierarchy actually says something about priority. */}
        <SectionHeader title="Quick Actions" />
        <View style={styles.primaryActionsGrid}>
          {PRIMARY_ACTIONS.map((action) => (
            <QuickAction key={action.label} {...action} onPress={() => router.push(action.path as never)} />
          ))}
        </View>
        <View style={styles.secondaryActionsRow}>
          {MORE_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.secondaryAction}
              onPress={() => router.push(action.path as never)}
              activeOpacity={0.8}
            >
              <MaterialIcons name={action.icon} size={16} color={colors.secondary} />
              <Text style={styles.secondaryActionLabel} numberOfLines={1}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <SegmentedControl options={FEED_MODE_OPTIONS} value={feedMode} onChange={setFeedMode} style={styles.feedModeControl} />

        <SectionHeader
          title={FEED_MODE_TITLES[feedMode]}
          action={
            <TouchableOpacity onPress={() => router.push('/(seeker)/jobs')} hitSlop={8}>
              <Text style={styles.viewAllText}>View all →</Text>
            </TouchableOpacity>
          }
        />

        {jobsMessage ? (
          <AlertBox variant="info" style={styles.alertBox}>
            {jobsMessage}
          </AlertBox>
        ) : null}

        {topJobs.length ? topJobs.map((job) => (
          <TouchableOpacity
            key={String(job.post_id)}
            activeOpacity={0.9}
            onPress={() => router.push(`/(seeker)/jobs/${job.post_id}`)}
          >
            <Card padding="md" style={styles.jobCard}>
              <View style={styles.jobCardHeaderRow}>
                <View style={styles.jobLogo}>
                  <Text style={styles.jobLogoText}>{jobCompany(job).charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.jobTitleWrap}>
                  <Text style={styles.jobTitle} numberOfLines={2}>{textFrom(job.job_title, 'Untitled job')}</Text>
                  <Text style={styles.jobCompany} numberOfLines={1}>{jobCompany(job)}</Text>
                </View>
                <MatchRing percentage={job.match?.percentage ?? 0} size={40} strokeWidth={4} />
              </View>
              <View style={styles.jobMetaContainer}>
                <MaterialIcons name="place" size={13} color={colors.textSecondary} />
                <Text style={styles.jobMeta} numberOfLines={1}>{jobLocation(job)}</Text>
                <Text style={styles.jobMetaDot}>•</Text>
                <Text style={styles.jobMeta} numberOfLines={1}>{formatSalary(job)}</Text>
              </View>
              <Badge variant="neutral" style={styles.employmentBadge}>
                {titleCase(job.employment_type, 'Employment type not listed')}
              </Badge>
            </Card>
          </TouchableOpacity>
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
        <MaterialIcons name={icon} size={22} color={colors.accent} />
      </View>
      <Text style={styles.actionLabel} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingBottom: spacing.xxxl },

  hero: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.xxxl + spacing.lg, overflow: 'hidden' },
  heroDecor: { position: 'absolute', top: -60, right: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: colors.accent, opacity: 0.12 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  headerText: { flex: 1 },
  bellBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  bellBadge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: colors.primary },
  bellBadgeText: { ...textStyles.smallBold, color: colors.primary, fontSize: 10, lineHeight: undefined },
  avatarCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { ...textStyles.title, color: colors.white, fontSize: 20, lineHeight: undefined },
  greetingText: { ...textStyles.small, color: 'rgba(255,255,255,0.72)' },
  nameText: { ...textStyles.heading, color: colors.white, fontSize: 22, lineHeight: undefined },

  strengthCard: { marginHorizontal: spacing.lg, marginTop: -spacing.xxl, marginBottom: spacing.lg, ...shadows.lg },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  strengthText: { flex: 1 },
  strengthTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.xs },
  strengthTitle: { ...textStyles.title, color: colors.textPrimary },
  strengthSub: { ...textStyles.small, color: colors.textSecondary, lineHeight: 17 },
  strengthCta: { marginTop: spacing.md, marginBottom: 0, alignSelf: 'flex-start', paddingHorizontal: 0 },
  strengthCtaText: { color: colors.info, ...textStyles.smallBold, lineHeight: undefined },

  loadingCard: { marginHorizontal: spacing.lg, marginBottom: spacing.lg, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  loadingText: { ...textStyles.smallMedium, color: colors.textSecondary, marginTop: spacing.xs },
  alertBox: { marginHorizontal: spacing.lg, marginBottom: spacing.lg },

  statsRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg },
  primaryActionsGrid: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg },
  actionCard: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, paddingVertical: spacing.md, paddingHorizontal: spacing.xs, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, ...shadows.xs },
  actionIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { color: colors.textPrimary, ...textStyles.smallBold, lineHeight: undefined, textAlign: 'center' },

  secondaryActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.sm },
  secondaryAction: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.infoBackground, borderRadius: radii.pill, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  secondaryActionLabel: { color: colors.secondary, ...textStyles.smallMedium, lineHeight: undefined },

  feedModeControl: { marginTop: spacing.xl, marginHorizontal: spacing.lg },
  viewAllText: { color: colors.secondary, ...textStyles.smallBold, lineHeight: undefined },

  jobCard: { marginHorizontal: spacing.lg, marginBottom: spacing.md },
  jobCardHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  jobLogo: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  jobLogoText: { color: colors.primary, ...textStyles.bodyBold, lineHeight: undefined },
  jobTitleWrap: { flex: 1 },
  jobTitle: { color: colors.textPrimary, ...textStyles.titleMedium, fontFamily: 'DMSans_700Bold', lineHeight: 21 },
  jobCompany: { color: colors.textSecondary, ...textStyles.smallMedium, marginTop: 2 },
  jobMetaContainer: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.md, marginBottom: spacing.sm },
  jobMeta: { color: colors.textSecondary, ...textStyles.small, flexShrink: 1 },
  jobMetaDot: { color: colors.subtle, fontSize: 12 },
  employmentBadge: { alignSelf: 'flex-start' },

  emptyCard: { marginHorizontal: spacing.lg, marginBottom: spacing.lg },
  emptyTitle: { color: colors.primary, ...textStyles.title, marginBottom: spacing.sm },
  emptySub: { color: colors.secondaryText, ...textStyles.body, textAlign: 'center' },
})

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { NearbyJob, NearbyJobsResponse, ProfileStrengthItem, SeekerProfile } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { useAuthStore } from '@/stores/authStore'
import { useMotion } from '@/hooks/useMotion'
import { firstName, listFrom } from '@/utils/seekerView'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { AlertBox } from '@/components/ui/AlertBox'
import { PressableScale } from '@/components/ui/PressableScale'
import { StatCard } from '@/components/ui/StatCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { MatchRing } from '@/components/ui/MatchRing'
import { AceMascot } from '@/components/chat/AceMascot'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { JobFeedCard } from '@/components/seeker/JobFeedCard'
import { colors, gradients, radii, shadows, spacing, textStyles, typography } from '@/theme'

type QuickActionIcon = React.ComponentProps<typeof MaterialIcons>['name']
type FeedMode = 'recommended' | 'nearby' | 'latest'

// Mirrors web's JobFeedSelector — title + description per feed, with a live count badge.
const FEED_SELECTOR_ITEMS: { value: FeedMode; title: string; description: string }[] = [
  { value: 'recommended', title: 'Recommended Jobs', description: 'Ranked by your profile and skills' },
  { value: 'nearby', title: 'Nearby Jobs', description: 'Based on your saved GPS location' },
  { value: 'latest', title: 'Latest Active Vacancies', description: 'Broader fallback across active postings' },
]

const EMPTY_JOBS: NearbyJob[] = []

const SORT_ITEMS: { value: 'match' | 'distance' | 'newest'; label: string }[] = [
  { value: 'match', label: 'Match' },
  { value: 'distance', label: 'Distance' },
  { value: 'newest', label: 'Newest' },
]

const PRIMARY_ACTIONS: { icon: QuickActionIcon; label: string; path: string }[] = [
  { icon: 'work', label: 'Browse Jobs', path: '/(seeker)/jobs' },
  { icon: 'map', label: 'Job Map', path: '/(seeker)/job-map' },
  { icon: 'assignment', label: 'Applications', path: '/(seeker)/applications' },
]

// "Ask i-PESO" used to live here too — it now has its own highlighted banner
// (see AceBanner below) rather than sharing this dense row as a same-weight icon.
const MORE_ACTIONS: { icon: QuickActionIcon; label: string; path: string }[] = [
  { icon: 'event', label: 'Job Fairs', path: '/(seeker)/job-fairs' },
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
  const insets = useSafeAreaInsets()
  const user = useAuthStore((state) => state.user)
  const token = useAuthStore((state) => state.token)

  const queryClient = useQueryClient()
  const [profile, setProfile] = useState<SeekerProfile | null>(null)
  const [profileFetchedAt, setProfileFetchedAt] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [jobsMessage, setJobsMessage] = useState('')
  const [feedMode, setFeedMode] = useState<FeedMode>('nearby')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'jobs' | 'saved'>('jobs')
  const [sort, setSort] = useState<'match' | 'distance' | 'newest'>('match')

  const flipSavedInFeeds = (jobId: string) => {
    (['recommended', 'nearby', 'latest'] as const).forEach((mode) => {
      queryClient.setQueryData<NearbyJobsResponse>(['homeFeed', mode], (current) =>
        current?.jobs
          ? { ...current, jobs: current.jobs.map((job) => (String(job.post_id) === jobId ? { ...job, is_saved: !job.is_saved } : job)) }
          : current
      )
    })
  }

  const toggleSaveMutation = useMutation({
    mutationFn: (jobId: string) => seekerService.toggleSavedJob(jobId),
    onMutate: (jobId) => flipSavedInFeeds(jobId),
    onError: (_err, jobId) => flipSavedInFeeds(jobId),
  })

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notificationsUnreadCount'],
    queryFn: () => seekerService.getUnreadNotificationCount(),
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
  })

  const { data: jobFairs = [] } = useQuery({
    queryKey: ['jobFairs'],
    queryFn: () => seekerService.getJobFairs(),
  })
  const upcomingFairs = jobFairs.slice(0, 2)

  const { data: analytics } = useQuery({
    queryKey: ['seekerAnalytics'],
    queryFn: () => seekerService.getAnalytics(),
  })

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const loadProfile = useCallback(async () => {
    setError('')
    try {
      const result = await seekerService.getProfile()
      setProfile(result)
      setProfileFetchedAt(Date.now())
    } catch {
      setError('Unable to load your profile. Check the backend connection.')
    }
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  // Fetched in parallel (not just the active tab) so the feed-selector cards can show a count
  // per feed the way web's JobFeedSelector does, rather than only knowing the active one.
  const recommendedQuery = useQuery({
    queryKey: ['homeFeed', 'recommended'],
    queryFn: () => seekerService.searchJobs({ radiusKm: 20, limit: 8, feedMode: 'recommended' }),
  })
  const nearbyQuery = useQuery({
    queryKey: ['homeFeed', 'nearby'],
    queryFn: () => seekerService.searchJobs({ radiusKm: 20, limit: 8, feedMode: 'nearby' }),
  })
  const latestQuery = useQuery({
    queryKey: ['homeFeed', 'latest'],
    queryFn: () => seekerService.searchJobs({ radiusKm: 20, limit: 8, feedMode: 'latest' }),
  })
  const feedQueries = { recommended: recommendedQuery, nearby: nearbyQuery, latest: latestQuery }
  const feedCounts = {
    recommended: recommendedQuery.data?.jobs?.length ?? 0,
    nearby: nearbyQuery.data?.jobs?.length ?? 0,
    latest: latestQuery.data?.jobs?.length ?? 0,
  }

  // Mirrors the website's feed fallback, generalized to every tab: if the active feed comes
  // back empty or errored (no saved location for "Nearby", profile too new for "Recommended"),
  // fall back to the broadest feed — Latest — instead of leaving Home showing nothing at all.
  // Previously this only covered "Recommended", so a seeker with no saved address landed on
  // the default "Nearby" tab and saw an empty Home with no way out short of tapping a
  // different feed card themselves.
  const activeQuery = feedQueries[feedMode]
  const activeFeedEmpty = activeQuery.isSuccess && feedCounts[feedMode] === 0
  const activeFeedFailed = activeQuery.isError
  const shouldFallbackToLatest = feedMode !== 'latest' && (activeFeedEmpty || activeFeedFailed) && feedCounts.latest > 0

  useEffect(() => {
    if (!shouldFallbackToLatest) {
      setJobsMessage('')
      return
    }
    if (feedMode === 'nearby') {
      setJobsMessage(
        activeFeedFailed
          ? 'Nearby jobs need your saved address location — showing the latest active vacancies instead.'
          : 'No nearby jobs found in range — showing the latest active vacancies instead.'
      )
    } else {
      setJobsMessage('No personalized recommendations yet — showing the latest active vacancies instead.')
    }
  }, [shouldFallbackToLatest, feedMode, activeFeedFailed])

  const effectiveFeedMode: FeedMode = shouldFallbackToLatest ? 'latest' : feedMode
  const jobs = feedQueries[effectiveFeedMode].data?.jobs ?? EMPTY_JOBS
  const jobsLoading = activeQuery.isLoading || (shouldFallbackToLatest && latestQuery.isLoading)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.allSettled([loadProfile(), recommendedQuery.refetch(), nearbyQuery.refetch(), latestQuery.refetch()])
    setRefreshing(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadProfile])

  const activeProfile = profile ?? user
  // profileFetchedAt (set on every successful fetch) rides along as the cache-bust value —
  // profile.id alone never changes for the same account, so after a photo upload from the
  // Profile screen, revisiting the dashboard would otherwise still show whatever React
  // Native's native image loader had already cached for that unchanged URL.
  const avatarSource = useMemo(() => {
    if (!profile?.has_profile_image || !token) return null
    return { uri: seekerService.profileImageUrl(`${profile.id}-${profileFetchedAt}`), headers: { Authorization: `Bearer ${token}` } }
  }, [profile?.has_profile_image, profile?.id, token, profileFetchedAt])
  const strength = profile?.profile_strength?.percentage ?? 0
  const stats = profile?.dashboard_stats
  const filteredJobs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const base = activeTab === 'saved' ? jobs.filter((job) => job.is_saved) : jobs
    if (!query) return base
    return base.filter((job) => {
      const haystack = [
        job.job_title,
        job.employer?.company_name,
        job.barangay,
        job.city_municipality,
        job.province,
        ...listFrom(job.required_skills),
      ].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(query)
    })
  }, [activeTab, jobs, searchQuery])
  const sortedJobs = useMemo(() => {
    const withMatch = (job: NearbyJob) => Number(job.match_percentage ?? job.match?.percentage ?? 0)
    const withDistance = (job: NearbyJob) => Number(job.distance_km ?? Number.MAX_SAFE_INTEGER)
    const withDate = (job: NearbyJob) => (job.posted_at ? new Date(job.posted_at).getTime() : 0)
    return [...filteredJobs].sort((left, right) => {
      if (sort === 'distance') return withDistance(left) - withDistance(right) || withMatch(right) - withMatch(left)
      if (sort === 'newest') return withDate(right) - withDate(left) || withMatch(right) - withMatch(left)
      return withMatch(right) - withMatch(left) || withDistance(left) - withDistance(right)
    })
  }, [filteredJobs, sort])
  const topJobs = sortedJobs.slice(0, 3)
  const nextAction = pickNextBestAction(profile?.profile_strength?.items)

  const readinessStatus = strength >= 80 ? 'Ready' : (strength >= 40 ? 'In Progress' : 'Needs Attention')
  const readinessVariant = readinessStatus === 'Ready' ? 'success' : readinessStatus === 'In Progress' ? 'info' : 'warning'

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="light-content" backgroundColor={colors.blue800} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue600} progressViewOffset={140} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Gradient hero. The Profile Strength card overlaps its bottom edge, which ties the
            two together and gives the screen a single focal point on open. */}
        <LinearGradient
          colors={[...gradients.hero]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + spacing.lg }]}
        >
          <View style={styles.heroDecor} pointerEvents="none" />
          <View style={styles.heroTop}>
            <View style={styles.headerLeft}>
              <View style={styles.avatarCircle}>
                {avatarSource ? (
                  <Image source={avatarSource} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{firstName(activeProfile).charAt(0).toUpperCase()}</Text>
                )}
              </View>
              <View style={styles.headerText}>
                <Text style={styles.greetingText}>{greeting}</Text>
                <Text style={styles.nameText} numberOfLines={1}>{firstName(activeProfile)}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(seeker)/notifications')}
              style={styles.bellBtn}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
            >
              <MaterialIcons name="notifications" size={22} color={colors.white} />
              {unreadCount > 0 ? (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <Card padding="md" style={styles.strengthCard}>
          <View style={styles.strengthRow}>
            <MatchRing percentage={strength} size={72} strokeWidth={6} />
            <View style={styles.strengthText}>
              <View style={styles.strengthTitleRow}>
                <Text style={styles.strengthTitle}>Profile strength</Text>
                <Badge variant={readinessVariant}>{readinessStatus}</Badge>
              </View>
              <Text style={styles.strengthSub} numberOfLines={2}>
                {nextAction
                  ? nextAction.message
                  : strength < 100
                  ? 'Complete your profile to get better matches.'
                  : 'Your profile is fully updated. Check your top matches below.'}
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
            {(nextAction ? `Update ${nextAction.label}` : strength < 100 ? 'Complete profile' : 'Browse jobs') + '  →'}
          </Button>
        </Card>

        {error ? (
          <AlertBox variant="danger" style={styles.alertBox}>
            {error}
          </AlertBox>
        ) : null}

        {upcomingFairs.length ? (
          <PressableScale
            scaleTo="buttonPress"
            ripple={null}
            style={styles.bulletinCard}
            onPress={() => router.push('/(seeker)/job-fairs')}
            accessibilityRole="button"
            accessibilityLabel="Open PESO Job Fair Bulletin"
          >
            <View style={styles.bulletinHeader}>
              <View style={styles.flexOne}>
                <Text style={styles.bulletinKicker}>PESO Job Fair Bulletin</Text>
                <Text style={styles.bulletinTitle}>Upcoming employment events</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={colors.blue700} />
            </View>
            {upcomingFairs.map((fair) => (
              <View key={String(fair.job_fair_id)} style={styles.bulletinRow}>
                <Text style={styles.bulletinFairTitle} numberOfLines={1}>{fair.title}</Text>
                <View style={styles.bulletinMetaRow}>
                  <MaterialIcons name="event" size={13} color={colors.blue700} />
                  <Text style={styles.bulletinMeta} numberOfLines={1}>
                    {[fair.start_date, fair.start_time?.slice(0, 5)].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                {fair.venue ? (
                  <View style={styles.bulletinMetaRow}>
                    <MaterialIcons name="place" size={13} color={colors.blue700} />
                    <Text style={styles.bulletinMeta} numberOfLines={1}>{fair.venue}</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </PressableScale>
        ) : null}

        <SectionHeader title="At a glance" style={styles.sectionHeader} />
        <View style={styles.statsRow}>
          <StatCard
            title="Profile Readiness"
            value={`${Math.min(strength, 100)}%`}
            tint="blue"
            icon={<MaterialIcons name="person-outline" size={18} color={colors.blue700} />}
          />
          <StatCard
            title="Active Applications"
            value={stats?.active_applications ?? 0}
            tint="blue"
            icon={<MaterialIcons name="work-outline" size={18} color={colors.blue700} />}
          />
        </View>
        <View style={[styles.statsRow, { marginTop: spacing.sm }]}>
          <StatCard
            title="Saved Jobs"
            value={stats?.saved_jobs?.length ?? 0}
            tint="amber"
            icon={<MaterialIcons name="bookmark-border" size={18} color={colors.warning} />}
          />
          <StatCard
            title="Profile Views (30d)"
            value={analytics?.total_views_30_days ?? 0}
            tint="green"
            icon={<MaterialIcons name="track-changes" size={18} color={colors.success} />}
          />
        </View>

        {/* Quick Actions — the 3 most-used flows get full-weight cards; the rest sit in a
            denser secondary row so the hierarchy actually says something about priority. */}
        <SectionHeader title="Quick actions" style={styles.sectionHeader} />
        <View style={styles.primaryActionsGrid}>
          {PRIMARY_ACTIONS.map((action, index) => (
            <QuickAction
              key={action.label}
              {...action}
              index={index}
              onPress={() => router.push(action.path as never)}
            />
          ))}
        </View>

        <AceBanner />

        <View style={styles.secondaryActionsRow}>
          {MORE_ACTIONS.map((action) => (
            <PressableScale
              key={action.label}
              scaleTo="buttonPress"
              ripple={null}
              style={styles.secondaryAction}
              onPress={() => {
                // "Complete Profile" points at /onboarding, but that screen redirects
                // straight back here the instant profile_completed is already true —
                // which looks exactly like the tap did nothing. Send an already-complete
                // profile to the edit screen instead, so the button always goes somewhere.
                const target = action.path === '/onboarding' && user?.profile_completed
                  ? '/(seeker)/profile/edit'
                  : action.path
                router.push(target as never)
              }}
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              <MaterialIcons name={action.icon} size={16} color={colors.blue700} />
              <Text style={styles.secondaryActionLabel} numberOfLines={1}>{action.label}</Text>
            </PressableScale>
          ))}
        </View>

        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color={colors.subtle} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search jobs, skills, or employers"
            placeholderTextColor={colors.subtle}
            returnKeyType="search"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear search">
              <MaterialIcons name="close" size={18} color={colors.subtle} />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.feedSelectorRow}>
          {FEED_SELECTOR_ITEMS.map((item) => {
            const active = feedMode === item.value
            return (
              <PressableScale
                key={item.value}
                scaleTo="buttonPress"
                ripple={null}
                style={[styles.feedSelectorCard, active && styles.feedSelectorCardActive]}
                onPress={() => setFeedMode(item.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <View style={styles.feedSelectorTop}>
                  <Text style={[styles.feedSelectorTitle, active && styles.feedSelectorTitleActive]} numberOfLines={1}>{item.title}</Text>
                  <View style={[styles.feedSelectorCount, active && styles.feedSelectorCountActive]}>
                    <Text style={[styles.feedSelectorCountText, active && styles.feedSelectorCountTextActive]}>{feedCounts[item.value]}</Text>
                  </View>
                </View>
                <Text style={[styles.feedSelectorDesc, active && styles.feedSelectorDescActive]} numberOfLines={1}>{item.description}</Text>
              </PressableScale>
            )
          })}
        </ScrollView>

        <View style={styles.feedControlsRow}>
          <View style={styles.tabRow}>
            <TabButton label="Jobs" icon="star" active={activeTab === 'jobs'} onPress={() => setActiveTab('jobs')} />
            <TabButton
              label="Saved Jobs"
              icon="bookmark"
              active={activeTab === 'saved'}
              count={jobs.filter((job) => job.is_saved).length}
              onPress={() => setActiveTab('saved')}
            />
          </View>
          <TouchableOpacity onPress={() => router.push('/(seeker)/jobs')} hitSlop={8} accessibilityRole="button">
            <Text style={styles.viewAllText}>View all →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sortRow}>
          <Text style={styles.resultCountText}>{sortedJobs.length} result{sortedJobs.length === 1 ? '' : 's'}</Text>
          <View style={styles.sortChipsRow}>
            {SORT_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.value}
                onPress={() => setSort(item.value)}
                style={[styles.sortChip, sort === item.value && styles.sortChipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: sort === item.value }}
              >
                <Text style={[styles.sortChipText, sort === item.value && styles.sortChipTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {jobsMessage ? (
          <AlertBox variant="info" style={styles.alertBox}>
            {jobsMessage}
          </AlertBox>
        ) : null}

        {jobsLoading ? (
          <SkeletonGroup label="Loading your matches" style={styles.jobSkeletons}>
            {[0, 1, 2].map((row) => (
              <View key={row} style={styles.jobSkeletonCard}>
                <View style={styles.jobSkeletonTop}>
                  <Skeleton width={40} height={40} radius={radii.md} />
                  <View style={styles.flexOne}>
                    <Skeleton width="80%" height={14} />
                    <Skeleton width="50%" height={11} style={styles.skeletonGap} />
                  </View>
                  <Skeleton width={40} height={40} radius={20} />
                </View>
                <Skeleton width="70%" height={11} style={styles.skeletonRow} />
                <Skeleton width={96} height={22} style={styles.skeletonRow} />
              </View>
            ))}
          </SkeletonGroup>
        ) : topJobs.length ? (
          <View style={styles.feedListWrap}>
            {topJobs.map((job, index) => (
              <JobFeedCard
                key={String(job.post_id)}
                job={job}
                index={index}
                saving={toggleSaveMutation.isPending && String(toggleSaveMutation.variables) === String(job.post_id)}
                onPress={() => router.push(`/(seeker)/jobs/${job.post_id}`)}
                onToggleSave={() => toggleSaveMutation.mutate(String(job.post_id))}
              />
            ))}
          </View>
        ) : (
          <Card padding="md" style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No jobs match your search' : activeTab === 'saved' ? 'No saved jobs yet' : 'No nearby jobs yet'}
            </Text>
            <Text style={styles.emptySub}>
              {searchQuery
                ? 'Try another keyword, or clear the search to see your full feed.'
                : activeTab === 'saved'
                ? 'Save promising vacancies so you can compare them later.'
                : 'Jobs appear here when employers post active vacancies near your saved address.'}
            </Text>
          </Card>
        )}
      </ScrollView>
    </View>
  )
}

function TabButton({
  label,
  icon,
  active,
  count,
  onPress,
}: {
  label: string
  icon: QuickActionIcon
  active: boolean
  count?: number
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.tabBtn, active && styles.tabBtnActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <MaterialIcons name={icon} size={15} color={active ? colors.white : colors.textSecondary} />
      <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>{label}</Text>
      {count ? (
        <View style={[styles.tabBtnCount, active && styles.tabBtnCountActive]}>
          <Text style={[styles.tabBtnCountText, active && styles.tabBtnCountTextActive]}>{count}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  )
}

function QuickAction({
  icon,
  label,
  index,
  onPress,
}: {
  icon: QuickActionIcon
  label: string
  index: number
  onPress: () => void
}) {
  const m = useMotion()

  return (
    <Animated.View
      style={styles.flexOne}
      entering={m.enabled ? FadeInUp.delay(m.stagger(index)).duration(240) : undefined}
    >
      <PressableScale
        scaleTo="buttonPress"
        style={styles.actionCard}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <View style={styles.actionIconCircle}>
          <MaterialIcons name={icon} size={22} color={colors.blue700} />
        </View>
        <Text style={styles.actionLabel} numberOfLines={1}>{label}</Text>
      </PressableScale>
    </Animated.View>
  )
}

/**
 * Ace's one prominent entry point on Home — previously just a same-weight icon lost in the
 * secondary actions row (see the comment on MORE_ACTIONS above). Uses `gradients.brand`
 * rather than `gradients.hero` (already spent on the header just above) or a gold gradient
 * (the theme rations amber to single accent touches, never gradients — see theme/index.ts).
 * Ace's own antenna mark already carries that one gold touch.
 */
function AceBanner() {
  const m = useMotion()

  return (
    <Animated.View
      style={styles.aceBannerWrap}
      entering={m.enabled ? FadeInUp.delay(m.stagger(PRIMARY_ACTIONS.length)).duration(240) : undefined}
    >
      <PressableScale
        scaleTo="buttonPress"
        ripple={null}
        onPress={() => router.push('/(seeker)/assistant')}
        accessibilityRole="button"
        accessibilityLabel="Ask Ace, your i-PESO assistant"
      >
        <LinearGradient colors={[...gradients.brand]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.aceBanner}>
          <View style={styles.aceMascotWrap}>
            <AceMascot state="idle" size={64} />
          </View>
          <View style={styles.aceBannerText}>
            <Text style={styles.aceBannerTitle}>Ask Ace</Text>
            <Text style={styles.aceBannerSubtitle} numberOfLines={2}>
              Get instant help with your job search
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color={colors.white} />
        </LinearGradient>
      </PressableScale>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  flexOne: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: spacing.xxxl },

  hero: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl + spacing.lg,
    overflow: 'hidden',
  },
  heroDecor: { position: 'absolute', top: -60, right: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: colors.white, opacity: 0.08 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  headerText: { flex: 1 },
  bellBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.heroChip, alignItems: 'center', justifyContent: 'center' },
  bellBadge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: colors.blue700 },
  bellBadgeText: { ...textStyles.smallBold, color: colors.accentText, fontSize: 10, lineHeight: undefined },
  avatarCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.heroChip, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.32)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { ...textStyles.title, color: colors.white, fontSize: 20, lineHeight: undefined },
  greetingText: { ...textStyles.small, color: colors.blue200 },
  nameText: { ...textStyles.heading, color: colors.white, fontSize: 22, lineHeight: undefined },

  strengthCard: { marginHorizontal: spacing.lg, marginTop: -spacing.xxl, marginBottom: spacing.lg, ...shadows.lg },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  strengthText: { flex: 1 },
  strengthTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.xs },
  strengthTitle: { ...textStyles.title, color: colors.textPrimary },
  strengthSub: { ...textStyles.small, color: colors.textSecondary, lineHeight: 17 },
  strengthCta: { marginTop: spacing.md, marginBottom: 0, alignSelf: 'flex-start', paddingHorizontal: 0 },
  strengthCtaText: { color: colors.blue600, ...textStyles.smallBold, lineHeight: undefined },

  alertBox: { marginHorizontal: spacing.lg, marginBottom: spacing.lg },

  bulletinCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.blue200,
    backgroundColor: colors.blue50,
    padding: spacing.lg,
    gap: spacing.md,
  },
  bulletinHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bulletinKicker: { ...textStyles.label, color: colors.blue700, letterSpacing: 0.6 },
  bulletinTitle: { ...textStyles.titleMedium, color: colors.blue900, marginTop: 2 },
  bulletinRow: { backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, gap: 4, ...shadows.xs },
  bulletinFairTitle: { ...textStyles.smallBold, color: colors.textPrimary },
  bulletinMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  bulletinMeta: { ...textStyles.small, color: colors.textSecondary, flexShrink: 1 },

  // The ScrollView's own content has no horizontal padding (so the hero gradient bleeds
  // edge-to-edge), so every section header needs this to line up with the padded cards below.
  sectionHeader: { marginHorizontal: spacing.lg },

  statsRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg },
  primaryActionsGrid: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg },
  actionCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, paddingVertical: spacing.lg, paddingHorizontal: spacing.xs, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, ...shadows.xs },
  actionIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.blue50, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { color: colors.textPrimary, ...textStyles.smallBold, lineHeight: undefined, textAlign: 'center' },

  aceBannerWrap: { marginHorizontal: spacing.lg, marginTop: spacing.md },
  aceBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radii.lg, padding: spacing.lg, ...shadows.md },
  aceMascotWrap: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  aceBannerText: { flex: 1 },
  aceBannerTitle: { ...textStyles.titleMedium, color: colors.white },
  aceBannerSubtitle: { ...textStyles.small, color: colors.blue100, marginTop: 2 },

  secondaryActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.sm },
  secondaryAction: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.blue50, borderRadius: radii.pill, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  secondaryActionLabel: { color: colors.blue700, ...textStyles.smallMedium, lineHeight: undefined },

  viewAllText: { color: colors.blue600, ...textStyles.smallBold, lineHeight: undefined },

  feedSelectorRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  feedSelectorCard: { width: 190, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: spacing.md },
  feedSelectorCardActive: { backgroundColor: colors.blue700, borderColor: colors.blue700 },
  feedSelectorTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  feedSelectorTitle: { ...textStyles.smallBold, color: colors.textPrimary, flexShrink: 1 },
  feedSelectorTitleActive: { color: colors.white },
  feedSelectorCount: { minWidth: 22, borderRadius: radii.pill, backgroundColor: colors.background, paddingHorizontal: 6, paddingVertical: 2, alignItems: 'center' },
  feedSelectorCountActive: { backgroundColor: colors.heroChipActive },
  feedSelectorCountText: { ...textStyles.label, fontSize: 10, color: colors.textSecondary },
  feedSelectorCountTextActive: { color: colors.white },
  feedSelectorDesc: { ...textStyles.small, fontSize: 11, color: colors.textSecondary, marginTop: spacing.xs },
  feedSelectorDescActive: { color: colors.blue200 },

  feedControlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.xl },
  tabRow: { flexDirection: 'row', gap: spacing.sm, flexShrink: 1 },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  tabBtnActive: { backgroundColor: colors.blue600, borderColor: colors.blue600 },
  tabBtnText: { ...textStyles.smallBold, color: colors.textSecondary },
  tabBtnTextActive: { color: colors.white },
  tabBtnCount: { minWidth: 18, borderRadius: radii.pill, backgroundColor: colors.background, paddingHorizontal: 5, alignItems: 'center' },
  tabBtnCountActive: { backgroundColor: colors.heroChipActive },
  tabBtnCountText: { ...textStyles.label, fontSize: 10, color: colors.textSecondary },
  tabBtnCountTextActive: { color: colors.white },

  sortRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: spacing.md },
  resultCountText: { ...textStyles.small, color: colors.textSecondary },
  sortChipsRow: { flexDirection: 'row', gap: spacing.xs },
  sortChip: { borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  sortChipActive: { backgroundColor: colors.blue50, borderColor: colors.blue200 },
  sortChipText: { ...textStyles.small, fontSize: 11, color: colors.textSecondary },
  sortChipTextActive: { color: colors.blue700, fontFamily: typography.family.bold },

  searchBox: {
    marginTop: spacing.xl,
    marginHorizontal: spacing.lg,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: typography.body, fontFamily: typography.family.medium },

  feedListWrap: { paddingHorizontal: spacing.lg },

  jobSkeletons: { paddingHorizontal: spacing.lg, gap: spacing.md },
  jobSkeletonCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  jobSkeletonTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  skeletonGap: { marginTop: spacing.sm },
  skeletonRow: { marginTop: spacing.md },

  emptyCard: { marginHorizontal: spacing.lg, marginBottom: spacing.lg },
  emptyTitle: { color: colors.textPrimary, ...textStyles.title, marginBottom: spacing.sm },
  emptySub: { color: colors.textSecondary, ...textStyles.body, textAlign: 'center' },
})

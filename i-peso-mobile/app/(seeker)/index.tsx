import { useCallback, useEffect, useMemo, useState } from 'react'
import { Image, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { JobFair, NearbyJob, NearbyJobsResponse, ProfileStrengthItem, SeekerProfile } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { useProfilePhotoUri } from '@/hooks/useProfilePhotoUri'
import { AnnouncementBanner } from '@/components/announcements/AnnouncementBanner'
import { useSystemStatus } from '@/hooks/useSystemStatus'
import { useAuthStore } from '@/stores/authStore'
import { useMotion } from '@/hooks/useMotion'
import { firstName } from '@/utils/seekerView'
import { Button } from '@/components/ui/Button'
import { AlertBox } from '@/components/ui/AlertBox'
import { Chip } from '@/components/ui/Chip'
import { DateBadge } from '@/components/ui/DateBadge'
import { EmptyArt } from '@/components/ui/EmptyArt'
import { PressableScale } from '@/components/ui/PressableScale'
import { MatchRing } from '@/components/ui/MatchRing'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { HOME_JOB_CARD_WIDTH, HomeJobCard } from '@/components/seeker/HomeJobCard'
import { colors, gradients, isDark, radii, shadows, spacing, textStyles, typography } from '@/theme'

type IconName = React.ComponentProps<typeof MaterialIcons>['name']
type FeedMode = 'recommended' | 'nearby' | 'latest'

// Redesigned Home (Superdesign draft "Home — Redesign (base)"). Search, sort, the Saved view and
// the full job list live on the Jobs tab; Home is a calm summary with one primary action — the
// seeker's next best step — inside the profile-strength hero.

const FEED_CHIPS: { value: FeedMode; label: string }[] = [
  { value: 'recommended', label: 'For you' },
  { value: 'nearby', label: 'Nearby' },
  { value: 'latest', label: 'Latest' },
]

const QUICK_ACTIONS: { label: string; icon: IconName; href: string }[] = [
  { label: 'Job Map', icon: 'map', href: '/(seeker)/job-map?from=home' },
  { label: 'Job Fairs', icon: 'event', href: '/(seeker)/job-fairs?from=home' },
  { label: 'Resume Studio', icon: 'description', href: '/(seeker)/profile/resume-studio?from=home' },
  { label: 'Safety Reports', icon: 'shield', href: '/(seeker)/safety-reports?from=home' },
]

const EMPTY_JOBS: NearbyJob[] = []
const CAROUSEL_LIMIT = 8

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

/** "08:00:00" → "8:00 AM". */
function clock(value?: string | null) {
  const match = /^(\d{1,2}):(\d{2})/.exec(value ?? '')
  if (!match) return ''
  const hour = Number(match[1])
  return `${hour % 12 || 12}:${match[2]} ${hour < 12 ? 'AM' : 'PM'}`
}

export default function SeekerHomeScreen() {
  const insets = useSafeAreaInsets()
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()

  // Shares the ['seekerProfile'] query with the Profile screen, which invalidates it after a
  // photo upload/removal — so the header avatar here updates without a manual pull-to-refresh.
  const profileQuery = useQuery({ queryKey: ['seekerProfile'], queryFn: () => seekerService.getProfile() })
  const profile: SeekerProfile | null = profileQuery.data ?? null
  const error = profileQuery.isError && !profile ? 'Unable to load your profile. Check your connection and pull down to try again.' : ''
  const [refreshing, setRefreshing] = useState(false)
  const [jobsMessage, setJobsMessage] = useState('')
  const [feedMode, setFeedMode] = useState<FeedMode>('nearby')
  // A horizontal ScrollView nested in this vertical one can collapse to ~0 height on Android
  // unless the ScrollView itself has a height (the old Home's feed selector hit this). Measure
  // the cards and pin it; tracks dynamic type because it re-measures on every content change.
  const [carouselHeight, setCarouselHeight] = useState<number | undefined>(undefined)

  const flipSavedInFeeds = (jobId: string) => {
    (['recommended', 'nearby', 'latest'] as const).forEach((mode) => {
      queryClient.setQueryData<NearbyJobsResponse>(['homeFeed', mode], (current) =>
        current?.jobs
          ? { ...current, jobs: current.jobs.map((job) => (String(job.post_id) === jobId ? { ...job, is_saved: !job.is_saved } : job)) }
          : current
      )
    })
  }

  // Optimistic: the bookmark flips at once and flips back if the request fails.
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

  const jobFairsQuery = useQuery({ queryKey: ['jobFairs'], queryFn: () => seekerService.getJobFairs() })
  const nextFair: JobFair | undefined = jobFairsQuery.data?.[0]

  // Fetched in parallel so switching chips is instant and the empty-feed fallback below can
  // tell whether Latest has anything to offer.
  const recommendedQuery = useQuery({
    queryKey: ['homeFeed', 'recommended'],
    queryFn: () => seekerService.searchJobs({ radiusKm: 20, limit: CAROUSEL_LIMIT, feedMode: 'recommended' }),
  })
  const nearbyQuery = useQuery({
    queryKey: ['homeFeed', 'nearby'],
    queryFn: () => seekerService.searchJobs({ radiusKm: 20, limit: CAROUSEL_LIMIT, feedMode: 'nearby' }),
  })
  const latestQuery = useQuery({
    queryKey: ['homeFeed', 'latest'],
    queryFn: () => seekerService.searchJobs({ radiusKm: 20, limit: CAROUSEL_LIMIT, feedMode: 'latest' }),
  })
  const feedQueries = { recommended: recommendedQuery, nearby: nearbyQuery, latest: latestQuery }
  const systemStatus = useSystemStatus()
  const feedCounts = {
    recommended: recommendedQuery.data?.jobs?.length ?? 0,
    nearby: nearbyQuery.data?.jobs?.length ?? 0,
    latest: latestQuery.data?.jobs?.length ?? 0,
  }

  // Mirrors the website's feed fallback: if the active feed comes back empty or errored (no
  // saved location for "Nearby", profile too new for "For you"), fall back to the broadest
  // feed — Latest — instead of leaving Home with nothing to show.
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
          ? 'Nearby jobs need your saved address — showing the latest openings instead.'
          : 'No nearby jobs in range — showing the latest openings instead.'
      )
    } else {
      setJobsMessage('No personal recommendations yet — showing the latest openings instead.')
    }
  }, [shouldFallbackToLatest, feedMode, activeFeedFailed])

  const effectiveFeedMode: FeedMode = shouldFallbackToLatest ? 'latest' : feedMode
  const jobs = feedQueries[effectiveFeedMode].data?.jobs ?? EMPTY_JOBS
  const jobsLoading = activeQuery.isLoading || (shouldFallbackToLatest && latestQuery.isLoading)
  const jobsFailed = activeFeedFailed && !shouldFallbackToLatest && !jobsLoading
  // Best match first, as the old Home's default sort did.
  const carouselJobs = useMemo(
    () => [...jobs].sort((a, b) => Number(b.match_percentage ?? b.match?.percentage ?? 0) - Number(a.match_percentage ?? a.match?.percentage ?? 0)),
    [jobs],
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.allSettled([profileQuery.refetch(), recommendedQuery.refetch(), nearbyQuery.refetch(), latestQuery.refetch(), jobFairsQuery.refetch()])
    setRefreshing(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Magandang umaga'
    if (hour < 18) return 'Magandang hapon'
    return 'Magandang gabi'
  }, [])

  const activeProfile = profile ?? user
  // dataUpdatedAt is part of the cache key so a photo uploaded from Profile is fetched fresh.
  const avatarUri = useProfilePhotoUri(Boolean(profile?.has_profile_image), `${profile?.id ?? 'me'}-${profileQuery.dataUpdatedAt}`)
  const name = firstName(activeProfile)
  const strength = profile?.profile_strength?.percentage ?? 0
  const nextAction = pickNextBestAction(profile?.profile_strength?.items)
  const heroTitle = strength >= 80 ? 'Your profile is ready' : strength >= 40 ? 'Almost there' : "Let's build your profile"
  const heroMessage = nextAction
    ? nextAction.message
    : strength < 100
    ? 'Complete your profile to get better matches.'
    : 'Your profile is complete. Check your top matches below.'
  const heroCta = nextAction ? `Update ${nextAction.label}` : strength < 100 ? 'Complete profile' : 'Browse jobs'
  const onHeroCta = () => {
    if (nextAction) {
      router.push(
        nextAction.section
          ? { pathname: '/(seeker)/profile/edit', params: { section: String(nextAction.section), from: 'home' } }
          : '/(seeker)/profile'
      )
    } else {
      router.push(strength < 100 ? '/(seeker)/profile' : '/(seeker)/jobs')
    }
  }

  // The tab bar is laid out below the screen (not floating over it), so the FAB only needs a
  // gutter above the screen's bottom edge.
  const fabBottom = spacing.lg

  return (
    <View style={styles.flex}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={{ paddingTop: insets.top + spacing.sm, paddingBottom: fabBottom + 56 + spacing.xl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue600} colors={[colors.blue600]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* (1) Greeting header — white */}
        <View style={styles.header}>
          <PressableScale
            scaleTo="buttonPress"
            ripple={null}
            onPress={() => router.push('/(seeker)/profile')}
            style={styles.headerLeft}
            accessibilityRole="button"
            accessibilityLabel={`${greeting}, ${name}. Open your profile`}
          >
            <View style={styles.avatar}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
              )}
            </View>
            <View style={styles.flexOne}>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.name} numberOfLines={1}>{name}</Text>
            </View>
          </PressableScale>
          <PressableScale
            scaleTo="buttonPress"
            ripple={null}
            onPress={() => router.push({ pathname: '/(seeker)/notifications', params: { from: 'home' } })}
            style={styles.bellBtn}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          >
            <MaterialIcons name="notifications-none" size={24} color={colors.iconBlue} />
            {unreadCount > 0 ? (
              // Amber: the count badge is one of amber's three sanctioned uses. Navy text, never white.
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            ) : null}
          </PressableScale>
        </View>

        {/* (2) Profile strength hero — the screen's one primary action */}
        <View style={styles.heroWrap}>
          <LinearGradient colors={[...gradients.brand]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.heroDecorA} pointerEvents="none" />
            <View style={styles.heroDecorB} pointerEvents="none" />
            <View style={styles.heroRow}>
              <MatchRing percentage={strength} size={84} strokeWidth={7} onDark showPercent accessibilityLabel="Profile strength" />
              <View style={styles.flexOne}>
                <Text style={styles.heroKicker}>PROFILE STRENGTH</Text>
                <Text style={styles.heroTitle}>{heroTitle}</Text>
                <Text style={styles.heroMessage}>{heroMessage}</Text>
              </View>
            </View>
            <Button variant="inverse" size="md" fullWidth iconRight="arrow-forward" onPress={onHeroCta} style={styles.heroCta}>
              {heroCta}
            </Button>
          </LinearGradient>
        </View>

        {error ? <AlertBox variant="danger" style={styles.errorBox}>{error}</AlertBox> : null}

        {/* (3) PESO announcements (bell + push sourced). Renders nothing when there are none, and
            carries its own bottom margin when it does — so it gets no wrapper margin here; the hero's
            bottom margin is the gap above it either way. */}
        <AnnouncementBanner />

        {/* (4) Quick actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">Quick actions</Text>
          <View style={styles.quickRow}>
            {QUICK_ACTIONS.map((action) => (
              <PressableScale
                key={action.label}
                scaleTo="buttonPress"
                ripple={null}
                onPress={() => router.push(action.href as never)}
                style={styles.quickItem}
                accessibilityRole="button"
                accessibilityLabel={action.label}
              >
                <View style={styles.quickTile}>
                  <MaterialIcons name={action.icon} size={26} color={colors.iconBlue} />
                </View>
                <Text style={styles.quickLabel}>{action.label}</Text>
              </PressableScale>
            ))}
          </View>
        </View>

        {/* (5) Jobs for you */}
        <View style={styles.sectionTight}>
          <View style={[styles.sectionHead, styles.gutter]}>
            <Text style={styles.sectionTitle} accessibilityRole="header">Jobs for you</Text>
            <PressableScale scaleTo="buttonPress" ripple={null} onPress={() => router.push('/(seeker)/jobs')} style={styles.linkBtn} accessibilityRole="link">
              <Text style={styles.linkText}>See all</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.link} />
            </PressableScale>
          </View>
          <View style={[styles.chipRow, styles.gutter]}>
            {FEED_CHIPS.map((chip) => (
              <Chip key={chip.value} label={chip.label} selected={feedMode === chip.value} onPress={() => setFeedMode(chip.value)} />
            ))}
          </View>

          {jobsMessage ? <AlertBox variant="info" style={styles.alertBox}>{jobsMessage}</AlertBox> : null}

          {jobsLoading ? (
            <SkeletonGroup label="Loading jobs for you" style={styles.carouselSkeleton}>
              {[0, 1].map((row) => (
                <View key={row} style={styles.skeletonCard}>
                  <View style={styles.skeletonTop}>
                    <Skeleton width={44} height={44} radius={radii.md} />
                    <Skeleton width={52} height={52} radius={26} />
                  </View>
                  <Skeleton width="80%" height={14} style={styles.skeletonGap} />
                  <Skeleton width="55%" height={11} style={styles.skeletonGapSm} />
                  <Skeleton width="65%" height={11} style={styles.skeletonGap} />
                  <Skeleton width={120} height={20} style={styles.skeletonGap} />
                </View>
              ))}
            </SkeletonGroup>
          ) : jobsFailed ? (
            <View style={[styles.stateCard, styles.gutterMargin]}>
              <EmptyArt kind="cloud" size={64} />
              <View style={styles.flexOne}>
                <Text style={styles.stateTitle}>Couldn&apos;t load jobs</Text>
                <Text style={styles.stateBody}>Check your connection, then try again.</Text>
                <Button variant="outline" size="sm" icon="refresh" onPress={() => activeQuery.refetch()} style={styles.stateBtn}>Try again</Button>
              </View>
            </View>
          ) : carouselJobs.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={HOME_JOB_CARD_WIDTH + spacing.md}
              decelerationRate="fast"
              style={[styles.carousel, carouselHeight ? { height: carouselHeight } : null]}
              contentContainerStyle={styles.carouselContent}
              onContentSizeChange={(_width, height) => {
                if (height > 0 && height !== carouselHeight) setCarouselHeight(height)
              }}
            >
              {carouselJobs.map((job) => (
                <HomeJobCard
                  key={String(job.post_id)}
                  job={job}
                  saving={toggleSaveMutation.isPending && String(toggleSaveMutation.variables) === String(job.post_id)}
                  onPress={() => router.push({ pathname: '/(seeker)/jobs/[id]', params: { id: String(job.post_id), from: 'home' } })}
                  onToggleSave={() => toggleSaveMutation.mutate(String(job.post_id))}
                />
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.stateCard, styles.gutterMargin]}>
              <EmptyArt kind="search" size={64} />
              <View style={styles.flexOne}>
                <Text style={styles.stateTitle}>No jobs here yet</Text>
                <Text style={styles.stateBody}>New openings from PESO employers show up here. Browse all jobs in the meantime.</Text>
                <Button variant="outline" size="sm" onPress={() => router.push('/(seeker)/jobs')} style={styles.stateBtn}>Browse jobs</Button>
              </View>
            </View>
          )}
        </View>

        {/* (6) Upcoming job fair */}
        {nextFair ? (
          <View style={styles.sectionTight}>
            <View style={[styles.sectionHead, styles.gutter]}>
              <Text style={styles.sectionTitle} accessibilityRole="header">Upcoming job fair</Text>
              <PressableScale scaleTo="buttonPress" ripple={null} onPress={() => router.push('/(seeker)/job-fairs?from=home')} style={styles.linkBtn} accessibilityRole="link">
                <Text style={styles.linkText}>All fairs</Text>
                <MaterialIcons name="chevron-right" size={20} color={colors.link} />
              </PressableScale>
            </View>
            <PressableScale
              onPress={() => router.push({ pathname: '/(seeker)/job-fairs/[id]', params: { id: String(nextFair.job_fair_id), from: 'home' } })}
              style={[styles.fairCard, styles.gutterMargin]}
              accessibilityRole="button"
              accessibilityLabel={`Job fair: ${nextFair.title}`}
            >
              <DateBadge date={nextFair.start_date ?? nextFair.event_date} />
              <View style={styles.flexOne}>
                {nextFair.is_rsvped ? (
                  <View style={styles.registeredPill}>
                    <MaterialIcons name="check" size={13} color={colors.white} />
                    <Text style={styles.registeredText}>Registered</Text>
                  </View>
                ) : null}
                <Text style={styles.fairTitle} numberOfLines={2}>{nextFair.title}</Text>
                {nextFair.start_time ? (
                  <FairMeta icon="schedule" text={[clock(nextFair.start_time), clock(nextFair.end_time)].filter(Boolean).join(' – ')} />
                ) : null}
                {nextFair.venue ? <FairMeta icon="place" text={nextFair.venue} /> : null}
                {nextFair.participating_employers?.length ? (
                  <View style={styles.employersPill}>
                    <MaterialIcons name="storefront" size={14} color={colors.iconBlue} />
                    <Text style={styles.employersText}>
                      {nextFair.participating_employers.length} employer{nextFair.participating_employers.length === 1 ? '' : 's'}
                    </Text>
                  </View>
                ) : null}
              </View>
              <MaterialIcons name="chevron-right" size={24} color={colors.subtle} />
            </PressableScale>
          </View>
        ) : null}

        <PressableScale scaleTo="buttonPress" ripple={null} style={styles.helpLink} onPress={() => router.push({ pathname: '/(seeker)/help', params: { from: 'home' } })} accessibilityRole="link">
          <MaterialIcons name="help-outline" size={18} color={colors.link} />
          <Text style={styles.helpLinkText}>Questions? Help &amp; FAQs</Text>
        </PressableScale>
      </ScrollView>

      {/* (7) Floating assistant — hidden when PESO switches it off in System Settings. */}
      {systemStatus.chatbot_enabled ? <AskAceButton bottom={fabBottom} /> : null}
    </View>
  )
}

function FairMeta({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.fairMeta}>
      <MaterialIcons name={icon} size={15} color={colors.iconBlue} />
      <Text style={styles.fairMetaText} numberOfLines={1}>{text}</Text>
    </View>
  )
}

function AskAceButton({ bottom }: { bottom: number }) {
  const m = useMotion()
  return (
    <Animated.View style={[styles.fabWrap, { bottom }]} entering={m.enabled ? FadeInUp.delay(m.stagger(2)).duration(m.duration('normal')) : undefined}>
      <PressableScale
        scaleTo="buttonPress"
        ripple={null}
        haptics
        onPress={() => router.push('/(seeker)/assistant')}
        accessibilityRole="button"
        accessibilityLabel="Ask ACE, your i-PESO assistant"
        style={styles.fabShadow}
      >
        <LinearGradient colors={[...gradients.cta]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fab}>
          <MaterialIcons name="chat-bubble-outline" size={22} color={colors.white} />
          <Text style={styles.fabText}>Ask ACE</Text>
        </LinearGradient>
      </PressableScale>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  flexOne: { flex: 1 },
  gutter: { paddingHorizontal: spacing.lg },
  gutterMargin: { marginHorizontal: spacing.lg },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1, minHeight: 48 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.tint, borderWidth: 2, borderColor: colors.tintBorder, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { ...textStyles.title, color: colors.figure, lineHeight: undefined },
  greeting: { ...textStyles.small, color: colors.textSecondary },
  name: { ...textStyles.heading, color: colors.textPrimary },
  bellBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  bellBadge: { position: 'absolute', top: -2, right: -2, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  bellBadgeText: { fontSize: 11, fontFamily: typography.family.bold, color: colors.accentText },

  heroWrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  hero: { borderRadius: radii.xl, padding: spacing.xl, overflow: 'hidden', ...shadows.lg },
  heroDecorA: { position: 'absolute', top: -50, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: colors.white, opacity: 0.06 },
  heroDecorB: { position: 'absolute', bottom: -70, right: 40, width: 120, height: 120, borderRadius: 60, backgroundColor: colors.blue400, opacity: 0.1 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  heroKicker: { ...textStyles.label, color: colors.blue200 },
  heroTitle: { ...textStyles.title, color: colors.white, marginTop: spacing.xs },
  heroMessage: { fontSize: 13, lineHeight: 18, fontFamily: typography.family.regular, color: colors.blue100, marginTop: 2 },
  heroCta: { marginTop: spacing.lg + 2 },

  alertBox: { marginHorizontal: spacing.lg, marginBottom: spacing.md },
  errorBox: { marginHorizontal: spacing.lg, marginBottom: spacing.lg },

  // Hero margin (16) + this (8) = the 24pt section gap, with or without the announcement banner
  // (which ends with its own 16pt margin).
  section: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  sectionTight: { paddingTop: spacing.xl },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { ...textStyles.title, color: colors.textPrimary },
  linkBtn: { flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingLeft: spacing.md },
  linkText: { ...textStyles.bodyBold, color: colors.link },

  quickRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  quickItem: { flex: 1, alignItems: 'center', gap: spacing.sm, minHeight: 84, paddingVertical: spacing.xs },
  quickTile: { width: 56, height: 56, borderRadius: radii.lg, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { ...textStyles.smallMedium, color: colors.textPrimary, textAlign: 'center' },

  chipRow: { flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.md },
  carousel: { flexGrow: 0 },
  carouselContent: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.md },
  carouselSkeleton: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  skeletonCard: { width: HOME_JOB_CARD_WIDTH, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: spacing.lg },
  skeletonTop: { flexDirection: 'row', justifyContent: 'space-between' },
  skeletonGap: { marginTop: spacing.md },
  skeletonGapSm: { marginTop: spacing.sm },

  stateCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.sunken },
  stateTitle: { ...textStyles.bodyBold, color: colors.textPrimary },
  stateBody: { ...textStyles.small, color: colors.textSecondary, marginTop: 2 },
  stateBtn: { alignSelf: 'flex-start', marginTop: spacing.sm },

  fairCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md + 2, padding: spacing.md + 2, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, ...shadows.sm },
  registeredPill: { flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start', backgroundColor: colors.secondary, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 2, marginBottom: spacing.xs },
  registeredText: { fontSize: 11, fontFamily: typography.family.bold, color: colors.white },
  fairTitle: { ...textStyles.bodyBold, fontSize: 15, color: colors.textPrimary },
  fairMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs + 2 },
  fairMetaText: { ...textStyles.small, color: colors.textSecondary, flexShrink: 1 },
  employersPill: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start', backgroundColor: colors.tint, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 3, marginTop: spacing.sm },
  employersText: { fontSize: 11, fontFamily: typography.family.bold, color: colors.iconBlue },

  helpLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs + 2, minHeight: 44, marginTop: spacing.lg },
  helpLinkText: { ...textStyles.smallBold, color: colors.link, fontSize: 13 },

  fabWrap: { position: 'absolute', right: spacing.lg },
  fabShadow: { borderRadius: radii.pill, ...shadows.ctaGlow },
  fab: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, height: 56, paddingLeft: spacing.lg, paddingRight: spacing.xl, borderRadius: radii.pill },
  fabText: { ...textStyles.bodyBold, color: colors.white },
})

import { useState } from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import type { SeekerNotification } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { useMotion } from '@/hooks/useMotion'
import { PressableScale } from '@/components/ui/PressableScale'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton'
import { colors, radii, spacing, typography } from '@/theme'
import { formatDistanceToNow, isToday } from 'date-fns'
import { reviewKeyFromNotification } from '@/utils/reviews'

function groupFor(createdAt?: string | null) {
  if (!createdAt) return 'Earlier'
  const date = new Date(createdAt)
  return !Number.isNaN(date.getTime()) && isToday(date) ? 'Today' : 'Earlier'
}

// Every backend Notification class (ApplicationStatusNotification, GovernmentProgramNotification,
// InterviewBaseNotification, JobFairNotification/JobFairPublished) keys this as `data.type` — it
// was previously checked here as `data.action_type`, a field the backend never actually sends, so
// that branch could never fire. The presence-based checks (application_id/program_id/job_fair_id)
// happened to mask it for most notifications, but `type` is the real, authoritative source.
function iconForNotification(data?: SeekerNotification['data']): React.ComponentProps<typeof MaterialIcons>['name'] {
  switch (data?.type) {
    case 'application_status':
      return 'work'
    case 'government_program':
      return 'school'
    case 'job_fair':
      return 'event'
    case 'job_vacancy':
      return 'new-releases'
    case 'interview':
      return 'event-available'
    case 'announcement':
      return 'campaign'
    default:
      if (data?.application_id) return 'work'
      if (data?.program_id) return 'school'
      if (data?.job_fair_id) return 'event'
      if (data?.post_id) return 'new-releases'
      return 'notifications'
  }
}

// Notifications is a hidden sibling in the Tabs navigator, so router.back() has no history and
// lands on the first tab (Home). Go back to where the visitor opened it from instead. The origin
// is remembered because returning from a screen opened here (job, review…) arrives without it.
let openedFrom: 'home' | 'profile' = 'home'

export default function NotificationsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { from } = useLocalSearchParams<{ from?: string }>()
  if (from === 'profile' || from === 'home') openedFrom = from
  const goBack = () => router.replace(openedFrom === 'profile' ? '/(seeker)/profile' : '/(seeker)')
  const queryClient = useQueryClient()
  const m = useMotion()
  const [refreshing, setRefreshing] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => seekerService.getNotifications(),
    // The Home bell badge already polls every 30s (index.tsx) — this list never did, so a
    // status update landing while this screen is open (not just backgrounded) wouldn't show
    // up until a manual pull-to-refresh or a full remount. Matches the badge's cadence.
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
  })
  const notifications = data?.notifications ?? []
  const unreadCount = data?.unread_count ?? 0

  // Optimistic mark-read (redesign UX rule): the dots clear and the Home bell count drops at
  // once; both caches roll back if the request fails, and re-sync from the server afterwards.
  type NotificationsCache = typeof data
  const applyRead = (ids: string[] | 'all') => {
    const now = new Date().toISOString()
    queryClient.setQueryData<NotificationsCache>(['notifications'], (current) => {
      if (!current) return current
      let cleared = 0
      const next = (current.notifications ?? []).map((n) => {
        if (n.read_at || (ids !== 'all' && !ids.includes(n.id))) return n
        cleared += 1
        return { ...n, read_at: now }
      })
      return { ...current, notifications: next, unread_count: Math.max(0, (current.unread_count ?? 0) - cleared) }
    })
    queryClient.setQueryData<number>(['notificationsUnreadCount'], (count) =>
      ids === 'all' ? 0 : Math.max(0, (count ?? 0) - ids.length)
    )
  }
  const snapshot = async () => {
    await queryClient.cancelQueries({ queryKey: ['notifications'] })
    return {
      list: queryClient.getQueryData<NotificationsCache>(['notifications']),
      count: queryClient.getQueryData<number>(['notificationsUnreadCount']),
    }
  }
  const rollback = (context?: { list: NotificationsCache; count: number | undefined }) => {
    if (!context) return
    queryClient.setQueryData(['notifications'], context.list)
    queryClient.setQueryData(['notificationsUnreadCount'], context.count)
  }
  const resync = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
    queryClient.invalidateQueries({ queryKey: ['notificationsUnreadCount'] })
  }

  const markAllReadMutation = useMutation({
    mutationFn: () => seekerService.markNotificationsRead(),
    onMutate: async () => {
      const context = await snapshot()
      applyRead('all')
      return context
    },
    onError: (_error, _vars, context) => rollback(context),
    onSettled: resync,
  })

  const markReadMutation = useMutation({
    mutationFn: (id: string) => seekerService.markNotificationRead(id),
    onMutate: async (id) => {
      const context = await snapshot()
      applyRead([id])
      return context
    },
    onError: (_error, _vars, context) => rollback(context),
    onSettled: resync,
  })

  const onRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  // Routing is driven by payload fields, not the raw action_url: the backend's
  // action_url points at web routes (and is outright broken/employer-facing for
  // job fairs), so it can't be trusted for in-app navigation.
  //
  // Interview notifications deep-link to the application detail screen so the
  // Job Seeker lands directly on the Interview Details section with the
  // [Join Interview] button — mirrors routeForPushData() in pushNotifications.ts.
  const handleNotificationPress = (notification: SeekerNotification) => {
    if (!notification.read_at) {
      markReadMutation.mutate(notification.id)
    }

    // Review notifications go first: invitations also carry application_id, which the
    // branch below would otherwise send to the Applications list.
    const notificationType = notification.data?.type
    if (notificationType === 'review_invitation') {
      const review = reviewKeyFromNotification(notification.data)
      router.push({ pathname: '/(seeker)/reviews', params: review ? { review, from: 'notifications' } : { from: 'notifications' } })
    } else if (notificationType === 'review_moderated' || notificationType === 'worker_feedback_received') {
      router.push({ pathname: '/(seeker)/reviews', params: { from: 'notifications' } })
    } else if (notificationType === 'safety_report_update') {
      router.push({
        pathname: '/(seeker)/safety-reports',
        params: notification.data?.report_id ? { case: String(notification.data.report_id), from: 'notifications' } : { from: 'notifications' },
      })
    } else if (notificationType === 'safety_action_notice') {
      // A notice from PESO about this account: no screen of its own. Marked read above;
      // stay here rather than falling through to another branch.
    } else if (notificationType === 'announcement') {
      // Before the job_fair_id / program_id fallbacks; action_url is a web path, so not used.
      router.push({
        pathname: '/(seeker)/announcements',
        params: notification.data?.announcement_id ? { open: String(notification.data.announcement_id), from: 'notifications' } : { from: 'notifications' },
      })
    } else if (notification.data?.type === 'interview' && notification.data?.application_id) {
      router.push(`/(seeker)/applications/${notification.data.application_id}` as any)
    } else if (notification.data?.application_id) {
      router.push('/(seeker)/applications')
    } else if (notification.data?.program_id) {
      router.push(`/(seeker)/government-programs/${notification.data.program_id}`)
    } else if (notification.data?.job_fair_id) {
      router.push({ pathname: '/(seeker)/job-fairs', params: { from: 'notifications' } })
    } else if (notification.data?.post_id) {
      router.push({ pathname: '/(seeker)/jobs/[id]', params: { id: String(notification.data.post_id), from: 'notifications' } })
    }
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader
        title="Notifications"
        onBack={goBack}
        right={
          unreadCount > 0 ? (
            <PressableScale scaleTo="buttonPress" ripple={null} haptics onPress={() => markAllReadMutation.mutate()} disabled={markAllReadMutation.isPending} style={styles.markAllBtn} accessibilityRole="button">
              <Text style={styles.markAllText}>Mark all read</Text>
            </PressableScale>
          ) : null
        }
      />

      {isLoading ? (
        <ScreenSkeleton label="Loading notifications" />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={[styles.listContent, { paddingBottom: spacing.xxxl + insets.bottom }]}
          ListEmptyComponent={
            <EmptyState
              art="bell"
              title="No notifications yet"
              message="We'll let you know when employers update your applications or when matching jobs are posted."
            />
          }
          renderItem={({ item, index }) => {
            const isUnread = !item.read_at
            // Today / Earlier group headings (redesign "25 — Notifications"); the list is
            // newest-first, so a heading shows where the group changes.
            const group = groupFor(item.created_at)
            const showHeading = index === 0 || groupFor(notifications[index - 1]?.created_at) !== group

            return (
              <Animated.View entering={m.enabled ? FadeInUp.delay(m.stagger(index)).duration(m.duration('normal')) : undefined}>
                {showHeading ? <Text style={styles.groupHeading} accessibilityRole="header">{group}</Text> : null}
                <PressableScale
                  scaleTo="cardPress"
                  ripple={null}
                  onPress={() => handleNotificationPress(item)}
                  style={[styles.row, isUnread && styles.rowUnread]}
                  accessibilityRole="button"
                  accessibilityLabel={`${isUnread ? 'Unread. ' : ''}${item.data?.title || 'Notification'}. ${item.data?.message ?? ''}`}
                >
                  <View style={styles.iconContainer}>
                    <MaterialIcons name={iconForNotification(item.data)} size={22} color={colors.iconBlue} />
                  </View>
                  <View style={styles.contentContainer}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.itemTitle, isUnread && styles.unreadText]}>{item.data?.title || 'Notification'}</Text>
                      <Text style={styles.timeText}>
                        {item.created_at ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true }) : ''}
                      </Text>
                    </View>
                    <Text style={styles.itemMessage}>{item.data?.message}</Text>
                  </View>
                  {isUnread ? <View style={styles.unreadDot} /> : <View style={styles.dotSpacer} />}
                </PressableScale>
              </Animated.View>
            )
          }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  markAllText: { color: colors.link, fontSize: 13, fontFamily: typography.family.bold },
  markAllBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.xs },
  listContent: { paddingBottom: spacing.xxxl },
  groupHeading: { fontSize: typography.label, lineHeight: 14, letterSpacing: 0.4, fontFamily: typography.family.bold, color: colors.subtle, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  // Full-width rows; unread = sunken tint + blue dot (the dot, not colour alone, carries it).
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 2, backgroundColor: colors.surface },
  rowUnread: { backgroundColor: colors.sunken },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: radii.md + 2,
    backgroundColor: colors.tint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: { flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm, marginBottom: 2 },
  itemTitle: { fontSize: typography.body, lineHeight: 20, color: colors.textPrimary, fontFamily: typography.family.medium, flex: 1 },
  unreadText: { fontFamily: typography.family.bold },
  timeText: { fontSize: 11, lineHeight: 16, color: colors.subtle },
  itemMessage: { fontSize: typography.small, color: colors.textSecondary, lineHeight: 18 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.secondary, marginTop: 6 },
  dotSpacer: { width: 8 },
})

import { useEffect, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { seekerService } from '@/services/seekerService'
import { apiErrorMessage } from '@/utils/apiError'
import { ANNOUNCEMENT_CATEGORIES, ANNOUNCEMENT_KEYS, formatAnnouncementDateTime } from '@/utils/announcements'
import { useToast } from '@/stores/toastStore'
import { AnnouncementSheet, CategoryChip, PinnedMark, PriorityPill } from '@/components/announcements/AnnouncementSheet'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PressableScale } from '@/components/ui/PressableScale'
import { QueryState } from '@/components/ui/QueryState'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { colors, radii, spacing, textStyles } from '@/theme'

// Rebuilt from i-peso-frontend/src/pages/shared/AnnouncementsFeedPage.jsx (job seeker view).
// The website pages with Previous/Next; on a phone the list grows with "Load more".

// announcements is a flat sibling in the Tabs navigator, so router.back() has no real history.
function backTargetFor(from: string | undefined): string {
  if (from === 'notifications') return '/(seeker)/notifications'
  if (from === 'profile') return '/(seeker)/profile'
  return '/(seeker)'
}

export default function AnnouncementsScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  // A bell notification or push links here as open=12 (the website's ?open=).
  const { open: openParam, from } = useLocalSearchParams<{ open?: string; from?: string }>()
  const [category, setCategory] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  // Open the requested announcement, then clear the param so it doesn't reopen on its own.
  useEffect(() => {
    if (!openParam) return
    setOpenId(openParam)
    router.setParams({ open: undefined })
  }, [openParam, router])

  const feed = useInfiniteQuery({
    queryKey: [...ANNOUNCEMENT_KEYS.feed, category],
    queryFn: ({ pageParam }) => seekerService.announcements({ category, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.current_page < last.last_page ? last.current_page + 1 : undefined),
  })
  const items = feed.data?.pages.flatMap((page) => page.data) ?? []
  const unread = feed.data?.pages[0]?.unread_count ?? 0

  const readAll = useMutation({
    mutationFn: () => seekerService.readAllAnnouncements(),
    onSuccess: () => {
      showToast('All announcements marked as read.', 'success')
      queryClient.invalidateQueries({ queryKey: ANNOUNCEMENT_KEYS.all })
    },
    onError: (caught) => showToast(apiErrorMessage(caught, 'Unable to mark announcements as read.'), 'error'),
  })

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Announcements" onBack={() => router.replace(backTargetFor(from) as never)} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={feed.isRefetching && !feed.isFetchingNextPage} onRefresh={() => feed.refetch()} tintColor={colors.info} />}
      >
        <Text style={styles.kicker}>PESO Urdaneta</Text>
        <Text style={styles.intro}>
          Official notices from the Public Employment Service Office for job seekers — office advisories, events, programs and system updates.
        </Text>
        {unread > 0 ? (
          <Button variant="outline" size="sm" onPress={() => readAll.mutate()} loading={readAll.isPending} style={styles.readAll}>
            {`Mark all as read (${unread})`}
          </Button>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} accessibilityLabel="Filter by category">
          {[{ value: '', label: 'All' }, ...ANNOUNCEMENT_CATEGORIES].map((item) => {
            const selected = category === item.value
            return (
              <Pressable
                key={item.value || 'all'}
                onPress={() => setCategory(item.value)}
                style={[styles.chip, selected && styles.chipSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{item.label}</Text>
              </Pressable>
            )
          })}
        </ScrollView>

        <QueryState
          isLoading={feed.isLoading}
          error={feed.error}
          errorFallback="Announcements could not be loaded. Check your connection and try again."
          onRetry={() => feed.refetch()}
          isEmpty={items.length === 0}
          emptyIcon="campaign"
          emptyTitle={category ? 'No announcements in this category' : 'No announcements right now'}
          emptyMessage="New notices from PESO will appear here."
        >
          {items.map((item) => (
            <PressableScale
              key={item.id}
              scaleTo="cardPress"
              ripple={null}
              onPress={() => setOpenId(String(item.id))}
              accessibilityRole="button"
              accessibilityLabel={`${item.is_read ? '' : 'Unread. '}${item.title}`}
            >
              <Card padding="md" style={[styles.card, !item.is_read && styles.cardUnread]}>
                <View style={styles.metaRow}>
                  {!item.is_read ? <View style={styles.unreadDot} accessibilityLabel="Unread" /> : null}
                  <CategoryChip category={item.category} label={item.category_label} />
                  <PriorityPill priority={item.priority} label={item.priority_label} />
                  {item.is_pinned ? <PinnedMark /> : null}
                </View>
                <Text style={styles.date}>{formatAnnouncementDateTime(item.publish_at)}</Text>
                <Text style={[styles.title, !item.is_read && styles.titleUnread]}>{item.title}</Text>
                <Text style={styles.excerpt} numberOfLines={2}>{item.excerpt}</Text>
                <View style={styles.footer}>
                  <Text style={styles.readLink}>Read announcement</Text>
                  {item.has_attachment ? (
                    <View style={styles.inline}>
                      <MaterialIcons name="attach-file" size={14} color={colors.textSecondary} />
                      <Text style={styles.attachmentHint}>Attachment</Text>
                    </View>
                  ) : null}
                </View>
              </Card>
            </PressableScale>
          ))}

          {feed.hasNextPage ? (
            <Button variant="outline" size="sm" onPress={() => feed.fetchNextPage()} loading={feed.isFetchingNextPage} style={styles.loadMore}>
              Load more
            </Button>
          ) : null}
        </QueryState>
      </ScrollView>

      {openId ? <AnnouncementSheet key={openId} id={openId} onClose={() => setOpenId(null)} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  kicker: { ...textStyles.label, color: colors.secondary, textTransform: 'uppercase', letterSpacing: 1 },
  intro: { ...textStyles.small, color: colors.textSecondary, lineHeight: 18, marginTop: spacing.xs },
  readAll: { alignSelf: 'flex-start', marginTop: spacing.md },
  chips: { gap: spacing.sm, paddingVertical: spacing.md },
  chip: { minHeight: 36, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radii.pill, paddingHorizontal: spacing.md },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...textStyles.smallBold, color: colors.textSecondary },
  chipTextSelected: { color: colors.white },
  card: { marginBottom: spacing.md },
  cardUnread: { borderColor: colors.borderStrong },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.secondary },
  date: { ...textStyles.small, color: colors.subtle, marginTop: spacing.xs },
  title: { ...textStyles.bodyMedium, color: colors.textPrimary, marginTop: spacing.xs },
  titleUnread: { ...textStyles.bodyBold },
  excerpt: { ...textStyles.small, color: colors.textSecondary, lineHeight: 18, marginTop: spacing.xs },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  readLink: { ...textStyles.smallBold, color: colors.primary },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  attachmentHint: { ...textStyles.small, color: colors.textSecondary },
  loadMore: { alignSelf: 'center', marginTop: spacing.sm },
})

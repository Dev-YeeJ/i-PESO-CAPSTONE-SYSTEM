import { useEffect, useState } from 'react'
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as FileSystem from 'expo-file-system/legacy'
import * as SecureStore from 'expo-secure-store'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import type { Announcement } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { ANNOUNCEMENT_KEYS, categoryIcon, formatAnnouncementDateTime } from '@/utils/announcements'
import { downloadAndShare } from '@/utils/fileTransfer'
import { openPortalLink } from '@/utils/links'
import { Badge } from '@/components/ui/Badge'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { PressableScale } from '@/components/ui/PressableScale'
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton'
import { colors, radii, spacing, textStyles } from '@/theme'

// Rebuilt from i-peso-frontend/src/components/announcements/AnnouncementDetailDialog.jsx and
// AnnouncementPieces.jsx.

/** One announcement. Mount only while open (`{id ? <AnnouncementSheet … /> : null}`). */
export function AnnouncementSheet({ id, onClose }: { id: number | string; onClose: () => void }) {
  const router = useRouter()
  const queryClient = useQueryClient()

  // This request is what marks the announcement read.
  const detail = useQuery({
    queryKey: ANNOUNCEMENT_KEYS.detail(id),
    queryFn: () => seekerService.announcement(id),
    staleTime: 60_000,
  })
  const announcement = detail.data?.announcement

  useEffect(() => {
    if (detail.isSuccess) {
      queryClient.invalidateQueries({ queryKey: ANNOUNCEMENT_KEYS.feed })
      queryClient.invalidateQueries({ queryKey: ANNOUNCEMENT_KEYS.banner })
      queryClient.invalidateQueries({ queryKey: ANNOUNCEMENT_KEYS.unread })
    }
  }, [detail.isSuccess, queryClient])

  const openLink = () => {
    if (announcement && openPortalLink(announcement.link_url, router)) onClose()
  }

  return (
    <BottomSheet visible onClose={onClose} title={announcement ? 'Announcement' : detail.isError ? 'Announcement unavailable' : 'Announcement'} heightRatio={0.88}>
      {detail.isLoading ? (
        <ScreenSkeleton label="Loading announcement" />
      ) : detail.isError || !announcement ? (
        <View style={styles.body}>
          <Text style={styles.muted}>This announcement has ended or is no longer available.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <View style={styles.metaRow}>
            <CategoryChip category={announcement.category} label={announcement.category_label} />
            <PriorityPill priority={announcement.priority} label={announcement.priority_label} />
            {announcement.is_pinned ? <PinnedMark /> : null}
          </View>
          <Text style={styles.title} accessibilityRole="header">{announcement.title}</Text>
          <Text style={styles.meta}>Posted by PESO Urdaneta · {formatAnnouncementDateTime(announcement.publish_at)}</Text>
          {announcement.expires_at ? (
            <View style={styles.inline}>
              <MaterialIcons name="event-busy" size={14} color={colors.textSecondary} />
              <Text style={styles.meta}>Until {formatAnnouncementDateTime(announcement.expires_at)}</Text>
            </View>
          ) : null}

          {/* Plain text with the author's line breaks kept — never rendered as HTML/markdown. */}
          <Text style={styles.bodyText} selectable>{announcement.body}</Text>

          {announcement.has_attachment ? <ReaderAttachment announcement={announcement} /> : null}

          {announcement.link_url ? (
            <Button onPress={openLink} style={styles.linkButton}>
              {announcement.link_label || 'Learn more'}
            </Button>
          ) : null}
        </ScrollView>
      )}
    </BottomSheet>
  )
}

export function CategoryChip({ category, label }: { category: string; label: string }) {
  return (
    <View style={styles.chip}>
      <MaterialIcons name={categoryIcon(category)} size={12} color={colors.textSecondary} />
      <Text style={styles.chipText}>{label}</Text>
    </View>
  )
}

/** Only Important and Urgent get a pill, as on the website. */
export function PriorityPill({ priority, label }: { priority: string; label: string }) {
  if (priority !== 'important' && priority !== 'urgent') return null
  return <Badge variant={priority === 'urgent' ? 'danger' : 'warning'}>{label || (priority === 'urgent' ? 'Urgent' : 'Important')}</Badge>
}

export function PinnedMark() {
  return (
    <View style={styles.inline} accessibilityLabel="Pinned to the top">
      <MaterialIcons name="push-pin" size={12} color={colors.primary} />
      <Text style={styles.pinned}>Pinned</Text>
    </View>
  )
}

/**
 * The attachment streams from the API with the seeker's token. Images are downloaded to the
 * cache first and shown from there (an <Image> with auth headers fails silently on some
 * devices); PDFs download and open in the share sheet, like resume PDFs.
 */
function ReaderAttachment({ announcement }: { announcement: Announcement }) {
  const url = seekerService.announcementAttachmentUrl(announcement.id)
  const name = announcement.attachment_name ?? 'Attachment'
  const [opening, setOpening] = useState(false)
  const [failed, setFailed] = useState(false)

  const image = useQuery({
    queryKey: ['announcements', 'attachment', String(announcement.id)],
    enabled: announcement.attachment_is_image,
    staleTime: Infinity,
    retry: 1,
    queryFn: async () => {
      const token = await SecureStore.getItemAsync('ipeso_token')
      const extension = name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
      const result = await FileSystem.downloadAsync(url, `${FileSystem.cacheDirectory}announcement-${announcement.id}.${extension}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (result.status >= 400) throw new Error(`HTTP ${result.status}`)
      return result.uri
    },
  })

  if (failed || image.isError) {
    return <Text style={[styles.meta, styles.attachment]}>The attachment could not be loaded.</Text>
  }

  if (announcement.attachment_is_image) {
    if (!image.data) {
      return <View style={[styles.attachment, styles.imageLoading]} accessibilityLabel="Loading attachment"><ActivityIndicator color={colors.info} /></View>
    }
    return (
      <View style={[styles.attachment, styles.imageFrame]}>
        <Image source={{ uri: image.data }} style={styles.image} resizeMode="contain" accessibilityLabel={name} onError={() => setFailed(true)} />
      </View>
    )
  }

  const open = async () => {
    setOpening(true)
    try {
      await downloadAndShare(url, name, 'application/pdf', name)
    } catch {
      setFailed(true)
    } finally {
      setOpening(false)
    }
  }

  return (
    <PressableScale
      scaleTo="buttonPress"
      ripple={null}
      onPress={open}
      disabled={opening}
      style={[styles.attachment, styles.fileRow]}
      accessibilityRole="button"
      accessibilityLabel={`Open attachment ${name}`}
    >
      <MaterialIcons name="picture-as-pdf" size={20} color={colors.error} />
      <Text style={[styles.fileName, styles.flex]} numberOfLines={1}>{name}</Text>
      {opening ? <ActivityIndicator size="small" color={colors.info} /> : <MaterialIcons name="attach-file" size={18} color={colors.subtle} />}
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  flex: { flex: 1 },
  muted: { ...textStyles.body, color: colors.textSecondary },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  chip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.sunken, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  chipText: { ...textStyles.label, color: colors.textSecondary },
  pinned: { ...textStyles.label, color: colors.primary },
  title: { ...textStyles.title, color: colors.textPrimary, marginTop: spacing.md },
  meta: { ...textStyles.small, color: colors.textSecondary, marginTop: spacing.xs },
  bodyText: { ...textStyles.body, color: colors.textPrimary, lineHeight: 22, marginTop: spacing.lg },
  attachment: { marginTop: spacing.lg },
  imageLoading: { height: 120, borderRadius: radii.lg, backgroundColor: colors.sunken, alignItems: 'center', justifyContent: 'center' },
  imageFrame: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, overflow: 'hidden', backgroundColor: colors.sunken },
  image: { width: '100%', height: 280 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.sunken, borderRadius: radii.lg, paddingHorizontal: spacing.md },
  fileName: { ...textStyles.smallBold, color: colors.textPrimary },
  linkButton: { marginTop: spacing.lg, alignSelf: 'flex-start' },
})

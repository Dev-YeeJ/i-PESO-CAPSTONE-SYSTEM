import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { seekerService } from '@/services/seekerService'
import { ANNOUNCEMENT_KEYS } from '@/utils/announcements'
import { colors, radii, spacing, textStyles } from '@/theme'
import { AnnouncementSheet } from './AnnouncementSheet'

// Rebuilt from i-peso-frontend/src/components/announcements/AnnouncementBanner.jsx.

/**
 * Home banner: live Important/Urgent announcements this seeker hasn't dismissed (the API sends
 * at most 3, urgent first). Renders nothing — and never blocks Home — when there are none or
 * the request fails. Urgent uses the red error tokens; Important only a light amber tint.
 */
export function AnnouncementBanner() {
  const queryClient = useQueryClient()
  const [openId, setOpenId] = useState<number | null>(null)
  const [hidden, setHidden] = useState<Set<number>>(() => new Set())

  const banner = useQuery({
    queryKey: ANNOUNCEMENT_KEYS.banner,
    queryFn: () => seekerService.announcementBanner(),
    staleTime: 60_000,
    retry: false,
  })

  const items = (banner.data?.data ?? []).filter((item) => !hidden.has(item.id))

  const dismiss = async (id: number) => {
    // Hide at once; dismissing only removes it from this banner, not from the Announcements screen.
    setHidden((current) => new Set(current).add(id))
    try {
      await seekerService.dismissAnnouncement(id)
    } catch {
      // The banner query below re-syncs; a failed dismiss just shows it again next time.
    } finally {
      queryClient.invalidateQueries({ queryKey: ANNOUNCEMENT_KEYS.banner })
      queryClient.invalidateQueries({ queryKey: ANNOUNCEMENT_KEYS.feed })
    }
  }

  const sheet = openId ? <AnnouncementSheet key={openId} id={openId} onClose={() => setOpenId(null)} /> : null
  if (!items.length) return sheet

  return (
    <>
      <View style={styles.list} accessibilityLabel="PESO announcements">
        {items.map((item) => {
          const urgent = item.priority === 'urgent'
          return (
            <View key={item.id} style={[styles.card, urgent ? styles.cardUrgent : styles.cardImportant]}>
              <View style={[styles.iconWrap, urgent && styles.iconWrapUrgent]}>
                <MaterialIcons name="campaign" size={18} color={urgent ? colors.error : colors.primary} />
              </View>
              <View style={styles.flex}>
                <Text style={[styles.kicker, urgent && styles.kickerUrgent]}>
                  {urgent ? 'Urgent PESO announcement' : 'PESO announcement'}
                </Text>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.excerpt} numberOfLines={2}>{item.excerpt}</Text>
                <Pressable onPress={() => setOpenId(item.id)} hitSlop={8} style={styles.readMore} accessibilityRole="button" accessibilityLabel={`Read more: ${item.title}`}>
                  <Text style={styles.readMoreText}>Read more</Text>
                </Pressable>
              </View>
              <Pressable
                onPress={() => dismiss(item.id)}
                style={styles.dismiss}
                accessibilityRole="button"
                accessibilityLabel={`Dismiss announcement: ${item.title}`}
              >
                <MaterialIcons name="close" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
          )
        })}
      </View>
      {sheet}
    </>
  )
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  flex: { flex: 1 },
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, borderWidth: 1, borderRadius: radii.lg, padding: spacing.md },
  cardImportant: { backgroundColor: colors.warningBackground, borderColor: colors.warningBorder },
  cardUrgent: { backgroundColor: colors.errorBackground, borderColor: colors.errorBorder },
  iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  iconWrapUrgent: {},
  kicker: { ...textStyles.label, color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  kickerUrgent: { color: colors.error },
  title: { ...textStyles.bodyBold, color: colors.textPrimary, marginTop: 2 },
  excerpt: { ...textStyles.small, color: colors.textSecondary, lineHeight: 18, marginTop: 2 },
  readMore: { alignSelf: 'flex-start', marginTop: spacing.sm, minHeight: 24, justifyContent: 'center' },
  readMoreText: { ...textStyles.smallBold, color: colors.secondary, textDecorationLine: 'underline' },
  dismiss: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginTop: -spacing.sm, marginRight: -spacing.sm },
})

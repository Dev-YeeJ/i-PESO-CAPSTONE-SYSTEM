import { Image, StyleSheet, Text, View } from 'react-native'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import type { JobFairPoster } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { useAuthStore } from '@/stores/authStore'
import { Card } from '@/components/ui/Card'
import { colors, radii, spacing, typography } from '@/theme'

const avatarTones = [colors.info, colors.secondary, colors.success, colors.warning, colors.error]
const toneFor = (name?: string | null) => {
  const source = name || '?'
  let sum = 0
  for (let i = 0; i < source.length; i += 1) sum += source.charCodeAt(i)
  return avatarTones[sum % avatarTones.length]
}
const initialsFor = (name?: string | null) =>
  (name || '?').trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase()

function timeAgo(iso?: string | null): string {
  if (!iso) return ''
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  const units: Array<[string, number]> = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]]
  for (const [label, secondsPerUnit] of units) {
    const value = Math.floor(seconds / secondsPerUnit)
    if (value >= 1) return `${value} ${label}${value === 1 ? '' : 's'} ago`
  }
  return 'just now'
}

export function PosterFeedCard({ poster }: { poster: JobFairPoster }) {
  const token = useAuthStore((state) => state.token)
  const isImage = (poster.mime_type || '').startsWith('image/')
  const metaLine = [poster.job_fair_title, poster.venue, timeAgo(poster.posted_at)].filter(Boolean).join(' · ')

  return (
    <Card padding="sm" style={styles.card} contentStyle={styles.content}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: toneFor(poster.company_name) }]}>
          <Text style={styles.avatarText}>{initialsFor(poster.company_name)}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.company} numberOfLines={1}>{poster.company_name || 'Employer'}</Text>
          <Text style={styles.meta} numberOfLines={1}>{metaLine}</Text>
        </View>
      </View>

      {isImage && token ? (
        <Image
          source={{ uri: seekerService.jobFairPosterUrl(poster.id), headers: { Authorization: `Bearer ${token}` } }}
          style={styles.poster}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.docRow}>
          <MaterialIcons name="description" size={28} color={colors.info} />
          <Text style={styles.docName} numberOfLines={1}>{poster.original_filename || 'Poster'}</Text>
        </View>
      )}

      <View style={styles.footer}>
        <MaterialIcons name="verified" size={14} color={colors.subtle} />
        <Text style={styles.footerText}>PESO-approved employer posting</Text>
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  content: { gap: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.sm },
  avatar: { width: 40, height: 40, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.white, fontSize: typography.small, fontFamily: typography.family.bold },
  headerText: { flex: 1 },
  company: { color: colors.textPrimary, fontSize: typography.body, fontFamily: typography.family.bold },
  meta: { color: colors.textSecondary, fontSize: typography.small, marginTop: 2 },
  poster: { width: '100%', aspectRatio: 4 / 3, borderRadius: radii.md, backgroundColor: colors.background },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.lg, backgroundColor: colors.background, borderRadius: radii.md },
  docName: { flex: 1, color: colors.textPrimary, fontSize: typography.small, fontFamily: typography.family.bold },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingTop: spacing.sm },
  footerText: { color: colors.subtle, fontSize: typography.small },
})

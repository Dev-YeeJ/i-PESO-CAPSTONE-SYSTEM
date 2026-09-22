import { useState } from 'react'
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import type { JobFairPoster } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { useAuthStore } from '@/stores/authStore'
import { downloadAndShare } from '@/utils/fileTransfer'
import { useMotion } from '@/hooks/useMotion'
import { useToast } from '@/stores/toastStore'
import { Card } from '@/components/ui/Card'
import { ImagePreviewModal } from '@/components/ui/ImagePreviewModal'
import { PressableScale } from '@/components/ui/PressableScale'
import { colors, radii, shadows, spacing, typography } from '@/theme'

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

export function PosterFeedCard({ poster, index }: { poster: JobFairPoster; index?: number }) {
  const router = useRouter()
  const token = useAuthStore((state) => state.token)
  const m = useMotion()
  const { showToast } = useToast()
  const [previewOpen, setPreviewOpen] = useState(false)
  const [opening, setOpening] = useState(false)
  const [fileIndex, setFileIndex] = useState(0)

  const files = poster.files ?? []
  const hasFiles = files.length > 0
  const hasMultiple = files.length > 1
  const currentFile = hasFiles ? files[Math.min(fileIndex, files.length - 1)] : null
  const isImage = (currentFile?.mime_type || '').startsWith('image/')
  const metaLine = [poster.job_fair_title, poster.venue, timeAgo(poster.posted_at)].filter(Boolean).join(' · ')
  const posterUrl = currentFile ? seekerService.jobFairPosterUrl(currentFile.id) : null
  const canViewBooth = poster.job_fair_id != null && poster.employer_id != null

  // React Native has no window.open — a document poster is downloaded (authenticated, same
  // as the image thumbnail) to local cache and handed to the OS share sheet, which lets the
  // user open it in whatever PDF/file viewer they already have. Mirrors the pattern this app
  // already uses for resumes (utils/fileTransfer.ts).
  const openDocument = async () => {
    if (opening || !currentFile || !posterUrl) return
    setOpening(true)
    try {
      await downloadAndShare(posterUrl, currentFile.original_filename || `poster-${currentFile.id}`)
    } catch {
      showToast('This poster could not be opened right now. Please try again.', 'error')
    } finally {
      setOpening(false)
    }
  }

  const openBooth = () => {
    // i-peso-frontend's PosterFeedTab links "View Booth" to the job-fair-scoped booth page
    // (/seeker/job-fairs/:fairId/employers/:employerId), not a generic employer profile —
    // it shows the vacancies confirmed for THIS fair with per-vacancy match%, which the
    // generic employer screen has no way to scope to a specific job fair.
    router.push({
      pathname: '/(seeker)/job-fairs/booth',
      params: { jobFairId: String(poster.job_fair_id), employerId: String(poster.employer_id), from: 'poster' },
    } as never)
  }

  return (
    <Animated.View entering={m.enabled ? FadeInUp.delay(m.stagger(index ?? 0)).duration(240) : undefined}>
    <Card padding="sm" style={styles.card} contentStyle={styles.content}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: toneFor(poster.company_name) }]}>
          <Text style={styles.avatarText}>{initialsFor(poster.company_name)}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.company} numberOfLines={1}>{poster.company_name || 'Employer'}</Text>
          <Text style={styles.meta} numberOfLines={1}>{metaLine}</Text>
        </View>
        {poster.match_percentage != null ? (
          <View style={styles.matchBadge}>
            <Text style={styles.matchBadgeText}>{Math.round(poster.match_percentage)}% match</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.mediaWrap}>
        {!hasFiles ? (
          <View style={styles.emptyFiles}>
            <MaterialIcons name="image-not-supported" size={20} color={colors.subtle} />
            <Text style={styles.emptyFilesText}>No files uploaded</Text>
          </View>
        ) : isImage && token ? (
          <PressableScale
            onPress={() => setPreviewOpen(true)}
            ripple={null}
            accessibilityRole="button"
            accessibilityLabel={`Open ${poster.company_name || 'employer'} poster image`}
          >
            <Image
              source={{ uri: posterUrl!, headers: { Authorization: `Bearer ${token}` } }}
              style={styles.poster}
              resizeMode="cover"
            />
          </PressableScale>
        ) : (
          <PressableScale
            onPress={openDocument}
            disabled={opening}
            ripple={null}
            style={styles.docRow}
            accessibilityRole="button"
            accessibilityLabel={`Open document ${currentFile?.original_filename || 'poster'}`}
          >
            {opening ? (
              <ActivityIndicator size="small" color={colors.info} />
            ) : (
              <MaterialIcons name="description" size={28} color={colors.info} />
            )}
            <View style={styles.docTextWrap}>
              <Text style={styles.docName} numberOfLines={1}>{currentFile?.original_filename || 'Poster'}</Text>
              <Text style={styles.docHint}>{opening ? 'Opening…' : 'Tap to open'}</Text>
            </View>
          </PressableScale>
        )}

        {hasMultiple ? (
          <>
            <PressableScale
              onPress={() => setFileIndex((current) => (current - 1 + files.length) % files.length)}
              ripple={null}
              style={[styles.navBtn, styles.navBtnLeft]}
              accessibilityRole="button"
              accessibilityLabel="Previous poster image"
            >
              <MaterialIcons name="chevron-left" size={20} color={colors.white} />
            </PressableScale>
            <PressableScale
              onPress={() => setFileIndex((current) => (current + 1) % files.length)}
              ripple={null}
              style={[styles.navBtn, styles.navBtnRight]}
              accessibilityRole="button"
              accessibilityLabel="Next poster image"
            >
              <MaterialIcons name="chevron-right" size={20} color={colors.white} />
            </PressableScale>

            <View style={styles.dotsRow}>
              {files.map((file, dotIndex) => (
                <PressableScale
                  key={String(file.id)}
                  onPress={() => setFileIndex(dotIndex)}
                  ripple={null}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={`Go to poster ${dotIndex + 1}`}
                >
                  <View style={[styles.dot, dotIndex === fileIndex && styles.dotActive]} />
                </PressableScale>
              ))}
            </View>

            <View style={styles.counter}>
              <Text style={styles.counterText}>{fileIndex + 1} / {files.length}</Text>
            </View>
          </>
        ) : null}
      </View>

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <MaterialIcons name="verified" size={14} color={colors.subtle} />
          <Text style={styles.footerText}>PESO-approved employer posting</Text>
        </View>
        {canViewBooth ? (
          <PressableScale
            scaleTo="buttonPress"
            ripple={null}
            style={styles.boothBtn}
            onPress={openBooth}
            accessibilityRole="button"
            accessibilityLabel={`View ${poster.company_name || 'employer'} booth`}
          >
            <Text style={styles.boothBtnText}>View Booth</Text>
            <MaterialIcons name="arrow-forward" size={13} color={colors.info} />
          </PressableScale>
        ) : null}
      </View>

      {isImage && token && posterUrl ? (
        <ImagePreviewModal
          visible={previewOpen}
          uri={posterUrl}
          headers={{ Authorization: `Bearer ${token}` }}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
    </Card>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  content: { gap: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.sm },
  matchBadge: { backgroundColor: colors.successBackground, borderWidth: 1, borderColor: colors.successBorder, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  matchBadgeText: { color: colors.success, fontSize: 10, fontFamily: typography.family.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  avatar: { width: 40, height: 40, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.white, fontSize: typography.small, fontFamily: typography.family.bold },
  headerText: { flex: 1 },
  company: { color: colors.textPrimary, fontSize: typography.body, fontFamily: typography.family.bold },
  meta: { color: colors.textSecondary, fontSize: typography.small, marginTop: 2 },
  mediaWrap: { position: 'relative' },
  emptyFiles: { alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.xxl, backgroundColor: colors.background, borderRadius: radii.md },
  emptyFilesText: { color: colors.subtle, fontSize: typography.small, fontFamily: typography.family.medium },
  poster: { width: '100%', aspectRatio: 4 / 3, borderRadius: radii.md, backgroundColor: colors.background },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.lg, backgroundColor: colors.background, borderRadius: radii.md },
  docTextWrap: { flex: 1 },
  docName: { color: colors.textPrimary, fontSize: typography.small, fontFamily: typography.family.bold },
  docHint: { color: colors.subtle, fontSize: 11, marginTop: 1 },
  navBtn: {
    position: 'absolute',
    top: '50%',
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.45)',
  },
  navBtnLeft: { left: spacing.sm },
  navBtnRight: { right: spacing.sm },
  dotsRow: { position: 'absolute', bottom: spacing.sm, alignSelf: 'center', flexDirection: 'row', gap: 5, backgroundColor: 'rgba(15,23,42,0.35)', borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { width: 14, backgroundColor: colors.white },
  counter: { position: 'absolute', top: spacing.sm, right: spacing.sm, backgroundColor: 'rgba(15,23,42,0.55)', borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 3, ...shadows.card },
  counterText: { color: colors.white, fontSize: 11, fontFamily: typography.family.bold },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingTop: spacing.sm },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 },
  footerText: { color: colors.subtle, fontSize: typography.small },
  boothBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.infoBackground, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  boothBtnText: { color: colors.info, fontSize: 11, fontFamily: typography.family.bold },
})

import { useState } from 'react'
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import type { EmployerBoothVacancy } from '@/services/seekerService'
import { seekerService } from '@/services/seekerService'
import { useAuthStore } from '@/stores/authStore'
import { downloadAndShare } from '@/utils/fileTransfer'
import { textFrom } from '@/utils/seekerView'
import { AlertBox } from '@/components/ui/AlertBox'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { ImagePreviewModal } from '@/components/ui/ImagePreviewModal'
import { PressableScale } from '@/components/ui/PressableScale'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton'
import { colors, radii, spacing, typography } from '@/theme'

// Where the header's back button should land, since job-fairs/booth is a flat sibling in
// the Tabs navigator (see job-fairs.tsx for the same reasoning) — plain router.back() has
// no real history to pop and always falls through to the first tab (Home).
function backTargetFor(from: string | undefined, fromId: string | undefined): string {
  if (from === 'job-fair' && fromId) return `/(seeker)/job-fairs/${fromId}`
  if (from === 'poster') return '/(seeker)/employer-posters'
  return '/(seeker)/job-fairs'
}

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

export default function EmployerBoothScreen() {
  const router = useRouter()
  const token = useAuthStore((state) => state.token)
  const { jobFairId, employerId, from, fromId } = useLocalSearchParams<{
    jobFairId: string
    employerId: string
    from?: string
    fromId?: string
  }>()
  const backTarget = backTargetFor(from, fromId)
  const [previewOpen, setPreviewOpen] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['employerBooth', jobFairId, employerId],
    queryFn: () => seekerService.getEmployerBooth(jobFairId, employerId),
    enabled: Boolean(jobFairId && employerId),
  })

  const displayName = data ? textFrom(data.employer.company_name || data.employer.trade_name, 'Employer') : ''
  const poster = data?.poster
  const posterUrl = poster ? seekerService.jobFairPosterUrl(poster.id) : null
  const isImagePoster = (poster?.mime_type || '').startsWith('image/')

  const openJob = (postId: number | string) => {
    // No 'booth' back-target exists on jobs/[id] (it would need both fairId and employerId to
    // return here) — omitting `from` falls back to Home, same as any other unlisted origin.
    router.push({ pathname: '/(seeker)/jobs/[id]', params: { id: String(postId) } })
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title={displayName || 'Employer Booth'} onBack={() => router.replace(backTarget as never)} />

      {isLoading ? (
        <ScreenSkeleton label="Loading employer booth" />
      ) : error || !data ? (
        <View style={styles.content}>
          <AlertBox variant="danger">Unable to load this employer booth. Please try again.</AlertBox>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.kicker}>{data.job_fair.title}</Text>
          {data.job_fair.venue ? <Text style={styles.subtitle}>{data.job_fair.venue}</Text> : null}

          {poster ? (
            <>
              <Text style={styles.sectionTitle}>Job Fair Poster</Text>
              <Card padding="sm" style={styles.posterCard} contentStyle={styles.posterCardContent}>
                <PosterView
                  isImage={isImagePoster}
                  posterUrl={posterUrl!}
                  token={token}
                  onOpenImage={() => setPreviewOpen(true)}
                  onOpenDocument={() => downloadAndShare(posterUrl!, poster.original_filename || `poster-${poster.id}`)}
                  displayName={displayName}
                />
                <View style={styles.posterFooter}>
                  <View style={styles.flexShrink}>
                    <Text style={styles.posterFileName} numberOfLines={1}>{poster.original_filename || 'Poster'}</Text>
                    {poster.posted_at ? <Text style={styles.posterMeta}>Posted {timeAgo(poster.posted_at)}</Text> : null}
                  </View>
                  {poster.match_percentage != null ? (
                    <View style={styles.matchBadge}>
                      <MaterialIcons name="auto-awesome" size={12} color={colors.success} />
                      <Text style={styles.matchBadgeText}>Up to {Math.round(poster.match_percentage)}% match</Text>
                    </View>
                  ) : null}
                </View>
              </Card>
            </>
          ) : null}

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Job Vacancies at this Booth</Text>
            <Badge variant="info">{data.vacancies.length} role{data.vacancies.length === 1 ? '' : 's'}</Badge>
          </View>

          {data.vacancies.length === 0 ? (
            <Card padding="md" style={styles.emptyCard}>
              <Text style={styles.emptyText}>No vacancies listed on their confirmation slip yet.</Text>
            </Card>
          ) : (
            <View style={styles.vacancyList}>
              {data.vacancies.map((vacancy) => (
                <VacancyCard key={String(vacancy.id)} vacancy={vacancy} onView={openJob} />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {poster && isImagePoster && token ? (
        <ImagePreviewModal
          visible={previewOpen}
          uri={posterUrl}
          headers={{ Authorization: `Bearer ${token}` }}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
    </View>
  )
}

function PosterView({
  isImage,
  posterUrl,
  token,
  onOpenImage,
  onOpenDocument,
  displayName,
}: {
  isImage: boolean
  posterUrl: string
  token: string | null
  onOpenImage: () => void
  onOpenDocument: () => Promise<string>
  displayName: string
}) {
  const [opening, setOpening] = useState(false)

  if (isImage && token) {
    return (
      <PressableScale
        onPress={onOpenImage}
        ripple={null}
        accessibilityRole="button"
        accessibilityLabel={`Open ${displayName} job fair poster image`}
      >
        <Image source={{ uri: posterUrl, headers: { Authorization: `Bearer ${token}` } }} style={styles.posterImage} resizeMode="cover" />
      </PressableScale>
    )
  }

  return (
    <PressableScale
      onPress={async () => {
        if (opening) return
        setOpening(true)
        try {
          await onOpenDocument()
        } finally {
          setOpening(false)
        }
      }}
      disabled={opening}
      ripple={null}
      style={styles.docRow}
      accessibilityRole="button"
      accessibilityLabel="Open job fair poster document"
    >
      {opening ? <ActivityIndicator size="small" color={colors.info} /> : <MaterialIcons name="description" size={28} color={colors.info} />}
      <View style={styles.flexShrink}>
        <Text style={styles.docTitle}>View Document</Text>
        <Text style={styles.docHint}>{opening ? 'Opening…' : 'Tap to open PDF/document'}</Text>
      </View>
    </PressableScale>
  )
}

function VacancyCard({ vacancy, onView }: { vacancy: EmployerBoothVacancy; onView: (postId: number | string) => void }) {
  const hasJobLink = Boolean(vacancy.vacancy)
  const title = hasJobLink ? vacancy.vacancy!.job_title : vacancy.position_title
  const location = hasJobLink ? vacancy.vacancy!.location : vacancy.place_of_work

  return (
    <Card padding="md" style={[styles.vacancyCard, hasJobLink && styles.vacancyCardLinked]}>
      <View style={styles.vacancyHeaderRow}>
        <Text style={styles.vacancyTitle} numberOfLines={2}>{textFrom(title, 'Position not specified')}</Text>
        {vacancy.match_percentage != null ? (
          <View style={styles.matchBadge}>
            <Text style={styles.matchBadgeText}>{Math.round(vacancy.match_percentage)}% match</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.vacancyMetaRow}>
        <MaterialIcons name="work-outline" size={14} color={colors.subtle} />
        <Text style={styles.vacancyMetaText}>{vacancy.number_needed ?? 0} vacancy/ies</Text>
      </View>
      <View style={styles.vacancyMetaRow}>
        <MaterialIcons name="place" size={14} color={colors.subtle} />
        <Text style={styles.vacancyMetaText} numberOfLines={2}>{textFrom(location, 'Location not specified')}</Text>
      </View>

      {!hasJobLink && vacancy.qualifications ? (
        <View style={styles.qualificationsBox}>
          <Text style={styles.qualificationsLabel}>Qualifications</Text>
          <Text style={styles.qualificationsText} numberOfLines={4}>{vacancy.qualifications}</Text>
        </View>
      ) : null}

      <View style={styles.vacancyFooter}>
        {hasJobLink ? (
          <TouchableOpacity style={styles.viewJobBtn} onPress={() => onView(vacancy.vacancy!.post_id)}>
            <Text style={styles.viewJobBtnText}>View Full Job Details</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.unlinkedText}>Not linked to an online posting — ask about this role at the booth.</Text>
        )}
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xxxl },
  flexShrink: { flexShrink: 1 },
  kicker: { color: colors.secondary, fontSize: typography.small, fontFamily: typography.family.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  subtitle: { color: colors.textSecondary, fontSize: typography.small, marginTop: 2, marginBottom: spacing.lg },
  sectionTitle: { color: colors.textPrimary, fontSize: typography.small, fontFamily: typography.family.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.md },

  posterCard: { marginTop: spacing.md, marginBottom: spacing.lg },
  posterCardContent: { gap: 0 },
  posterImage: { width: '100%', aspectRatio: 4 / 3, borderRadius: radii.md, backgroundColor: colors.background },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.xl, backgroundColor: colors.background, borderRadius: radii.md },
  docTitle: { color: colors.textPrimary, fontSize: typography.body, fontFamily: typography.family.bold },
  docHint: { color: colors.subtle, fontSize: 11, marginTop: 1 },
  posterFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingTop: spacing.sm },
  posterFileName: { color: colors.textPrimary, fontSize: typography.small, fontFamily: typography.family.bold },
  posterMeta: { color: colors.subtle, fontSize: 11, marginTop: 1 },
  matchBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.successBackground, borderWidth: 1, borderColor: colors.successBorder, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  matchBadgeText: { color: colors.success, fontSize: 10, fontFamily: typography.family.bold, textTransform: 'uppercase', letterSpacing: 0.4 },

  emptyCard: { alignItems: 'center' },
  emptyText: { color: colors.textSecondary, fontSize: typography.body, textAlign: 'center' },

  vacancyList: { gap: spacing.md },
  vacancyCard: {},
  vacancyCardLinked: { borderColor: colors.infoBorder },
  vacancyHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  vacancyTitle: { flex: 1, color: colors.textPrimary, fontSize: typography.body, fontFamily: typography.family.bold },
  vacancyMetaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, marginTop: spacing.sm },
  vacancyMetaText: { flex: 1, color: colors.textSecondary, fontSize: typography.small },
  qualificationsBox: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  qualificationsLabel: { color: colors.subtle, fontSize: 10, fontFamily: typography.family.bold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  qualificationsText: { color: colors.textSecondary, fontSize: typography.small, lineHeight: 18 },
  vacancyFooter: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  viewJobBtn: { backgroundColor: colors.infoBackground, borderRadius: radii.md, paddingVertical: spacing.sm, alignItems: 'center' },
  viewJobBtnText: { color: colors.info, fontSize: typography.small, fontFamily: typography.family.bold },
  unlinkedText: { color: colors.subtle, fontSize: 11, textAlign: 'center', lineHeight: 15 },
})
